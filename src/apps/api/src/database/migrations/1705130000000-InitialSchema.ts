import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1705130000000 implements MigrationInterface {
  name = 'InitialSchema1705130000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create users table
    await queryRunner.query(`
      CREATE TYPE "user_role_enum" AS ENUM ('admin', 'user');
      CREATE TABLE "users" (
        "id" SERIAL PRIMARY KEY,
        "email" VARCHAR(255) UNIQUE NOT NULL,
        "password_hash" VARCHAR NOT NULL,
        "role" "user_role_enum" DEFAULT 'user' NOT NULL,
        "created_at" TIMESTAMP DEFAULT now(),
        "updated_at" TIMESTAMP DEFAULT now()
      );
    `);

    // Create llm_providers table (no FK dependencies)
    await queryRunner.query(`
      CREATE TYPE "llm_provider_type_enum" AS ENUM ('paddlex', 'openai', 'anthropic');
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

    // Create providers table (OCR providers)
    await queryRunner.query(`
      CREATE TYPE "provider_type_enum" AS ENUM ('PADDLEX', 'OPENAI', 'CUSTOM');
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
        "created_at" TIMESTAMP DEFAULT now(),
        "updated_at" TIMESTAMP DEFAULT now()
      );
      CREATE INDEX "providers_name_idx" ON "providers"("name");
    `);

    // Create prompts table (no FK dependencies)
    await queryRunner.query(`
      CREATE TYPE "prompt_type_enum" AS ENUM ('system', 're_extract');
      CREATE TABLE "prompts" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR NOT NULL,
        "type" "prompt_type_enum" NOT NULL,
        "content" TEXT NOT NULL,
        "variables" JSONB,
        "created_at" TIMESTAMP DEFAULT now(),
        "updated_at" TIMESTAMP DEFAULT now()
      );
    `);

    // Create projects table
    await queryRunner.query(`
      CREATE TABLE "projects" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR NOT NULL,
        "description" VARCHAR,
        "default_provider_id" VARCHAR,
        "default_prompt_id" INT,
        "user_id" INT NOT NULL,
        "created_at" TIMESTAMP DEFAULT now(),
        "updated_at" TIMESTAMP DEFAULT now(),
        CONSTRAINT "fk_projects_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      );
      CREATE INDEX "projects_user_id_idx" ON "projects"("user_id");
    `);

    // Create groups table
    await queryRunner.query(`
      CREATE TABLE "groups" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR NOT NULL,
        "project_id" INT NOT NULL,
        "created_at" TIMESTAMP DEFAULT now(),
        "updated_at" TIMESTAMP DEFAULT now(),
        CONSTRAINT "fk_groups_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE
      );
      CREATE INDEX "groups_project_id_idx" ON "groups"("project_id");
    `);

    // Create manifests table
    await queryRunner.query(`
      CREATE TYPE "manifest_status_enum" AS ENUM ('pending', 'processing', 'completed', 'failed');
      CREATE TABLE "manifests" (
        "id" SERIAL PRIMARY KEY,
        "filename" VARCHAR NOT NULL,
        "original_filename" VARCHAR NOT NULL,
        "storage_path" VARCHAR NOT NULL,
        "file_size" INT NOT NULL,
        "status" "manifest_status_enum" DEFAULT 'pending' NOT NULL,
        "group_id" INT NOT NULL,
        "extracted_data" JSONB,
        "confidence" FLOAT,
        "purchase_order" VARCHAR,
        "invoice_date" DATE,
        "department" VARCHAR,
        "human_verified" BOOLEAN DEFAULT false NOT NULL,
        "created_at" TIMESTAMP DEFAULT now(),
        "updated_at" TIMESTAMP DEFAULT now(),
        CONSTRAINT "fk_manifests_group" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE
      );
      CREATE INDEX "manifests_group_id_idx" ON "manifests"("group_id");
      CREATE INDEX "manifests_status_idx" ON "manifests"("status");
      CREATE INDEX "manifests_purchase_order_idx" ON "manifests"("purchase_order");
    `);

    // Create manifest_items table
    await queryRunner.query(`
      CREATE TABLE "manifest_items" (
        "id" SERIAL PRIMARY KEY,
        "description" TEXT NOT NULL,
        "quantity" INT NOT NULL,
        "unit_price" DECIMAL NOT NULL,
        "total_price" DECIMAL NOT NULL,
        "manifest_id" INT NOT NULL,
        CONSTRAINT "fk_manifest_items_manifest" FOREIGN KEY ("manifest_id") REFERENCES "manifests"("id") ON DELETE CASCADE
      );
      CREATE INDEX "manifest_items_manifest_id_idx" ON "manifest_items"("manifest_id");
    `);

    // Create jobs table
    await queryRunner.query(`
      CREATE TYPE "job_status_enum" AS ENUM ('pending', 'processing', 'completed', 'failed');
      CREATE TABLE "jobs" (
        "id" SERIAL PRIMARY KEY,
        "manifest_id" INT NOT NULL,
        "status" "job_status_enum" DEFAULT 'pending' NOT NULL,
        "provider_id" INT,
        "prompt_id" INT,
        "queue_job_id" VARCHAR,
        "progress" FLOAT DEFAULT 0 NOT NULL,
        "attempt_count" INT DEFAULT 0 NOT NULL,
        "error_message" TEXT,
        "started_at" TIMESTAMP,
        "completed_at" TIMESTAMP,
        "created_at" TIMESTAMP DEFAULT now(),
        CONSTRAINT "fk_jobs_manifest" FOREIGN KEY ("manifest_id") REFERENCES "manifests"("id") ON DELETE CASCADE
      );
      CREATE INDEX "jobs_manifest_id_idx" ON "jobs"("manifest_id");
      CREATE INDEX "jobs_status_idx" ON "jobs"("status");
    `);

    // Create extraction_history table
    await queryRunner.query(`
      CREATE TABLE "extraction_history" (
        "id" SERIAL PRIMARY KEY,
        "manifest_id" INT NOT NULL,
        "job_id" INT NOT NULL,
        "extracted_data" JSONB,
        "confidence" FLOAT,
        "changes" JSONB,
        "reason" TEXT,
        "created_at" TIMESTAMP DEFAULT now(),
        CONSTRAINT "fk_extraction_history_manifest" FOREIGN KEY ("manifest_id") REFERENCES "manifests"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_extraction_history_job" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE
      );
      CREATE INDEX "extraction_history_manifest_id_idx" ON "extraction_history"("manifest_id");
      CREATE INDEX "extraction_history_job_id_idx" ON "extraction_history"("job_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "extraction_history";`);
    await queryRunner.query(`DROP TABLE "jobs";`);
    await queryRunner.query(`DROP TABLE "manifest_items";`);
    await queryRunner.query(`DROP TABLE "manifests";`);
    await queryRunner.query(`DROP TABLE "groups";`);
    await queryRunner.query(`DROP TABLE "projects";`);
    await queryRunner.query(`DROP TABLE "prompts";`);
    await queryRunner.query(`DROP TABLE "providers";`);
    await queryRunner.query(`DROP TABLE "llm_providers";`);
    await queryRunner.query(`DROP TABLE "users";`);
    await queryRunner.query(`DROP TYPE "job_status_enum";`);
    await queryRunner.query(`DROP TYPE "manifest_status_enum";`);
    await queryRunner.query(`DROP TYPE "prompt_type_enum";`);
    await queryRunner.query(`DROP TYPE "provider_type_enum";`);
    await queryRunner.query(`DROP TYPE "llm_provider_type_enum";`);
    await queryRunner.query(`DROP TYPE "user_role_enum";`);
  }
}
