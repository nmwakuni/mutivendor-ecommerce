import { slugify } from '../../utils/slugify';

describe('slugify', () => {
  it('should convert string to lowercase slug', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('should replace spaces with hyphens', () => {
    expect(slugify('Product Name With Spaces')).toBe('product-name-with-spaces');
  });

  it('should remove special characters', () => {
    expect(slugify('Product@#$%Name!')).toBe('productname');
  });

  it('should handle multiple consecutive spaces', () => {
    expect(slugify('Product    Name')).toBe('product-name');
  });

  it('should handle leading and trailing spaces', () => {
    expect(slugify('  Product Name  ')).toBe('product-name');
  });

  it('should handle empty string', () => {
    expect(slugify('')).toBe('');
  });

  it('should handle accented characters', () => {
    expect(slugify('Café')).toBe('caf');
  });
});
