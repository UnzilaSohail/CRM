import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { PrismaClient } from '@crm/db';
import { AppModule } from './app.module';

export interface CreateAppOptions {
  /** Defaults to a client built from DATABASE_URL. Tests pass an in-process Postgres client. */
  prisma?: PrismaClient;
}

/** Builds the app without listening, so tests and main.ts share one setup. */
export async function createApp(options: CreateAppOptions = {}): Promise<NestFastifyApplication> {
  const prisma = options.prisma ?? new PrismaClient();
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule.register(prisma),
    new FastifyAdapter(),
    { logger: process.env.API_LOG === '1' ? ['error', 'warn'] : false },
  );
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000' });
  const config = new DocumentBuilder()
    .setTitle('AiNetworks CRM API')
    .setVersion('0.0.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));
  app.enableShutdownHooks();
  return app;
}
