import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SchemaEntity } from '../entities/schema.entity';
import { SchemasController } from './schemas.controller';
import { SchemasService } from './schemas.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([SchemaEntity])],
  controllers: [SchemasController],
  providers: [SchemasService],
  exports: [SchemasService],
})
export class SchemasModule {}
