import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';
import { config } from './app/config';

if (!config.postgres.host?.length || !config.postgres.port) throw new Error('No Postgres data is used.');
if (!config.postgres.user?.length || !config.postgres.password?.length) throw new Error('No Postgres data is used.');
if (!config.postgres.database?.length) throw new Error('No Postgres database is used.');

export default defineConfig({
  out: './drizzle',
  schema: './db',
  dialect: 'postgresql',
  dbCredentials: {
    user: config.postgres.user,
    password: config.postgres.password,
    host: config.postgres.host,
    port: config.postgres.port,
    database: config.postgres.database,
    ssl: config.postgres.ssl,
  },
});
