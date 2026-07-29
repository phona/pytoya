# OCR Extractors 数据迁移

## 背景

旧配置：`project.textExtractorId`（单个 extractor）
新配置：`schema.validationSettings.ocrExtractors`（extractor 数组）

旧代码有 fallback 读取 `project.textExtractorId`，新版已去掉 fallback，所有 schema 必须配置 `ocrExtractors` 才能执行 extraction。

## 迁移步骤

### 1. 预览（确认影响范围）

```bash
npx ts-node scripts/migrate-ocr-extractors.ts --dry-run
```

输出示例：
```
Found 12 schema(s) without ocrExtractors.
  [DRY RUN] Schema 3: ocrExtractors ← [{ type: "paddle-ocr-vl" }]
  [DRY RUN] Schema 7: ocrExtractors ← [{ type: "inference-ocr" }]
  ...

Dry run complete. Run without --dry-run to apply.
```

### 2. 执行迁移

```bash
npx ts-node scripts/migrate-ocr-extractors.ts
```

迁移逻辑：
- 遍历所有 `validationSettings` 中没有 `ocrExtractors` 的 schema
- 从所属 project 的 `textExtractorId` 读取旧配置，写入 `ocrExtractors`
- project 也没有 `textExtractorId` 的，默认用 `paddle-ocr-vl`

### 3. 验证

确认所有 schema 已迁移：

```sql
SELECT s.id, s.name,
  s.validation_settings->'ocrExtractors' as ocr_extractors
FROM schemas s
WHERE s.validation_settings IS NULL
   OR s.validation_settings->'ocrExtractors' IS NULL;
```

期望结果：0 行。

## 回滚

迁移只写 `validationSettings` JSONB 字段，不会删除原有数据。如需要回退：

```sql
UPDATE schemas
SET validation_settings = validation_settings - 'ocrExtractors'
WHERE validation_settings ? 'ocrExtractors';
```

## 后续清理

确认迁移全部完成后，`project.textExtractorId` 字段不再被代码读取，可考虑从数据库中移除该列：

```sql
ALTER TABLE projects DROP COLUMN text_extractor_id;
```
