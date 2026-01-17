import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import appConfig from '../config/app.config';
import { DatabaseConfig } from '../config/env.validation';

const config = appConfig();

const dbConfig = plainToInstance(DatabaseConfig, config.database, {
  enableImplicitConversion: true,
}) as DatabaseConfig;
const dbErrors = validateSync(dbConfig);

if (dbErrors.length > 0) {
  throw new Error(
    `Database configuration validation failed: ${dbErrors
      .map((e: { property: string; constraints?: Record<string, unknown> }) =>
        `${e.property} (${JSON.stringify(e.constraints)})`
      )
      .join(', ')}`,
  );
}

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
