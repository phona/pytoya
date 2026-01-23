import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddManifestContentSha2561705460000000
  implements MigrationInterface
{
  name = 'AddManifestContentSha2561705460000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "manifests"
        ADD COLUMN IF NOT EXISTS "content_sha256" VARCHAR;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_manifests_group_content_sha256_unique"
        ON "manifests" ("group_id", "content_sha256")
        WHERE "content_sha256" IS NOT NULL;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_manifests_group_content_sha256_unique";
    `);

    await queryRunner.query(`
      ALTER TABLE "manifests" DROP COLUMN IF EXISTS "content_sha256";
    `);
  }
}

