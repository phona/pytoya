import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateCostPrecisionAndCurrency1705450000000
  implements MigrationInterface
{
  name = 'UpdateCostPrecisionAndCurrency1705450000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "manifests"
        ADD COLUMN IF NOT EXISTS "extraction_cost_currency" VARCHAR;
    `);

    await queryRunner.query(`
      ALTER TABLE "manifests"
        ADD COLUMN IF NOT EXISTS "text_cost" numeric(18, 9),
        ADD COLUMN IF NOT EXISTS "llm_cost" numeric(18, 9),
        ALTER COLUMN "extraction_cost" TYPE numeric(18, 9);
    `);

    await queryRunner.query(`
      ALTER TABLE "jobs"
        ADD COLUMN IF NOT EXISTS "cost_currency" VARCHAR;
    `);

    await queryRunner.query(`
      ALTER TABLE "jobs"
        ALTER COLUMN "estimated_cost" TYPE numeric(18, 9),
        ALTER COLUMN "actual_cost" TYPE numeric(18, 9),
        ALTER COLUMN "ocr_estimated_cost" TYPE numeric(18, 9),
        ALTER COLUMN "ocr_actual_cost" TYPE numeric(18, 9),
        ALTER COLUMN "llm_estimated_cost" TYPE numeric(18, 9),
        ALTER COLUMN "llm_actual_cost" TYPE numeric(18, 9);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "jobs"
        DROP COLUMN IF EXISTS "cost_currency";
    `);

    await queryRunner.query(`
      ALTER TABLE "jobs"
        ALTER COLUMN "estimated_cost" TYPE numeric(10, 4),
        ALTER COLUMN "actual_cost" TYPE numeric(10, 4),
        ALTER COLUMN "ocr_estimated_cost" TYPE numeric(10, 4),
        ALTER COLUMN "ocr_actual_cost" TYPE numeric(10, 4),
        ALTER COLUMN "llm_estimated_cost" TYPE numeric(10, 4),
        ALTER COLUMN "llm_actual_cost" TYPE numeric(10, 4);
    `);

    await queryRunner.query(`
      ALTER TABLE "manifests"
        DROP COLUMN IF EXISTS "extraction_cost_currency",
        DROP COLUMN IF EXISTS "text_cost",
        DROP COLUMN IF EXISTS "llm_cost";
    `);

    await queryRunner.query(`
      ALTER TABLE "manifests"
        ALTER COLUMN "extraction_cost" TYPE numeric(10, 4);
    `);
  }
}
