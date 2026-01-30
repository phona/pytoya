# Project Creation Guide

PyToYa supports Quick Create for fast setup and Guided Setup for full configuration.

## Quick Create
1. **Basics**: Enter project name.
2. **Extractor + Models**: Select a text extractor and the LLM model (both required).

Quick Create skips description, schema, and rules so you can start importing data right away.

## Guided Setup Steps
1. **Basics**: Enter project name and optional description.
2. **Extractor + Models**: Select the text extractor and LLM model (required).
3. **Schema**: Edit JSON Schema. Use the LLM generator or import a file if needed.
4. **Rules**: Generate validation rules with AI or add rules manually.
5. **Validation Scripts**: Add optional custom scripts (runs after schema/rules).
6. **Review**: Confirm selections and create the project.

## API Notes
- Guided Setup uses `POST /projects/wizard` so creation is atomic (project + schema + rules + scripts are created together).

## Tips
- Pick the text extractor and LLM model first so schema and rule generation can use them.
- Use JSON Schema `required` arrays sparingly to avoid brittle validation.
- Use validation rules to capture OCR corrections, enum constraints, and patterns.
- Validation scripts are still available in the project detail page for custom logic.
