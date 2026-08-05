-- pytoya-optimize scan.sql — 只读扫描
-- 用法: psql -U postgres -d pytoya -v last_round='2026-03-01' -f scan.sql

\echo === 新增纠正 diff（自上轮以来） ===
SELECT l.id AS log_id, l.manifest_id, l.created_at,
       d->>'path' AS path, d->>'before' AS before, d->>'after' AS after
FROM operation_logs l, jsonb_array_elements(l.diffs) d
WHERE l.action = 'manual_edit' AND l.created_at > :'last_round'::timestamp
ORDER BY l.id;

\echo === 纠正分布（全历史 top 15） ===
SELECT regexp_replace(d->>'path', '\.\d+\.', '.N.') AS path, count(*)
FROM operation_logs l, jsonb_array_elements(l.diffs) d
WHERE l.action = 'manual_edit'
GROUP BY 1 ORDER BY 2 DESC LIMIT 15;

\echo === failed 单据 ===
SELECT id, group_id, status, updated_at FROM manifests
WHERE status = 'failed' ORDER BY id;

\echo === 新完成单据数（自上轮以来） ===
SELECT count(*) FROM manifests
WHERE status = 'completed' AND updated_at > :'last_round'::timestamp;

\echo === schema 14 现状（ocrExtractors + promptRules 长度） ===
SELECT validation_settings->'ocrExtractors' AS ocr_extractors,
       length(validation_settings->>'promptRulesMarkdown') AS prompt_rules_len
FROM schemas WHERE id = 14;

\echo === 待审品名（新完成单据的 items[*].name） ===
SELECT m.id AS manifest_id, (i - 1) AS row_idx, r->>'name' AS name
FROM manifests m,
     jsonb_array_elements(m.extracted_data->'items') WITH ORDINALITY AS x(r, i)
WHERE m.status = 'completed' AND m.updated_at > :'last_round'::timestamp
ORDER BY m.id, i;
