import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { CurrentUser, CurrentUserPayload } from '@/infra/auth/decorators/current-user.decorator'
import { Roles } from '@/infra/auth/decorators/roles.decorator'
import { CreateTenantUseCase } from '@/domain/tenants/application/use-cases/create-tenant/create-tenant.use-case'
import { ListTenantsUseCase } from '@/domain/tenants/application/use-cases/list-tenants/list-tenants.use-case'
import { CreateTenantDto } from '../dtos/create-tenant.dto'
import { RoleType } from '@/domain/auth/enterprise/value-objects/user-role.vo'

const DEFAULT_PLAN_ID = 'plan-reseller'

@ApiTags('tenants')
@Controller('tenants')
export class TenantsController {
  constructor(
    private readonly createTenantUseCase: CreateTenantUseCase,
    private readonly listTenantsUseCase: ListTenantsUseCase,
  ) {}

  // ─── GET /tenants ─────────────────────────────────────────────────────────

  @Roles('RESELLER', 'PLATFORM_OWNER')
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'List accessible tenants',
    description:
      'RESELLER: returns their client tenants. PLATFORM_OWNER: returns all tenants.',
  })
  @ApiResponse({ status: 200, description: 'List of tenants.' })
  @ApiResponse({ status: 401, description: 'Not authenticated.' })
  @ApiResponse({ status: 403, description: 'Insufficient role.' })
  async list(@CurrentUser() user: CurrentUserPayload) {
    const result = await this.listTenantsUseCase.execute({
      actorRole: user.role as RoleType,
      actorTenantId: user.tenantId,
    })
    if (result.isLeft()) throw result.value
    return result.value
  }

  // ─── POST /tenants ────────────────────────────────────────────────────────

  @Roles('RESELLER', 'PLATFORM_OWNER')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Create a new tenant (company)',
    description:
      'RESELLER: creates a client tenant automatically linked to the calling reseller. ' +
      'PLATFORM_OWNER: creates a reseller tenant (resellerTenantId=null) unless resellerTenantId is explicitly provided.',
  })
  @ApiBody({ type: CreateTenantDto })
  @ApiResponse({ status: 201, description: 'Tenant created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid request body.' })
  @ApiResponse({ status: 401, description: 'Not authenticated.' })
  @ApiResponse({ status: 403, description: 'Insufficient role.' })
  @ApiResponse({ status: 409, description: 'Slug already taken.' })
  async create(
    @Body() dto: CreateTenantDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const resellerTenantId =
      user.role === 'RESELLER'
        ? user.tenantId
        : (dto.resellerTenantId ?? null)

    const result = await this.createTenantUseCase.execute({
      name: dto.name,
      slug: dto.slug,
      planId: dto.planId ?? DEFAULT_PLAN_ID,
      resellerTenantId,
    })

    if (result.isLeft()) throw result.value
    return result.value
  }
}
