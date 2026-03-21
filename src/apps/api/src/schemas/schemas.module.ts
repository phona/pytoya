import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ModelEntity } from '../entities/model.entity';
import { ManifestEntity } from '../entities/manifest.entity';
import { ProjectEntity } from '../entities/project.entity';
import { SchemaEntity } from '../entities/schema.entity';
import { SchemaRuleEntity } from '../entities/schema-rule.entity';
import { OperationLogEntity } from '../entities/operation-log.entity';
import { CaslModule } from '../auth/casl/casl.module';
import { SchemasController } from './schemas.controller';
import { SchemaRulesController } from './schema-rules.controller';
import { CorrectionAnalysisService } from './correction-analysis.service';
import { PromptRulesGeneratorService } from './prompt-rules-generator.service';
import { RuleGeneratorService } from './rule-generator.service';
import { SchemaGeneratorService } from './schema-generator.service';
import { SchemaRulesService } from './schema-rules.service';
import { SchemasService } from './schemas.service';

@Global()
@Module({
  imports: [
    CaslModule,
    TypeOrmModule.forFeature([
      ManifestEntity,
      ModelEntity,
      OperationLogEntity,
      ProjectEntity,
      SchemaEntity,
      SchemaRuleEntity,
    ]),
  ],
  controllers: [SchemasController, SchemaRulesController],
  providers: [
    SchemasService,
    SchemaRulesService,
    SchemaGeneratorService,
    RuleGeneratorService,
    PromptRulesGeneratorService,
    CorrectionAnalysisService,
  ],
  exports: [SchemasService, SchemaRulesService],
})
export class SchemasModule {}
