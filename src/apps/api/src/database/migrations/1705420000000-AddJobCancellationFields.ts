import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddJobCancellationFields1705420000000 implements MigrationInterface {
  name = 'AddJobCancellationFields1705420000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "cancel_requested_at" TIMESTAMP;
      ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "cancel_reason" TEXT;
      ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "canceled_at" TIMESTAMP;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "jobs" DROP COLUMN IF EXISTS "canceled_at";
      ALTER TABLE "jobs" DROP COLUMN IF EXISTS "cancel_reason";
      ALTER TABLE "jobs" DROP COLUMN IF EXISTS "cancel_requested_at";
    `);
  }
}

