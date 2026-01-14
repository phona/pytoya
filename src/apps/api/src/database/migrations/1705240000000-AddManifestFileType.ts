import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddManifestFileType1705240000000 implements MigrationInterface {
  name = 'AddManifestFileType1705240000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add fileType column to manifest table
    await queryRunner.query(`
      ALTER TABLE "manifest"
      ADD "fileType" varchar NOT NULL DEFAULT 'pdf'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback: remove fileType column from manifest table
    await queryRunner.query(`
      ALTER TABLE "manifest"
      DROP COLUMN "fileType"
    `);
  }
}
