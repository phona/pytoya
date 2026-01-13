import { DataSource } from 'typeorm';
import { entities } from '../entities';

const dbPort = Number(process.env.DB_PORT ?? 5432);
const isDevelopment = (process.env.NODE_ENV ?? 'development') === 'development';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number.isNaN(dbPort) ? 5432 : dbPort,
  username: process.env.DB_USERNAME ?? 'pytoya_user',
  password: process.env.DB_PASSWORD ?? 'pytoya_pass',
  database: process.env.DB_DATABASE ?? 'pytoya',
  entities,
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: isDevelopment,
});

export default AppDataSource;
