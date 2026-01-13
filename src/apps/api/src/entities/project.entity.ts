import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { GroupEntity } from './group.entity';
import { UserEntity } from './user.entity';

@Entity()
export class ProjectEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'default_provider_id' })
  defaultProviderId!: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'default_prompt_id' })
  defaultPromptId!: string | null;

  @Column({ type: 'int', name: 'user_id' })
  ownerId!: number;

  @ManyToOne(() => UserEntity, (user) => user.projects)
  @JoinColumn({ name: 'user_id' })
  owner!: UserEntity;

  @OneToMany(() => GroupEntity, (group) => group.project)
  groups!: GroupEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
