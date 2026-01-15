import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ProjectEntity } from './project.entity';

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

@Entity()
export class UserEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', unique: true })
  username!: string;

  @Column({ type: 'varchar', name: 'password_hash' })
  password!: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role!: UserRole;

  @OneToMany(() => ProjectEntity, (project) => project.owner)
  projects!: ProjectEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  toJSON() {
    return {
      id: this.id,
      username: this.username,
      role: this.role,
    };
  }
}
