# Change: Improve Project Settings UX

## Why
The current project settings experience has several UX problems:
1. **No navigation to manifests**: GroupCard displays groups but has no click handler, forcing users to manually type URLs
2. **Monolithic edit flow**: Clicking "Project Settings" opens a 6-step wizard (1000+ lines) even for simple changes like model selection
3. **Poor discoverability**: Settings are hidden behind a wizard with no clear overview
4. **No quick create**: New projects must complete all 6 steps even for MVP use cases

## What Changes
- Add navigation to GroupCard to access manifests
- Replace "Project Settings" button with organized dropdown menu
- Add settings overview cards to ProjectDetailPage for quick access
- Implement "Quick Create" option for new projects (name + model only)
- Add status indicators to GroupCard (pending, error, verified counts)
- Make GroupCard fully clickable with visible affordance

## Impact
- Affected specs: web-app
- Affected code:
  - `src/apps/web/src/routes/dashboard/ProjectDetailPage.tsx`
  - `src/apps/web/src/shared/components/GroupCard.tsx`
  - `src/apps/web/src/shared/components/ProjectWizard.tsx`
  - `src/apps/web/src/shared/components/ExportButton.tsx`
  - `src/apps/web/src/app/router.tsx` (new routes)
- **BREAKING**: ProjectWizard edit mode will be removed (replaced by dedicated pages)
