-- pytoya-optimize fix_junk_apply.sql — 垃圾行清理（按 manifest，事务）
-- 用法: psql -U postgres -d pytoya -v ON_ERROR_STOP=1 -v mid=<manifest_id> -f fix_junk_apply.sql
-- 删除：纯数字/过短品名行 + 完全重复行（name+quantity+inc_price 全同，保留首个）
-- 必须在税价修复之后执行（删行会移动下标）
BEGIN;
UPDATE manifests
SET extracted_data = jsonb_set(
      extracted_data, '{items}',
      COALESCE((
        SELECT jsonb_agg(elem ORDER BY idx)
        FROM (
          SELECT elem, idx,
                 row_number() OVER (
                   PARTITION BY elem->>'name', elem->>'quantity', elem->>'unit_price_inc_tax'
                   ORDER BY idx) AS rn
          FROM jsonb_array_elements(extracted_data->'items') WITH ORDINALITY AS x(elem, idx)
          WHERE NOT (
            COALESCE(elem->>'name', '') ~ '^[0-9. -]+$'
            OR length(trim(COALESCE(elem->>'name', ''))) < 2
          )
        ) t
        WHERE rn = 1
      ), '[]'::jsonb)
    ),
    validation_results = COALESCE(validation_results, '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object('rule', 'junk_row_filter', 'at', now())
    ),
    updated_at = now()
WHERE id = :mid;
COMMIT;
