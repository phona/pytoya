import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TestModelResponseDto {
  @ApiProperty({ example: true })
  ok!: boolean;

  @ApiProperty({ example: 'LLM connection ok' })
  message!: string;

  @ApiPropertyOptional({ example: 'gpt-4o' })
  model?: string;

  @ApiPropertyOptional({ example: 128 })
  latencyMs?: number;
}
