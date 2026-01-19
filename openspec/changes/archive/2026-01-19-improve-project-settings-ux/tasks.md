# Tasks: Improve Project Settings UX

## 1. GroupCard Navigation & Status
- [x] 1.1 Add status indicators to GroupCard (pending, error, verified counts)
- [x] 1.2 Make entire GroupCard clickable with hover state
- [x] 1.3 Add view text hint for navigation affordance
- [x] 1.4 Wire onClick to navigate to `/projects/:projectId/groups/:groupId/manifests`
- [x] 1.5 Move Edit/Delete buttons to a menu or keep visible on hover

## 2. Settings Dropdown Menu
- [x] 2.1 Create SettingsDropdown component using shadcn DropdownMenu
- [x] 2.2 Add menu sections: Basic, Models, Schema & Rules, Scripts, Danger Zone
- [x] 2.3 Wire menu items to navigate to respective settings pages
- [x] 2.4 Replace "Project Settings" button with SettingsDropdown in ProjectDetailPage

## 3. Settings Overview Cards
- [x] 3.1 Create SettingsCard component (clickable, shows count/status)
- [x] 3.2 Add cards section to ProjectDetailPage below Groups
- [x] 3.3 Wire cards to navigate: Schema, Rules, Validation Scripts
- [x] 3.4 Add hover states and click affordance

## 4. Quick Create Flow
- [x] 4.1 Add create mode selection to ProjectsPage (Quick vs Guided)
- [x] 4.2 Simplify ProjectWizard to "Quick Create" (name + model only)
- [x] 4.3 Keep full wizard as "Guided Setup" opt-in
- [x] 4.4 Update ProjectWizard to remove edit mode (use dedicated pages instead)

## 5. New Settings Pages (for future)
- [x] 5.1 Create BasicSettingsPage (name, description modal)
- [x] 5.2 Create ModelSettingsPage (OCR/LLM selection modal)
- [x] 5.3 Add routes: `/projects/:id/settings/basic`, `/projects/:id/settings/models`

## 6. Tests
- [x] 6.1 Update GroupCard.test.tsx for navigation and status
- [x] 6.2 Update ProjectDetailPage.test.tsx for settings dropdown
- [x] 6.3 Add tests for SettingsCard component
- [x] 6.4 Update ProjectWizard tests for quick create flow

## 7. Documentation
- [x] 7.1 Update WEB_APP.md with new navigation flow
- [x] 7.2 Document settings dropdown pattern
- [x] 7.3 Update PROJECT_CREATION.md with quick create option
