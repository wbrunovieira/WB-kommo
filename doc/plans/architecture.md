# WB-Kommo — CRM SaaS: Documento de Arquitetura

> Versão 1.1 — 2026-04-06

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

### 3.3 Estrutura Interna de cada Módulo (DDD)

```
modules/users/
├── domain/
│   ├── entities/
│   │   ├── user-identity.entity.ts      # Auth: email, password, tokens, bloqueio
│   │   ├── user-profile.entity.ts       # Dados pessoais: nome, avatar, timezone
│   │   └── user-authorization.entity.ts # Roles e permissões granulares
│   ├── value-objects/
│   │   ├── email.vo.ts
│   │   ├── password.vo.ts
│   │   ├── user-role.vo.ts
│   │   └── session-token.vo.ts
│   ├── events/
│   │   ├── user-created.event.ts
│   │   └── user-impersonated.event.ts
│   ├── repositories/
│   │   ├── i-user-identity.repository.ts
│   │   ├── i-user-profile.repository.ts
│   │   └── i-user-authorization.repository.ts
│   └── errors/
│       ├── user-not-found.error.ts
│       └── invalid-credentials.error.ts
├── application/
│   ├── use-cases/
│   │   ├── create-user.use-case.ts
│   │   ├── authenticate-user.use-case.ts
│   │   └── impersonate-tenant.use-case.ts
│   ├── dtos/
│   │   ├── create-user.dto.ts
│   │   └── user-response.dto.ts
│   ├── mappers/
│   │   ├── user-identity.mapper.ts
│   │   ├── user-profile.mapper.ts
│   │   └── user-authorization.mapper.ts
│   └── criteria/
│       └── user-profile.criteria.ts     # Fluent query builder
├── infrastructure/
│   ├── repositories/
│   │   ├── prisma-user-identity.repository.ts
│   │   ├── prisma-user-profile.repository.ts
│   │   └── prisma-user-authorization.repository.ts
│   └── test/
│       ├── in-memory-user-identity.repository.ts
│       ├── in-memory-user-profile.repository.ts
│       └── in-memory-user-authorization.repository.ts
├── presentation/
│   ├── users.controller.ts
│   └── users.module.ts
└── __tests__/
    ├── unit/
    ├── integration/
    └── e2e/
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

  // Permissões implícitas por role
  canManageAllTenants(): boolean    // apenas RESELLER
  canImpersonate(): boolean         // apenas RESELLER
  canManageUsers(): boolean         // RESELLER | ACCOUNT_ADMIN
  canManagePipelines(): boolean     // RESELLER | ACCOUNT_ADMIN
  canCreateLeads(): boolean         // todos
  canDeleteLeads(): boolean         // RESELLER | ACCOUNT_ADMIN
  canExportData(): boolean          // RESELLER | ACCOUNT_ADMIN
  canViewBilling(): boolean         // RESELLER | ACCOUNT_ADMIN
}
```

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

### 3.8 Multi-tenancy

Estratégia: **Row-Level Tenancy com `tenantId` em todas as tabelas**.

- Cada request autenticado carrega o `tenantId` no JWT.
- Um `TenantGuard` global injeta o contexto de tenant em todas as queries.
- O Prisma middleware garante que todo acesso seja filtrado pelo `tenantId` — impossível vazar dados entre tenants.
- Dados do Reseller ficam em um tenant especial com role `RESELLER`.

### 3.9 Impersonation (Login como Cliente)

Fluxo:
1. Reseller chama `POST /auth/impersonate/:tenantId`.
2. `ImpersonationGuard` valida role `RESELLER`.
3. Gera JWT de curta duração (30min): `{ sub: resellerId, impersonating: tenantId, role: ACCOUNT_ADMIN }`.
4. Cria `UserSession` com `isImpersonation: true` e `impersonatorId`.
5. **Todo** acesso com esse token é gravado em `AuditLog` com `impersonated: true` (imutável — sem UPDATE/DELETE).
6. Encerrar via `POST /auth/impersonate/end` revoga a `UserSession`.

### 3.10 Autenticação

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

## 6. Estratégia de Testes

### 6.1 Ferramentas

| Camada | Ferramenta | Motivo |
|--------|-----------|--------|
| Unitários + Integração | **Vitest** | Nativo ESM, watch ultra-rápido, API compatível com Jest, sem config extra para TypeScript |
| E2E HTTP | **Supertest** + **@nestjs/testing** | Sobe o módulo NestJS sem porta, requisições HTTP reais |
| Banco integração | **Testcontainers** (`@testcontainers/postgresql`) | PostgreSQL real e isolado por suite |
| Cobertura | **@vitest/coverage-v8** | Cobertura via V8 nativo, sem Istanbul |

### 6.2 Configuração Vitest

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

### 6.3 Pirâmide de Testes

```
         /\
        /E2E\         ← ~10% — Supertest + @nestjs/testing, fluxos completos
       /------\
      /Integração\    ← ~20% — Repositórios Prisma com testcontainers
     /------------\
    /    Unitários  \  ← ~70% — Domain + Use Cases com in-memory repos
   /________________\
```

### 6.4 Testes Unitários — In-Memory Repositories

Repositórios in-memory implementam a mesma interface dos repositórios Prisma. Use cases testados com 100% de isolamento, sem banco, sem I/O.

```typescript
// test/repositories/in-memory-user-identity.repository.ts
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

### 6.5 Testes de Integração — Prisma + Testcontainers

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

### 6.6 Testes E2E — Supertest + @nestjs/testing

```typescript
// test/auth.e2e-spec.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Test } from '@nestjs/testing'
import * as request from 'supertest'

describe('Auth (e2e)', () => {
  let app: INestApplication

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = module.createNestApplication()
    await app.init()
  })

  afterAll(() => app.close())

  it('POST /auth/login → 200 with valid credentials', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'reseller@wb.com', password: 'P@ss1234' })
      .expect(200)
      .expect(res => {
        expect(res.body).toHaveProperty('accessToken')
      })
  })

  it('POST /auth/impersonate/:tenantId → 403 for non-reseller', async () => {
    // ...
  })
})
```

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

### 8.2 Gestão de Leads
```
Lead criado → Stage inicial do Pipeline
  → Movimentação via drag & drop (Kanban) → PATCH /leads/:id/stage
  → Atividades registradas na timeline
  → Automações disparam assincronamente (Bull Queue)
  → Lead pode ser ganho (WON) ou perdido (LOST)
```

### 8.3 Impersonation
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
- [ ] Setup Jest (unit + integration + e2e)
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

*Versão 1.1 — atualizado em 2026-04-06 com padrões do projeto revalida-italia-back.*
