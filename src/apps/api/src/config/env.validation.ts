import { plainToInstance } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  validateSync,
} from 'class-validator';

class DatabaseConfig {
  @IsString()
  host!: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  port!: number;

  @IsString()
  username!: string;

  @IsString()
  password!: string;

  @IsString()
  database!: string;
}

class RedisConfig {
  @IsString()
  host!: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  port!: number;
}

class JwtConfig {
  @IsString()
  secret!: string;

  @IsOptional()
  @IsString()
  expiration?: string;
}

class PaddleocrConfig {
  @IsString()
  baseUrl!: string;
}

class LlmConfig {
  @IsOptional()
  @IsString()
  apiKey?: string;
}

class ServerConfig {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  port?: number;
}

export class AppConfig {
  database!: DatabaseConfig;

  redis!: RedisConfig;

  jwt!: JwtConfig;

  paddleocr!: PaddleocrConfig;

  llm!: LlmConfig;

  server?: ServerConfig;

  @IsOptional()
  @IsString()
  logLevel?: string;
}

const formatErrors = (errors: Array<{ property: string }>): string =>
  errors.map((error) => error.property).join(', ');

export const validateEnv = (
  config: Record<string, unknown>,
): Record<string, unknown> => {
  const validated = plainToInstance(AppConfig, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(
      `Configuration validation failed: ${formatErrors(errors)}`,
    );
  }

  if (!validated.llm?.apiKey) {
    throw new Error(
      'Configuration validation failed: llm.apiKey is required',
    );
  }

  return config;
};
