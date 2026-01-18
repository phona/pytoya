# Tasks: Improve Project Settings UX

## 1. GroupCard Navigation & Status
- [ ] 1.1 Add status indicators to GroupCard (pending, error, verified counts)
- [ ] 1.2 Make entire GroupCard clickable with hover state
- [ ] 1.3 Add "View →" text hint for navigation affordance
- [ ] 1.4 Wire onClick to navigate to `/projects/:projectId/groups/:groupId/manifests`
- [ ] 1.5 Move Edit/Delete buttons to a menu or keep visible on hover

## 2. Settings Dropdown Menu
- [ ] 2.1 Create SettingsDropdown component using shadcn DropdownMenu
- [ ] 2.2 Add menu sections: Basic, Models, Schema & Rules, Scripts, Danger Zone
- [ ] 2.3 Wire menu items to navigate to respective settings pages
- [ ] 2.4 Replace "Project Settings" button with SettingsDropdown in ProjectDetailPage

## 3. Settings Overview Cards
- [ ] 3.1 Create SettingsCard component (clickable, shows count/status)
- [ ] 3.2 Add cards section to ProjectDetailPage below Groups
- [ ] 3.3 Wire cards to navigate: Schema, Rules, Validation Scripts
- [ ] 3.4 Add hover states and click affordance

## 4. Quick Create Flow
- [ ] 4.1 Add create mode selection to ProjectsPage (Quick vs Guided)
- [ ] 4.2 Simplify ProjectWizard to "Quick Create" (name + model only)
- [ ] 4.3 Keep full wizard as "Guided Setup" opt-in
- [ ] 4.4 Update ProjectWizard to remove edit mode (use dedicated pages instead)

## 5. New Settings Pages (for future)
- [ ] 5.1 Create BasicSettingsPage (name, description modal)
- [ ] 5.2 Create ModelSettingsPage (OCR/LLM selection modal)
- [ ] 5.3 Add routes: `/projects/:id/settings/basic`, `/projects/:id/settings/models`

## 6. Tests
- [ ] 6.1 Update GroupCard.test.tsx for navigation and status
- [ ] 6.2 Update ProjectDetailPage.test.tsx for settings dropdown
- [ ] 6.3 Add tests for SettingsCard component
- [ ] 6.4 Update ProjectWizard tests for quick create flow

## 7. Documentation
- [ ] 7.1 Update WEB_APP.md with new navigation flow
- [ ] 7.2 Document settings dropdown pattern
- [ ] 7.3 Update PROJECT_CREATION.md with quick create option
