import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { postgresConnectionOptions } from './postgres-connection';

config({ path: '../.env' });

// Migrations CLI data source. Supports DATABASE_URL (+ TLS) like app.module.ts,
// falling back to POSTGRES_* for local dev.
export const AppDataSource = new DataSource({
  type: 'postgres',
  ...postgresConnectionOptions(),
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: true,
});
