import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { neon } from '@neondatabase/serverless';
import pg from 'pg';
import * as schema from './schema';

let pgPool: pg.Pool | null = null;
let currentDbInstance: any = null;

export { assertDatabaseConfig } from './config';
import { assertDatabaseConfig } from './config';

export function setDb(dbInstance: any) {
  currentDbInstance = dbInstance;
}

export function getDb(connectionString?: string) {
  if (currentDbInstance) {
    return currentDbInstance;
  }

  const url = connectionString || assertDatabaseConfig();

  if (url.includes('neon.tech')) {
    const sql = neon(url);
    currentDbInstance = drizzleNeon(sql, { schema });
    return currentDbInstance;
  }

  if (!pgPool) {
    pgPool = new pg.Pool({ connectionString: url });
  }
  currentDbInstance = drizzlePg(pgPool, { schema });
  return currentDbInstance;
}

export * from './schema';
