// Escapes the characters that are wildcards in a SQL LIKE pattern, so user text is matched
// literally. Must be used with `ESCAPE '\'` in the query.
export function escapeLikePattern(text: string): string {
  return text.replace(/[\\%_]/g, (character) => `\\${character}`);
}
