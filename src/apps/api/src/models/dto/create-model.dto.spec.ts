import 'reflect-metadata';
import { validate } from 'class-validator';
import { CreateModelDto } from './create-model.dto';

describe('CreateModelDto', () => {
  it('validates required fields and adapter parameters', async () => {
    const dto = new CreateModelDto();
    dto.name = 'Test';
    dto.adapterType = 'openai';
    dto.parameters = {
      baseUrl: 'https://api.openai.com/v1',
      apiKey: 'test',
      modelName: 'gpt-4o',
    };

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('fails validation when parameters are missing required fields', async () => {
    const dto = new CreateModelDto();
    dto.name = 'Test';
    dto.adapterType = 'openai';
    dto.parameters = {
      baseUrl: 'https://api.openai.com/v1',
    };

    const errors = await validate(dto);
    expect(errors).not.toHaveLength(0);
  });
});
