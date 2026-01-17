import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserLoginSecurity1705290000000
  implements MigrationInterface
{
  name = 'AddUserLoginSecurity1705290000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "failed_login_attempts" INT NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "locked_until" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "last_login_at" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "last_failed_login_at" TIMESTAMP;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "users_locked_until_idx"
      ON "users" ("locked_until")
      WHERE "locked_until" IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "users_locked_until_idx";
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "failed_login_attempts",
      DROP COLUMN IF EXISTS "locked_until",
      DROP COLUMN IF EXISTS "last_login_at",
      DROP COLUMN IF EXISTS "last_failed_login_at";
    `);
  }
}
