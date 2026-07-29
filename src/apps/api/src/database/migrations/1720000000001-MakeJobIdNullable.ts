import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeJobIdNullable1720000000001 implements MigrationInterface {
  name = 'MakeJobIdNullable1720000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "extraction_history"
      ALTER COLUMN "job_id" DROP NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "extraction_history"
      ALTER COLUMN "job_id" SET NOT NULL
    `);
  }
}
