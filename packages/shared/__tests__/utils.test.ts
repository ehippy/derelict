import { formatGameName } from '../src/utils';

describe('formatGameName', () => {
  test('formats a simple slug as title case', () => {
    expect(formatGameName('abandoned-mining-station')).toBe('Abandoned Mining Station');
  });

  test('removes numeric suffix before formatting', () => {
    // The function strips trailing numbers like -2, -3
    expect(formatGameName('dying-signal-2')).toBe('Dying Signal');
    expect(formatGameName('dying-signal-3')).toBe('Dying Signal');
  });

  test('handles slugs with alphanumeric ID suffix (no numeric-only suffix to strip)', () => {
    // gTKNJGK is alphabetic, so it stays. charAt(0).toUpperCase() capitalizes first char only.
    expect(formatGameName('dying-signal-gTKNJGK')).toBe('Dying Signal GTKNJGK');
  });

  test('handles alphanumeric ID followed by numeric suffix', () => {
    expect(formatGameName('dying-signal-gTKNJGK-2')).toBe('Dying Signal GTKNJGK');
    expect(formatGameName('dying-signal-gTKNJGK-3')).toBe('Dying Signal GTKNJGK');
  });

  test('handles single-word slugs', () => {
    expect(formatGameName('escape')).toBe('Escape');
  });

  test('handles two-word slugs', () => {
    expect(formatGameName('last-stand')).toBe('Last Stand');
  });

  test('handles hyphens in all positions', () => {
    expect(formatGameName('the-last-stand')).toBe('The Last Stand');
    expect(formatGameName('a-b-c-d-e')).toBe('A B C D E');
  });

  test('preserves lowercase words correctly', () => {
    expect(formatGameName('low-key')).toBe('Low Key');
    expect(formatGameName('deep-space')).toBe('Deep Space');
  });

  test('handles numeric suffix on multi-word slug', () => {
    expect(formatGameName('abandoned-mining-station-5')).toBe('Abandoned Mining Station');
  });

  test('handles empty string', () => {
    expect(formatGameName('')).toBe('');
  });
});
