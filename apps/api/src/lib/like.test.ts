import { describe, expect, it } from 'vitest';
import { escapeLikePattern } from './like';

describe('escapeLikePattern', () => {
  it.each([
    ['%', '\\%'],
    ['_', '\\_'],
    ['\\', '\\\\'],
    ['50%', '50\\%'],
    ['a_b', 'a\\_b'],
    ['100%_\\', '100\\%\\_\\\\'],
  ])('escapes %j as %j', (input, expected) => {
    expect(escapeLikePattern(input)).toBe(expected);
  });

  it.each(['flux capacitor', 'Large Flux', '', 'a-b.c', "it's"])(
    'leaves ordinary text %j unchanged',
    (input) => {
      expect(escapeLikePattern(input)).toBe(input);
    },
  );
});
