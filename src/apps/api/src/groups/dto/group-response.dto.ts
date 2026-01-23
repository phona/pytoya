import { GroupEntity } from '../../entities/group.entity';

export type GroupStatusCounts = {
  pending: number;
  failed: number;
  completed: number;
  verified: number;
};

export type GroupCounts = {
  manifests: number;
  status: GroupStatusCounts;
};

export class GroupResponseDto {
  id!: number;
  name!: string;
  projectId!: number;
  createdAt!: Date;
  updatedAt!: Date;
  _count?: { manifests: number };
  statusCounts?: GroupStatusCounts;

  static fromEntity(group: GroupEntity, counts?: GroupCounts): GroupResponseDto {
    return {
      id: group.id,
      name: group.name,
      projectId: group.projectId,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
      _count: counts ? { manifests: counts.manifests } : undefined,
      statusCounts: counts?.status,
    };
  }
}
