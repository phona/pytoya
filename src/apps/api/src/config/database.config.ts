import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';
import { entities } from '../entities';

export const databaseConfig: TypeOrmModuleAsyncOptions = {
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService): DataSourceOptions => {
    const isDevelopment =
      configService.get<string>('NODE_ENV', 'development') === 'development';
    const port = Number(configService.get('DB_PORT', 5432));
    const dbPort = Number.isNaN(port) ? 5432 : port;

    return {
      type: 'postgres',
      host: configService.get('DB_HOST', 'localhost'),
      port: dbPort,
      username: configService.get('DB_USERNAME', 'pytoya_user'),
      password: configService.get('DB_PASSWORD', 'pytoya_pass'),
      database: configService.get('DB_DATABASE', 'pytoya'),
      entities,
      synchronize: false,
      logging: isDevelopment,
    };
  },
};
