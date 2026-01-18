import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SchemaEntity } from './schema.entity';

export enum SchemaRuleType {
  VERIFICATION = 'verification',
  RESTRICTION = 'restriction',
}

export enum SchemaRuleOperator {
  PATTERN = 'pattern',
  ENUM = 'enum',
  RANGE_MIN = 'range_min',
  RANGE_MAX = 'range_max',
  LENGTH_MIN = 'length_min',
  LENGTH_MAX = 'length_max',
  OCR_CORRECTION = 'ocr_correction',
}

@Entity('schema_rules')
export class SchemaRuleEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', name: 'schema_id' })
  schemaId!: number;

  @Column({ type: 'varchar', name: 'field_path' })
  fieldPath!: string;

  @Column({ type: 'varchar', name: 'rule_type' })
  ruleType!: SchemaRuleType;

  @Column({ type: 'varchar', name: 'rule_operator' })
  ruleOperator!: SchemaRuleOperator;

  @Column({ type: 'jsonb', name: 'rule_config', default: () => "'{}'::jsonb" })
  ruleConfig!: Record<string, unknown>;

  @Column({ type: 'varchar', name: 'error_message', nullable: true })
  errorMessage!: string | null;

  @Column({ type: 'int', default: 0 })
  priority!: number;

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  @Column({ type: 'varchar', nullable: true })
  description!: string | null;

  @ManyToOne(() => SchemaEntity, (schema) => schema.rules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'schema_id' })
  schema!: SchemaEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
