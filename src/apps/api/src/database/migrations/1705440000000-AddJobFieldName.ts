import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddJobFieldName1705440000000 implements MigrationInterface {
  name = 'AddJobFieldName1705440000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "jobs"
        ADD COLUMN IF NOT EXISTS "field_name" VARCHAR;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "jobs" DROP COLUMN IF EXISTS "field_name";
    `);
  }
}

