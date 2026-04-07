import { Entity } from '@/core/entity'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'

export interface UserProfileProps {
  tenantId: string
  identityId: string
  name: string
  avatarUrl?: string
  phone?: string
  timezone: string
  language: string
  deletedAt?: Date
  createdAt?: Date
  updatedAt?: Date
}

export class UserProfile extends Entity<UserProfileProps> {
  private constructor(props: UserProfileProps, id?: UniqueEntityID) {
    super(props, id)
  }

  static create(
    props: Pick<UserProfileProps, 'tenantId' | 'identityId' | 'name'> &
      Partial<Pick<UserProfileProps, 'avatarUrl' | 'phone' | 'timezone' | 'language'>>,
    id?: UniqueEntityID,
  ): UserProfile {
    return new UserProfile(
      {
        ...props,
        timezone: props.timezone ?? 'America/Sao_Paulo',
        language: props.language ?? 'pt-BR',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      id,
    )
  }

  static reconstitute(props: UserProfileProps, id: UniqueEntityID): UserProfile {
    return new UserProfile(props, id)
  }

  get tenantId(): string { return this.props.tenantId }
  get identityId(): string { return this.props.identityId }
  get name(): string { return this.props.name }
  get avatarUrl(): string | undefined { return this.props.avatarUrl }
  get phone(): string | undefined { return this.props.phone }
  get timezone(): string { return this.props.timezone }
  get language(): string { return this.props.language }
  get deletedAt(): Date | undefined { return this.props.deletedAt }

  updateProfile(data: Partial<Pick<UserProfileProps, 'name' | 'avatarUrl' | 'phone' | 'timezone' | 'language'>>): void {
    if (data.name !== undefined) this.props.name = data.name
    if (data.avatarUrl !== undefined) this.props.avatarUrl = data.avatarUrl
    if (data.phone !== undefined) this.props.phone = data.phone
    if (data.timezone !== undefined) this.props.timezone = data.timezone
    if (data.language !== undefined) this.props.language = data.language
    this.props.updatedAt = new Date()
  }

  softDelete(): void {
    this.props.deletedAt = new Date()
    this.props.updatedAt = new Date()
  }
}
