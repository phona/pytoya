import { GroupEntity } from '../../entities/group.entity';

export class GroupResponseDto {
  id!: number;
  name!: string;
  projectId!: number;
  createdAt!: Date;
  updatedAt!: Date;

  static fromEntity(group: GroupEntity): GroupResponseDto {
    return {
      id: group.id,
      name: group.name,
      projectId: group.projectId,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    };
  }
}
