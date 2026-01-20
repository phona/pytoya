import { MigrationInterface, QueryRunner } from 'typeorm';

export class SetDefaultProjectExtractor1705400000000 implements MigrationInterface {
  name = 'SetDefaultProjectExtractor1705400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "projects"
      SET "text_extractor_id" = (
        SELECT "id" FROM "extractors"
        WHERE "extractor_type" = 'paddleocr'
        ORDER BY "created_at" ASC
        LIMIT 1
      )
      WHERE "text_extractor_id" IS NULL;
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // no-op
  }
}
