import { Entity } from '@/core/entity'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'
import { SessionToken } from '../value-objects/session-token.vo'

export interface UserSessionProps {
  tenantId: string
  identityId: string
  refreshToken: SessionToken
  ipAddress?: string
  userAgent?: string
  isImpersonation: boolean
  impersonatorId?: string
  expiresAt: Date
  revokedAt?: Date
  createdAt?: Date
  role?: string
}

export class UserSession extends Entity<UserSessionProps> {
  private constructor(props: UserSessionProps, id?: UniqueEntityID) {
    super(props, id)
  }

  static create(
    props: Omit<UserSessionProps, 'createdAt'>,
    id?: UniqueEntityID,
  ): UserSession {
    return new UserSession({ ...props, createdAt: new Date() }, id)
  }

  static reconstitute(props: UserSessionProps, id: UniqueEntityID): UserSession {
    return new UserSession(props, id)
  }

  get tenantId(): string { return this.props.tenantId }
  get identityId(): string { return this.props.identityId }
  get refreshToken(): SessionToken { return this.props.refreshToken }
  get ipAddress(): string | undefined { return this.props.ipAddress }
  get userAgent(): string | undefined { return this.props.userAgent }
  get isImpersonation(): boolean { return this.props.isImpersonation }
  get impersonatorId(): string | undefined { return this.props.impersonatorId }
  get expiresAt(): Date { return this.props.expiresAt }
  get revokedAt(): Date | undefined { return this.props.revokedAt }
  get role(): string { return this.props.role ?? 'MEMBER' }

  isValid(): boolean {
    if (this.props.revokedAt) return false
    return this.props.expiresAt > new Date()
  }

  revoke(): void {
    this.props.revokedAt = new Date()
  }
}
