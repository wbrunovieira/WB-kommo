import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import {
  ApiBearerAuth,
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import type { Request, Response } from 'express'
import { RegisterUserUseCase } from '@/domain/auth/application/use-cases/register-user/register-user.use-case'
import { AuthenticateUserUseCase } from '@/domain/auth/application/use-cases/authenticate-user/authenticate-user.use-case'
import { RefreshTokenUseCase } from '@/domain/auth/application/use-cases/refresh-token/refresh-token.use-case'
import { LogoutUseCase } from '@/domain/auth/application/use-cases/logout/logout.use-case'
import { ImpersonateUserUseCase } from '@/domain/auth/application/use-cases/impersonate-user/impersonate-user.use-case'
import { ITenantRepository } from '@/domain/tenants/application/repositories/i-tenant.repository'
import { TenantNotFoundError } from '@/domain/auth/application/use-cases/errors/tenant-not-found.error'
import { CurrentUser, CurrentUserPayload } from '@/infra/auth/decorators/current-user.decorator'
import { Public } from '@/infra/auth/decorators/public.decorator'
import { Roles } from '@/infra/auth/decorators/roles.decorator'
import { RegisterUserDto } from '../dtos/register-user.dto'
import { LoginDto } from '../dtos/login.dto'
import { AuthPresenter, AuthTokensResponse, RegisteredUserResponse } from '../presenters/auth.presenter'

const REFRESH_COOKIE = 'wb_refresh_token'

function refreshCookieOptions(isProduction: boolean) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    path: '/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  }
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly isProduction = process.env.NODE_ENV === 'production'

  constructor(
    private readonly registerUseCase: RegisterUserUseCase,
    private readonly authenticateUseCase: AuthenticateUserUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly impersonateUseCase: ImpersonateUserUseCase,
    private readonly tenantRepository: ITenantRepository,
    private readonly jwtService: JwtService,
  ) {}

  // ─── POST /auth/register ────────────────────────────────────────────────

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new user',
    description: 'Creates identity, profile and authorization records atomically within a tenant.',
  })
  @ApiBody({ type: RegisterUserDto })
  @ApiResponse({ status: 201, description: 'User successfully created.', type: RegisteredUserResponse })
  @ApiResponse({ status: 400, description: 'Invalid request body (DTO validation failed).' })
  @ApiResponse({ status: 409, description: 'Email already registered in this tenant.' })
  @ApiResponse({ status: 422, description: 'Weak password or invalid email format.' })
  async register(@Body() dto: RegisterUserDto) {
    const result = await this.registerUseCase.execute(dto)
    if (result.isLeft()) throw result.value
    return AuthPresenter.toRegistered(result.value)
  }

  // ─── POST /auth/login ───────────────────────────────────────────────────

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login',
    description:
      'Authenticates the user. Returns a JWT access token (15 min) in the body and sets ' +
      'an httpOnly wb_refresh_token cookie (7 days) for token rotation.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Login successful.', type: AuthTokensResponse })
  @ApiResponse({ status: 400, description: 'Invalid request body.' })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  @ApiResponse({ status: 404, description: 'Workspace not found.' })
  @ApiResponse({ status: 423, description: 'Account temporarily locked after 5 failed attempts.' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tenantResult = await this.tenantRepository.findBySlug(dto.workspace)
    if (tenantResult.isLeft()) throw tenantResult.value
    if (!tenantResult.value) throw new TenantNotFoundError(dto.workspace)

    const tenantId = tenantResult.value.id

    const result = await this.authenticateUseCase.execute({
      tenantId,
      email: dto.email,
      password: dto.password,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    if (result.isLeft()) throw result.value

    const { userId, role, refreshToken } = result.value
    const accessToken = this.jwtService.sign({ sub: userId, tenantId, role })

    res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions(this.isProduction))

    return AuthPresenter.toTokens({ accessToken, userId, tenantId, role })
  }

  // ─── POST /auth/logout ──────────────────────────────────────────────────

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Logout',
    description: 'Revokes all active sessions for the authenticated user and clears the refresh token cookie.',
  })
  @ApiResponse({ status: 204, description: 'Logout successful.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  async logout(
    @CurrentUser() user: CurrentUserPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.logoutUseCase.execute({ identityId: user.sub })
    if (result.isLeft()) throw result.value

    res.clearCookie(REFRESH_COOKIE, { path: '/auth' })
  }

  // ─── POST /auth/refresh ─────────────────────────────────────────────────

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth(REFRESH_COOKIE)
  @ApiOperation({
    summary: 'Refresh tokens',
    description:
      'Token rotation: reads wb_refresh_token cookie, invalidates it and issues a new token pair. ' +
      'New refresh token is set as an httpOnly cookie.',
  })
  @ApiResponse({ status: 200, description: 'Tokens successfully refreshed.', type: AuthTokensResponse })
  @ApiResponse({ status: 401, description: 'Missing, invalid, expired or already-used refresh token.' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawToken: string | undefined = req.cookies?.[REFRESH_COOKIE]
    if (!rawToken) throw new UnauthorizedException('Refresh token cookie is missing')

    const result = await this.refreshTokenUseCase.execute({ refreshToken: rawToken })
    if (result.isLeft()) throw result.value

    const { userId, tenantId, refreshToken } = result.value
    const role = 'MEMBER'
    const accessToken = this.jwtService.sign({ sub: userId, tenantId, role })

    res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions(this.isProduction))

    return AuthPresenter.toTokens({ accessToken, userId, tenantId, role })
  }

  // ─── POST /auth/impersonate/:tenantId ───────────────────────────────────

  @Roles('RESELLER', 'PLATFORM_OWNER')
  @Post('impersonate/:tenantId')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Impersonate tenant',
    description:
      'RESELLER or PLATFORM_OWNER. Creates a short-lived impersonation session (30 min) in the target tenant. ' +
      'RESELLER can only impersonate their own client tenants. PLATFORM_OWNER can impersonate any tenant.',
  })
  @ApiParam({ name: 'tenantId', description: 'ID of the tenant to impersonate' })
  @ApiResponse({ status: 200, description: 'Impersonation session created.', type: AuthTokensResponse })
  @ApiResponse({ status: 401, description: 'Not authenticated.' })
  @ApiResponse({ status: 403, description: 'User does not have RESELLER role.' })
  async impersonate(
    @Param('tenantId') targetTenantId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.impersonateUseCase.execute({
      resellerId: user.sub,
      targetTenantId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    if (result.isLeft()) throw result.value

    const { sessionId, refreshToken } = result.value
    const accessToken = this.jwtService.sign({
      sub: user.sub,
      tenantId: targetTenantId,
      role: 'RESELLER',
      isImpersonation: true,
      impersonatorId: user.sub,
    })

    res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions(this.isProduction))

    return AuthPresenter.toTokens({
      accessToken,
      userId: user.sub,
      tenantId: targetTenantId,
      role: user.role,
    })
  }

  // ─── POST /auth/impersonate/end ─────────────────────────────────────────

  @Post('impersonate/end')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'End impersonation',
    description: 'Revokes the active impersonation session.',
  })
  @ApiResponse({ status: 204, description: 'Impersonation session ended.' })
  @ApiResponse({ status: 401, description: 'Not authenticated.' })
  async endImpersonation(
    @CurrentUser() user: CurrentUserPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.logoutUseCase.execute({ identityId: user.sub })
    if (result.isLeft()) throw result.value

    res.clearCookie(REFRESH_COOKIE, { path: '/auth' })
  }
}
