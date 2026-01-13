import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UserEntity, UserRole } from '../entities/user.entity';

interface CreateUserInput {
  email: string;
  password: string;
  role: UserRole;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findById(id: number): Promise<UserEntity | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async create(input: CreateUserInput): Promise<UserEntity> {
    const user = this.userRepository.create(input);
    return this.userRepository.save(user);
  }
}
