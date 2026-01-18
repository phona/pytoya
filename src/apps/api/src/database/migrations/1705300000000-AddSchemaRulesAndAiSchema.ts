import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSchemaRulesAndAiSchema1705300000000
  implements MigrationInterface
{
  name = 'AddSchemaRulesAndAiSchema1705300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "schema_rules" (
        "id" SERIAL PRIMARY KEY,
        "schema_id" INT NOT NULL,
        "field_path" VARCHAR NOT NULL,
        "rule_type" VARCHAR NOT NULL,
        "rule_operator" VARCHAR NOT NULL,
        "rule_config" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "error_message" VARCHAR,
        "priority" INT NOT NULL DEFAULT 0,
        "enabled" BOOLEAN NOT NULL DEFAULT true,
        "description" VARCHAR,
        "created_at" TIMESTAMP DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "schema_rules_schema_id_idx"
      ON "schema_rules" ("schema_id");
    `);

    await queryRunner.query(`
      ALTER TABLE "schema_rules"
      ADD CONSTRAINT "fk_schema_rules_schema"
      FOREIGN KEY ("schema_id") REFERENCES "schemas"("id") ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      ALTER TABLE "schemas"
      ADD COLUMN "system_prompt_template" TEXT,
      ADD COLUMN "validation_settings" JSONB;
    `);

    await queryRunner.query(`
      ALTER TABLE "schemas"
      DROP COLUMN IF EXISTS "is_template";
    `);

    await queryRunner.query(`
      ALTER TABLE "projects"
      DROP COLUMN IF EXISTS "default_prompt_id";
    `);

    await queryRunner.query(`
      ALTER TABLE "projects"
      ALTER COLUMN "llm_model_id" SET NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "projects"
      ALTER COLUMN "llm_model_id" DROP NOT NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE "projects"
      ADD COLUMN "default_prompt_id" VARCHAR;
    `);

    await queryRunner.query(`
      ALTER TABLE "schemas"
      ADD COLUMN "is_template" BOOLEAN NOT NULL DEFAULT false;
    `);

    await queryRunner.query(`
      ALTER TABLE "schemas"
      DROP COLUMN IF EXISTS "system_prompt_template",
      DROP COLUMN IF EXISTS "validation_settings";
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "schema_rules";
    `);
  }
}
