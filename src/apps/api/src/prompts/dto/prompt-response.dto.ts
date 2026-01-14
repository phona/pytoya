import { PromptEntity, PromptType } from '../../entities/prompt.entity';

export class PromptResponseDto {
  id!: number;
  name!: string;
  type!: PromptType;
  content!: string;
  variables!: string[] | null;
  createdAt!: Date;
  updatedAt!: Date;

  static fromEntity(prompt: PromptEntity): PromptResponseDto {
    return {
      id: prompt.id,
      name: prompt.name,
      type: prompt.type,
      content: prompt.content,
      variables: prompt.variables,
      createdAt: prompt.createdAt,
      updatedAt: prompt.updatedAt,
    };
  }
}
