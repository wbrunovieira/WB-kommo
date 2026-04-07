import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { Request, Response } from 'express'
import { randomUUID } from 'crypto'
import { domainErrorMapping } from './error-mappings/domain-error.mapping'

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()
    const traceId = (request.headers['x-trace-id'] as string) ?? randomUUID()

    // Domain errors — mapped by class name
    if (exception instanceof Error) {
      const mapping = domainErrorMapping[exception.constructor.name]
      if (mapping) {
        this.logger.warn(`[${traceId}] Domain error: ${exception.constructor.name} — ${exception.message}`)
        return response.status(mapping.status).json({
          type: `https://errors.wb-kommo.com/${exception.constructor.name}`,
          title: mapping.title,
          status: mapping.status,
          detail: exception.message,
          traceId,
          timestamp: new Date().toISOString(),
        })
      }
    }

    // NestJS HTTP exceptions
    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      const exceptionResponse = exception.getResponse()
      return response.status(status).json({
        type: `https://errors.wb-kommo.com/HttpException`,
        title: exception.message,
        status,
        detail: typeof exceptionResponse === 'object'
          ? (exceptionResponse as any).message ?? exception.message
          : exceptionResponse,
        traceId,
        timestamp: new Date().toISOString(),
      })
    }

    // Unexpected errors
    this.logger.error(`[${traceId}] Unexpected error`, exception)
    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      type: 'https://errors.wb-kommo.com/InternalServerError',
      title: 'Internal Server Error',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      detail: 'An unexpected error occurred',
      traceId,
      timestamp: new Date().toISOString(),
    })
  }
}
