import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddJobCostBreakdown1705340000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add OCR and LLM cost breakdown columns
    await queryRunner.query(`
      ALTER TABLE "jobs"
      ADD COLUMN "ocr_estimated_cost" DECIMAL(10,4),
      ADD COLUMN "ocr_actual_cost" DECIMAL(10,4),
      ADD COLUMN "llm_estimated_cost" DECIMAL(10,4),
      ADD COLUMN "llm_actual_cost" DECIMAL(10,4),
      ADD COLUMN "llm_input_tokens" INTEGER,
      ADD COLUMN "llm_output_tokens" INTEGER,
      ADD COLUMN "pages_processed" INTEGER,
      ADD COLUMN "model_id" VARCHAR;
    `);

    // Create index on model_id for better query performance
    await queryRunner.query(`
      CREATE INDEX "jobs_model_id_idx" ON "jobs" ("model_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "jobs"
      DROP COLUMN "ocr_estimated_cost",
      DROP COLUMN "ocr_actual_cost",
      DROP COLUMN "llm_estimated_cost",
      DROP COLUMN "llm_actual_cost",
      DROP COLUMN "llm_input_tokens",
      DROP COLUMN "llm_output_tokens",
      DROP COLUMN "pages_processed",
      DROP COLUMN "model_id";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "jobs_model_id_idx";
    `);
  }
}
