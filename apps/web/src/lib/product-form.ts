import {
  createProductInputSchema,
  type CreateProductInput,
  type ErrorDetail,
  type Product,
} from '@vynyl/shared';
import { ApiError } from './api/api-error';

export type ProductField = keyof CreateProductInput;
// What the user types: every field is text until it is validated.
export type FormValues = Record<ProductField, string>;
export type FieldErrors = Partial<Record<ProductField, string>>;

export type ValidationResult =
  { ok: true; input: CreateProductInput } | { ok: false; errors: FieldErrors };

export const SAVE_FAILED_MESSAGE = 'Could not save the product. Please try again.';
const SKU_CONFLICT_MESSAGE = 'This SKU is already in use';

const EMPTY_VALUES: FormValues = {
  title: '',
  description: '',
  category: '',
  price: '',
  stock: '',
  brand: '',
  sku: '',
  weight: '',
};

const NUMERIC_FIELDS: readonly ProductField[] = ['price', 'stock', 'weight'];
// Digits with an optional sign and decimal point. Number() alone would also accept "", "1e2",
// "0x10" and " ", which are not what a person means by a price.
const NUMBER_TEXT = /^-?(\d+(\.\d*)?|\.\d+)$/;

// A validation problem as the shared schema reports it (zod itself is a dependency of shared only).
type SchemaIssue = NonNullable<
  ReturnType<typeof createProductInputSchema.safeParse>['error']
>['issues'][number];

const isProductField = (name: string): name is ProductField => Object.hasOwn(EMPTY_VALUES, name);
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

// The limits in these messages come from the schema issue, so they are never written twice.
function messageFor(issue: SchemaIssue): string {
  const unit = 'origin' in issue && issue.origin === 'string' ? ' characters' : '';
  switch (issue.code) {
    case 'invalid_type':
      return issue.expected === 'int' ? 'Enter a whole number' : capitalize(issue.message);
    case 'too_small':
      return issue.inclusive === false
        ? `Must be greater than ${issue.minimum}`
        : `Must be at least ${issue.minimum}${unit}`;
    case 'too_big':
      return `Must be at most ${issue.maximum}${unit}`;
    default:
      return capitalize(issue.message);
  }
}

export const emptyValues = (): FormValues => ({ ...EMPTY_VALUES });

export const valuesFromProduct = (product: Product): FormValues => ({
  title: product.title,
  description: product.description,
  category: product.category,
  price: String(product.price),
  stock: String(product.stock),
  brand: product.brand,
  sku: product.sku,
  weight: String(product.weight),
});

// The field rules live in the shared schema, the same one the API applies. This only adds what
// text needs first: blank is "Required" and numbers are read from their text.
export function validateProductForm(values: FormValues): ValidationResult {
  const errors: FieldErrors = {};
  const candidate: Partial<Record<ProductField, string | number>> = {};

  for (const field of Object.keys(EMPTY_VALUES).filter(isProductField)) {
    const text = values[field].trim();
    if (text === '') {
      errors[field] = 'Required';
    } else if (!NUMERIC_FIELDS.includes(field)) {
      candidate[field] = text;
    } else if (NUMBER_TEXT.test(text)) {
      candidate[field] = Number(text);
    } else {
      errors[field] = 'Enter a number';
    }
  }

  const parsed = createProductInputSchema.safeParse(candidate);
  if (parsed.success) {
    return { ok: true, input: parsed.data };
  }

  // Fields already reported above are missing from `candidate`, so the schema complains about
  // them too; the first message a field got is the one to keep.
  for (const issue of parsed.error.issues) {
    const field = issue.path[0];
    if (typeof field === 'string' && isProductField(field) && errors[field] === undefined) {
      errors[field] = messageFor(issue);
    }
  }
  return { ok: false, errors };
}

// What to show after a failed save: messages for the fields the server pointed at, and a toast
// text when something is left that no field explains.
export function describeSaveFailure(error: unknown): { fields: FieldErrors; toast?: string } {
  if (error instanceof ApiError && error.code === 'SKU_CONFLICT') {
    return { fields: { sku: SKU_CONFLICT_MESSAGE } };
  }
  if (error instanceof ApiError && error.code === 'VALIDATION_ERROR' && error.details) {
    const fields: FieldErrors = {};
    const unmapped: ErrorDetail[] = [];
    for (const detail of error.details) {
      if (isProductField(detail.path)) {
        fields[detail.path] ??= capitalize(detail.message);
      } else {
        unmapped.push(detail);
      }
    }
    const explained = Object.keys(fields).length > 0;
    return explained && unmapped.length === 0 ? { fields } : { fields, toast: SAVE_FAILED_MESSAGE };
  }
  return { fields: {}, toast: SAVE_FAILED_MESSAGE };
}
