import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ProviderType {
  PADDLEX = 'PADDLEX',
  OPENAI = 'OPENAI',
  CUSTOM = 'CUSTOM',
}

@Entity()
export class ProviderEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column()
  name!: string;

  @Column({ type: 'enum', enum: ProviderType })
  type!: ProviderType;

  @Column()
  baseUrl!: string;

  @Column()
  apiKey!: string;

  @Column({ nullable: true })
  modelName!: string | null;

  @Column({ type: 'float', nullable: true })
  temperature!: number | null;

  @Column({ type: 'int', nullable: true })
  maxTokens!: number | null;

  @Column({ type: 'boolean', default: false })
  isDefault!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
