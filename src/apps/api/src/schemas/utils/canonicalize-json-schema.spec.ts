import { canonicalizeJsonSchemaForStringify } from './canonicalize-json-schema';

describe('canonicalizeJsonSchemaForStringify', () => {
  it('orders properties by x-ui-order then name (recursively)', () => {
    const schema = {
      type: 'object',
      properties: {
        beta: { type: 'string' },
        alpha: { type: 'string', 'x-ui-order': 2 },
        gamma: { type: 'string', 'x-ui-order': 1 },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              z: { type: 'string' },
              a: { type: 'string', 'x-ui-order': 1 },
            },
          },
        },
      },
    } as unknown as Record<string, unknown>;

    const canonical = canonicalizeJsonSchemaForStringify(schema);
    const rootProps = canonical.properties as Record<string, unknown>;
    expect(Object.keys(rootProps)).toEqual(['gamma', 'alpha', 'beta', 'items']);

    const itemsSchema = (rootProps.items as Record<string, unknown>).items as Record<string, unknown>;
    const itemProps = itemsSchema.properties as Record<string, unknown>;
    expect(Object.keys(itemProps)).toEqual(['a', 'z']);
  });
});

