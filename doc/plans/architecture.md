# WB-Kommo — CRM SaaS: Documento de Arquitetura

> Versão 1.0 — 2026-04-06

---

## 1. Visão Geral do Produto

Sistema CRM SaaS para gestão de leads, inspirado no Kommo. O modelo de negócio é **reseller**: o proprietário da plataforma (reseller) vende assinaturas para seus clientes, possui acesso irrestrito a todas as features e pode **impersonar qualquer cliente** (login como cliente) para suporte e auditoria.

### Atores Principais

| Ator | Descrição |
|------|-----------|
| **Reseller (Super Admin)** | Proprietário da plataforma. Acesso total, gerencia planos, clientes e pode impersonar qualquer conta. |
| **Admin de Conta** | Administrador do espaço de trabalho de um cliente. Gerencia usuários, pipelines e configurações da conta. |
| **Usuário** | Membro da equipe de um cliente. Acessa leads, pipelines e tarefas conforme permissões. |

---

## 2. Estrutura do Monorepo

```
WB-kommo/
├── backend/                  # NestJS — DDD
│   ├── src/
│   │   ├── modules/          # Bounded Contexts (domínios)
│   │   ├── infrastructure/   # DB, cache, queue, mail, storage
│   │   ├── shared/           # Utilitários, value objects, base classes
│   │   └── main.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── test/                 # Testes e2e
│   ├── docker-compose.yml
│   ├── Dockerfile
│   └── .env.example
├── frontend/                 # Next.js 15 (App Router)
│   ├── src/
│   │   ├── app/              # Rotas (App Router)
│   │   ├── components/       # UI components
│   │   ├── features/         # Feature slices (por domínio)
│   │   ├── lib/              # Clientes HTTP, hooks, utils
│   │   └── styles/
│   └── .env.example
└── doc/
    └── plans/
        └── architecture.md   # Este documento
```

---

## 3. Arquitetura de Backend — NestJS + DDD

### 3.1 Princípios Adotados

- **Domain-Driven Design (DDD)**: Bounded Contexts bem definidos, Entities, Value Objects, Aggregates, Domain Events, Repositories e Application Services.
- **Hexagonal Architecture (Ports & Adapters)**: O domínio não depende de infraestrutura. Repositórios são abstrações (interfaces) implementadas na camada de infraestrutura.
- **CQRS leve**: Separação de commands (mutações) e queries (leituras) dentro dos Application Services. Pode evoluir para CQRS completo com Event Sourcing no futuro.
- **Dependency Injection**: 100% via NestJS IoC container.

### 3.2 Bounded Contexts (Módulos)

```
src/modules/
├── auth/               # Autenticação, JWT, refresh tokens, impersonation
├── tenants/            # Gestão de contas/workspaces (multi-tenancy)
├── users/              # Usuários dentro de cada tenant
├── plans/              # Planos de assinatura e billing
├── leads/              # Leads, contatos, organizações
├── pipelines/          # Funis de venda, estágios, cards
├── activities/         # Tarefas, notas, emails, ligações
├── automations/        # Regras e automações de pipeline
├── integrations/       # Webhooks, integrações externas
└── notifications/      # Notificações em tempo real (WebSocket/SSE)
```

### 3.3 Estrutura Interna de cada Módulo (DDD)

```
modules/leads/
├── domain/
│   ├── entities/
│   │   └── lead.entity.ts
│   ├── value-objects/
│   │   ├── lead-status.vo.ts
│   │   └── contact-info.vo.ts
│   ├── aggregates/
│   │   └── lead.aggregate.ts
│   ├── events/
│   │   └── lead-created.event.ts
│   ├── repositories/
│   │   └── lead.repository.ts       # Interface (Port)
│   └── services/
│       └── lead-scoring.service.ts  # Domain Service
├── application/
│   ├── commands/
│   │   ├── create-lead.command.ts
│   │   └── create-lead.handler.ts
│   ├── queries/
│   │   ├── get-leads.query.ts
│   │   └── get-leads.handler.ts
│   ├── dtos/
│   │   ├── create-lead.dto.ts
│   │   └── lead-response.dto.ts
│   └── use-cases/
│       └── create-lead.use-case.ts
├── infrastructure/
│   ├── repositories/
│   │   └── prisma-lead.repository.ts  # Adapter
│   └── mappers/
│       └── lead.mapper.ts
├── presentation/
│   ├── leads.controller.ts
│   └── leads.module.ts
└── __tests__/
    ├── unit/
    ├── integration/
    └── e2e/
```

### 3.4 Multi-tenancy

Estratégia: **Row-Level Tenancy com tenant_id em todas as tabelas**.

- Cada request autenticado carrega o `tenantId` no JWT.
- Um `TenantGuard` global injeta o contexto de tenant em todas as queries.
- O Prisma middleware garante que todo acesso seja filtrado pelo `tenantId`.
- Dados do Reseller ficam no tenant com role `RESELLER` (tenant especial).

### 3.5 Impersonation (Login como Cliente)

Fluxo:
1. Reseller chama `POST /auth/impersonate/:tenantId`.
2. Backend valida que o solicitante tem role `RESELLER`.
3. Gera um JWT de curta duração (`impersonation_token`) com claims: `{ sub: resellerId, impersonating: tenantId, role: ADMIN }`.
4. Toda ação feita com esse token é logada em `audit_logs` com flag `impersonated: true`.
5. Reseller pode encerrar a impersonação via `POST /auth/impersonate/end`.

### 3.6 Autenticação & Autorização

- JWT (Access Token 15min) + Refresh Token (7 dias, httpOnly cookie).
- Role-based: `RESELLER | ACCOUNT_ADMIN | MEMBER`.
- Permission-based dentro do tenant (ex: `leads:create`, `pipeline:manage`).
- Guards: `JwtAuthGuard`, `RolesGuard`, `TenantGuard`, `ImpersonationGuard`.

---

## 4. Banco de Dados — PostgreSQL + Prisma

### 4.1 Schema Principal (entidades-chave)

```prisma
model Tenant {
  id          String   @id @default(uuid())
  name        String
  slug        String   @unique
  planId      String
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  plan        Plan     @relation(fields: [planId], references: [id])
  users       User[]
  leads       Lead[]
  pipelines   Pipeline[]
}

model User {
  id         String   @id @default(uuid())
  tenantId   String
  email      String
  name       String
  role       Role     @default(MEMBER)
  passwordHash String
  isActive   Boolean  @default(true)
  tenant     Tenant   @relation(fields: [tenantId], references: [id])
  @@unique([tenantId, email])
}

model Plan {
  id          String   @id @default(uuid())
  name        String   // Starter, Pro, Enterprise
  maxUsers    Int
  maxLeads    Int
  price       Decimal
  features    Json
  tenants     Tenant[]
}

model Lead {
  id          String     @id @default(uuid())
  tenantId    String
  pipelineId  String
  stageId     String
  name        String
  value       Decimal?
  status      LeadStatus @default(OPEN)
  assignedTo  String?
  contacts    Contact[]
  activities  Activity[]
  tags        Tag[]
  customFields Json?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  tenant      Tenant     @relation(fields: [tenantId], references: [id])
  pipeline    Pipeline   @relation(fields: [pipelineId], references: [id])
  stage       Stage      @relation(fields: [stageId], references: [id])
}

model Pipeline {
  id       String  @id @default(uuid())
  tenantId String
  name     String
  isActive Boolean @default(true)
  stages   Stage[]
  leads    Lead[]
  tenant   Tenant  @relation(fields: [tenantId], references: [id])
}

model Stage {
  id         String @id @default(uuid())
  pipelineId String
  name       String
  order      Int
  color      String?
  leads      Lead[]
  pipeline   Pipeline @relation(fields: [pipelineId], references: [id])
}

model Contact {
  id       String  @id @default(uuid())
  tenantId String
  leadId   String?
  name     String
  email    String?
  phone    String?
  lead     Lead?   @relation(fields: [leadId], references: [id])
}

model Activity {
  id        String       @id @default(uuid())
  tenantId  String
  leadId    String
  userId    String
  type      ActivityType // NOTE, CALL, EMAIL, TASK, MEETING
  content   String
  dueDate   DateTime?
  completed Boolean      @default(false)
  lead      Lead         @relation(fields: [leadId], references: [id])
}

model AuditLog {
  id            String   @id @default(uuid())
  tenantId      String
  userId        String
  action        String
  entity        String
  entityId      String
  payload       Json?
  impersonated  Boolean  @default(false)
  impersonatorId String?
  createdAt     DateTime @default(now())
}
```

### 4.2 Migrations & Seeds

- Migrations versionadas via `prisma migrate`.
- Seeds separados por ambiente: `seed.ts` (dev) e `seed.production.ts` (dados mínimos).

---

## 5. Infraestrutura — Docker Compose

```yaml
# backend/docker-compose.yml
services:
  api:
    build: .
    ports: ["3001:3001"]
    depends_on: [postgres, redis]
    environment:
      DATABASE_URL: postgresql://...
      REDIS_URL: redis://redis:6379

  postgres:
    image: postgres:16-alpine
    volumes: [postgres_data:/var/lib/postgresql/data]
    ports: ["5432:5432"]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  # Opcional - Bull Queue UI
  bull-board:
    image: deadly0/bull-board
    ports: ["3002:3000"]
    depends_on: [redis]

volumes:
  postgres_data:
```

### Serviços de Infraestrutura

| Serviço | Uso |
|---------|-----|
| PostgreSQL 16 | Banco de dados principal |
| Redis 7 | Cache, sessões, filas de jobs (Bull) |
| Bull Queue | Processamento assíncrono (emails, webhooks, automações) |
| WebSocket (Socket.io) | Notificações em tempo real |

---

## 6. Estratégia de Testes

### 6.1 Pirâmide de Testes

```
         /\
        /E2E\         ← ~10% — Supertest, fluxos completos por feature
       /------\
      /Integração\    ← ~20% — Módulos com DB real (test container)
     /------------\
    /    Unitários  \  ← ~70% — Domain layer, use cases, value objects
   /________________\
```

### 6.2 Testes Unitários

- **Escopo**: Domain entities, Value Objects, Domain Services, Use Cases, Handlers.
- **Ferramentas**: Jest + ts-jest.
- **Mocks**: Repositórios mockados manualmente (interfaces). Sem framework de mock pesado.
- **Meta de cobertura**: ≥ 85% nas camadas `domain/` e `application/`.

```typescript
// Exemplo: lead.entity.spec.ts
describe('Lead Entity', () => {
  it('should not allow moving to a previous stage without permission', () => {
    const lead = LeadFactory.create({ stageOrder: 2 });
    expect(() => lead.moveToStage(stageOrder: 1)).toThrow(DomainException);
  });
});
```

### 6.3 Testes de Integração

- **Escopo**: Repositórios Prisma contra banco real, Application Services com DB.
- **Ferramentas**: Jest + `@testcontainers/postgresql` (banco isolado por suite).
- **Estratégia**: Cada suite cria seu próprio schema/banco, trunca entre testes.
- **Meta de cobertura**: Todos os repositórios e use cases críticos cobertos.

```typescript
// Exemplo: prisma-lead.repository.spec.ts
describe('PrismaLeadRepository (integration)', () => {
  let container: StartedPostgreSqlContainer;
  
  beforeAll(async () => {
    container = await new PostgreSqlContainer().start();
    // aplica migrations no container
  });
  
  it('should persist and retrieve a lead by tenant', async () => {
    // ...
  });
});
```

### 6.4 Testes E2E

- **Escopo**: Endpoints HTTP completos, autenticação, multi-tenancy, impersonation.
- **Ferramentas**: Jest + Supertest + banco de test isolado.
- **Fixtures**: Factories para criar tenants, usuários e leads de teste.
- **Meta**: Cobrir todos os fluxos críticos de negócio (criar lead, mover no pipeline, impersonation, billing).

### 6.5 Configuração de Cobertura (Jest)

```json
{
  "coverageThresholds": {
    "global": {
      "branches": 80,
      "functions": 85,
      "lines": 85,
      "statements": 85
    },
    "./src/modules/**/domain/**": {
      "lines": 90
    }
  }
}
```

---

## 7. Frontend — Next.js 15 (App Router)

### 7.1 Stack

| Tecnologia | Uso |
|-----------|-----|
| Next.js 15 (App Router) | Framework principal, RSC |
| TypeScript | Tipagem forte |
| Tailwind CSS 4 | Estilização utility-first |
| Framer Motion | Animações suaves (drag & drop, transições) |
| shadcn/ui | Componentes base acessíveis |
| Zustand | Estado global leve |
| TanStack Query v5 | Server state, cache, revalidação |
| TanStack Table | Tabelas avançadas de leads |
| React Hook Form + Zod | Formulários e validação |
| Socket.io Client | Notificações em tempo real |
| @dnd-kit | Drag & drop no Kanban |

### 7.2 Estrutura de Pastas

```
frontend/src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── layout.tsx
│   ├── (reseller)/               # Area exclusiva do reseller
│   │   ├── dashboard/page.tsx
│   │   ├── clients/page.tsx
│   │   ├── clients/[id]/page.tsx
│   │   └── layout.tsx
│   ├── (workspace)/              # Area do tenant (cliente ou reseller impersonando)
│   │   ├── leads/page.tsx
│   │   ├── pipeline/[id]/page.tsx
│   │   ├── contacts/page.tsx
│   │   ├── activities/page.tsx
│   │   ├── settings/
│   │   └── layout.tsx
│   └── layout.tsx
├── components/
│   ├── ui/                       # shadcn/ui wrappers
│   ├── layout/                   # Sidebar, Header, Nav
│   ├── kanban/                   # Pipeline Kanban board
│   ├── lead/                     # Lead card, lead detail
│   └── shared/                   # Badges, Avatars, EmptyState
├── features/                     # Feature slices por domínio
│   ├── auth/
│   ├── leads/
│   ├── pipeline/
│   └── tenants/
├── lib/
│   ├── api/                      # Clientes HTTP (fetch wrappers)
│   ├── hooks/                    # Hooks customizados
│   ├── stores/                   # Zustand stores
│   └── utils/
└── styles/
    └── globals.css
```

### 7.3 Impersonation no Frontend

- Header exibe banner `"Visualizando como: [Nome do Cliente]"` com botão de sair.
- Ao iniciar impersonation, o token é armazenado separado do token principal.
- Rota `/reseller/clients/[id]/impersonate` aciona o fluxo.
- Encerrar retorna ao token original do reseller.

### 7.4 UI/UX — Inspiração Kommo

- **Kanban de Pipeline**: colunas arrastáveis (dnd-kit) com cards de leads, animações de transição suaves (Framer Motion).
- **Lead Detail**: painel lateral (slide-over) com timeline de atividades, contatos, valor, tags e histórico.
- **Sidebar**: colapsável, ícones com tooltips, ativa conforme rota.
- **Animações**: page transitions com `AnimatePresence`, skeleton loaders, hover states suaves.
- **Paleta**: tons neutros escuros (#1a1a2e, #16213e) com accent azul/roxo vibrante — moderno e profissional.

---

## 8. Fluxos de Negócio Críticos

### 8.1 Cadastro de Cliente (Tenant)

```
Reseller → POST /tenants → Cria Tenant + Admin User → Envia email de boas-vindas
                         → Associa Plano
                         → Cria Pipeline padrão
```

### 8.2 Gestão de Leads

```
Lead criado → Vai para Stage inicial do Pipeline
           → Pode ser movido entre stages (Kanban drag/drop)
           → Atividades são registradas na timeline
           → Automações disparam (ex: email ao entrar em stage X)
           → Lead pode ser ganho (WON) ou perdido (LOST)
```

### 8.3 Billing / Planos

```
Tenant tem um Plan → Plan define: maxUsers, maxLeads, features
Reseller pode atualizar o plan de um Tenant
Limites são checados via Guard antes de criar recursos
```

---

## 9. Segurança

- Senhas com bcrypt (salt rounds 12).
- Rate limiting via `@nestjs/throttler` (ex: 5 tentativas de login por minuto).
- CORS configurado para domínios específicos.
- Helmet para headers HTTP seguros.
- Toda impersonation logada em `audit_logs` com imutabilidade (sem delete/update).
- Validação de input com `class-validator` + `class-transformer` em todos os DTOs.
- Queries sempre filtradas por `tenantId` — impossível vazar dados de outro tenant.

---

## 10. Roadmap de Implementação

### Fase 1 — Fundação (Semanas 1-3)
- [ ] Setup Docker Compose + PostgreSQL + Redis
- [ ] Setup NestJS com estrutura DDD base
- [ ] Schema Prisma inicial + migrations
- [ ] Módulo Auth (login, register, JWT, refresh token)
- [ ] Módulo Tenants (CRUD básico)
- [ ] Módulo Users com roles
- [ ] Impersonation básico
- [ ] Setup Jest (unit + integration + e2e)
- [ ] Setup Next.js + Tailwind + shadcn
- [ ] Telas de Login e Dashboard base

### Fase 2 — Core CRM (Semanas 4-7)
- [ ] Módulo Leads (CRUD completo)
- [ ] Módulo Pipelines + Stages
- [ ] Módulo Activities (notas, tarefas, ligações)
- [ ] Módulo Contacts
- [ ] Kanban board com drag & drop
- [ ] Lead detail slide-over
- [ ] Timeline de atividades
- [ ] Filtros e busca de leads
- [ ] Testes unitários e integração do core

### Fase 3 — SaaS Features (Semanas 8-11)
- [ ] Módulo Plans + limites
- [ ] Painel Reseller (gestão de clientes)
- [ ] Impersonation completo no frontend
- [ ] Módulo Automations (regras de pipeline)
- [ ] Notificações em tempo real (WebSocket)
- [ ] Módulo Integrations (webhooks outbound)
- [ ] Audit Logs UI para reseller
- [ ] Testes e2e dos fluxos SaaS

### Fase 4 — Polimento (Semanas 12-14)
- [ ] Animações e UX refinados
- [ ] Performance (query optimization, caching Redis)
- [ ] Monitoramento (logs estruturados, health checks)
- [ ] Documentação da API (Swagger/OpenAPI)
- [ ] CI/CD básico
- [ ] Cobertura de testes ≥ 85%

---

## 11. Decisões de Arquitetura — ADRs Resumidos

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| Multi-tenancy | Row-level (tenantId) | Simples de implementar, adequado para início. Schema-per-tenant pode ser adotado depois se necessário. |
| ORM | Prisma | DX excelente, type-safety, migrations confiáveis. |
| Cache | Redis | Sessões, rate limiting, filas (Bull). |
| Filas | Bull (Redis-based) | Emails, webhooks, automações assíncronas. |
| Auth | JWT + httpOnly cookie | Seguro, stateless, compatível com SSR do Next.js. |
| State frontend | Zustand + TanStack Query | Zustand para UI state, TanStack Query para server state — separação clara. |
| DDD | Hexagonal + CQRS leve | Testável, desacoplado, evolui para CQRS completo sem reescrita. |

---

*Documento gerado em 2026-04-06. Sujeito a revisão conforme o projeto evolui.*
