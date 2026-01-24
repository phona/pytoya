import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddJobKind1705470000000 implements MigrationInterface {
  name = 'AddJobKind1705470000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "jobs"
        ADD COLUMN IF NOT EXISTS "kind" VARCHAR NOT NULL DEFAULT 'extraction';
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_jobs_kind"
        ON "jobs" ("kind");
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_jobs_kind";
    `);

    await queryRunner.query(`
      ALTER TABLE "jobs" DROP COLUMN IF EXISTS "kind";
    `);
  }
}

