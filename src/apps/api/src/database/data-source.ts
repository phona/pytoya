import { join } from 'node:path';
import { DataSource } from 'typeorm';
import appConfig from '../config/app.config';
import { validateEnv } from '../config/env.validation';

let config = appConfig();
config = validateEnv(config);

const dbConfig = config.database as {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
};

const AppDataSource = new DataSource({
  type: 'postgres',
  host: dbConfig.host,
  port: dbConfig.port,
  username: dbConfig.username,
  password: dbConfig.password,
  database: dbConfig.database,
  entities: [join(__dirname, '..', 'entities', '**', '*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  synchronize: false,
  logging: false,
});

export default AppDataSource;
