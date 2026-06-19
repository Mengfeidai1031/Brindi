import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { validateEnv } from './config/env.validation';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // En local sin Docker, el .env vive en la raíz del monorepo;
      // dentro del contenedor las variables llegan por environment.
      envFilePath: ['../../.env', '.env'],
      validate: validateEnv,
    }),
    // Límite global laxo; los endpoints sensibles (login/registro)
    // aplican límites estrictos con @Throttle (10/min).
    // Almacenamiento en memoria por ahora; pasará a Redis cuando haya
    // múltiples instancias (ver "Decisiones de diseño").
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 100 }],
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
