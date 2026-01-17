import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { NewAdminCommand } from './users/new-admin.command';
import { PasswordAuditCommand } from './users/password-audit.command';
import { ServeCommand } from './users/serve.command';
import appConfig from './config/app.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      validate: validateEnv,
    }),
    DatabaseModule,
    UsersModule,
  ],
  providers: [NewAdminCommand, PasswordAuditCommand, ServeCommand],
})
export class CliModule {}
