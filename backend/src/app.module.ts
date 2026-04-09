import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { envSchema } from './env/env'
import { AuthModule } from './infra/modules/auth.module'
import { CrmModule } from './infra/modules/crm.module'
import { SeedModule } from './infra/modules/seed.module'
import { GlobalExceptionFilter } from './infra/filters/http-exception.filter'
import { JwtAuthGuard } from './infra/auth/guards/jwt-auth.guard'
import { RolesGuard } from './infra/auth/guards/roles.guard'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => envSchema.parse(config),
    }),
    AuthModule,
    CrmModule,
    SeedModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
