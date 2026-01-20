import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddManifestTextExtractor1705390000000 implements MigrationInterface {
  name = 'AddManifestTextExtractor1705390000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "manifests" ADD COLUMN "text_extractor_id" UUID;
    `);

    await queryRunner.query(`
      ALTER TABLE "manifests"
      ADD CONSTRAINT "fk_manifests_text_extractor"
      FOREIGN KEY ("text_extractor_id") REFERENCES "extractors"("id") ON DELETE SET NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "manifests" DROP CONSTRAINT IF EXISTS "fk_manifests_text_extractor";
    `);
    await queryRunner.query(`
      ALTER TABLE "manifests" DROP COLUMN IF EXISTS "text_extractor_id";
    `);
  }
}
