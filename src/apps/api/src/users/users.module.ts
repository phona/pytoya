import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserEntity } from '../entities/user.entity';
import { AdminSeedService } from './admin-seed.service';
import { UsersService } from './users.service';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([UserEntity])],
  providers: [AdminSeedService, UsersService],
  exports: [AdminSeedService, UsersService],
})
export class UsersModule {}
