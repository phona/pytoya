## ADDED Requirements

### Requirement: User Profile Password Change
The web application SHALL provide a Profile page that allows authenticated users to change their password.

#### Scenario: User opens Profile page
- **GIVEN** an authenticated user
- **WHEN** the user navigates to the Profile page
- **THEN** the system SHALL show the current username and role
- **AND** the system SHALL show a Change Password form

#### Scenario: Password change success
- **GIVEN** an authenticated user on the Profile page
- **WHEN** the user submits the Change Password form with valid inputs
- **THEN** the system SHALL call the backend change-password endpoint
- **AND** the UI SHALL show a success message

#### Scenario: Password change error
- **GIVEN** an authenticated user on the Profile page
- **WHEN** the backend returns an error (e.g. wrong current password)
- **THEN** the UI SHALL show a user-friendly error message

