import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveSchemaExtractionStrategy1705410000000 implements MigrationInterface {
  name = 'RemoveSchemaExtractionStrategy1705410000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "schemas" DROP COLUMN IF EXISTS "extractionStrategy";
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "schemas" ADD COLUMN "extractionStrategy" VARCHAR;
    `);
  }
}
