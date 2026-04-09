import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator'
import { CurrentUser, CurrentUserPayload } from '@/infra/auth/decorators/current-user.decorator'
import { Roles } from '@/infra/auth/decorators/roles.decorator'
import { ListWorkspaceUsersUseCase } from '@/domain/auth/application/use-cases/list-workspace-users/list-workspace-users.use-case'
import { RegisterUserUseCase } from '@/domain/auth/application/use-cases/register-user/register-user.use-case'
import { UpdateWorkspaceUserUseCase } from '@/domain/auth/application/use-cases/update-workspace-user/update-workspace-user.use-case'
import { SoftDeleteWorkspaceUserUseCase } from '@/domain/auth/application/use-cases/soft-delete-workspace-user/soft-delete-workspace-user.use-case'
import { RegisterUserDto } from '../dtos/register-user.dto'
import { UserRole, RoleType } from '@/domain/auth/enterprise/value-objects/user-role.vo'

class UpdateWorkspaceUserDto {
  @IsOptional() @IsString() @MinLength(2) name?: string
  @IsOptional() @IsString() timezone?: string
  @IsOptional() @IsString() language?: string
  @IsOptional() @IsEnum(['PLATFORM_OWNER', 'RESELLER', 'ACCOUNT_ADMIN', 'MEMBER', 'AGENT']) role?: RoleType
}

class WorkspaceUserResponse {
  identityId!: string
  name!: string
  email!: string
  role!: string
  timezone!: string
  language!: string
  isEmailVerified!: boolean
  createdAt!: string
}

@ApiTags('workspace')
@ApiBearerAuth('access-token')
@Controller('workspace')
export class WorkspaceController {
  constructor(
    private readonly listUsersUseCase: ListWorkspaceUsersUseCase,
    private readonly registerUserUseCase: RegisterUserUseCase,
    private readonly updateUserUseCase: UpdateWorkspaceUserUseCase,
    private readonly softDeleteUserUseCase: SoftDeleteWorkspaceUserUseCase,
  ) {}

  // ─── GET /workspace/users ─────────────────────────────────────────────────

  @Get('users')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List workspace users',
    description: 'Lists all active users in the workspace. AGENT role is not allowed.',
  })
  @ApiQuery({ name: 'tenantId', required: false, description: 'Override target tenant (PLATFORM_OWNER only)' })
  @ApiResponse({ status: 200, description: 'List of users.' })
  @ApiResponse({ status: 401, description: 'Not authenticated.' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions (AGENT).' })
  async listUsers(
    @CurrentUser() user: CurrentUserPayload,
    @Query('tenantId') targetTenantId?: string,
  ): Promise<WorkspaceUserResponse[]> {
    const result = await this.listUsersUseCase.execute({
      callerTenantId: user.tenantId,
      callerRole: user.role,
      targetTenantId: targetTenantId ?? user.tenantId,
    })

    if (result.isLeft()) throw new ForbiddenException(result.value.message)

    return result.value.map((view) => ({
      identityId: view.identity.id.toString(),
      name: view.profile.name,
      email: view.identity.email.value,
      role: view.authorization.role.value,
      timezone: view.profile.timezone,
      language: view.profile.language,
      isEmailVerified: view.identity.isEmailVerified,
      createdAt: view.identity.createdAt.toISOString(),
    }))
  }

  // ─── POST /workspace/users ────────────────────────────────────────────────

  @Post('users')
  @HttpCode(HttpStatus.CREATED)
  @Roles('PLATFORM_OWNER', 'RESELLER', 'ACCOUNT_ADMIN', 'MEMBER')
  @ApiOperation({
    summary: 'Create a user in the workspace',
    description:
      'Creates a new user. MEMBER can only create users in their own tenant. ' +
      'RESELLER/PLATFORM_OWNER can specify any tenantId.',
  })
  @ApiBody({ type: RegisterUserDto })
  @ApiResponse({ status: 201, description: 'User created successfully.' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions.' })
  @ApiResponse({ status: 409, description: 'Email already registered.' })
  async createUser(
    @Body() dto: RegisterUserDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const role = UserRole.create(user.role as any)

    // MEMBER can only create users in their own tenant
    if (!role.canManageOwnClients() && dto.tenantId !== user.tenantId) {
      throw new ForbiddenException('You can only create users in your own workspace')
    }

    const result = await this.registerUserUseCase.execute({
      tenantId: dto.tenantId,
      name: dto.name,
      email: dto.email,
      password: dto.password,
      role: dto.role,
      timezone: dto.timezone,
      language: dto.language,
    })

    if (result.isLeft()) throw result.value

    return {
      userId: result.value.userId,
      email: result.value.email,
      name: result.value.name,
      role: result.value.role,
    }
  }

  // ─── PATCH /workspace/users/:identityId ──────────────────────────────────

  @Patch('users/:identityId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update a workspace user (name, timezone, language, role)' })
  @ApiParam({ name: 'identityId', description: 'Identity ID of the target user' })
  @ApiBody({ type: UpdateWorkspaceUserDto })
  @ApiResponse({ status: 204, description: 'User updated.' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async updateUser(
    @Param('identityId') identityId: string,
    @Body() dto: UpdateWorkspaceUserDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const result = await this.updateUserUseCase.execute({
      callerTenantId: user.tenantId,
      callerRole: user.role,
      targetIdentityId: identityId,
      updates: {
        name: dto.name,
        timezone: dto.timezone,
        language: dto.language,
        role: dto.role,
      },
    })

    if (result.isLeft()) {
      const err = result.value
      if (err.message === 'User not found') throw new NotFoundException(err.message)
      throw new ForbiddenException(err.message)
    }
  }

  // ─── DELETE /workspace/users/:identityId ─────────────────────────────────

  @Delete('users/:identityId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Soft-delete a workspace user' })
  @ApiParam({ name: 'identityId', description: 'Identity ID of the target user' })
  @ApiResponse({ status: 204, description: 'User soft-deleted.' })
  @ApiResponse({ status: 400, description: 'Cannot delete own account.' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async softDeleteUser(
    @Param('identityId') identityId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const result = await this.softDeleteUserUseCase.execute({
      callerTenantId: user.tenantId,
      callerRole: user.role,
      callerIdentityId: user.sub,
      targetIdentityId: identityId,
    })

    if (result.isLeft()) {
      const err = result.value
      if (err.message === 'User not found') throw new NotFoundException(err.message)
      throw new ForbiddenException(err.message)
    }
  }
}
