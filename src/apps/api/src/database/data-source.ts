import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { DataSource } from 'typeorm';

const envPath = path.join(process.cwd(), '.env');
const fileEnv = fs.existsSync(envPath) ? dotenv.parse(fs.readFileSync(envPath)) : {};

const dbPort = Number(fileEnv.DB_PORT ?? 5432);
const isDevelopment = (fileEnv.NODE_ENV ?? 'development') === 'development';

const AppDataSource = new DataSource({
  type: 'postgres',
  host: fileEnv.DB_HOST ?? 'localhost',
  port: Number.isNaN(dbPort) ? 5432 : dbPort,
  username: fileEnv.DB_USERNAME ?? 'pytoya_user',
  password: fileEnv.DB_PASSWORD ?? 'pytoya_pass',
  database: fileEnv.DB_DATABASE ?? 'pytoya',
  entities: [path.join(__dirname, '..', 'entities', '**', '*.entity.{ts,js}')],
  migrations: [path.join(__dirname, 'migrations', '*.{ts,js}')],
  synchronize: false,
  logging: isDevelopment,
});

export default AppDataSource;
