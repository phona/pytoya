import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSchemaExtractionStrategy1705230000000
  implements MigrationInterface
{
  name = 'AddSchemaExtractionStrategy1705230000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add extractionStrategy column to schemas table
    await queryRunner.query(`
      ALTER TABLE "schemas"
      ADD "extractionStrategy" varchar NOT NULL DEFAULT 'ocr-first'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback: remove extractionStrategy column from schemas table
    await queryRunner.query(`
      ALTER TABLE "schemas"
      DROP COLUMN "extractionStrategy"
    `);
  }
}
