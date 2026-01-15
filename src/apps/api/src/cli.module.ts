import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { NewAdminCommand } from './users/new-admin.command';
import { ServeCommand } from './users/serve.command';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateEnv,
    }),
    DatabaseModule,
    UsersModule,
  ],
  providers: [NewAdminCommand, ServeCommand],
})
export class CliModule {}
