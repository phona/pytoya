import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProjectEntity } from '../entities/project.entity';
import { PromptEntity } from '../entities/prompt.entity';
import { ProviderEntity } from '../entities/provider.entity';
import { UsersModule } from '../users/users.module';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProjectEntity,
      ProviderEntity,
      PromptEntity,
    ]),
    UsersModule,
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
