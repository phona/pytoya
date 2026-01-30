## ADDED Requirements

### Requirement: Settings Save UX Must Not Get Stuck
The web application SHALL ensure that settings save actions cannot leave the UI in a permanently blocked "saving" state.

#### Scenario: Save succeeds
- **GIVEN** a user is editing a settings dialog (Project settings or Model pricing)
- **WHEN** the user clicks "Save" and the API call succeeds
- **THEN** the UI SHALL exit the saving state
- **AND** the UI SHALL close the dialog (or exit edit mode)

#### Scenario: Save fails
- **GIVEN** a user is editing a settings dialog (Project settings or Model pricing)
- **WHEN** the user clicks "Save" and the API call fails
- **THEN** the UI SHALL exit the saving state
- **AND** the UI SHALL keep the dialog open so the user can retry
- **AND** the UI SHALL show a user-visible error message

