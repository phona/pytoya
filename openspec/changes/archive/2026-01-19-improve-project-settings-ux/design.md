# Design: Improve Project Settings UX

## Context
The current project settings UX suffers from:
- **Monolithic wizard**: 1000+ line component handling both create and edit
- **No navigation affordance**: GroupCard doesn't link to manifests
- **Poor discoverability**: Settings hidden in multi-step flow
- **Forced complexity**: All settings required even for simple changes

Stakeholders: End users (invoice processors), admins, developers

## Goals / Non-Goals

### Goals
- Enable direct navigation from groups to manifests
- Provide clear, organized access to project settings
- Support quick project creation for MVP use cases
- Improve discoverability of all settings
- Maintain backward compatibility with existing routes

### Non-Goals
- Complete rewrite of routing structure (new routes only for settings)
- Changing the audit panel or manifests page UX (out of scope)
- Backend API changes (frontend-only)

## Decisions

### 1. GroupCard Navigation Pattern
**Decision**: Make entire card clickable with status indicators and navigation hint.

**Rationale**:
- Follows card click pattern used by ManifestCard
- Status indicators provide immediate value without navigation
- "View →" text makes affordance explicit

**Alternatives considered**:
- Add separate "View Manifests" button → rejected: adds visual noise, button already exists
- Double-click to navigate → rejected: non-standard pattern
- Keep only Edit/Delete buttons → rejected: doesn't solve navigation problem

### 2. Settings Dropdown vs Separate Page
**Decision**: Use dropdown menu on ProjectDetailPage, navigate to focused settings pages.

**Rationale**:
- Proven pattern (Linear, Notion, Slack)
- Keeps settings accessible without leaving context
- Allows for both modals (simple) and pages (complex)

**Alternatives considered**:
- Single settings page with tabs → rejected: requires more navigation
- All settings in modals → rejected: doesn't scale for complex editors
- Keep current wizard → rejected: main pain point we're solving

### 3. Quick Create vs Guided Setup
**Decision**: Offer choice upfront when creating project.

**Rationale**:
- Power users can create quickly (name + model)
- New users get guided setup if they want
- Progressive disclosure: can add schema/rules later

**Alternatives considered**:
- Single flow with optional steps → rejected: still forces linear progression
- Remove wizard entirely → rejected: guided setup valuable for new users
- Always quick create, add schema later → rejected: misses first-time UX

### 4. ProjectWizard Edit Mode Removal
**Decision**: Remove edit mode from ProjectWizard, use dedicated pages instead.

**Rationale**:
- Wizard is 1000+ lines, hard to maintain
- Edit shouldn't require stepping through all 6 steps
- Separation of concerns: create vs edit

**Migration path**:
1. Add settings dropdown with navigation
2. Create dedicated settings pages
3. Remove `mode` and `projectId` props from ProjectWizard
4. Update all edit flows to use new pages

## Component Structure

### New Components

```tsx
// SettingsDropdown component
<DropdownMenu>
  <DropdownMenuTrigger><Settings /></DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuLabel>Basic</DropdownMenuLabel>
    <DropdownMenuItem onClick={navigateToBasic}>
      Edit Name & Description
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuLabel>Models</DropdownMenuLabel>
    <DropdownMenuItem onClick={navigateToModels}>
      Change Models
    </DropdownMenuItem>
    <!-- ... -->
  </DropdownMenuContent>
</DropdownMenu>

// SettingsCard component
<Card onClick={navigate} className="cursor-pointer hover:shadow-md">
  <CardContent>
    <h3>{title}</h3>
    <p>{description}</p>
  </CardContent>
</Card>
```

### Modified Components

```tsx
// GroupCard - add navigation
interface GroupCardProps {
  group: Group; // extended with statusCounts
  onClick?: () => void; // NEW
}

export function GroupCard({ group, onClick, onEdit, onDelete }: GroupCardProps) {
  return (
    <div onClick={onClick} className="cursor-pointer hover:shadow-md">
      <h4>{group.name}</h4>
      <div>
        <StatusBadge type="pending">{group.statusCounts?.pending || 0}</StatusBadge>
        <StatusBadge type="error">{group.statusCounts?.error || 0}</StatusBadge>
        <StatusBadge type="verified">{group.statusCounts?.verified || 0}</StatusBadge>
      </div>
      <span>View →</span>
      {/* Edit/Delete move to three-dot menu or keep visible */}
    </div>
  );
}
```

## Routing Structure

```
New routes:
/projects/:id/settings/basic    → BasicSettingsPage (modal or page)
/projects/:id/settings/models   → ModelSettingsPage (modal or page)

Existing routes (unchanged):
/projects/:id                    → ProjectDetailPage
/projects/:id/groups/:groupId/manifests → ManifestsPage
/projects/:id/schemas/:schemaId  → SchemaDetailPage
```

## Visual Design

### Settings Menu Sections
```
┌──────────────────────────────────────┐
│  Project Settings          ▾         │
├──────────────────────────────────────┤
│  Basic                               │
│    Edit Name & Description           │
├──────────────────────────────────────┤
│  Models                              │
│    Change LLM/OCR Models             │
├──────────────────────────────────────┤
│  Schema & Rules                      │
│    Edit Schema                       │
│    Manage Rules                      │
├──────────────────────────────────────┤
│  Validation Scripts                  │
│    Manage Scripts                    │
├──────────────────────────────────────┤
│  Danger Zone                         │
│    Delete Project...                 │
└──────────────────────────────────────┘
```

### GroupCard Status Indicators
```
┌─────────────────────────────────┐
│ Group A                          │
│ 12 manifests                     │
│ ● 2 pending  ● 1 error  ✓ 9 verified │
│ View →                           │
└─────────────────────────────────┘
```

## Risks / Trade-offs

### Risks
- **Breaking change**: Wizard edit mode removal affects existing users
  - **Mitigation**: Add settings dropdown first, migrate before removing

- **Route proliferation**: Adding new settings routes
  - **Mitigation**: Keep minimal, use modals for simple settings

- **Status counts performance**: Querying counts for all groups
  - **Mitigation**: Backend already provides `_count`, add status aggregation

### Trade-offs
- **More components vs monolithic**: More files but easier to maintain
- **Dropdown vs sidebar**: Dropdown is simpler, sidebar would require layout change

## Migration Plan

1. **Phase 1**: Add GroupCard navigation and status (no breaking changes)
2. **Phase 2**: Add SettingsDropdown and overview cards
3. **Phase 3**: Create dedicated settings pages (basic, models)
4. **Phase 4**: Update all edit flows to use new pages
5. **Phase 5**: Remove wizard edit mode and props
6. **Phase 6**: Add Quick Create option to ProjectsPage

### Rollback
- Each phase can be independently reverted
- Old "Project Settings" button can coexist during transition
- Wizard edit mode remains until Phase 5

## Open Questions

1. Should BasicSettingsPage be a modal or a full page?
   - **Recommendation**: Modal for simple inline edits

2. Should ModelSettingsPage be a modal or full page?
   - **Recommendation**: Modal (just two dropdowns)

3. Should status counts be real-time or cached?
   - **Recommendation**: Cache on group query, refresh on navigate

4. Should we keep the "Project Settings" button during transition?
   - **Recommendation**: Yes, replace only after settings pages are implemented
