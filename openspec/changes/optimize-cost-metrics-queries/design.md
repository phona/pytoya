# Design: optimize-cost-metrics-queries

## Query approaches

Latest job per manifest can be implemented by:
- Postgres `DISTINCT ON (manifest_id) ORDER BY created_at DESC`
- or window functions (`ROW_NUMBER() OVER (PARTITION BY manifest_id ORDER BY created_at DESC)`)

Choose the simplest approach supported by the existing TypeORM query style.

## Limits

Keep the existing `limit` behavior for trends and ensure queries remain bounded.

