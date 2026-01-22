## ADDED Requirements

### Requirement: Internationalization (i18n) Support
The web application SHALL support localized UI text and runtime language switching.

#### Scenario: Default locale selection
- **GIVEN** a user visits the web app with no saved language preference
- **WHEN** the application initializes
- **THEN** the app SHALL select a locale based on browser language
- **AND** the app SHALL fall back to `en` when the browser locale is unsupported

#### Scenario: Language preference persistence
- **GIVEN** a user selects a language in the UI
- **WHEN** the user reloads the page
- **THEN** the app SHALL restore the previously selected language

#### Scenario: Missing translation fallback
- **GIVEN** a translation key is missing for the active locale
- **WHEN** the UI renders that string
- **THEN** the app SHALL fall back to `en` for that key
- **AND** the UI SHALL still render a safe, user-friendly message

### Requirement: Localized API Error Presentation
The web application SHALL present localized error messages based on backend error codes.

#### Scenario: Known backend error code
- **GIVEN** an API call fails with an error envelope containing `error.code`
- **WHEN** the UI displays an error message to the user
- **THEN** the UI SHALL map `error.code` to a translation key and render the localized message
- **AND** the UI SHOULD show `requestId` for support/debugging when available

#### Scenario: Unknown backend error code
- **GIVEN** an API call fails with an unknown `error.code`
- **WHEN** the UI displays an error message
- **THEN** the UI SHALL display a localized generic error message

