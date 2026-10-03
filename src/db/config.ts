export function assertDatabaseConfig(): string {
  const url = (typeof process !== 'undefined' ? process.env?.DATABASE_URL : '') || '';
  if (!url) {
    throw new Error(
      'Configuration Error: DATABASE_URL is missing. Please copy .env.example to .env and run "npm run db:up".'
    );
  }
  return url;
}
