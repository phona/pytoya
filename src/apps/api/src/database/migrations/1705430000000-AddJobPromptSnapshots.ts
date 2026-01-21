import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddJobPromptSnapshots1705430000000 implements MigrationInterface {
  name = 'AddJobPromptSnapshots1705430000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "jobs"
        ADD COLUMN IF NOT EXISTS "system_prompt" TEXT;
    `);

    await queryRunner.query(`
      ALTER TABLE "jobs"
        ADD COLUMN IF NOT EXISTS "user_prompt" TEXT;
    `);

    await queryRunner.query(`
      ALTER TABLE "jobs"
        ADD COLUMN IF NOT EXISTS "assistant_response" TEXT;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "jobs" DROP COLUMN IF EXISTS "assistant_response";
    `);
    await queryRunner.query(`
      ALTER TABLE "jobs" DROP COLUMN IF EXISTS "user_prompt";
    `);
    await queryRunner.query(`
      ALTER TABLE "jobs" DROP COLUMN IF EXISTS "system_prompt";
    `);
  }
}

