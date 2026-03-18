import type { OperationLogEntity, FieldDiff } from '../../entities/operation-log.entity';

export class OperationLogResponseDto {
  id!: number;
  manifestId!: number;
  userId!: number;
  username!: string;
  action!: string;
  diffs!: FieldDiff[];
  metadata!: Record<string, unknown> | null;
  createdAt!: string;

  static fromEntity(entity: OperationLogEntity): OperationLogResponseDto {
    const dto = new OperationLogResponseDto();
    dto.id = entity.id;
    dto.manifestId = entity.manifestId;
    dto.userId = entity.userId;
    dto.username = entity.user?.username ?? `user-${entity.userId}`;
    dto.action = entity.action;
    dto.diffs = entity.diffs;
    dto.metadata = entity.metadata;
    dto.createdAt = entity.createdAt.toISOString();
    return dto;
  }
}
