// prisma validate needs DATABASE_URL to be set, but never connects. Use a placeholder when absent.
import { execSync } from 'node:child_process';
process.env.DATABASE_URL ??= 'postgresql://placeholder:placeholder@localhost:5432/placeholder';
execSync('prisma validate', { stdio: 'inherit' });
