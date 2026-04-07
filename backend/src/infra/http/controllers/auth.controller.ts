import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import type { Request } from 'express'
import { RegisterUserUseCase } from '@/domain/auth/application/use-cases/register-user/register-user.use-case'
import { AuthenticateUserUseCase } from '@/domain/auth/application/use-cases/authenticate-user/authenticate-user.use-case'
import { RefreshTokenUseCase } from '@/domain/auth/application/use-cases/refresh-token/refresh-token.use-case'
import { LogoutUseCase } from '@/domain/auth/application/use-cases/logout/logout.use-case'
import { ImpersonateUserUseCase } from '@/domain/auth/application/use-cases/impersonate-user/impersonate-user.use-case'
import { CurrentUser, CurrentUserPayload } from '@/infra/auth/decorators/current-user.decorator'
import { Public } from '@/infra/auth/decorators/public.decorator'
import { Roles } from '@/infra/auth/decorators/roles.decorator'
import { RegisterUserDto } from '../dtos/register-user.dto'
import { LoginDto } from '../dtos/login.dto'
import { RefreshTokenDto } from '../dtos/refresh-token.dto'
import { AuthPresenter } from '../presenters/auth.presenter'

@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUserUseCase,
    private readonly authenticateUseCase: AuthenticateUserUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly impersonateUseCase: ImpersonateUserUseCase,
    private readonly jwtService: JwtService,
  ) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterUserDto) {
    const result = await this.registerUseCase.execute(dto)
    if (result.isLeft()) throw result.value
    return AuthPresenter.toRegistered(result.value)
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const result = await this.authenticateUseCase.execute({
      tenantId: dto.tenantId,
      email: dto.email,
      password: dto.password,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    if (result.isLeft()) throw result.value

    const { userId, tenantId, role, refreshToken } = result.value
    const accessToken = this.jwtService.sign({ sub: userId, tenantId, role })

    return AuthPresenter.toTokens({ accessToken, refreshToken, userId, tenantId, role })
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@CurrentUser() user: CurrentUserPayload) {
    const result = await this.logoutUseCase.execute({ identityId: user.sub })
    if (result.isLeft()) throw result.value
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto) {
    const result = await this.refreshTokenUseCase.execute({ refreshToken: dto.refreshToken })
    if (result.isLeft()) throw result.value

    const { userId, tenantId, refreshToken } = result.value
    const role = 'MEMBER' // role is re-read from the new JWT on next request
    const accessToken = this.jwtService.sign({ sub: userId, tenantId, role })

    return AuthPresenter.toTokens({ accessToken, refreshToken, userId, tenantId, role })
  }

  @Roles('RESELLER')
  @Post('impersonate/:tenantId')
  @HttpCode(HttpStatus.OK)
  async impersonate(
    @Param('tenantId') targetTenantId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
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

    return AuthPresenter.toTokens({
      accessToken,
      refreshToken,
      userId: sessionId,
      tenantId: targetTenantId,
      role: 'RESELLER',
    })
  }

  @Post('impersonate/end')
  @HttpCode(HttpStatus.NO_CONTENT)
  async endImpersonation(@CurrentUser() user: CurrentUserPayload) {
    const result = await this.logoutUseCase.execute({ identityId: user.sub })
    if (result.isLeft()) throw result.value
  }
}
