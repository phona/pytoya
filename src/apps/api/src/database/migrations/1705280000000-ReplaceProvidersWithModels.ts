import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReplaceProvidersWithModels1705280000000 implements MigrationInterface {
  name = 'ReplaceProvidersWithModels1705280000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "models" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" VARCHAR NOT NULL,
        "adapter_type" VARCHAR NOT NULL,
        "parameters" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "description" VARCHAR,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMP DEFAULT now(),
        "updated_at" TIMESTAMP DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "models_adapter_type_idx" ON "models"("adapter_type");
    `);
    await queryRunner.query(`
      CREATE INDEX "models_is_active_idx" ON "models"("is_active");
    `);

    await queryRunner.query(`
      ALTER TABLE "projects"
      DROP COLUMN IF EXISTS "default_provider_id",
      ADD COLUMN "ocr_model_id" UUID,
      ADD COLUMN "llm_model_id" UUID;
    `);

    await queryRunner.query(`
      ALTER TABLE "projects"
      ADD CONSTRAINT "fk_projects_ocr_model"
      FOREIGN KEY ("ocr_model_id") REFERENCES "models"("id") ON DELETE SET NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE "projects"
      ADD CONSTRAINT "fk_projects_llm_model"
      FOREIGN KEY ("llm_model_id") REFERENCES "models"("id") ON DELETE SET NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE "jobs"
      DROP COLUMN IF EXISTS "provider_id",
      ADD COLUMN "llm_model_id" UUID;
    `);

    await queryRunner.query(`DROP TABLE IF EXISTS "providers" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "llm_providers" CASCADE;`);
    await queryRunner.query(`DROP TYPE IF EXISTS "provider_type_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "llm_provider_type_enum";`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "provider_type_enum" AS ENUM ('PADDLEX', 'OPENAI', 'CUSTOM');
    `);
    await queryRunner.query(`
      CREATE TYPE "llm_provider_type_enum" AS ENUM ('paddlex', 'openai', 'anthropic');
    `);

    await queryRunner.query(`
      CREATE TABLE "providers" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR NOT NULL,
        "type" "provider_type_enum" NOT NULL,
        "base_url" VARCHAR NOT NULL,
        "api_key" VARCHAR NOT NULL,
        "model_name" VARCHAR,
        "temperature" FLOAT,
        "max_tokens" INT,
        "is_default" BOOLEAN DEFAULT false NOT NULL,
        "supportsVision" BOOLEAN DEFAULT false NOT NULL,
        "supportsStructuredOutput" BOOLEAN DEFAULT false NOT NULL,
        "created_at" TIMESTAMP DEFAULT now(),
        "updated_at" TIMESTAMP DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "providers_name_idx" ON "providers"("name");
    `);

    await queryRunner.query(`
      CREATE TABLE "llm_providers" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" VARCHAR NOT NULL,
        "type" "llm_provider_type_enum" NOT NULL,
        "api_key" VARCHAR NOT NULL,
        "base_url" VARCHAR,
        "config" JSONB,
        "is_active" BOOLEAN DEFAULT true NOT NULL,
        "created_at" TIMESTAMP DEFAULT now(),
        "updated_at" TIMESTAMP DEFAULT now()
      );
    `);

    await queryRunner.query(`
      ALTER TABLE "projects"
      DROP CONSTRAINT IF EXISTS "fk_projects_ocr_model",
      DROP CONSTRAINT IF EXISTS "fk_projects_llm_model",
      DROP COLUMN IF EXISTS "ocr_model_id",
      DROP COLUMN IF EXISTS "llm_model_id",
      ADD COLUMN "default_provider_id" VARCHAR;
    `);

    await queryRunner.query(`
      ALTER TABLE "jobs"
      DROP COLUMN IF EXISTS "llm_model_id",
      ADD COLUMN "provider_id" INT;
    `);

    await queryRunner.query(`DROP TABLE IF EXISTS "models";`);
  }
}
