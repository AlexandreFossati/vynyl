import { describe, expect, it } from 'vitest';
import { formatCategory, formatDateTime } from './format';

describe('formatCategory', () => {
  it.each([
    ['automotive', 'Automotive'],
    ['dimensional-travel', 'Dimensional travel'],
    ['a-b-c', 'A b c'],
  ])('turns %s into %s', (category, expected) => {
    expect(formatCategory(category)).toBe(expected);
  });
});

describe('formatDateTime', () => {
  it('shows the date and the time of an ISO instant', () => {
    // Noon UTC is the same calendar day in every time zone from UTC-11 to UTC+11.
    const text = formatDateTime('2025-04-30T12:00:00.000Z');

    expect(text).toMatch(/^Apr (29|30), 2025/);
    expect(text).toMatch(/\d{1,2}:\d{2}\s?(AM|PM)$/);
  });
});
