import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedDefaultExtractors1705370000000 implements MigrationInterface {
  name = 'SeedDefaultExtractors1705370000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "extractors" ("name", "extractor_type", "config", "description", "is_active")
      VALUES
        (
          'PaddleOCR VL',
          'paddleocr',
          '{"pricing":{"mode":"page","currency":"USD","pricePerPage":0.001}}'::jsonb,
          'Layout-aware OCR optimized for Chinese documents',
          true
        ),
        (
          'Vision LLM - GPT-4o',
          'vision-llm',
          '{"baseUrl":"https://api.openai.com/v1","model":"gpt-4o","temperature":0,"maxTokens":4096,"pricing":{"mode":"token","currency":"USD","inputPricePerMillionTokens":2.5,"outputPricePerMillionTokens":10}}'::jsonb,
          'OpenAI GPT-4o vision model for direct text extraction',
          false
        );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "extractors" WHERE "name" IN ('PaddleOCR VL', 'Vision LLM - GPT-4o');
    `);
  }
}
