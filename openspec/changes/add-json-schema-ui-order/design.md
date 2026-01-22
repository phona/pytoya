# Design: JSON Schema UI Field Ordering (`x-ui-order`)

## Problem
Postgres `jsonb` canonicalizes object keys, so JSON Schema `properties` ordering cannot be relied on after save/reload.

## Goals
- Provide user-controlled field ordering for schema-driven UI rendering.
- Keep ordering deterministic (stable) even when metadata is missing.
- Apply ordering consistently across:
  - Manifest audit form fields (root + nested + array item objects)
  - Schema preview (code view / JSON formatting)
  - Backend prompt/rules schema stringification (human-facing)

## Non-goals
- Preserve raw JSON key order through storage (not possible with `jsonb`).
- Change JSON Schema validation semantics.

## Proposed Metadata
- Property-level annotation: `x-ui-order: number`
  - Lower values render earlier.
  - Missing/invalid values are treated as "unordered".

## Ordering Rules (Deterministic)
For any schema node that is an object schema and has `properties`:
1. Sort properties by `x-ui-order` ascending (numeric).
2. Properties without valid `x-ui-order` sort last.
3. Tie-breaker is property name ascending (A→Z).

Notes:
- Arrays are not re-ordered (JSON arrays are ordered).
- Ordering is applied recursively to nested object schemas, including within array `items`.

## Pseudocode
```text
orderProps(properties):
  entries = Object.entries(properties)
  sort entries by:
    aOrder = number(a.value["x-ui-order"]) else +inf
    bOrder = number(b.value["x-ui-order"]) else +inf
    if aOrder != bOrder: return aOrder - bOrder
    return a.key localeCompare b.key
  return entries

canonicalize(node):
  if node is object-schema and node.properties exists:
    nextProps = {}
    for (name, sub) in orderProps(node.properties):
      nextProps[name] = canonicalize(sub)
    return { ...node, properties: nextProps }
  if node is array-schema and node.items exists:
    return { ...node, items: canonicalize(node.items) }
  if node.oneOf/anyOf/allOf exists:
    return { ...node, oneOf/anyOf/allOf: map canonicalize }
  return node
```

## Architecture (Where Ordering Happens)
```mermaid
flowchart LR
  UI[Web UI] -->|PATCH jsonSchema (+ x-ui-order)| API[Nest API]
  API -->|save jsonb| DB[(Postgres)]
  DB -->|GET jsonSchema (keys reordered)| API
  API --> UI
  UI -->|canonicalize()| Render[Audit Form Render]
  UI -->|canonicalize() + stringify| Preview[Schema Preview]
  API -->|canonicalize() + stringify| Prompts[Prompt/Rules Generation]
```

## Edge Cases
- Only one property has `x-ui-order`: it renders first; others render after sorted by name.
- Duplicate `x-ui-order` values: tie-break by name (stable).
- Non-numeric `x-ui-order`: treated as missing.
- Negative numbers: allowed (render earlier).

## Compatibility & Migration
- Existing schemas remain valid; missing `x-ui-order` falls back to name ordering.
- No database migration required.
