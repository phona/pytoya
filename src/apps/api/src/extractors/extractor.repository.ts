import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';

import { ExtractorEntity } from '../entities/extractor.entity';

export type ExtractorFilters = {
  extractorType?: string;
  isActive?: boolean;
};

@Injectable()
export class ExtractorRepository {
  constructor(
    @InjectRepository(ExtractorEntity)
    private readonly repository: Repository<ExtractorEntity>,
  ) {}

  async create(input: Partial<ExtractorEntity>): Promise<ExtractorEntity> {
    const entity = this.repository.create(input);
    return this.repository.save(entity);
  }

  async findAll(filters: ExtractorFilters = {}): Promise<ExtractorEntity[]> {
    const where: FindOptionsWhere<ExtractorEntity> = {};
    if (filters.extractorType) {
      where.extractorType = filters.extractorType;
    }
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }
    return this.repository.find({ where, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<ExtractorEntity | null> {
    return this.repository.findOne({ where: { id } });
  }

  async update(id: string, input: Partial<ExtractorEntity>): Promise<ExtractorEntity> {
    const extractor = await this.findOne(id);
    if (!extractor) {
      return this.repository.save(this.repository.create({ id, ...input }));
    }
    Object.assign(extractor, input);
    return this.repository.save(extractor);
  }

  async remove(id: string): Promise<ExtractorEntity> {
    const extractor = await this.findOne(id);
    if (!extractor) {
      throw new Error(`Extractor ${id} not found`);
    }
    return this.repository.remove(extractor);
  }
}
