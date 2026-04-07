import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/errors/either'
import { IUserIdentityRepository } from '../../repositories/i-user-identity.repository'
import { IUserProfileRepository } from '../../repositories/i-user-profile.repository'
import { IUserAuthorizationRepository } from '../../repositories/i-user-authorization.repository'
import { UserIdentity } from '../../../enterprise/entities/user-identity.entity'
import { UserProfile } from '../../../enterprise/entities/user-profile.entity'
import { UserAuthorization } from '../../../enterprise/entities/user-authorization.entity'
import { Email } from '../../../enterprise/value-objects/email.vo'
import { Password } from '../../../enterprise/value-objects/password.vo'
import { UserRole, RoleType } from '../../../enterprise/value-objects/user-role.vo'
import { UserAlreadyExistsError } from '../errors/user-already-exists.error'

export interface RegisterUserRequest {
  tenantId: string
  name: string
  email: string
  password: string
  role: RoleType
  timezone?: string
  language?: string
}

export interface RegisterUserResponse {
  userId: string
  email: string
  name: string
  role: RoleType
}

export type RegisterUserResult = Either<
  UserAlreadyExistsError | Error,
  RegisterUserResponse
>

@Injectable()
export class RegisterUserUseCase {
  constructor(
    private readonly identityRepo: IUserIdentityRepository,
    private readonly profileRepo: IUserProfileRepository,
    private readonly authorizationRepo: IUserAuthorizationRepository,
  ) {}

  async execute(request: RegisterUserRequest): Promise<RegisterUserResult> {
    // 1. Validate email — rule in VO
    let email: Email
    try {
      email = Email.create(request.email)
    } catch {
      return left(new Error('Invalid email format'))
    }

    // 2. Check email uniqueness within tenant
    const existsResult = await this.identityRepo.emailExists(request.tenantId, email)
    if (existsResult.isLeft()) return left(existsResult.value)
    if (existsResult.value) return left(new UserAlreadyExistsError())

    // 3. Validate + hash password — rule in VO
    let password: Password
    try {
      password = await Password.create(request.password)
    } catch (err) {
      return left(err as Error)
    }

    // 4. Create aggregates
    const identity = UserIdentity.create({ tenantId: request.tenantId, email, password })

    const profile = UserProfile.create({
      tenantId: request.tenantId,
      identityId: identity.id.toString(),
      name: request.name,
      timezone: request.timezone,
      language: request.language,
    })

    const authorization = UserAuthorization.create({
      tenantId: request.tenantId,
      identityId: identity.id.toString(),
      role: UserRole.create(request.role),
    })

    // 5. Persist — all three must succeed
    const saveIdentity = await this.identityRepo.save(identity)
    if (saveIdentity.isLeft()) return left(saveIdentity.value)

    const saveProfile = await this.profileRepo.save(profile)
    if (saveProfile.isLeft()) return left(saveProfile.value)

    const saveAuth = await this.authorizationRepo.save(authorization)
    if (saveAuth.isLeft()) return left(saveAuth.value)

    return right({
      userId: identity.id.toString(),
      email: identity.email.value,
      name: profile.name,
      role: authorization.role.value,
    })
  }
}
