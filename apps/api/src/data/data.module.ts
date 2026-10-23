import { type DynamicModule, Global, Module } from '@nestjs/common';
import type { PrismaClient } from '@crm/db';

export const PRISMA = Symbol('PRISMA');

/** Provides the PrismaClient. Tests pass an in-process Postgres client; production builds its own. */
@Global()
@Module({})
export class DataModule {
  static register(prisma: PrismaClient): DynamicModule {
    return {
      module: DataModule,
      // useFactory, not useValue: Nest serialises dynamic-module metadata to build a token, and a
      // PrismaClient is far too large and cyclic for that.
      providers: [{ provide: PRISMA, useFactory: () => prisma }],
      exports: [PRISMA],
      global: true,
    };
  }
}
