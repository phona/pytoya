import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

import { isValidJsonPath } from '../utils/json-path.util';

@ValidatorConstraint({ name: 'jsonPath', async: false })
export class JsonPathConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (value === undefined || value === null || value === '') {
      return true;
    }
    if (typeof value !== 'string') {
      return false;
    }
    return isValidJsonPath(value);
  }

  defaultMessage(): string {
    return 'Invalid field path format';
  }
}

@ValidatorConstraint({ name: 'jsonPathMap', async: false })
export class JsonPathMapConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (value === undefined || value === null) {
      return true;
    }
    if (!value || typeof value !== 'object') {
      return false;
    }
    return Object.keys(value as Record<string, unknown>).every(isValidJsonPath);
  }

  defaultMessage(): string {
    return 'Invalid field path format';
  }
}
