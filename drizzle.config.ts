import { defineConfig } from 'drizzle-kit';

if (typeof process.loadEnvFile === 'function' && !process.env.DATABASE_URL) {
  try {
    process.loadEnvFile();
  } catch {}
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/tournament_manager',
  },
});
