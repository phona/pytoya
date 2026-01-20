import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddManifestOcrAndCost1705310000000 implements MigrationInterface {
  name = 'AddManifestOcrAndCost1705310000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "manifests"
      ADD COLUMN "ocr_result" JSONB,
      ADD COLUMN "ocr_processed_at" TIMESTAMP,
      ADD COLUMN "ocr_quality_score" INTEGER,
      ADD COLUMN "extraction_cost" DECIMAL(10,4);
    `);

    await queryRunner.query(`
      CREATE INDEX "manifests_ocr_processed_at_idx"
      ON "manifests" ("ocr_processed_at");
    `);

    await queryRunner.query(`
      CREATE INDEX "manifests_ocr_quality_score_idx"
      ON "manifests" ("ocr_quality_score");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "manifests_ocr_quality_score_idx";
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "manifests_ocr_processed_at_idx";
    `);

    await queryRunner.query(`
      ALTER TABLE "manifests"
      DROP COLUMN IF EXISTS "extraction_cost",
      DROP COLUMN IF EXISTS "ocr_quality_score",
      DROP COLUMN IF EXISTS "ocr_processed_at",
      DROP COLUMN IF EXISTS "ocr_result";
    `);
  }
}
