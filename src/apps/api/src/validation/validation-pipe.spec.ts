import {
  ArgumentMetadata,
  BadRequestException,
  ValidationPipe,
} from '@nestjs/common';
import { IsString, type ValidationError } from 'class-validator';
import { ERROR_CODES } from '../common/errors/error-codes';

class SampleDto {
  @IsString()
  name!: string;
}

describe('ValidationPipe (global defaults)', () => {
  const createPipe = () => {
    const flattenValidationErrors = (
      errors: ValidationError[],
      parentPath = '',
    ): Array<{ path: string; rule: string }> => {
      const details: Array<{ path: string; rule: string }> = [];
      for (const error of errors) {
        const currentPath = parentPath
          ? `${parentPath}.${error.property}`
          : error.property;

        if (error.constraints) {
          for (const rule of Object.keys(error.constraints)) {
            details.push({ path: currentPath, rule });
          }
        }

        if (error.children && error.children.length > 0) {
          details.push(...flattenValidationErrors(error.children, currentPath));
        }
      }
      return details;
    };

    return new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors: ValidationError[]) =>
        new BadRequestException({
          code: ERROR_CODES.VALIDATION_FAILED,
          message: 'Validation failed',
          details: flattenValidationErrors(errors),
        }),
    });
  };

  it('rejects unknown fields when forbidNonWhitelisted is enabled', async () => {
    const pipe = createPipe();
    const metadata: ArgumentMetadata = { type: 'body', metatype: SampleDto };

    try {
      await pipe.transform({ name: 'ok', extra: 'nope' }, metadata);
      throw new Error('Expected validation error');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse();
      expect(response).toMatchObject({
        code: ERROR_CODES.VALIDATION_FAILED,
        message: 'Validation failed',
      });
      expect((response as any).details).toEqual(
        expect.arrayContaining([{ path: 'extra', rule: 'whitelistValidation' }]),
      );
    }
  });

  it('accepts whitelisted fields', async () => {
    const pipe = createPipe();
    const metadata: ArgumentMetadata = { type: 'body', metatype: SampleDto };

    await expect(
      pipe.transform({ name: 'ok' }, metadata),
    ).resolves.toMatchObject({ name: 'ok' });
  });

  it('includes structured details for constraint violations', async () => {
    const pipe = createPipe();
    const metadata: ArgumentMetadata = { type: 'body', metatype: SampleDto };

    try {
      await pipe.transform({ name: 123 }, metadata);
      throw new Error('Expected validation error');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse();
      expect(response).toMatchObject({ code: ERROR_CODES.VALIDATION_FAILED });
      expect((response as any).details).toEqual(
        expect.arrayContaining([{ path: 'name', rule: 'isString' }]),
      );
    }
  });
});
