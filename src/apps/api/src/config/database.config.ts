import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';
import { entities } from '../entities';

export const databaseConfig: TypeOrmModuleAsyncOptions = {
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService): DataSourceOptions => {
    return {
      type: 'postgres',
      host: configService.get<string>('database.host', 'localhost'),
      port: configService.get<number>('database.port', 5432),
      username: configService.get<string>('database.username', 'pytoya_user'),
      password: configService.get<string>('database.password', 'pytoya_pass'),
      database: configService.get<string>('database.database', 'pytoya'),
      entities,
      migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
      migrationsRun: false,
      synchronize: false,
    };
  },
};
