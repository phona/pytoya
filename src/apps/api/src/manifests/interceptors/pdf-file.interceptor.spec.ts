import {
  detectFileType,
  IMAGE_MIME_TYPES,
  PDF_MIME_TYPE,
  ALLOWED_MIME_TYPES,
} from './pdf-file.interceptor';

describe('pdf-file.interceptor', () => {
  describe('detectFileType', () => {
    it('should detect PDF files', () => {
      const result = detectFileType('application/pdf');
      expect(result).toBe('pdf');
    });

    it('should detect PNG images', () => {
      const result = detectFileType('image/png');
      expect(result).toBe('image');
    });

    it('should detect JPEG images', () => {
      const result = detectFileType('image/jpeg');
      expect(result).toBe('image');
    });

    it('should detect JPG images', () => {
      const result = detectFileType('image/jpg');
      expect(result).toBe('image');
    });

    it('should detect GIF images', () => {
      const result = detectFileType('image/gif');
      expect(result).toBe('image');
    });

    it('should detect WebP images', () => {
      const result = detectFileType('image/webp');
      expect(result).toBe('image');
    });

    it('should detect BMP images', () => {
      const result = detectFileType('image/bmp');
      expect(result).toBe('image');
    });

    it('should return unknown for unsupported MIME types', () => {
      const result = detectFileType('application/vnd.ms-excel');
      expect(result).toBe('unknown');
    });

    it('should return unknown for text/plain', () => {
      const result = detectFileType('text/plain');
      expect(result).toBe('unknown');
    });
  });

  describe('MIME type constants', () => {
    it('should have PDF_MIME_TYPE as application/pdf', () => {
      expect(PDF_MIME_TYPE).toBe('application/pdf');
    });

    it('should include common image MIME types', () => {
      expect(IMAGE_MIME_TYPES).toContain('image/jpeg');
      expect(IMAGE_MIME_TYPES).toContain('image/png');
      expect(IMAGE_MIME_TYPES).toContain('image/gif');
      expect(IMAGE_MIME_TYPES).toContain('image/webp');
      expect(IMAGE_MIME_TYPES).toContain('image/bmp');
      expect(IMAGE_MIME_TYPES).toContain('image/jpg');
    });

    it('should have ALLOWED_MIME_TYPES including PDF and images', () => {
      expect(ALLOWED_MIME_TYPES).toContain('application/pdf');
      expect(ALLOWED_MIME_TYPES.length).toBeGreaterThan(1);
    });

    it('should have exactly 7 allowed MIME types (1 PDF + 6 images)', () => {
      expect(ALLOWED_MIME_TYPES).toHaveLength(7);
    });
  });
});
