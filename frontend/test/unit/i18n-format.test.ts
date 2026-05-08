import { describe, it, expect } from 'vitest';
import { format } from '../../src/lib/i18n';

describe('format', () => {
  it('substitutes named placeholders', () => {
    expect(format('Hello {name}', { name: 'World' })).toBe('Hello World');
  });

  it('substitutes numeric values', () => {
    expect(format('Found {n} items', { n: 5 })).toBe('Found 5 items');
  });

  it('substitutes multiple placeholders', () => {
    expect(format('{a} and {b}', { a: 'X', b: 'Y' })).toBe('X and Y');
  });

  it('leaves unknown placeholders untouched', () => {
    expect(format('Hello {unknown}', { name: 'World' })).toBe('Hello {unknown}');
  });

  it('does not walk the prototype chain (proto-pollution guard)', () => {
    // `toString` exists on Object.prototype. Using `in` would substitute it
    // (returning [object Function] or similar); hasOwnProperty avoids that.
    expect(format('x{toString}y', {})).toBe('x{toString}y');
  });

  it('handles empty template', () => {
    expect(format('', { x: 1 })).toBe('');
  });

  it('treats placeholder values as strings (no XSS amplification)', () => {
    // Values are stringified via String(); nothing escapes HTML, but the
    // function is meant for JSX text nodes which React escapes for us.
    expect(format('{val}', { val: '<script>' })).toBe('<script>');
  });
});
