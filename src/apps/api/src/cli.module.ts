import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { ModelsModule } from './models/models.module';
import { SeedModelPricingCommand } from './models/model-pricing.command';
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
    ModelsModule,
    UsersModule,
  ],
  providers: [
    NewAdminCommand,
    PasswordAuditCommand,
    ServeCommand,
    SeedModelPricingCommand,
  ],
})
export class CliModule {}
