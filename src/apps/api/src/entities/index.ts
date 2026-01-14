import { ExtractionHistoryEntity } from './extraction-history.entity';
import { GroupEntity } from './group.entity';
import { JobEntity } from './job.entity';
import { LlmProviderEntity } from './llm-provider.entity';
import { ManifestEntity } from './manifest.entity';
import { ManifestItemEntity } from './manifest-item.entity';
import { ProjectEntity } from './project.entity';
import { PromptEntity } from './prompt.entity';
import { ProviderEntity } from './provider.entity';
import { SchemaEntity } from './schema.entity';
import { UserEntity } from './user.entity';

export {
  ExtractionHistoryEntity,
  GroupEntity,
  JobEntity,
  LlmProviderEntity,
  ManifestEntity,
  ManifestItemEntity,
  ProjectEntity,
  PromptEntity,
  ProviderEntity,
  SchemaEntity,
  UserEntity,
};
export { JobStatus } from './job.entity';
export { LlmProviderType } from './llm-provider.entity';
export { ManifestStatus } from './manifest.entity';
export { PromptType } from './prompt.entity';
export { ProviderType } from './provider.entity';
export { UserRole } from './user.entity';

export const entities = [
  UserEntity,
  ProjectEntity,
  GroupEntity,
  SchemaEntity,
  ManifestEntity,
  ManifestItemEntity,
  LlmProviderEntity,
  ProviderEntity,
  PromptEntity,
  JobEntity,
  ExtractionHistoryEntity,
];
