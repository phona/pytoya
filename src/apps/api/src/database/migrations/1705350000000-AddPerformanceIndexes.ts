import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPerformanceIndexes1705350000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add indexes for frequently queried columns
    await queryRunner.query(`
      -- Index for manifest status filtering
      CREATE INDEX IF NOT EXISTS "manifests_status_idx" ON "manifests" ("status");

      -- Index for manifest extraction_cost filtering
      CREATE INDEX IF NOT EXISTS "manifests_extraction_cost_idx" ON "manifests" ("extraction_cost");

      -- Index for jobs model_id filtering
      CREATE INDEX IF NOT EXISTS "jobs_model_id_idx" ON "jobs" ("model_id");

      -- Index for jobs status filtering
      CREATE INDEX IF NOT EXISTS "jobs_status_idx" ON "jobs" ("status");

      -- Index for jobs created_at sorting (for recent job queries)
      CREATE INDEX IF NOT EXISTS "jobs_created_at_idx" ON "jobs" ("created_at" DESC);

      -- Composite index for jobs manifest lookups with status
      CREATE INDEX IF NOT EXISTS "jobs_manifest_id_status_idx" ON "jobs" ("manifest_id", "status");

      -- GIN index for faster JSONB queries on ocr_result
      CREATE INDEX IF NOT EXISTS "manifests_ocr_result_gin_idx" ON "manifests" USING GIN ("ocr_result");

      -- Partial index for manifests with OCR results only
      CREATE INDEX IF NOT EXISTS "manifests_with_ocr_idx" ON "manifests" ("id")
      WHERE "ocr_result" IS NOT NULL;

      -- Partial index for manifests with extraction costs
      CREATE INDEX IF NOT EXISTS "manifests_with_cost_idx" ON "manifests" ("id", "extraction_cost")
      WHERE "extraction_cost" IS NOT NULL;

      -- Index for groups project_id filtering
      CREATE INDEX IF NOT EXISTS "groups_project_id_idx" ON "groups" ("project_id");

      -- Index for projects user_id filtering
      CREATE INDEX IF NOT EXISTS "projects_user_id_idx" ON "projects" ("user_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "manifests_status_idx";
      DROP INDEX IF EXISTS "manifests_extraction_cost_idx";
      DROP INDEX IF EXISTS "jobs_model_id_idx";
      DROP INDEX IF EXISTS "jobs_status_idx";
      DROP INDEX IF EXISTS "jobs_created_at_idx";
      DROP INDEX IF EXISTS "jobs_manifest_id_status_idx";
      DROP INDEX IF EXISTS "manifests_ocr_result_gin_idx";
      DROP INDEX IF EXISTS "manifests_with_ocr_idx";
      DROP INDEX IF EXISTS "manifests_with_cost_idx";
      DROP INDEX IF EXISTS "groups_project_id_idx";
      DROP INDEX IF EXISTS "projects_user_id_idx";
    `);
  }
}
