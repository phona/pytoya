# Change: Manifests UI: List Page + Audit Panel

## Why
Users need a comprehensive UI to view, filter, and audit invoice manifests with advanced features like re-extract buttons and OCR viewing.

## What Changes
- Create list page with advanced filters sidebar (status, PO, date range, department, confidence, human verified)
- Implement sort options (PO, date, confidence, status)
- Add view toggle (table/card)
- Implement pagination
- Add batch actions (export CSV, re-extract selected)
- Create two-column audit panel (PDF viewer | Editable form)
- Add "Re-extract All" button at top
- Add "Re-extract" button next to each field
- Add OCR result viewer tab
- Add extraction history
- Implement confidence indicators (color-coded borders)
- Implement items management (add/edit/delete)
- Auto-save with debouncing + manual save button
- Navigation (previous/next within filtered results)
- Port existing `audit_page/` logic to React

## Impact
- Affected specs: New manifest-ui capability
- Affected code: New frontend components and pages
