import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSchemas1705140000000 implements MigrationInterface {
  name = 'AddSchemas1705140000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create schemas table
    await queryRunner.query(`
      CREATE TABLE "schemas" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR NOT NULL,
        "json_schema" JSONB NOT NULL,
        "required_fields" TEXT[] DEFAULT '{}',
        "project_id" INT NOT NULL,
        "is_template" BOOLEAN DEFAULT false NOT NULL,
        "description" VARCHAR,
        "created_at" TIMESTAMP DEFAULT now(),
        "updated_at" TIMESTAMP DEFAULT now(),
        CONSTRAINT "fk_schemas_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE
      );
      CREATE INDEX "schemas_project_id_idx" ON "schemas"("project_id");
      CREATE INDEX "schemas_is_template_idx" ON "schemas"("is_template");
    `);

    // Add default_schema_id column to projects table
    await queryRunner.query(`
      ALTER TABLE "projects"
      ADD COLUMN "default_schema_id" INT;
      ALTER TABLE "projects"
      ADD CONSTRAINT "fk_projects_default_schema" FOREIGN KEY ("default_schema_id") REFERENCES "schemas"("id") ON DELETE SET NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "schemas";`);
    await queryRunner.query(`
      ALTER TABLE "projects"
      DROP CONSTRAINT "fk_projects_default_schema";
      ALTER TABLE "projects"
      DROP COLUMN "default_schema_id";
    `);
  }
}
