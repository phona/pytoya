# Project Creation Guide

PyToYa uses a guided wizard to create projects and set up extraction defaults.

## Wizard Steps
1. **Basics**: Enter project name and optional description.
2. **Models**: Select the LLM model (required) and optionally enable OCR.
3. **Schema**: Edit JSON Schema. Use the LLM generator or import a file if needed.
4. **Rules**: Generate validation rules with AI or add rules manually.
5. **Review**: Confirm selections and create the project.

## Tips
- Pick the LLM model first so schema and rule generation can use it.
- Use JSON Schema `required` arrays sparingly to avoid brittle validation.
- Use validation rules to capture OCR corrections, enum constraints, and patterns.
- Validation scripts are still available in the project detail page for custom logic.
