-- pytoya-optimize fix_preview.sql — 修复预览（只读，先看这个再决定执行）
-- 用法: psql -U postgres -d pytoya -f fix_preview.sql

\echo === 税价串列候选（命中行 + 建议修复值） ===
WITH rows AS (
  SELECT m.id AS manifest_id, (i - 1) AS row_idx,
         r->>'unit_price_ex_tax' AS ex, r->>'unit_price_inc_tax' AS inc
  FROM manifests m,
       jsonb_array_elements(m.extracted_data->'items') WITH ORDINALITY AS x(r, i)
  WHERE m.status = 'completed'
), num AS (
  SELECT *, NULLIF(trim(ex), '')::numeric AS n_ex, NULLIF(trim(inc), '')::numeric AS n_inc
  FROM rows
), doc_guard AS (
  SELECT manifest_id,
         count(*) FILTER (WHERE n_ex = n_inc)::float / NULLIF(count(*), 0) AS eq_ratio
  FROM num GROUP BY manifest_id
)
SELECT n.manifest_id, n.row_idx, n.ex AS current_ex, n.inc,
       round(n.n_inc / 1.13, 2) AS suggested_ex,
       round(g.eq_ratio::numeric, 2) AS doc_eq_ratio
FROM num n JOIN doc_guard g ON g.manifest_id = n.manifest_id
WHERE n.n_inc > 0 AND n.n_ex IS NOT NULL
  AND abs(n.n_ex - n.n_inc) / n.n_inc < 0.02
  AND abs(n.n_ex - n.n_inc / 1.13) / GREATEST(n.n_ex, 0.01) > 0.02
  AND COALESCE(g.eq_ratio, 0) < 0.5
ORDER BY n.manifest_id, n.row_idx;

\echo === 零税率守卫命中的单据（整单跳过，仅展示） ===
WITH rows AS (
  SELECT m.id AS manifest_id,
         NULLIF(trim(r->>'unit_price_ex_tax'), '')::numeric AS n_ex,
         NULLIF(trim(r->>'unit_price_inc_tax'), '')::numeric AS n_inc
  FROM manifests m,
       jsonb_array_elements(m.extracted_data->'items') AS r
  WHERE m.status = 'completed'
)
SELECT manifest_id, count(*) AS rows,
       count(*) FILTER (WHERE n_ex = n_inc) AS equal_rows
FROM rows GROUP BY manifest_id
HAVING count(*) FILTER (WHERE n_ex = n_inc)::float / NULLIF(count(*), 0) >= 0.5;

\echo === 垃圾行候选（纯数字/过短品名） ===
SELECT m.id AS manifest_id, (i - 1) AS row_idx, r->>'name' AS name
FROM manifests m,
     jsonb_array_elements(m.extracted_data->'items') WITH ORDINALITY AS x(r, i)
WHERE m.status = 'completed'
  AND (COALESCE(r->>'name', '') ~ '^[0-9. -]+$'
       OR length(trim(COALESCE(r->>'name', ''))) < 2)
ORDER BY m.id, i;

\echo === 重复行候选（同 manifest 内 name+quantity+inc_price 全同，保留首个） ===
SELECT manifest_id, row_idx, name, quantity, inc_price FROM (
  SELECT m.id AS manifest_id, (i - 1) AS row_idx,
         r->>'name' AS name, r->>'quantity' AS quantity,
         r->>'unit_price_inc_tax' AS inc_price,
         row_number() OVER (
           PARTITION BY m.id, r->>'name', r->>'quantity', r->>'unit_price_inc_tax'
           ORDER BY i) AS rn
  FROM manifests m,
       jsonb_array_elements(m.extracted_data->'items') WITH ORDINALITY AS x(r, i)
  WHERE m.status = 'completed'
) t WHERE rn > 1
ORDER BY manifest_id, row_idx;
