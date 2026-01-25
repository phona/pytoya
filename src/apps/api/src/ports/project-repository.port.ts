export type ProjectRecord = {
  id: number;
  ownerId: number;
  llmModelId?: string | null;
};

export interface ProjectRepositoryPort {
  findById(projectId: number): Promise<ProjectRecord | null>;
}
