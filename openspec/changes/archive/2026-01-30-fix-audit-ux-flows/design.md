# Design: fix-audit-ux-flows

## 1) Human Verified override flag

Goal: keep strict default, but make explicit override work after user confirms.

ASCII:
```
validate errors?
  no  -> allow verify
  yes -> allow verify ONLY with allowValidationErrors=true
```

## 2) List websocket subscriptions

Use existing ref-counted subscription API in `useWebSocket`.

ASCII:
```
List page shows rows: [id1 id2 ...]
  subscribe all
When rows change:
  unsubscribe old
  subscribe new
```

## 3) OCR highlight semantics

Rule: UI must not claim “confidence” if confidence is not available at the granularity being highlighted.

Options:
- Hide toggle when no confidence signal exists.
- Rename toggle to explicitly “heuristic”.

We start with the minimal truthful UX change (no misleading label).

