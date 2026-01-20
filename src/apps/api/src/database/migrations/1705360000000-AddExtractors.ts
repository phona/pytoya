import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExtractors1705360000000 implements MigrationInterface {
  name = 'AddExtractors1705360000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "extractors" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" VARCHAR NOT NULL,
        "extractor_type" VARCHAR NOT NULL,
        "config" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "description" VARCHAR,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMP DEFAULT now(),
        "updated_at" TIMESTAMP DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "extractors_type_idx" ON "extractors"("extractor_type");
    `);
    await queryRunner.query(`
      CREATE INDEX "extractors_is_active_idx" ON "extractors"("is_active");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "extractors";');
  }
}
