import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
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

  // ─── Swagger ─────────────────────────────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('WB-Kommo API')
    .setDescription(
      'CRM SaaS with reseller + multi-tenant model. ' +
      'Authentication, user management, leads and pipelines.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
      'access-token',
    )
    .addTag('auth', 'Registration, login, token refresh and impersonation')
    .build()

  const document = SwaggerModule.createDocument(app, swaggerConfig)
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  })
  // ─────────────────────────────────────────────────────────────────────────

  const port = config.get('PORT', { infer: true })
  await app.listen(port)

  console.log(`WB-Kommo API running on http://localhost:${port}`)
  console.log(`Swagger docs:     http://localhost:${port}/docs`)
}

bootstrap()
