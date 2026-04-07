import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/errors/either'
import { IUserSessionRepository } from '../../repositories/i-user-session.repository'

export interface LogoutRequest {
  identityId: string
}

export type LogoutResult = Either<Error, void>

@Injectable()
export class LogoutUseCase {
  constructor(private readonly sessionRepo: IUserSessionRepository) {}

  async execute(request: LogoutRequest): Promise<LogoutResult> {
    const result = await this.sessionRepo.revokeAllByIdentityId(request.identityId)
    if (result.isLeft()) return left(result.value)
    return right(undefined)
  }
}
