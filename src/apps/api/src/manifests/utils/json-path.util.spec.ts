import { buildJsonPathQuery, isValidJsonPath } from './json-path.util';

describe('json-path utils', () => {
  describe('isValidJsonPath', () => {
    it('accepts dot-notation paths', () => {
      expect(isValidJsonPath('invoice.po_no')).toBe(true);
      expect(isValidJsonPath('credit_card.id_number')).toBe(true);
      expect(isValidJsonPath('receipt.merchant.name')).toBe(true);
    });

    it('rejects empty segments', () => {
      expect(isValidJsonPath('invoice..po_no')).toBe(false);
      expect(isValidJsonPath('.invoice')).toBe(false);
    });

    it('rejects numeric segments to avoid array indexing', () => {
      expect(isValidJsonPath('items.0.name')).toBe(false);
    });

    it('rejects invalid characters', () => {
      expect(isValidJsonPath('invoice.po_no;DROP')).toBe(false);
      expect(isValidJsonPath('invoice.po no')).toBe(false);
    });
  });

  describe('buildJsonPathQuery', () => {
    it('builds jsonb path for nested fields', () => {
      expect(buildJsonPathQuery('manifest', 'invoice.po_no')).toBe(
        "manifest.extractedData -> 'invoice' ->> 'po_no'",
      );
    });

    it('builds jsonb path for receipt fields', () => {
      expect(buildJsonPathQuery('manifest', 'receipt.merchant.name')).toBe(
        "manifest.extractedData -> 'receipt' -> 'merchant' ->> 'name'",
      );
    });

    it('builds jsonb path for single-level fields', () => {
      expect(buildJsonPathQuery('manifest', 'status')).toBe(
        "manifest.extractedData ->> 'status'",
      );
    });
  });
});
