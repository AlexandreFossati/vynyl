import { z } from 'zod';

// Path and query values arrive as text. Accepting digits only rejects forms such as "1e2",
// "+5", "0x10", " " or "" that Number() would silently turn into a valid-looking value.
export const wholeNumber = z
  .string()
  .regex(/^\d+$/, 'must be a non-negative integer')
  .transform(Number);
