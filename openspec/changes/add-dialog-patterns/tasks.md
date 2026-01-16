## 1. Implementation

- [ ] 1.1 Create shared `Dialog` component
  - Centered modal with backdrop
  - Close on overlay click and Escape
  - Accessible title/description hooks
- [ ] 1.2 Update Models create/edit flows to use Dialog
  - Create flow: select model type first, then show ModelForm
  - Edit flow: lock model type, edit arguments only
  - Keep state handling intact
- [ ] 1.3 Update Manifests create/edit flows to use Dialog
  - Use dialog for upload (create)
  - Use dialog for audit panel (edit)
- [ ] 1.4 Wire close/reset behavior
  - Ensure cancel/close resets state
  - Ensure focus return

## 2. Testing

- [ ] 2.1 Add dialog component tests
- [ ] 2.2 Update ModelsPage tests for dialog usage
- [ ] 2.3 Update ManifestsPage tests for dialog usage

## 3. Documentation

- [ ] 3.1 Update `docs/WEB_APP.md` with dialog patterns for create/edit
