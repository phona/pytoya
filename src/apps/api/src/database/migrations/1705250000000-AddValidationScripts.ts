import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddValidationScripts1705250000000 implements MigrationInterface {
  name = 'AddValidationScripts1705250000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add validation_results column to manifests table
    await queryRunner.query(`
      ALTER TABLE "manifests"
      ADD COLUMN "validation_results" JSONB;
    `);

    // Create validation_scripts table
    await queryRunner.query(`
      CREATE TABLE "validation_scripts" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR NOT NULL,
        "description" VARCHAR,
        "project_id" INT NOT NULL,
        "script" TEXT NOT NULL,
        "severity" VARCHAR DEFAULT 'warning' NOT NULL,
        "enabled" BOOLEAN DEFAULT true NOT NULL,
        "is_template" BOOLEAN DEFAULT false NOT NULL,
        "created_at" TIMESTAMP DEFAULT now(),
        "updated_at" TIMESTAMP DEFAULT now(),
        CONSTRAINT "fk_validation_scripts_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE
      );
      CREATE INDEX "validation_scripts_project_id_idx" ON "validation_scripts"("project_id");
      CREATE INDEX "validation_scripts_severity_idx" ON "validation_scripts"("severity");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "validation_scripts";`);
    await queryRunner.query(`
      ALTER TABLE "manifests"
      DROP COLUMN "validation_results";
    `);
  }
}
