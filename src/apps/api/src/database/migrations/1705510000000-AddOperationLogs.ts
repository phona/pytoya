import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOperationLogs1705510000000 implements MigrationInterface {
  name = 'AddOperationLogs1705510000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "operation_logs" (
        "id" SERIAL PRIMARY KEY,
        "manifest_id" INT NOT NULL,
        "user_id" INT NOT NULL,
        "action" VARCHAR NOT NULL,
        "diffs" JSONB NOT NULL DEFAULT '[]',
        "metadata" JSONB,
        "created_at" TIMESTAMP DEFAULT now(),
        CONSTRAINT "fk_operation_logs_manifest" FOREIGN KEY ("manifest_id") REFERENCES "manifests"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_operation_logs_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL
      );
      CREATE INDEX "operation_logs_manifest_id_idx" ON "operation_logs"("manifest_id");
      CREATE INDEX "operation_logs_user_id_idx" ON "operation_logs"("user_id");
      CREATE INDEX "operation_logs_created_at_idx" ON "operation_logs"("created_at" DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "operation_logs";`);
  }
}
