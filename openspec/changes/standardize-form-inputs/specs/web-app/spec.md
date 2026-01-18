## ADDED Requirements

### Requirement: Consistent Form Input Components
The web application SHALL use shadcn/ui form components for all form inputs.

#### Scenario: Text inputs
- **WHEN** a text input is needed
- **THEN** the system SHALL use the `Input` component from `@/shared/components/ui/input`
- **AND** the input SHALL have consistent styling and focus states
- **AND** the input SHALL support error states via React Hook Form integration

#### Scenario: Textarea inputs
- **WHEN** a multi-line text input is needed
- **THEN** the system SHALL use the `Textarea` component from `@/shared/components/ui/textarea`
- **AND** the textarea SHALL have consistent styling and resize behavior

#### Scenario: Select dropdowns
- **WHEN** a select dropdown is needed
- **THEN** the system SHALL use the `Select` component from `@/shared/components/ui/select`
- **AND** the select SHALL use `SelectTrigger`, `SelectValue`, `SelectContent`, and `SelectItem` components
- **AND** the select SHALL be keyboard accessible

#### Scenario: Error message display
- **WHEN** a form field has a validation error
- **THEN** the system SHALL use the `FormMessage` component to display the error
- **AND** the error SHALL appear below the input field
- **AND** the error SHALL be styled with destructive colors

#### Scenario: Label association
- **WHEN** a form input is rendered
- **THEN** the input SHALL have an associated label via `htmlFor` attribute
- **AND** the label SHALL clearly describe the expected input
- **AND** required fields SHALL be indicated

### Requirement: Form Input Accessibility
All form inputs SHALL be accessible to keyboard users and screen readers.

#### Scenario: Keyboard navigation
- **WHEN** a user navigates a form with Tab key
- **THEN** all inputs SHALL be focusable in logical order
- **AND** the focus state SHALL be visually visible
- **AND** the user SHALL be able to submit the form with Enter key

#### Scenario: Screen reader support
- **WHEN** a form input is read by a screen reader
- **THEN** the input SHALL be announced with its label
- **AND** required fields SHALL be announced as required
- **AND** validation errors SHALL be announced after the input label

#### Scenario: Error state accessibility
- **WHEN** a validation error is displayed
- **THEN** the error message SHALL be associated with the input via `aria-describedby`
- **AND** the input SHALL have `aria-invalid="true"` attribute
- **AND** the error SHALL be announced by screen readers

#### Scenario: Disabled state
- **WHEN** an input is disabled
- **THEN** the system SHALL pass the `disabled` prop to the component
- **AND** the input SHALL be visually styled as disabled
- **AND** the input SHALL NOT be interactive
- **AND** disabled state SHALL be announced by screen readers
