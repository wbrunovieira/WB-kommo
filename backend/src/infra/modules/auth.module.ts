import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { ConfigService } from '@nestjs/config'
import { Env } from '@/env/env'
import { DatabaseModule } from './database.module'
import { JwtStrategy } from '@/infra/auth/strategies/jwt.strategy'
import { JwtAuthGuard } from '@/infra/auth/guards/jwt-auth.guard'
import { RolesGuard } from '@/infra/auth/guards/roles.guard'
import { AuthController } from '@/infra/http/controllers/auth.controller'
import { RegisterUserUseCase } from '@/domain/auth/application/use-cases/register-user/register-user.use-case'
import { AuthenticateUserUseCase } from '@/domain/auth/application/use-cases/authenticate-user/authenticate-user.use-case'
import { RefreshTokenUseCase } from '@/domain/auth/application/use-cases/refresh-token/refresh-token.use-case'
import { LogoutUseCase } from '@/domain/auth/application/use-cases/logout/logout.use-case'
import { ImpersonateUserUseCase } from '@/domain/auth/application/use-cases/impersonate-user/impersonate-user.use-case'

@Module({
  imports: [
    DatabaseModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        secret: config.get('SESSION_JWT_SECRET', { infer: true }),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    RegisterUserUseCase,
    AuthenticateUserUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    ImpersonateUserUseCase,
  ],
  exports: [JwtAuthGuard, RolesGuard, JwtModule, DatabaseModule],
})
export class AuthModule {}
