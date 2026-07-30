/**
 * Data migration: populate schema.validationSettings.ocrExtractors from project.textExtractorId.
 *
 * New schema no longer reads project.textExtractorId — each schema must have
 * validationSettings.ocrExtractors configured.
 *
 * This script reads the old project config and writes it to each schema.
 *
 * Usage:
 *   npx ts-node scripts/migrate-ocr-extractors.ts
 *
 * Dry run (no writes):
 *   npx ts-node scripts/migrate-ocr-extractors.ts --dry-run
 */

import { createConnection } from 'typeorm';

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  const connection = await createConnection();

  // Query schemas that lack ocrExtractors
  const schemas: Array<{ id: number; projectId: number; validationSettings: Record<string, unknown> | null }> =
    await connection.query(
      `SELECT s.id, s.project_id AS "projectId", s.validation_settings AS "validationSettings"
       FROM schemas s
       WHERE s.validation_settings IS NULL
          OR s.validation_settings::jsonb->'ocrExtractors' IS NULL`,
    );

  if (schemas.length === 0) {
    console.log('All schemas already have ocrExtractors configured. Nothing to do.');
    await connection.close();
    return;
  }

  console.log(`Found ${schemas.length} schema(s) without ocrExtractors.`);

  for (const schema of schemas) {
    // Get project's textExtractorId
    const projects: Array<{ textExtractorId: string | null }> = await connection.query(
      `SELECT text_extractor_id AS "textExtractorId"
       FROM projects
       WHERE id = $1`,
      [schema.projectId],
    );

    const project = projects[0];
    const extractorType = project?.textExtractorId ?? 'paddle-ocr-vl';

    // Resolve the type name to an actual ExtractorEntity UUID
    const extractors: Array<{ id: string }> = await connection.query(
      `SELECT id FROM extractors WHERE extractor_type = $1 LIMIT 1`,
      [extractorType],
    );

    if (extractors.length === 0) {
      console.warn(`  Skipping schema ${schema.id}: no Extractor entity found for type "${extractorType}"`);
      continue;
    }

    const settings = schema.validationSettings ?? {};
    (settings as any).ocrExtractors = [{ extractorId: extractors[0].id, config: {} }];

    if (isDryRun) {
      console.log(`  [DRY RUN] Schema ${schema.id}: ocrExtractors ← [{ extractorId: "${extractorType}" }]`);
    } else {
      await connection.query(
        `UPDATE schemas
         SET validation_settings = $1::jsonb
         WHERE id = $2`,
        [JSON.stringify(settings), schema.id],
      );
      console.log(`  Schema ${schema.id}: ocrExtractors ← [{ extractorId: "${extractorType}" }]`);
    }
  }

  if (isDryRun) {
    console.log('\nDry run complete. Run without --dry-run to apply.');
  } else {
    console.log(`\nMigration complete. ${schemas.length} schema(s) updated.`);
  }

  await connection.close();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
