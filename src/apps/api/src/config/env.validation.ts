import { plainToInstance } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
  validateSync,
} from 'class-validator';
import { Type } from 'class-transformer';

export class DatabaseConfig {
  @IsString()
  @IsNotEmpty()
  host!: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  port!: number;

  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;

  @IsString()
  @IsNotEmpty()
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

class ExtractionQueueConfig {
  @IsInt()
  @Min(1)
  @Max(50)
  concurrency!: number;
}

class QueueConfig {
  @ValidateNested()
  @Type(() => ExtractionQueueConfig)
  extraction!: ExtractionQueueConfig;
}

class JwtConfig {
  @IsString()
  @IsNotEmpty()
  secret!: string;

  @IsOptional()
  @IsString()
  expiration?: string;
}

class PaddleocrConfig {
  @IsString()
  baseUrl!: string;

  @IsOptional()
  @IsString()
  endpoint?: string;
}

class LlmConfig {
  @IsString()
  @IsNotEmpty()
  apiKey!: string;
}

class FeaturesConfig {
  @IsBoolean()
  manualExtraction!: boolean;
}

class ServerConfig {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  port?: number;

  @IsOptional()
  @IsString()
  basePath?: string;

  @IsOptional()
  @IsString()
  logLevel?: string;
}

class CorsConfig {
  @IsBoolean()
  enabled!: boolean;

  @IsArray()
  @IsString({ each: true })
  allowedOrigins!: string[];

  @IsOptional()
  @IsBoolean()
  credentials?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  methods?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedHeaders?: string[];
}

class RateLimitConfig {
  @IsBoolean()
  enabled!: boolean;

  @IsInt()
  @Min(1)
  ttl!: number;

  @IsInt()
  @Min(1)
  limit!: number;

  @IsOptional()
  @IsIn(['memory', 'redis'])
  storage?: string;
}

class AccountLockoutThreshold {
  @IsInt()
  @Min(1)
  attempts!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  duration?: number;

  @IsOptional()
  @IsBoolean()
  permanent?: boolean;
}

class AccountLockoutConfig {
  @IsBoolean()
  enabled!: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AccountLockoutThreshold)
  thresholds!: AccountLockoutThreshold[];
}

class PasswordPolicyConfig {
  @IsInt()
  @Min(1)
  minLength!: number;

  @IsInt()
  @Min(1)
  maxLength!: number;

  @IsBoolean()
  requireUppercase!: boolean;

  @IsBoolean()
  requireLowercase!: boolean;

  @IsBoolean()
  requireNumber!: boolean;

  @IsBoolean()
  requireSpecialChar!: boolean;

  @IsString()
  specialChars!: string;
}

class UsernamePolicyConfig {
  @IsInt()
  @Min(1)
  minLength!: number;

  @IsInt()
  @Min(1)
  maxLength!: number;

  @IsString()
  pattern!: string;
}

class SecurityConfig {
  @ValidateNested()
  @Type(() => CorsConfig)
  cors!: CorsConfig;

  @ValidateNested()
  @Type(() => RateLimitConfig)
  rateLimit!: RateLimitConfig;

  @ValidateNested()
  @Type(() => AccountLockoutConfig)
  accountLockout!: AccountLockoutConfig;

  @ValidateNested()
  @Type(() => PasswordPolicyConfig)
  passwordPolicy!: PasswordPolicyConfig;

  @ValidateNested()
  @Type(() => UsernamePolicyConfig)
  usernamePolicy!: UsernamePolicyConfig;
}

export class AppConfig {
  @ValidateNested()
  @Type(() => DatabaseConfig)
  database!: DatabaseConfig;

  @ValidateNested()
  @Type(() => RedisConfig)
  redis!: RedisConfig;

  @ValidateNested()
  @Type(() => QueueConfig)
  queue!: QueueConfig;

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
  @Type(() => FeaturesConfig)
  features!: FeaturesConfig;

  @ValidateNested()
  @Type(() => SecurityConfig)
  security!: SecurityConfig;

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
