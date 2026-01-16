# Change: Add Multi-Step Project Creation Wizard

## Why

The current project creation flow is a single form with all fields visible at once. Users must:
1. Pre-create schemas separately (hidden dependency)
2. Pre-configure prompts separately (hidden dependency)
3. Understand extraction strategies before creating a project

This creates cognitive load and onboarding friction. A multi-step wizard with inline schema/prompt creation and LLM-assisted prompt optimization would simplify the experience.

## What Changes

- **UI Pattern: Dialog-based forms** - All forms open as modal dialogs overlaying list pages (no navigation)
- Replace single-form `ProjectForm` with multi-step wizard dialog:
  - Step 1: Basic info (name, description)
  - Step 2: Extraction strategy selection
  - Step 3a: Schema-based → Visual schema builder embedded
  - Step 3b: Prompt-based → LLM prompt optimization interface
  - Step 4: Model selection (OCR + LLM)
  - Step 5: Review & create
- Simplify sidebar navigation:
  - Remove: Schemas, Prompts, Validation Scripts
  - Keep: Projects, Models, Settings
- Add LLM prompt optimization endpoint (backend) to generate extraction prompts from user descriptions
- Move schema creation to project wizard (schemas still stored as entities, but created inline)
- Move validation script configuration to project settings (per-project)
- Apply dialog pattern to all entity forms (Projects, Models, Schemas)

## Impact

- Affected specs: `web-app`, `projects`, `extraction`
- Affected code:
  - `src/apps/web/src/shared/components/ProjectForm.tsx` - complete rewrite as wizard
  - `src/apps/web/src/shared/components/SidebarNav.tsx` - simplified nav items
  - `src/apps/web/src/routes/dashboard/SchemasPage.tsx` - remove or make admin-only
  - `src/apps/web/src/routes/dashboard/PromptsPage.tsx` - remove or make admin-only
  - `src/apps/web/src/routes/dashboard/ValidationScriptsPage.tsx` - remove or make admin-only
  - `src/apps/api/src/extraction/extraction.service.ts` - add prompt optimization endpoint
- Breaking changes:
  - Schemas page removed (schemas now managed within projects)
  - Prompts page removed (prompts now optimized inline)
- Dependencies: None
