# WB-Kommo — CRM SaaS: Documento de Arquitetura

> Versão 1.5 — 2026-04-07

---

## 1. Visão Geral do Produto

Sistema CRM SaaS para gestão de leads, inspirado no Kommo. O modelo de negócio é **reseller**: o proprietário da plataforma (reseller) vende assinaturas para seus clientes, possui acesso irrestrito a todas as features e pode **impersonar qualquer cliente** (login como cliente) para suporte e auditoria.

### Atores Principais

| Ator | Descrição |
|------|-----------|
| **Reseller (Super Admin)** | Proprietário da plataforma. Acesso total, gerencia planos, clientes e pode impersonar qualquer conta. |
| **Admin de Conta** | Administrador do espaço de trabalho de um cliente. Gerencia usuários, pipelines e configurações da conta. |
| **Usuário (Member)** | Membro da equipe de um cliente. Acessa leads, pipelines e tarefas conforme permissões. |

---

## 2. Estrutura do Monorepo

```
WB-kommo/
├── backend/
│   ├── src/
│   │   ├── core/                     # Utilitários e contratos compartilhados
│   │   │   ├── criteria/             # Base do Criteria Pattern
│   │   │   ├── domain/
│   │   │   │   ├── events/           # Base classes de Domain Events
│   │   │   │   └── exceptions/       # Exceções de domínio base
│   │   │   ├── errors/               # Either, Left, Right, AppError
│   │   │   ├── repositories/         # Interfaces genéricas (IRepository)
│   │   │   ├── types/                # Tipos utilitários globais
│   │   │   └── utils/                # Helpers puros (uuid, date, etc.)
│   │   │
│   │   ├── domain/                   # Bounded Contexts — lógica de negócio pura
│   │   │   ├── auth/
│   │   │   ├── tenants/
│   │   │   ├── users/
│   │   │   ├── plans/
│   │   │   ├── leads/
│   │   │   ├── pipelines/
│   │   │   ├── activities/
│   │   │   ├── automations/
│   │   │   └── notifications/
│   │   │
│   │   ├── infra/                    # Framework, DB, serviços externos
│   │   │   ├── auth/
│   │   │   │   ├── decorators/
│   │   │   │   ├── guards/
│   │   │   │   └── strategies/       # Passport JWT
│   │   │   ├── cache/                # Redis
│   │   │   ├── database/
│   │   │   │   ├── prisma/
│   │   │   │   │   ├── mappers/      # Domain ↔ Prisma
│   │   │   │   │   ├── repositories/ # Implementações Prisma
│   │   │   │   │   └── unit-of-work/ # Transações
│   │   │   │   └── redis/
│   │   │   ├── email/
│   │   │   │   ├── adapters/
│   │   │   │   └── listeners/
│   │   │   ├── events/
│   │   │   │   └── handlers/         # Event bus handlers
│   │   │   ├── filters/              # HTTP exception filters
│   │   │   │   └── error-mappings/
│   │   │   ├── http/
│   │   │   │   ├── controllers/      # Todos os HTTP controllers
│   │   │   │   ├── dtos/             # Request/Response DTOs
│   │   │   │   └── presenters/       # Response mappers
│   │   │   ├── interceptors/
│   │   │   ├── logger/               # Logs estruturados
│   │   │   ├── modules/              # NestJS Modules (DI wiring)
│   │   │   │   ├── auth.module.ts
│   │   │   │   ├── tenants.module.ts
│   │   │   │   ├── users.module.ts
│   │   │   │   ├── leads.module.ts
│   │   │   │   ├── pipelines.module.ts
│   │   │   │   ├── plans.module.ts
│   │   │   │   ├── activities.module.ts
│   │   │   │   └── notifications.module.ts
│   │   │   ├── queue/                # BullMQ workers e jobs
│   │   │   ├── storage/              # S3 / local storage
│   │   │   └── websocket/            # Socket.io gateways
│   │   │
│   │   ├── app.module.ts
│   │   └── main.ts
│   │
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   │
│   ├── src/
│   │   └── test/                     # Utilitários de testes unitários (co-located com src)
│   │       ├── repositories/         # In-memory repos reutilizáveis
│   │       │   ├── in-memory-user-identity.repository.ts
│   │       │   ├── in-memory-user-profile.repository.ts
│   │       │   ├── in-memory-lead.repository.ts
│   │       │   └── ...
│   │       ├── factories/            # make-lead, make-tenant, make-user
│   │       └── shared/               # Helpers, fixtures, setup global
│   │
│   ├── test/                         # Testes E2E (fora de src/)
│   │   ├── e2e/
│   │   │   ├── auth/
│   │   │   ├── tenants/
│   │   │   ├── leads/
│   │   │   ├── pipelines/
│   │   │   └── impersonation/
│   │   └── setup-e2e.ts              # Schema PostgreSQL isolado por suite
│   │
│   ├── docker-compose.yml
│   ├── Dockerfile.dev
│   ├── Dockerfile.prod
│   ├── vitest.config.ts              # Unitários + integração (inclui workspaces projects)
│   ├── vitest.config.e2e.ts          # E2E separado (maxThreads: 5, setupFiles)
│   ├── tsconfig.json
│   ├── tsconfig.build.json
│   ├── tsconfig.dev.json             # baseUrl + paths alias @/* → src/*
│   ├── nest-cli.json
│   └── .env.example
│
├── frontend/                         # Next.js 15 (App Router)
│   ├── src/
│   │   ├── app/[locale]/             # Rotas internacionalizadas
│   │   ├── i18n/                     # next-intl config
│   │   ├── messages/                 # pt.json, en.json, it.json, es.json
│   │   ├── components/
│   │   ├── features/
│   │   ├── lib/
│   │   ├── middleware.ts
│   │   └── styles/
│   └── .env.example
│
└── doc/
    └── plans/
        └── architecture.md
```

---

## 3. Arquitetura de Backend — NestJS + DDD

### 3.1 Princípios Adotados

- **Domain-Driven Design (DDD)**: Bounded Contexts bem definidos, Entities, Value Objects, Aggregates, Domain Events, Repositories e Application Services.
- **Hexagonal Architecture (Ports & Adapters)**: O domínio não depende de infraestrutura. Repositórios são abstrações (interfaces) implementadas na camada de infraestrutura.
- **Either Pattern**: Todos os use cases e repositórios retornam `Either<DomainError, T>` — sem exceções não tratadas, erros são valores tipados.
- **CQRS leve**: Separação de commands (mutações) e queries (leituras) dentro dos Application Services.
- **Dependency Injection**: 100% via NestJS IoC container.

### 3.2 Bounded Contexts (Módulos)

```
src/modules/
├── auth/               # Autenticação, JWT, refresh tokens, sessions, impersonation
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

### 3.3 Estrutura Interna de cada Bounded Context

Espelhando o revalida, cada domínio em `src/domain/{context}/` é dividido em duas camadas: **enterprise** (modelo puro) e **application** (orquestração). A infraestrutura fica em `src/infra/`.

```
src/domain/users/
├── enterprise/                          # Modelo de domínio puro (sem framework)
│   ├── entities/
│   │   ├── user-identity.entity.ts      # Auth: email, password, tokens, bloqueio
│   │   ├── user-profile.entity.ts       # Dados pessoais: nome, avatar, timezone
│   │   └── user-authorization.entity.ts # Roles e permissões granulares
│   ├── value-objects/
│   │   ├── email.vo.ts
│   │   ├── password.vo.ts
│   │   ├── user-role.vo.ts
│   │   └── session-token.vo.ts
│   └── events/
│       ├── user-created.event.ts
│       └── user-impersonated.event.ts
│
└── application/                         # Casos de uso e contratos
    ├── use-cases/
    │   ├── create-user/
    │   │   ├── create-user.use-case.ts
    │   │   └── create-user.use-case.spec.ts   # TDD — spec ao lado do use case
    │   ├── authenticate-user/
    │   │   ├── authenticate-user.use-case.ts
    │   │   └── authenticate-user.use-case.spec.ts
    │   ├── impersonate-tenant/
    │   │   ├── impersonate-tenant.use-case.ts
    │   │   └── impersonate-tenant.use-case.spec.ts
    │   └── errors/                          # Erros tipados retornados pelos use cases
    │       ├── user-already-exists.error.ts
    │       ├── invalid-credentials.error.ts
    │       ├── account-locked.error.ts
    │       └── weak-password.error.ts
    ├── repositories/                    # Interfaces (Ports) — sem Prisma aqui
    │   ├── i-user-identity.repository.ts
    │   ├── i-user-profile.repository.ts
    │   └── i-user-authorization.repository.ts
    ├── services/                        # Domain services de aplicação
    ├── mappers/                         # Domain ↔ DTO (sem Prisma)
    │   └── user-profile.mapper.ts
    ├── dtos/
    │   ├── create-user.dto.ts
    │   └── user-response.dto.ts
    ├── criteria/
    │   └── user-profile.criteria.ts     # Fluent query builder
    └── event-handlers/
        └── on-user-created.handler.ts
```

**Infraestrutura correspondente** em `src/infra/`:

```
src/infra/
├── database/prisma/
│   ├── repositories/
│   │   ├── prisma-user-identity.repository.ts   # Implementa IUserIdentityRepository
│   │   ├── prisma-user-profile.repository.ts
│   │   └── prisma-user-authorization.repository.ts
│   └── mappers/
│       ├── prisma-user-identity.mapper.ts        # Domain ↔ Prisma model
│       ├── prisma-user-profile.mapper.ts
│       └── prisma-user-authorization.mapper.ts
├── http/
│   ├── controllers/
│   │   ├── users.controller.ts
│   │   └── users.controller.spec.ts              # Teste unitário — mock do use case
│   └── presenters/
│       └── user.presenter.ts
└── modules/
    └── users.module.ts                           # DI wiring NestJS
```

**In-memory repositories** (para testes unitários) em `src/test/`:

```
src/test/
├── repositories/
│   ├── in-memory-user-identity.repository.ts
│   ├── in-memory-user-profile.repository.ts
│   ├── in-memory-user-authorization.repository.ts
│   ├── in-memory-lead.repository.ts
│   └── in-memory-pipeline.repository.ts
├── factories/
│   ├── make-user.ts
│   ├── make-tenant.ts
│   ├── make-lead.ts
│   └── make-pipeline.ts
└── shared/
    └── setup.ts                                  # beforeAll global, env test
```

> **Distinção importante**: `src/test/` contém utilitários para testes unitários (in-memory repos, factories).
> `test/` (raiz do backend) contém apenas testes E2E e o `setup-e2e.ts`.
```

### 3.4 Design do Aggregate User — Split Aggregate Pattern

Inspirado no projeto revalida, o User é dividido em **3 aggregates separados**, cada um com responsabilidade única:

#### `UserIdentity` — Autenticação
```typescript
// Responsável por: credenciais, verificação, bloqueio de conta
class UserIdentity extends Entity<UserIdentityProps> {
  tenantId: string           // multi-tenancy
  email: Email               // Value Object com validação RFC 5321
  password: Password         // Value Object com bcrypt
  isEmailVerified: boolean
  emailVerificationToken?: string
  passwordResetToken?: string
  passwordResetExpiresAt?: Date
  failedLoginAttempts: number
  lockedUntil?: Date         // bloqueio após 5 tentativas
  lastLoginAt?: Date
  deletedAt?: Date           // soft delete com anonimização de email

  // Métodos de domínio
  incrementFailedAttempts(): void   // bloqueia após 5
  resetFailedAttempts(): void
  lockAccount(minutes: number): void
  isLocked(): boolean
  requestPasswordReset(): string    // gera token + expiry
  verifyEmail(): void
  softDelete(): void                // anonimiza email
}
```

#### `UserProfile` — Dados Pessoais
```typescript
// Responsável por: nome, avatar, preferências, timezone
class UserProfile extends Entity<UserProfileProps> {
  tenantId: string
  identityId: string         // FK para UserIdentity
  name: string
  avatarUrl?: string
  phone?: string
  timezone: string           // default: 'America/Sao_Paulo'
  language: string           // default: 'pt-BR'
  deletedAt?: Date           // soft delete

  // Métodos de domínio
  updateProfile(data: Partial<UserProfileProps>): void
  softDelete(): void
}
```

#### `UserAuthorization` — Papéis e Permissões
```typescript
// Responsável por: roles, permissões granulares, vigência
class UserAuthorization extends Entity<UserAuthorizationProps> {
  tenantId: string
  identityId: string
  role: UserRole             // Value Object: RESELLER | ACCOUNT_ADMIN | MEMBER
  customPermissions: string[] // ex: ['leads:export', 'pipeline:delete']
  restrictions: string[]      // ex: ['leads:import']
  effectiveFrom: Date
  effectiveUntil?: Date       // assinatura expira

  // Métodos de domínio
  isActive(): boolean
  can(permission: string): boolean
  addPermission(permission: string): void
  removePermission(permission: string): void
  restrict(restriction: string): void
}
```

#### `UserSession` — Rastreamento de Sessões
```typescript
// Separado para não poluir UserIdentity
class UserSession extends Entity<UserSessionProps> {
  tenantId: string
  identityId: string
  refreshTokenHash: SessionToken  // SHA256 do refresh token
  ipAddress: string
  userAgent: string
  isImpersonation: boolean        // flag para sessões de impersonation
  impersonatorId?: string         // quem iniciou a impersonation
  expiresAt: Date
  revokedAt?: Date

  isValid(): boolean
  revoke(): void
}
```

### 3.5 Value Objects do Domínio User

#### `Email`
- Validação RFC 5321 (local part ≤ 64, domain ≤ 255)
- Normalização automática (lowercase)
- Prevenção de pontos consecutivos
- Factory method `createTrusted()` para dados vindos do banco

#### `Password`
- Hash via bcryptjs (salt rounds: 12)
- Mín 8, máx 100 caracteres
- Requer: maiúscula, minúscula, número, caractere especial
- Lista de senhas comuns bloqueadas
- `generate()` para senhas temporárias (onboarding de clientes)

#### `UserRole`
```typescript
// Centraliza todas as regras de permissão
class UserRole {
  private readonly value: 'RESELLER' | 'ACCOUNT_ADMIN' | 'MEMBER'

  isReseller(): boolean
  isAccountAdmin(): boolean
  isMember(): boolean
  isAdmin(): boolean   // true para RESELLER | ACCOUNT_ADMIN — atalho para guards

  // Permissões implícitas por role
  canManageAllTenants(): boolean    // apenas RESELLER
  canImpersonate(): boolean         // apenas RESELLER

  // Gestão de usuários — RESELLER cria em qualquer tenant, ACCOUNT_ADMIN cria no próprio tenant
  canCreateUsers(): boolean         // RESELLER | ACCOUNT_ADMIN
  canUpdateUsers(): boolean         // RESELLER | ACCOUNT_ADMIN
  canDeleteUsers(): boolean         // RESELLER | ACCOUNT_ADMIN
  canListUsers(): boolean           // RESELLER | ACCOUNT_ADMIN

  canManagePipelines(): boolean     // RESELLER | ACCOUNT_ADMIN
  canCreateLeads(): boolean         // todos
  canDeleteLeads(): boolean         // RESELLER | ACCOUNT_ADMIN
  canExportData(): boolean          // RESELLER | ACCOUNT_ADMIN
  canViewBilling(): boolean         // RESELLER | ACCOUNT_ADMIN
  canAccessAdminPanel(): boolean    // RESELLER | ACCOUNT_ADMIN
}
```

**Regra de escopo na criação de usuários:**
- `RESELLER` pode criar usuários em **qualquer tenant** (usado ao onboarding de um novo cliente).
- `ACCOUNT_ADMIN` só pode criar usuários **dentro do próprio tenant** — enforcement via `TenantGuard`.

#### `SessionToken`
- Hash SHA256 do token para armazenamento seguro no banco
- O token raw só existe em memória/cookie — nunca persiste

### 3.6 Either Pattern para Erros de Domínio

```typescript
// Todos os use cases retornam Either — sem throws não controlados
type Either<L, R> = Left<L, R> | Right<L, R>

// Exemplo: CreateUserUseCase
async execute(dto: CreateUserDto): Promise<Either<
  UserAlreadyExistsError | InvalidEmailError | WeakPasswordError,
  UserResponseDto
>> {
  const emailOrError = Email.create(dto.email)
  if (emailOrError.isLeft()) return left(emailOrError.value)

  const exists = await this.userIdentityRepo.emailExists(emailOrError.value)
  if (exists) return left(new UserAlreadyExistsError())

  // ... cria entidades, persiste, retorna Right
  return right(UserProfileMapper.toResponse(profile))
}
```

### 3.7 Criteria Pattern para Queries Complexas

```typescript
// Fluent builder — sem vazar SQL/Prisma para o domínio
const criteria = new UserProfileCriteria()
  .byTenant(tenantId)
  .byRole('MEMBER')
  .withPagination({ page: 1, limit: 20 })
  .orderBy('name', 'asc')

const users = await userProfileRepo.findByCriteria(criteria)
```

### 3.8 CQRS — Aggregated View Repositories (Read Models)

Para queries que precisam combinar múltiplos aggregates (ex: autenticação = identity + profile + authorization), cria-se um **repositório de view agregada** — uma query otimizada que retorna tudo de uma vez.

```typescript
// application/repositories/i-user-aggregated-view.repository.ts
export abstract class IUserAggregatedViewRepository {
  abstract findByEmail(email: string): Promise<Either<Error, UserAggregatedView | null>>
}

// Tipo de retorno (não é entity — é DTO de leitura)
export interface UserAggregatedView {
  identity: UserIdentity
  profile: UserProfile
  authorization: UserAuthorization
}
```

**Implementação Prisma:**
```typescript
// infra/database/prisma/repositories/prisma-user-aggregated-view.repository.ts
async findByEmail(email: string): Promise<Either<Error, UserAggregatedView | null>> {
  const raw = await this.prisma.userIdentity.findFirst({
    where: { email, deletedAt: null },
    include: { profile: true, authorization: true },
  })
  if (!raw) return right(null)
  return right({
    identity: UserIdentityMapper.toDomain(raw),
    profile: UserProfileMapper.toDomain(raw.profile!),
    authorization: UserAuthorizationMapper.toDomain(raw.authorization!),
  })
}
```

> Padrão extraído do `revalida-italia-back`: evita N+1 em use cases de autenticação e qualquer operação que precise de contexto completo do usuário.

### 3.9 Validação de Ambiente — Zod Schema

Centralizada em `src/env/env.ts`, garante que a aplicação falhe imediatamente na inicialização se variáveis obrigatórias estiverem ausentes ou com tipo errado.

```typescript
// src/env/env.ts
import { z } from 'zod'

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string(),

  // JWT — suporte a arquivos ou strings inline
  JWT_PRIVATE_KEY: z.string().optional(),
  JWT_PUBLIC_KEY: z.string().optional(),
  JWT_PRIVATE_KEY_PATH: z.string().optional(),
  JWT_PUBLIC_KEY_PATH: z.string().optional(),

  // Sessão (HS256 para cookies de refresh)
  SESSION_JWT_SECRET: z.string().min(32),

  // CORS
  CORS_ORIGINS: z.string().default('http://localhost:3000'),

  // Rate limiting
  RATE_LIMIT_AUTH_MAX: z.coerce.number().default(5),
  RATE_LIMIT_AUTH_WINDOW_SECONDS: z.coerce.number().default(60),

  // Storage
  STORAGE_TYPE: z.enum(['local', 's3']).default('local'),
})

export type Env = z.infer<typeof envSchema>
```

Usado como `ConfigModule.forRoot({ validate: (config) => envSchema.parse(config) })` no `AppModule`.

### 3.11 Multi-tenancy

Estratégia: **Row-Level Tenancy com `tenantId` em todas as tabelas**.

- Cada request autenticado carrega o `tenantId` no JWT.
- Um `TenantGuard` global injeta o contexto de tenant em todas as queries.
- O Prisma middleware garante que todo acesso seja filtrado pelo `tenantId` — impossível vazar dados entre tenants.
- Dados do Reseller ficam em um tenant especial com role `RESELLER`.

### 3.12 Impersonation (Login como Cliente)

Fluxo:
1. Reseller chama `POST /auth/impersonate/:tenantId`.
2. `ImpersonationGuard` valida role `RESELLER`.
3. Gera JWT de curta duração (30min): `{ sub: resellerId, impersonating: tenantId, role: ACCOUNT_ADMIN }`.
4. Cria `UserSession` com `isImpersonation: true` e `impersonatorId`.
5. **Todo** acesso com esse token é gravado em `AuditLog` com `impersonated: true` (imutável — sem UPDATE/DELETE).
6. Encerrar via `POST /auth/impersonate/end` revoga a `UserSession`.

### 3.14 VO / Entity / Use Case — Separação de Responsabilidades

Regra explícita para não misturar as camadas:

| Onde | O que fica | O que **não** fica |
|------|-----------|-------------------|
| **Value Object** | Validação e encapsulamento do valor. Rejeita estados inválidos na construção. | Estado mutável, I/O, referência a outras entidades. |
| **Entity** | Invariantes do aggregate. Métodos que mudam estado interno (`lockAccount`, `verifyEmail`). | Regras que envolvam outros aggregates, I/O, acesso a repositório. |
| **Use Case** | Orquestração: chama VOs, entidades e repositórios em sequência. Retorna `Either`. | Lógica de validação de valor (vai no VO), decisões de negócio que envolvam apenas um aggregate (vai na Entity). |

**Exemplo concreto — onde fica cada regra:**

```typescript
// ✅ CORRETO — regra de formato de e-mail fica no VO
class Email {
  static create(raw: string): Email {
    if (!raw.includes('@')) throw new InvalidEmailError()      // ← regra aqui
    if (raw.length > 254) throw new InvalidEmailError()        // ← regra aqui
    return new Email(raw.toLowerCase())
  }
  // createTrusted() para dados vindos do banco — pula validação
  static createTrusted(raw: string): Email {
    return new Email(raw)
  }
}

// ✅ CORRETO — invariante do aggregate fica na entity
class UserIdentity {
  incrementFailedAttempts(): void {
    this.props.failedLoginAttempts += 1
    if (this.props.failedLoginAttempts >= 5) {   // ← invariante do aggregate
      this.lockAccount(15)
    }
  }
}

// ✅ CORRETO — use case só orquestra, não tem lógica de negócio própria
class AuthenticateUserUseCase {
  async execute(dto: AuthenticateUserDto): Promise<AuthenticateUserResult> {
    // 1. Valida input → delega ao VO
    const emailOrError = Email.create(dto.email)    // ← regra no VO
    if (emailOrError.isLeft()) return left(new InvalidCredentialsError())

    // 2. Busca dado → delega ao repositório
    const user = await this.userViewRepo.findByEmail(dto.email)
    if (!user) return left(new InvalidCredentialsError())

    // 3. Executa lógica → delega à entity
    if (user.identity.isLocked()) return left(new AccountLockedError())  // ← regra na entity

    const isValid = await user.identity.password.compare(dto.password)  // ← regra no VO
    if (!isValid) {
      user.identity.incrementFailedAttempts()   // ← invariante na entity
      await this.identityRepo.save(user.identity)
      return left(new InvalidCredentialsError())
    }

    // 4. Retorna resultado
    user.identity.resetFailedAttempts()
    await this.identityRepo.save(user.identity)
    return right({ accessToken: '...', refreshToken: '...' })
  }
}

// ❌ ERRADO — regra de negócio no use case
class CreateUserUseCase {
  async execute(dto) {
    if (!dto.email.includes('@')) return left(...)  // ← deveria estar no VO Email
    if (dto.password.length < 8) return left(...)   // ← deveria estar no VO Password
  }
}
```

### 3.15 Domain Service vs Use Case — Quando Usar

**Use Case** (`application/use-cases/`): operação que envolve um ou mais aggregates e repositórios para atender um único caso de uso da aplicação. Tem correspondência direta com um endpoint ou comando do sistema.

**Domain Service** (`application/services/`): lógica de negócio que **não pertence a nenhum aggregate específico** e opera sobre múltiplos aggregates ou envolve regras complexas que transcendem uma entity.

| Situação | Onde fica |
|----------|-----------|
| Verificar se e-mail já existe antes de criar usuário | Use Case (orquestra repo) |
| Validar complexidade de senha | Value Object `Password` |
| Calcular se tenant está dentro do limite do plano ao criar lead | **Domain Service** `PlanLimitService` |
| Gerar e enviar senha temporária para novo usuário | Use Case (orquestra VO + email service) |
| Consolidar regra de permissão que envolve role + plano + tenant | **Domain Service** `PermissionService` |

```typescript
// Domain Service — lógica que envolve dois aggregates (Tenant + Plan)
@Injectable()
export class PlanLimitService {
  canCreateLead(tenant: Tenant, plan: Plan, currentLeadCount: number): boolean {
    if (plan.maxLeads === -1) return true       // ilimitado
    return currentLeadCount < plan.maxLeads
  }

  canCreateUser(tenant: Tenant, plan: Plan, currentUserCount: number): boolean {
    return currentUserCount < plan.maxUsers
  }
}

// Use Case que usa o Domain Service
class CreateLeadUseCase {
  constructor(
    private planLimitService: PlanLimitService,
    private tenantRepo: ITenantRepository,
    private planRepo: IPlanRepository,
    private leadRepo: ILeadRepository,
  ) {}

  async execute(dto) {
    const tenant = await this.tenantRepo.findById(dto.tenantId)
    const plan = await this.planRepo.findById(tenant.planId)
    const count = await this.leadRepo.countByTenant(dto.tenantId)

    if (!this.planLimitService.canCreateLead(tenant, plan, count)) {
      return left(new PlanLimitExceededError('leads'))
    }
    // ...
  }
}
```

### 3.16 Mappers — Contrato e `createTrusted()`

**Regra crítica**: dados vindos do banco **já foram validados na escrita** — usar `createTrusted()` nos VOs ao reconstruir entidades, nunca `create()`. `create()` lança exceção se o valor for inválido; `createTrusted()` confia nos dados e pula validação.

```typescript
// infra/database/prisma/mappers/prisma-user-identity.mapper.ts
export class PrismaUserIdentityMapper {
  // Banco → Domain: usa createTrusted() — dados já validados na escrita
  static toDomain(raw: PrismaUserIdentity): UserIdentity {
    return UserIdentity.reconstitute(
      {
        tenantId: raw.tenantId,
        email: Email.createTrusted(raw.email),        // ← trusted: veio do banco
        password: Password.createFromHash(raw.passwordHash), // ← trusted: já é hash
        isEmailVerified: raw.isEmailVerified,
        failedLoginAttempts: raw.failedLoginAttempts,
        lockedUntil: raw.lockedUntil ?? undefined,
        deletedAt: raw.deletedAt ?? undefined,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      },
      new UniqueEntityID(raw.id),
    )
  }

  // Domain → Banco: extrai valores primitivos
  static toPersistence(entity: UserIdentity): Prisma.UserIdentityCreateInput {
    return {
      id: entity.id.toString(),
      tenantId: entity.tenantId,
      email: entity.email.value,
      passwordHash: entity.password.value,
      isEmailVerified: entity.isEmailVerified,
      failedLoginAttempts: entity.failedLoginAttempts,
      lockedUntil: entity.lockedUntil ?? null,
      deletedAt: entity.deletedAt ?? null,
    }
  }
}
```

**Dois métodos estáticos na Entity:**
- `Entity.create()` — para criação nova (dispara domain events, valida estado inicial)
- `Entity.reconstitute()` — para reconstrução do banco (sem domain events, sem validação duplicada)

### 3.17 Error Mappings — Domínio → HTTP (RFC 7807)

O `GlobalExceptionFilter` em `infra/filters/` captura todos os erros e os mapeia para respostas padronizadas RFC 7807 (Problem Details).

```typescript
// infra/filters/error-mappings/domain-error.mapping.ts
export const domainErrorMapping: Record<string, { status: number; title: string }> = {
  InvalidCredentialsError:    { status: 401, title: 'Invalid credentials' },
  AccountLockedError:         { status: 403, title: 'Account temporarily locked' },
  UserAlreadyExistsError:     { status: 409, title: 'Email already registered' },
  WeakPasswordError:          { status: 422, title: 'Password does not meet requirements' },
  TenantNotFoundError:        { status: 404, title: 'Tenant not found' },
  PlanLimitExceededError:     { status: 422, title: 'Plan limit exceeded' },
  UnauthorizedError:          { status: 403, title: 'Insufficient permissions' },
}

// infra/filters/http-exception.filter.ts
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    if (exception instanceof DomainError) {
      const mapping = domainErrorMapping[exception.constructor.name]
      return response.status(mapping?.status ?? 500).json({
        type: `https://errors.wb-kommo.com/${exception.constructor.name}`,
        title: mapping?.title ?? 'Internal Server Error',
        status: mapping?.status ?? 500,
        detail: exception.message,
        traceId: request.headers['x-trace-id'],
        timestamp: new Date().toISOString(),
      })
    }
    // ... trata outros tipos de exceção
  }
}
```

**No controller — responsabilidade zero de mapeamento:**
```typescript
@Post()
async create(@Body() dto: CreateUserDto, @CurrentUser() actor: JwtPayload) {
  const result = await this.createUserUseCase.execute(dto, actor.tenantId)

  if (result.isLeft()) throw result.value   // ← lança o DomainError, filter mapeia
  return UserPresenter.toHttp(result.value) // ← controller só apresenta o sucesso
}
```

### 3.13 Autenticação

- Access Token (JWT, 15min) + Refresh Token (7 dias, httpOnly cookie).
- Refresh Token: hash SHA256 armazenado na `UserSession` — token raw nunca persiste.
- Guards: `JwtAuthGuard`, `RolesGuard`, `TenantGuard`, `ImpersonationGuard`.
- Rate limiting no login: 5 tentativas/minuto → bloqueia conta por 15min.
- Bloqueio de conta rastreado no `UserIdentity` (`failedLoginAttempts`, `lockedUntil`).

---

## 4. Banco de Dados — PostgreSQL + Prisma

### 4.1 Schema Prisma (módulo users)

```prisma
model UserIdentity {
  id                        String    @id @default(uuid())
  tenantId                  String
  email                     String
  passwordHash              String
  isEmailVerified           Boolean   @default(false)
  emailVerificationToken    String?
  passwordResetToken        String?
  passwordResetExpiresAt    DateTime?
  failedLoginAttempts       Int       @default(0)
  lockedUntil               DateTime?
  lastLoginAt               DateTime?
  deletedAt                 DateTime?
  createdAt                 DateTime  @default(now())
  updatedAt                 DateTime  @updatedAt

  tenant        Tenant           @relation(fields: [tenantId], references: [id])
  profile       UserProfile?
  authorization UserAuthorization?
  sessions      UserSession[]

  @@unique([tenantId, email])
  @@index([tenantId])
  @@index([emailVerificationToken])
  @@index([passwordResetToken])
}

model UserProfile {
  id         String    @id @default(uuid())
  tenantId   String
  identityId String    @unique
  name       String
  avatarUrl  String?
  phone      String?
  timezone   String    @default("America/Sao_Paulo")
  language   String    @default("pt-BR")
  deletedAt  DateTime?
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  identity  UserIdentity @relation(fields: [identityId], references: [id])
  tenant    Tenant       @relation(fields: [tenantId], references: [id])

  @@index([tenantId])
}

model UserAuthorization {
  id                String    @id @default(uuid())
  tenantId          String
  identityId        String    @unique
  role              RoleType  @default(MEMBER)
  customPermissions Json      @default("[]")
  restrictions      Json      @default("[]")
  effectiveFrom     DateTime  @default(now())
  effectiveUntil    DateTime?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  identity UserIdentity @relation(fields: [identityId], references: [id])
  tenant   Tenant       @relation(fields: [tenantId], references: [id])

  @@index([tenantId, role])
}

model UserSession {
  id              String    @id @default(uuid())
  tenantId        String
  identityId      String
  refreshTokenHash String
  ipAddress       String?
  userAgent       String?
  isImpersonation Boolean   @default(false)
  impersonatorId  String?
  expiresAt       DateTime
  revokedAt       DateTime?
  createdAt       DateTime  @default(now())

  identity UserIdentity @relation(fields: [identityId], references: [id])

  @@index([tenantId, identityId])
  @@index([refreshTokenHash])
}

model Tenant {
  id          String   @id @default(uuid())
  name        String
  slug        String   @unique
  planId      String
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  plan        Plan     @relation(fields: [planId], references: [id])
  identities  UserIdentity[]
  profiles    UserProfile[]
  authorizations UserAuthorization[]
  leads       Lead[]
  pipelines   Pipeline[]
}

model Plan {
  id        String   @id @default(uuid())
  name      String   // Starter | Pro | Enterprise
  maxUsers  Int
  maxLeads  Int
  price     Decimal
  features  Json
  tenants   Tenant[]
}

model Lead {
  id           String     @id @default(uuid())
  tenantId     String
  pipelineId   String
  stageId      String
  name         String
  value        Decimal?
  status       LeadStatus @default(OPEN)
  assignedToId String?
  customFields Json?
  tags         String[]   @default([])
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
  deletedAt    DateTime?

  tenant     Tenant     @relation(fields: [tenantId], references: [id])
  pipeline   Pipeline   @relation(fields: [pipelineId], references: [id])
  stage      Stage      @relation(fields: [stageId], references: [id])
  contacts   Contact[]
  activities Activity[]

  @@index([tenantId, status])
  @@index([tenantId, pipelineId])
  @@index([tenantId, stageId])
}

model Pipeline {
  id       String  @id @default(uuid())
  tenantId String
  name     String
  isActive Boolean @default(true)
  stages   Stage[]
  leads    Lead[]
  tenant   Tenant  @relation(fields: [tenantId], references: [id])

  @@index([tenantId])
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

  @@index([tenantId])
}

model Activity {
  id        String       @id @default(uuid())
  tenantId  String
  leadId    String
  userId    String
  type      ActivityType
  content   String
  dueDate   DateTime?
  completed Boolean      @default(false)
  createdAt DateTime     @default(now())
  lead      Lead         @relation(fields: [leadId], references: [id])

  @@index([tenantId, leadId])
}

model AuditLog {
  id             String   @id @default(uuid())
  tenantId       String
  userId         String
  action         String
  entity         String
  entityId       String
  payload        Json?
  impersonated   Boolean  @default(false)
  impersonatorId String?
  createdAt      DateTime @default(now())

  @@index([tenantId, createdAt])
  @@index([impersonated])
}

enum RoleType {
  RESELLER
  ACCOUNT_ADMIN
  MEMBER
}

enum LeadStatus {
  OPEN
  WON
  LOST
}

enum ActivityType {
  NOTE
  CALL
  EMAIL
  TASK
  MEETING
}
```

### 4.2 Migrations & Seeds

- Migrations versionadas via `prisma migrate`.
- Seeds separados: `seed.ts` (dev) e `seed.production.ts` (dados mínimos: planos + reseller).

---

## 5. Infraestrutura — Docker Compose

```yaml
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

  bull-board:
    image: deadly0/bull-board
    ports: ["3002:3000"]
    depends_on: [redis]

volumes:
  postgres_data:
```

| Serviço | Uso |
|---------|-----|
| PostgreSQL 16 | Banco de dados principal |
| Redis 7 | Cache, sessões, filas de jobs (Bull) |
| Bull Queue | Processamento assíncrono (emails, webhooks, automações) |
| WebSocket (Socket.io) | Notificações em tempo real |

---

## 6. Estratégia de Testes — TDD First

### 6.1 Metodologia — TDD (Test-Driven Development)

Todo código de backend é escrito seguindo o ciclo **Red → Green → Refactor**, sem exceções:

```
1. RED    — escreve o teste que falha (especifica o comportamento desejado)
2. GREEN  — escreve o mínimo de código para o teste passar
3. REFACTOR — melhora o código sem quebrar os testes
```

**Regras do processo:**

- Nenhum código de produção é escrito sem um teste falhando antes.
- O teste descreve a **intenção de negócio**, não a implementação interna.
- Use cases são o ponto de entrada do TDD — o teste do use case guia o design das entidades e value objects.
- Value Objects e Domain Entities são desenvolvidos TDD puro (unitários com in-memory repos).
- Repositórios Prisma são desenvolvidos TDD com testes de integração (testcontainers).
- Controllers são desenvolvidos TDD com dois tipos de teste: unitário (mock do use case, verifica mapeamento de erros e HTTP status) e E2E (fluxo completo com banco real).

**Exemplo de ciclo TDD — `CreateLeadUseCase`:**

```typescript
// PASSO 1 — RED: escreve o teste antes de qualquer implementação
it('should create a lead and assign it to the first stage of the pipeline', async () => {
  // Arrange
  const pipeline = makePipeline({ tenantId: 'tenant-1' })
  const stage = makeStage({ pipelineId: pipeline.id, order: 1 })
  pipelineRepo.items.push(pipeline)
  stageRepo.items.push(stage)

  // Act
  const result = await sut.execute({
    tenantId: 'tenant-1',
    pipelineId: pipeline.id,
    name: 'Acme Corp',
    value: 5000,
  })

  // Assert
  expect(result.isRight()).toBe(true)
  expect(leadRepo.items).toHaveLength(1)
  expect(leadRepo.items[0].stageId).toBe(stage.id)
})

// PASSO 2 — GREEN: implementa o mínimo para passar
// PASSO 3 — REFACTOR: melhora sem quebrar
```

**Factories de teste** para criar agregados válidos sem repetição:

```typescript
// src/test/factories/make-lead.ts
export function makeLead(override: Partial<LeadProps> = {}): Lead {
  return Lead.create({
    tenantId: 'tenant-1',
    pipelineId: 'pipeline-1',
    stageId: 'stage-1',
    name: 'Test Lead',
    status: LeadStatus.OPEN,
    ...override,
  })
}
```

### 6.2 Ferramentas

| Camada | Ferramenta | Motivo |
|--------|-----------|--------|
| Unitários + Integração | **Vitest** | Nativo ESM, watch ultra-rápido, API compatível com Jest, sem config extra para TypeScript |
| E2E HTTP | **Supertest** + **@nestjs/testing** | Sobe o módulo NestJS sem porta, requisições HTTP reais |
| Banco integração | **Testcontainers** (`@testcontainers/postgresql`) | PostgreSQL real e isolado por suite |
| Cobertura | **@vitest/coverage-v8** | Cobertura via V8 nativo, sem Istanbul |

### 6.3 Configuração Vitest

```typescript
// vitest.config.ts (backend)
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,                     // describe/it/expect sem import
    root: './src',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 80,
      },
      include: ['src/modules/**/domain/**', 'src/modules/**/application/**'],
      exclude: ['**/*.dto.ts', '**/*.module.ts', '**/index.ts'],
    },
    // Projetos separados para isolar configs por camada
    projects: [
      {
        name: 'unit',
        test: {
          include: ['**/__tests__/unit/**/*.spec.ts'],
          environment: 'node',
        },
      },
      {
        name: 'integration',
        test: {
          include: ['**/__tests__/integration/**/*.spec.ts'],
          environment: 'node',
          testTimeout: 30_000,      // testcontainers é mais lento
          hookTimeout: 60_000,
          pool: 'forks',            // processos isolados — cada suite tem seu container
          poolOptions: { forks: { singleFork: true } },
        },
      },
      {
        name: 'e2e',
        test: {
          include: ['test/**/*.e2e-spec.ts'],
          environment: 'node',
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
})
```

Scripts no `package.json`:
```json
{
  "scripts": {
    "test":            "vitest run --project=unit",
    "test:watch":      "vitest --project=unit",
    "test:integration":"vitest run --project=integration",
    "test:e2e":        "vitest run --project=e2e",
    "test:all":        "vitest run",
    "test:cov":        "vitest run --coverage"
  }
}
```

### 6.4 Pirâmide de Testes

```
         /\
        /E2E\         ← ~10% — Supertest + @nestjs/testing, todas as rotas
       /------\
      /Integração\    ← ~20% — Repositórios Prisma com testcontainers
     /------------\
    /  Unitários   \  ← ~70% — Use Cases (in-memory repos) + Controllers (mock use case)
   /________________\        + Value Objects + Domain Services
```

| Tipo | O que testa | Isolamento |
|------|------------|-----------|
| Unitário — Use Case | Regras de negócio, fluxos do domínio | In-memory repos, sem banco |
| Unitário — Controller | Mapeamento de erros → HTTP status, extração de dados do request | Mock do use case |
| Unitário — VO/Entity | Validações, invariantes | Sem deps externas |
| Integração | Repositórios Prisma vs banco real | Testcontainers PostgreSQL |
| E2E | Todas as rotas ponta a ponta | AppModule completo + banco real |

### 6.5 Testes Unitários — In-Memory Repositories

Repositórios in-memory implementam a mesma interface dos repositórios Prisma. Use cases testados com 100% de isolamento, sem banco, sem I/O.

```typescript
// src/test/repositories/in-memory-user-identity.repository.ts
export class InMemoryUserIdentityRepository implements IUserIdentityRepository {
  public items: UserIdentity[] = []

  async findByEmail(email: Email): Promise<UserIdentity | null> {
    return this.items.find(
      u => u.email.equals(email) && !u.deletedAt
    ) ?? null
  }

  async emailExists(email: Email): Promise<boolean> {
    return this.items.some(u => u.email.equals(email) && !u.deletedAt)
  }

  async save(identity: UserIdentity): Promise<void> {
    const idx = this.items.findIndex(u => u.id === identity.id)
    if (idx >= 0) this.items[idx] = identity
    else this.items.push(identity)
  }
}
```

```typescript
// __tests__/unit/create-user.use-case.spec.ts
import { describe, it, expect, beforeEach } from 'vitest'

describe('CreateUserUseCase', () => {
  let sut: CreateUserUseCase
  let identityRepo: InMemoryUserIdentityRepository
  let profileRepo: InMemoryUserProfileRepository

  beforeEach(() => {
    identityRepo = new InMemoryUserIdentityRepository()
    profileRepo = new InMemoryUserProfileRepository()
    sut = new CreateUserUseCase(identityRepo, profileRepo)
  })

  it('should return error if email already exists', async () => {
    await sut.execute({ email: 'a@b.com', name: 'Test', tenantId: 't1', password: 'P@ss1234' })
    const result = await sut.execute({ email: 'a@b.com', name: 'Test', tenantId: 't1', password: 'P@ss1234' })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(UserAlreadyExistsError)
  })
})
```

### 6.6 Testes Unitários de Controller

Controllers têm lógica específica que precisa de teste isolado: mapeamento correto de erros de domínio → HTTP status, extração de dados do `@CurrentUser()` / `@Param()`, e chamada correta ao use case. O use case é **mockado** — o objetivo é testar o controller, não o use case.

```typescript
// infra/http/controllers/users.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing'
import { vi, describe, it, expect, beforeEach } from 'vitest'

describe('UsersController', () => {
  let controller: UsersController
  let createUserUseCase: { execute: ReturnType<typeof vi.fn> }

  beforeEach(async () => {
    createUserUseCase = { execute: vi.fn() }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: CreateUserUseCase, useValue: createUserUseCase },
      ],
    }).compile()

    controller = module.get(UsersController)
  })

  it('should return 201 with user data on success', async () => {
    createUserUseCase.execute.mockResolvedValue(
      right({ id: 'user-1', name: 'John', email: 'john@test.com' })
    )

    const result = await controller.create(
      { name: 'John', email: 'john@test.com', password: 'P@ss1234' },
      { tenantId: 'tenant-1', role: 'ACCOUNT_ADMIN' },
    )

    expect(result).toEqual({ id: 'user-1', name: 'John', email: 'john@test.com' })
  })

  it('should throw DomainError when use case returns Left', async () => {
    createUserUseCase.execute.mockResolvedValue(
      left(new UserAlreadyExistsError())
    )

    await expect(
      controller.create(
        { name: 'John', email: 'existing@test.com', password: 'P@ss1234' },
        { tenantId: 'tenant-1', role: 'ACCOUNT_ADMIN' },
      )
    ).rejects.toBeInstanceOf(UserAlreadyExistsError)
    // GlobalExceptionFilter mapeia UserAlreadyExistsError → 409
  })

  it('should pass tenantId from JWT to use case', async () => {
    createUserUseCase.execute.mockResolvedValue(right({ id: 'user-1' }))

    await controller.create(
      { name: 'John', email: 'john@test.com', password: 'P@ss1234' },
      { tenantId: 'tenant-abc', role: 'ACCOUNT_ADMIN' },
    )

    expect(createUserUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-abc' })
    )
  })
})
```

**O que testar no controller unitário:**
- Retorno correto no caminho feliz
- `throw result.value` quando `isLeft()` (verifica que o error chega ao filter)
- Dados extraídos corretamente do request (`@Param`, `@Body`, `@CurrentUser`)
- Que o use case foi chamado com os parâmetros corretos

**O que NÃO testar no controller unitário:**
- Regra de negócio (está no use case)
- HTTP status code final (será testado no E2E com o filter ativo)
- Autenticação/guards (serão testados no E2E)

### 6.7 Testes de Integração — Prisma + Testcontainers

```typescript
// __tests__/integration/prisma-user-identity.repository.spec.ts
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql'

describe('PrismaUserIdentityRepository', () => {
  let container: StartedPostgreSqlContainer
  let prisma: PrismaClient
  let repo: PrismaUserIdentityRepository

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start()
    prisma = new PrismaClient({ datasources: { db: { url: container.getConnectionUri() } } })
    await execSync('prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: container.getConnectionUri() },
    })
    repo = new PrismaUserIdentityRepository(prisma)
  })

  afterAll(async () => {
    await prisma.$disconnect()
    await container.stop()
  })

  afterEach(async () => {
    await prisma.userIdentity.deleteMany()
  })

  it('should find by email excluding soft-deleted records', async () => {
    // ...
  })
})
```

### 6.8 Testes E2E — Supertest + @nestjs/testing

#### setup-e2e.ts — Schema PostgreSQL isolado por suite

Cada suite E2E recebe um schema PostgreSQL exclusivo (`test_{uuid}`). Isso permite rodar todas as suites em paralelo sem interferência.

```typescript
// test/setup-e2e.ts
import { execSync } from 'child_process'
import { randomUUID } from 'crypto'
import { PrismaClient } from '@prisma/client'

const schemaId = randomUUID()
const schemaUrl = `${process.env.DATABASE_URL}?schema=${schemaId}`

beforeAll(async () => {
  // Cria schema isolado e roda migrations
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: schemaUrl },
  })
  process.env.DATABASE_URL = schemaUrl
})

afterAll(async () => {
  // Dropa o schema ao final para não acumular lixo
  const prisma = new PrismaClient({ datasources: { db: { url: schemaUrl } } })
  await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaId}" CASCADE`)
  await prisma.$disconnect()
})
```

#### Exemplo de suite E2E

```typescript
// test/e2e/auth/login.e2e-spec.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Test } from '@nestjs/testing'
import * as request from 'supertest'

describe('Auth — POST /auth/login (e2e)', () => {
  let app: INestApplication

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = module.createNestApplication()
    app.useGlobalFilters(new GlobalExceptionFilter())  // ← ativa o filter para testar HTTP status
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }))
    await app.init()
  })

  afterAll(() => app.close())

  it('POST /auth/login → 200 com credenciais válidas', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'reseller@wb.com', password: 'P@ss1234' })
      .expect(200)
      .expect(res => {
        expect(res.body).toHaveProperty('accessToken')
        expect(res.body).not.toHaveProperty('password')
      })
  })

  it('POST /auth/login → 401 com senha errada', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'reseller@wb.com', password: 'wrong' })
      .expect(401)
      .expect(res => {
        expect(res.body.type).toContain('InvalidCredentialsError')
        expect(res.body).toHaveProperty('traceId')
      })
  })

  it('POST /auth/impersonate/:tenantId → 403 para não-reseller', async () => {
    // ...
  })
})
```

**Cobertura mínima de E2E por domínio:**

| Domínio | Rotas obrigatórias |
|---------|-------------------|
| auth | login, logout, refresh, impersonate, impersonate/end |
| users | create (reseller), create (admin), list, get, update, delete |
| tenants | create, list, get, update |
| leads | create, list, get, update, move-stage, delete |
| pipelines | create, list, get, update, stages CRUD |
| activities | create, list, complete |

---

## 7. Frontend — Next.js 15 (App Router)

### 7.1 Stack

| Tecnologia | Uso |
|-----------|-----|
| Next.js 15 (App Router) | Framework principal, RSC |
| TypeScript | Tipagem forte |
| **next-intl** | Internacionalização (pt, en, it, es) — RSC-first, mensagens tipadas |
| Tailwind CSS 4 | Estilização utility-first |
| Framer Motion | Animações suaves (drag & drop, transições) |
| shadcn/ui | Componentes base acessíveis |
| Zustand | Estado global leve |
| TanStack Query v5 | Server state, cache, revalidação |
| TanStack Table | Tabelas avançadas de leads |
| React Hook Form + Zod | Formulários e validação |
| Socket.io Client | Notificações em tempo real |
| @dnd-kit | Drag & drop no Kanban |

### 7.2 Internacionalização — next-intl

**Idiomas suportados:** `pt` (padrão), `en`, `it`, `es`

#### Roteamento

next-intl com **localização no path** (`/pt/...`, `/en/...`, etc.) via middleware. O locale padrão (`pt`) pode ser configurado com ou sem prefixo dependendo da preferência.

```
src/
├── i18n/
│   ├── routing.ts            # defineRouting com locales e defaultLocale
│   ├── request.ts            # getRequestConfig — carrega mensagens por locale
│   └── navigation.ts         # Link, redirect, useRouter tipados com locale
├── messages/
│   ├── pt.json
│   ├── en.json
│   ├── it.json
│   └── es.json
└── middleware.ts             # createMiddleware(routing) — detecta e redireciona locale
```

#### Configuração de roteamento

```typescript
// src/i18n/routing.ts
import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['pt', 'en', 'it', 'es'],
  defaultLocale: 'pt',
  localePrefix: 'as-needed',   // /pt omitido, /en /it /es explícitos
})
```

```typescript
// src/i18n/request.ts
import { getRequestConfig } from 'next-intl/server'
import { routing } from './routing'

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = (await requestLocale) ?? routing.defaultLocale
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
```

```typescript
// src/middleware.ts
import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

export default createMiddleware(routing)

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
```

#### Estrutura de mensagens

```json
// messages/pt.json
{
  "common": {
    "save": "Salvar",
    "cancel": "Cancelar",
    "delete": "Excluir",
    "loading": "Carregando...",
    "noResults": "Nenhum resultado encontrado"
  },
  "auth": {
    "login": "Entrar",
    "logout": "Sair",
    "email": "E-mail",
    "password": "Senha",
    "forgotPassword": "Esqueceu a senha?"
  },
  "leads": {
    "title": "Leads",
    "newLead": "Novo Lead",
    "status": {
      "open": "Aberto",
      "won": "Ganho",
      "lost": "Perdido"
    }
  },
  "pipeline": {
    "title": "Pipeline",
    "stage": "Estágio",
    "moveToStage": "Mover para {stage}"
  },
  "impersonation": {
    "banner": "Visualizando como: {clientName}",
    "exit": "Sair da visualização"
  }
}
```

#### Uso em Server Components (RSC)

```typescript
// app/[locale]/(workspace)/leads/page.tsx
import { getTranslations } from 'next-intl/server'

export default async function LeadsPage() {
  const t = await getTranslations('leads')
  return <h1>{t('title')}</h1>
}
```

#### Uso em Client Components

```typescript
'use client'
import { useTranslations } from 'next-intl'

export function LeadCard({ lead }: { lead: Lead }) {
  const t = useTranslations('leads')
  return <span>{t('status.open')}</span>
}
```

#### Type-safety das mensagens

```typescript
// Geração automática de tipos a partir das mensagens
// next-intl infere os tipos de messages/pt.json como fonte da verdade
// t('leads.nonExistent') → erro de TypeScript em tempo de desenvolvimento
```

#### Seletor de idioma no Header

- Dropdown com bandeiras/nomes dos idiomas.
- Troca de locale via `useRouter` + `usePathname` do `next-intl/navigation`.
- Preferência persistida em cookie (lida pelo middleware para redirect automático).
- Locale do usuário também sincronizado com o campo `language` do `UserProfile` no backend.

### 7.3 Estrutura de Pastas (com i18n)

```
frontend/src/
├── app/
│   └── [locale]/                 # Segmento dinâmico de locale
│       ├── layout.tsx            # NextIntlClientProvider aqui
│       ├── (auth)/
│       │   ├── login/page.tsx
│       │   └── layout.tsx
│       ├── (reseller)/
│       │   ├── dashboard/page.tsx
│       │   ├── clients/page.tsx
│       │   ├── clients/[id]/page.tsx
│       │   └── layout.tsx
│       └── (workspace)/
│           ├── leads/page.tsx
│           ├── pipeline/[id]/page.tsx
│           ├── contacts/page.tsx
│           ├── activities/page.tsx
│           ├── settings/
│           └── layout.tsx
├── i18n/
│   ├── routing.ts
│   ├── request.ts
│   └── navigation.ts             # Link/redirect/useRouter tipados
├── messages/
│   ├── pt.json                   # Fonte da verdade (tipos gerados a partir daqui)
│   ├── en.json
│   ├── it.json
│   └── es.json
├── components/
│   ├── ui/
│   ├── layout/
│   │   └── locale-switcher.tsx   # Seletor de idioma
│   ├── kanban/
│   ├── lead/
│   └── shared/
├── features/
│   ├── auth/
│   ├── leads/
│   ├── pipeline/
│   └── tenants/
├── lib/
│   ├── api/
│   ├── hooks/
│   ├── stores/
│   └── utils/
├── middleware.ts
└── styles/
    └── globals.css
```

### 7.3 Impersonation no Frontend

- Header exibe banner `"Visualizando como: [Nome do Cliente]"` com botão de sair.
- Token de impersonation armazenado separado do token principal (sessionStorage).
- Rota `/reseller/clients/[id]/impersonate` aciona o fluxo.
- Encerrar retorna ao token original do reseller.

### 7.4 UI/UX — Inspiração Kommo

- **Kanban de Pipeline**: colunas com cards de leads arrastáveis (dnd-kit), animações de transição (Framer Motion).
- **Lead Detail**: painel lateral (slide-over) com timeline de atividades, contatos, valor, tags.
- **Sidebar**: colapsável, ícones com tooltips, destaque por rota ativa.
- **Animações**: page transitions com `AnimatePresence`, skeleton loaders, hover states suaves.
- **Paleta**: tons escuros neutros (#1a1a2e, #16213e) com accent azul/roxo vibrante.

---

## 8. Fluxos de Negócio Críticos

### 8.1 Cadastro de Cliente (Tenant)
```
Reseller → POST /tenants
  → Cria Tenant + UserIdentity + UserProfile + UserAuthorization (role: ACCOUNT_ADMIN)
  → Associa Plano (verifica limites)
  → Cria Pipeline padrão
  → Envia email de boas-vindas com senha temporária (Password.generate())
  → Grava AuditLog
```

### 8.2 Criação de Usuários (por RESELLER ou ACCOUNT_ADMIN)

```
# RESELLER criando usuário em qualquer tenant
RESELLER → POST /tenants/:tenantId/users
  → RolesGuard: exige RESELLER
  → Verifica limite do plano (maxUsers)
  → Cria UserIdentity + UserProfile + UserAuthorization (role: MEMBER ou ACCOUNT_ADMIN)
  → Envia email com senha temporária
  → Grava AuditLog

# ACCOUNT_ADMIN criando usuário no próprio tenant
ACCOUNT_ADMIN → POST /users
  → RolesGuard: exige RESELLER | ACCOUNT_ADMIN
  → TenantGuard: força tenantId do JWT (não pode criar em outro tenant)
  → Verifica limite do plano (maxUsers)
  → Cria UserIdentity + UserProfile + UserAuthorization (role: MEMBER)
  → Envia email com senha temporária
  → Grava AuditLog
```

**Rotas de gestão de usuários:**

| Método | Rota | Guard | Descrição |
|--------|------|-------|-----------|
| `POST` | `/tenants/:tenantId/users` | `RESELLER` | Reseller cria usuário em qualquer tenant |
| `POST` | `/users` | `RESELLER \| ACCOUNT_ADMIN` | Cria usuário no próprio tenant |
| `GET` | `/users` | `RESELLER \| ACCOUNT_ADMIN` | Lista usuários do tenant |
| `GET` | `/users/:id` | `RESELLER \| ACCOUNT_ADMIN` | Detalhes de um usuário |
| `PATCH` | `/users/:id` | `RESELLER \| ACCOUNT_ADMIN` | Atualiza perfil/role |
| `DELETE` | `/users/:id` | `RESELLER \| ACCOUNT_ADMIN` | Desativa usuário (soft delete) |

### 8.3 Gestão de Leads
```
Lead criado → Stage inicial do Pipeline
  → Movimentação via drag & drop (Kanban) → PATCH /leads/:id/stage
  → Atividades registradas na timeline
  → Automações disparam assincronamente (Bull Queue)
  → Lead pode ser ganho (WON) ou perdido (LOST)
```

### 8.4 Impersonation
```
Reseller → POST /auth/impersonate/:tenantId
  → Valida role RESELLER
  → Gera impersonation JWT (30min) + cria UserSession (isImpersonation: true)
  → Frontend: troca token, exibe banner
  → Toda ação: AuditLog com impersonated: true + impersonatorId
  → POST /auth/impersonate/end → revoga UserSession, restaura token reseller
```

---

## 9. Segurança

- Senhas com bcryptjs (salt rounds 12).
- Rate limiting: `@nestjs/throttler` (5 tentativas de login/minuto).
- Bloqueio de conta: `UserIdentity.lockAccount()` após 5 falhas consecutivas.
- CORS configurado para domínios específicos.
- Helmet para headers HTTP seguros.
- Impersonation: sempre logado, `AuditLog` imutável (sem DELETE/UPDATE).
- Refresh Token: apenas hash SHA256 persiste — raw token nunca no banco.
- Queries sempre filtradas por `tenantId` — isolamento garantido por middleware Prisma.
- Input validado com `class-validator` + `class-transformer` em todos os DTOs.
- Either Pattern: erros de domínio nunca escapam como exceções inesperadas.

---

## 10. Decisões de Arquitetura — ADRs

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| Multi-tenancy | Row-level (tenantId) | Simples, adequado para início. Schema-per-tenant pode ser adotado depois se necessário. |
| User aggregate | Split em 3 (Identity/Profile/Authorization) | Separação de responsabilidades, cada aggregate evolui independente. |
| Error handling | Either Pattern | Erros são valores tipados — sem throws não controlados, fácil de testar. |
| Metodologia | **TDD** (Red → Green → Refactor) | Nenhum código de produção sem teste falhando antes — garante design guiado pelo comportamento. |
| Test runner | **Vitest** | Nativo ESM/TS, watch ultrarrápido, sem config extra, API compatível com Jest. |
| Testes unitários | In-memory repositories | Zero I/O, rápidos, sem acoplamento ao Prisma. |
| Testes integração | Testcontainers (PostgreSQL real) | Evita divergência entre mocks e banco real. |
| ORM | Prisma | DX excelente, type-safety, migrations confiáveis. |
| Cache/Filas | Redis + Bull | Sessões, rate limiting, processamento assíncrono. |
| Auth | JWT (15min) + Refresh httpOnly (7d) | Seguro, stateless, compatível com SSR Next.js. |
| Refresh Token storage | Hash SHA256 no banco | Token raw nunca persiste — mitigação de vazamento de banco. |
| i18n | next-intl (`[locale]` segment) | RSC-first, mensagens tipadas, middleware de detecção automática, suporte a `pt`, `en`, `it`, `es`. |
| State frontend | Zustand + TanStack Query | Zustand para UI, TanStack Query para server state — separação clara. |

---

## 11. Roadmap de Implementação

### Fase 1 — Fundação (Semanas 1-3)
- [ ] Setup Docker Compose + PostgreSQL + Redis
- [ ] Setup NestJS com estrutura DDD base + Either Pattern
- [ ] Schema Prisma inicial + migrations
- [ ] Módulo Auth: UserIdentity, UserProfile, UserAuthorization
- [ ] Value Objects: Email, Password, UserRole, SessionToken
- [ ] In-memory repositories para testes
- [ ] Use cases: CreateUser, AuthenticateUser, RefreshToken
- [ ] Impersonation: ImpersonateUseCase + UserSession
- [ ] Setup Vitest (unit + integration + e2e)
- [ ] Setup Next.js + Tailwind + shadcn
- [ ] Telas de Login e Dashboard base

### Fase 2 — Core CRM (Semanas 4-7)
- [ ] Módulo Leads + Pipelines + Stages
- [ ] Módulo Activities + Contacts
- [ ] Kanban board com drag & drop
- [ ] Lead detail slide-over com timeline
- [ ] Filtros e busca (Criteria Pattern nos leads)
- [ ] Testes unitários + integração do core

### Fase 3 — SaaS Features (Semanas 8-11)
- [ ] Módulo Plans + limites por plano
- [ ] Painel Reseller (gestão de clientes)
- [ ] Impersonation completo no frontend (banner, troca de token)
- [ ] Módulo Automations (regras de pipeline via Bull)
- [ ] Notificações em tempo real (Socket.io)
- [ ] Módulo Integrations (webhooks outbound)
- [ ] AuditLog UI para reseller
- [ ] Testes e2e dos fluxos SaaS

### Fase 4 — Polimento (Semanas 12-14)
- [ ] Animações e UX refinados (Framer Motion)
- [ ] Performance (query optimization, caching Redis)
- [ ] Logs estruturados + health checks
- [ ] Documentação da API (Swagger/OpenAPI)
- [ ] CI/CD básico
- [ ] Cobertura de testes ≥ 85%

---

*Versão 1.6 — atualizado em 2026-04-07: erros tipados em `use-cases/errors/`, separação VO/Entity/UseCase, Domain Service vs Use Case, contrato de mappers com `createTrusted()`, error-mappings RFC 7807, testes unitários de controller, setup-e2e.ts com schema PostgreSQL isolado, pirâmide de testes revisada.*
