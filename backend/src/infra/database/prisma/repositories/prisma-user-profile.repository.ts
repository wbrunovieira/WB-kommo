import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/errors/either'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'
import { IUserProfileRepository } from '@/domain/auth/application/repositories/i-user-profile.repository'
import { UserProfile } from '@/domain/auth/enterprise/entities/user-profile.entity'
import { PrismaService } from '../prisma.service'
import { PrismaUserProfileMapper } from '../mappers/prisma-user-profile.mapper'

@Injectable()
export class PrismaUserProfileRepository implements IUserProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: UniqueEntityID): Promise<Either<Error, UserProfile | null>> {
    try {
      const raw = await this.prisma.userProfile.findUnique({ where: { id: id.toString() } })
      return right(raw ? PrismaUserProfileMapper.toDomain(raw) : null)
    } catch (err) {
      return left(new Error(`Failed to find profile: ${err}`))
    }
  }

  async findByIdentityId(identityId: string): Promise<Either<Error, UserProfile | null>> {
    try {
      const raw = await this.prisma.userProfile.findUnique({ where: { identityId } })
      return right(raw ? PrismaUserProfileMapper.toDomain(raw) : null)
    } catch (err) {
      return left(new Error(`Failed to find profile by identityId: ${err}`))
    }
  }

  async save(profile: UserProfile): Promise<Either<Error, void>> {
    try {
      const data = PrismaUserProfileMapper.toPersistence(profile)
      await this.prisma.userProfile.upsert({
        where: { id: data.id as string },
        create: data,
        update: {
          name: data.name,
          avatarUrl: data.avatarUrl,
          phone: data.phone,
          timezone: data.timezone,
          language: data.language,
          deletedAt: data.deletedAt,
        },
      })
      return right(undefined)
    } catch (err) {
      return left(new Error(`Failed to save profile: ${err}`))
    }
  }

  async delete(id: UniqueEntityID): Promise<Either<Error, void>> {
    try {
      await this.prisma.userProfile.delete({ where: { id: id.toString() } })
      return right(undefined)
    } catch (err) {
      return left(new Error(`Failed to delete profile: ${err}`))
    }
  }
}
