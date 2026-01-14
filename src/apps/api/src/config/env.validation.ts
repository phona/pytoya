import { plainToInstance } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  validateSync,
} from 'class-validator';

class EnvironmentVariables {
  @IsString()
  DB_HOST!: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  DB_PORT!: number;

  @IsString()
  DB_USERNAME!: string;

  @IsString()
  DB_PASSWORD!: string;

  @IsString()
  DB_DATABASE!: string;

  @IsString()
  REDIS_HOST!: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  REDIS_PORT!: number;

  @IsString()
  JWT_SECRET!: string;

  @IsString()
  PADDLEOCR_BASE_URL!: string;

  @IsOptional()
  @IsString()
  OPENAI_API_KEY?: string;

  @IsOptional()
  @IsString()
  LLM_API_KEY?: string;
}

const formatErrors = (errors: Array<{ property: string }>): string =>
  errors.map((error) => error.property).join(', ');

export const validateEnv = (
  config: Record<string, unknown>,
): Record<string, unknown> => {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(
      `Environment validation failed: ${formatErrors(errors)}`,
    );
  }

  if (!validated.OPENAI_API_KEY && !validated.LLM_API_KEY) {
    throw new Error(
      'Environment validation failed: OPENAI_API_KEY or LLM_API_KEY is required',
    );
  }

  return config;
};
