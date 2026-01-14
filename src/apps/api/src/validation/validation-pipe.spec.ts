import {
  ArgumentMetadata,
  BadRequestException,
  ValidationPipe,
} from '@nestjs/common';
import { IsString } from 'class-validator';

class SampleDto {
  @IsString()
  name!: string;
}

describe('ValidationPipe (global defaults)', () => {
  const createPipe = () =>
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    });

  it('rejects unknown fields when forbidNonWhitelisted is enabled', async () => {
    const pipe = createPipe();
    const metadata: ArgumentMetadata = { type: 'body', metatype: SampleDto };

    await expect(
      pipe.transform({ name: 'ok', extra: 'nope' }, metadata),
    ).rejects.toThrow(BadRequestException);
  });

  it('accepts whitelisted fields', async () => {
    const pipe = createPipe();
    const metadata: ArgumentMetadata = { type: 'body', metatype: SampleDto };

    await expect(
      pipe.transform({ name: 'ok' }, metadata),
    ).resolves.toMatchObject({ name: 'ok' });
  });
});
