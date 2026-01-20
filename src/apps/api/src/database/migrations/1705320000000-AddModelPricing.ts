import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddModelPricing1705320000000 implements MigrationInterface {
  name = 'AddModelPricing1705320000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "models"
      ADD COLUMN "pricing" JSONB NOT NULL DEFAULT '{}'::jsonb,
      ADD COLUMN "pricing_history" JSONB NOT NULL DEFAULT '[]'::jsonb;
    `);

    await queryRunner.query(`
      UPDATE "models"
      SET "pricing" = jsonb_build_object(
        'effectiveDate', NOW(),
        'ocr', jsonb_build_object('pricePerPage', 0.0, 'currency', 'USD')
      )
      WHERE "adapter_type" = 'paddlex' AND "pricing" = '{}'::jsonb;
    `);

    await queryRunner.query(`
      UPDATE "models"
      SET "pricing" = jsonb_build_object(
        'effectiveDate', NOW(),
        'llm', jsonb_build_object('inputPrice', 0.0, 'outputPrice', 0.0, 'currency', 'USD')
      )
      WHERE "adapter_type" <> 'paddlex' AND "pricing" = '{}'::jsonb;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "models"
      DROP COLUMN IF EXISTS "pricing_history",
      DROP COLUMN IF EXISTS "pricing";
    `);
  }
}
