import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProviderVisionSupport1705220000000 implements MigrationInterface {
  name = 'AddProviderVisionSupport1705220000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add supportsVision column to providers table
    await queryRunner.query(`
      ALTER TABLE "providers"
      ADD "supportsVision" boolean NOT NULL DEFAULT false
    `);

    // Add supportsStructuredOutput column to providers table
    await queryRunner.query(`
      ALTER TABLE "providers"
      ADD "supportsStructuredOutput" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback: remove columns from providers table
    await queryRunner.query(`
      ALTER TABLE "providers"
      DROP COLUMN "supportsStructuredOutput"
    `);

    await queryRunner.query(`
      ALTER TABLE "providers"
      DROP COLUMN "supportsVision"
    `);
  }
}
