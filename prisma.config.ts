import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Prisma 7: schema e migrações ficam em db/
export default defineConfig({
  schema: 'db/schema.prisma',
  migrations: { path: 'db/migrations' },
  // sem .env o `prisma generate` (rodado no npm install) ainda funciona
  datasource: { url: process.env.DATABASE_URL ?? 'postgresql://localhost:5432/flaglab' },
});
