import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddJobCosts1705330000000 implements MigrationInterface {
  name = 'AddJobCosts1705330000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "jobs"
      ADD COLUMN "estimated_cost" DECIMAL(10,4),
      ADD COLUMN "actual_cost" DECIMAL(10,4);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "jobs"
      DROP COLUMN IF EXISTS "actual_cost",
      DROP COLUMN IF EXISTS "estimated_cost";
    `);
  }
}
