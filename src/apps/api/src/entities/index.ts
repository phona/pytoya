import { ExtractionHistoryEntity } from './extraction-history.entity';
import { GroupEntity } from './group.entity';
import { JobEntity } from './job.entity';
import { ManifestEntity } from './manifest.entity';
import { ManifestItemEntity } from './manifest-item.entity';
import { ModelEntity } from './model.entity';
import { ProjectEntity } from './project.entity';
import { PromptEntity } from './prompt.entity';
import { SchemaEntity } from './schema.entity';
import { UserEntity } from './user.entity';
import { ValidationScriptEntity } from './validation-script.entity';

export {
  ExtractionHistoryEntity,
  GroupEntity,
  JobEntity,
  ManifestEntity,
  ManifestItemEntity,
  ModelEntity,
  ProjectEntity,
  PromptEntity,
  SchemaEntity,
  UserEntity,
  ValidationScriptEntity,
};
export { JobStatus } from './job.entity';
export { ManifestStatus, ValidationIssue, ValidationResult } from './manifest.entity';
export { PromptType } from './prompt.entity';
export { UserRole } from './user.entity';
export { ValidationSeverity } from './validation-script.entity';

export const entities = [
  UserEntity,
  ProjectEntity,
  GroupEntity,
  SchemaEntity,
  ManifestEntity,
  ManifestItemEntity,
  ModelEntity,
  PromptEntity,
  JobEntity,
  ExtractionHistoryEntity,
  ValidationScriptEntity,
];
