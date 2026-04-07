import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import helmet from 'helmet'
import { AppModule } from './app.module'
import { Env } from './env/env'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  const config = app.get(ConfigService<Env, true>)

  app.use(helmet())

  const corsOrigins = config.get('CORS_ORIGINS', { infer: true }).split(',')
  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  })

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  const port = config.get('PORT', { infer: true })
  await app.listen(port)

  console.log(`🚀 WB-Kommo API running on http://localhost:${port}`)
}

bootstrap()
