import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config({ path: '../.env' });

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST ?? 'localhost',
  port: Number(process.env.POSTGRES_PORT ?? 5432),
  username: process.env.POSTGRES_USER ?? 'studyquest',
  password: process.env.POSTGRES_PASSWORD ?? 'studyquest_pass',
  database: process.env.POSTGRES_DB ?? 'studyquest',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: true,
});
