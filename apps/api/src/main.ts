import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { APP_NAME } from './config/app.constants';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Necesario para leer la cookie httpOnly del refresh token.
  app.use(cookieParser());

  // Validación de entrada exhaustiva en todos los endpoints (DTOs).
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS restrictivo: solo el origen del frontend (credentials para la cookie).
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  });

  // Documentación OpenAPI autogenerada.
  const swaggerConfig = new DocumentBuilder()
    .setTitle(`${APP_NAME} API`)
    .setDescription(
      `Backend principal de ${APP_NAME}. Esquema de datos minimalista por diseño de privacidad: ` +
        'no se persisten tickets, divisiones, planes ni ubicaciones.',
    )
    .setVersion('0.3.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`[${APP_NAME.toLowerCase()}-api] escuchando en http://localhost:${port} (docs en /api/docs)`);
}

void bootstrap();
