import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropValidationTemplate1705260000000 implements MigrationInterface {
  name = 'DropValidationTemplate1705260000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "validation_scripts" WHERE "is_template" = true`);
    await queryRunner.query(`ALTER TABLE "validation_scripts" DROP COLUMN "is_template"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "validation_scripts" ADD COLUMN "is_template" boolean NOT NULL DEFAULT false`);
  }
}
