import { BadRequestException } from '@nestjs/common';

const PATH_SEGMENT_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/;
const MAX_PATH_LENGTH = 200;

export function isValidJsonPath(path: string): boolean {
  if (!path || path.length > MAX_PATH_LENGTH) {
    return false;
  }
  const segments = path.split('.');
  return segments.every((segment) => PATH_SEGMENT_REGEX.test(segment));
}

export function assertValidJsonPath(path: string): void {
  if (!isValidJsonPath(path)) {
    throw new BadRequestException(`Invalid field path: ${path}`);
  }
}

export function buildJsonPathQuery(alias: string, fieldPath: string): string {
  const segments = fieldPath.split('.');
  const last = segments[segments.length - 1];
  const prefix = segments
    .slice(0, -1)
    .map((segment) => ` -> '${segment}'`)
    .join('');
  return `${alias}.extractedData${prefix} ->> '${last}'`;
}
