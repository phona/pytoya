import { JobEntity } from '../../entities/job.entity';
import { ManifestExtractionHistoryEntryDto } from './manifest-extraction-history.dto';

export class ManifestExtractionHistoryEntryDetailsDto extends ManifestExtractionHistoryEntryDto {
  systemPrompt!: string | null;
  userPrompt!: string | null;
  assistantResponse!: string | null;
  promptTemplateContent!: string | null;

  static fromEntity(
    job: JobEntity,
    lookups: {
      llmModelName?: string | null;
      promptName?: string | null;
      promptTemplateContent?: string | null;
    } = {},
  ): ManifestExtractionHistoryEntryDetailsDto {
    const base = ManifestExtractionHistoryEntryDto.fromEntity(job, {
      llmModelName: lookups.llmModelName ?? null,
      promptName: lookups.promptName ?? null,
    });

    return {
      ...base,
      systemPrompt: job.systemPrompt ?? null,
      userPrompt: job.userPrompt ?? null,
      assistantResponse: job.assistantResponse ?? null,
      promptTemplateContent: lookups.promptTemplateContent ?? null,
    };
  }
}

