import { plainToInstance } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
  validateSync,
} from 'class-validator';
import { Type } from 'class-transformer';

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
  @IsString()
  apiKey!: string;
}

class ServerConfig {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  port?: number;

  @IsOptional()
  @IsString()
  logLevel?: string;
}

export class AppConfig {
  @ValidateNested()
  @Type(() => DatabaseConfig)
  database!: DatabaseConfig;

  @ValidateNested()
  @Type(() => RedisConfig)
  redis!: RedisConfig;

  @ValidateNested()
  @Type(() => JwtConfig)
  jwt!: JwtConfig;

  @ValidateNested()
  @Type(() => PaddleocrConfig)
  paddleocr!: PaddleocrConfig;

  @ValidateNested()
  @Type(() => LlmConfig)
  llm!: LlmConfig;

  @ValidateNested()
  @Type(() => ServerConfig)
  @IsOptional()
  server?: ServerConfig;
}

const formatErrors = (errors: Array<{ property: string; constraints?: Record<string, string> }>): string =>
  errors.map((error) => `${error.property} (${JSON.stringify(error.constraints)})`).join(', ');

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

  return config;
};
