import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectTextExtractor1705380000000 implements MigrationInterface {
  name = 'AddProjectTextExtractor1705380000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "projects" ADD COLUMN "text_extractor_id" UUID;
    `);

    await queryRunner.query(`
      ALTER TABLE "projects"
      ADD CONSTRAINT "fk_projects_text_extractor"
      FOREIGN KEY ("text_extractor_id") REFERENCES "extractors"("id") ON DELETE SET NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "fk_projects_text_extractor";
    `);
    await queryRunner.query(`
      ALTER TABLE "projects" DROP COLUMN IF EXISTS "text_extractor_id";
    `);
  }
}
