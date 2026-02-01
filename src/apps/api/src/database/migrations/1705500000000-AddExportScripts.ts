import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExportScripts1705500000000 implements MigrationInterface {
  name = 'AddExportScripts1705500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "export_scripts" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR NOT NULL,
        "description" VARCHAR,
        "project_id" INT NOT NULL,
        "script" TEXT NOT NULL,
        "enabled" BOOLEAN DEFAULT true NOT NULL,
        "priority" INT DEFAULT 0 NOT NULL,
        "created_at" TIMESTAMP DEFAULT now(),
        "updated_at" TIMESTAMP DEFAULT now(),
        CONSTRAINT "fk_export_scripts_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE
      );
      CREATE INDEX "export_scripts_project_id_idx" ON "export_scripts"("project_id");
      CREATE INDEX "export_scripts_priority_idx" ON "export_scripts"("priority");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "export_scripts";`);
  }
}

