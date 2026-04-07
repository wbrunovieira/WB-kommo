import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/errors/either'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'
import { IUserAuthorizationRepository } from '@/domain/auth/application/repositories/i-user-authorization.repository'
import { UserAuthorization } from '@/domain/auth/enterprise/entities/user-authorization.entity'
import { PrismaService } from '../prisma.service'
import { PrismaUserAuthorizationMapper } from '../mappers/prisma-user-authorization.mapper'

@Injectable()
export class PrismaUserAuthorizationRepository implements IUserAuthorizationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: UniqueEntityID): Promise<Either<Error, UserAuthorization | null>> {
    try {
      const raw = await this.prisma.userAuthorization.findUnique({ where: { id: id.toString() } })
      return right(raw ? PrismaUserAuthorizationMapper.toDomain(raw) : null)
    } catch (err) {
      return left(new Error(`Failed to find authorization: ${err}`))
    }
  }

  async findByIdentityId(identityId: string): Promise<Either<Error, UserAuthorization | null>> {
    try {
      const raw = await this.prisma.userAuthorization.findUnique({ where: { identityId } })
      return right(raw ? PrismaUserAuthorizationMapper.toDomain(raw) : null)
    } catch (err) {
      return left(new Error(`Failed to find authorization by identityId: ${err}`))
    }
  }

  async save(authorization: UserAuthorization): Promise<Either<Error, void>> {
    try {
      const data = PrismaUserAuthorizationMapper.toPersistence(authorization)
      await this.prisma.userAuthorization.upsert({
        where: { id: data.id as string },
        create: data,
        update: {
          role: data.role,
          customPermissions: data.customPermissions,
          restrictions: data.restrictions,
          effectiveFrom: data.effectiveFrom,
          effectiveUntil: data.effectiveUntil,
        },
      })
      return right(undefined)
    } catch (err) {
      return left(new Error(`Failed to save authorization: ${err}`))
    }
  }

  async delete(id: UniqueEntityID): Promise<Either<Error, void>> {
    try {
      await this.prisma.userAuthorization.delete({ where: { id: id.toString() } })
      return right(undefined)
    } catch (err) {
      return left(new Error(`Failed to delete authorization: ${err}`))
    }
  }
}
