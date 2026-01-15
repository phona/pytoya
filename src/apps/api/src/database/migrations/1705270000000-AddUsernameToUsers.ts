import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUsernameToUsers1705270000000 implements MigrationInterface {
  name = 'AddUsernameToUsers1705270000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD "username" VARCHAR(255) UNIQUE NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "username"
    `);
  }
}
