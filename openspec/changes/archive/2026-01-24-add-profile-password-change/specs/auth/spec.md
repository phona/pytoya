## ADDED Requirements

### Requirement: Password Change
The backend SHALL allow an authenticated user to change their own password by providing their current password and a new password that meets the password policy.

#### Scenario: Change password succeeds
- **GIVEN** an authenticated user
- **WHEN** the user provides the correct current password and a valid new password
- **THEN** the system MUST update the stored password hash for that user
- **AND** the endpoint MUST return success

#### Scenario: Change password fails with wrong current password
- **GIVEN** an authenticated user
- **WHEN** the user provides an incorrect current password
- **THEN** the request MUST fail with 401 Unauthorized

#### Scenario: Change password fails with weak new password
- **GIVEN** an authenticated user
- **WHEN** the user provides a new password that does not meet the password policy
- **THEN** the request MUST fail with 400 Bad Request

