import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { ConfigService } from '@nestjs/config'
import { Env } from '@/env/env'
import { CurrentUserPayload } from '../decorators/current-user.decorator'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService<Env, true>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get('SESSION_JWT_SECRET', { infer: true }),
      ignoreExpiration: false,
    })
  }

  async validate(payload: CurrentUserPayload): Promise<CurrentUserPayload> {
    return {
      sub: payload.sub,
      tenantId: payload.tenantId,
      role: payload.role,
      isImpersonation: payload.isImpersonation,
      impersonatorId: payload.impersonatorId,
    }
  }
}
