import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? "http://localhost:3000" });
  await app.listen(Number(process.env.API_PORT ?? 4000), "0.0.0.0");
}
bootstrap().catch((e) => { console.error(e); process.exit(1); });
