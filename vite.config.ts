/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const databaseUrl = env.DATABASE_URL || process.env.DATABASE_URL || '';

  return {
    plugins: [react()],
    define: {
      'process.env.DATABASE_URL': JSON.stringify(databaseUrl),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    test: {
      globals: true,
      environment: 'node',
    },
  };
});
