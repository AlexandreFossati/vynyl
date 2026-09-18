import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import {
  FIELD_LABELS,
  fillForm,
  typeInto as type,
  validFormValues as values,
} from '../../test/product-form';
import ProductForm from './ProductForm.svelte';

const setup = (props: Partial<Parameters<typeof render<typeof ProductForm>>[1]> = {}) => {
  const onsubmit = vi.fn();
  const oncancel = vi.fn();
  const view = render(ProductForm, {
    props: { submitLabel: 'Create product', onsubmit, oncancel, ...props },
  });
  return { ...view, onsubmit, oncancel };
};

const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Create product' }));

describe('ProductForm', () => {
  describe('fields', () => {
    it('has a labelled, required field for each product property, and nothing else', () => {
      setup();

      for (const label of Object.values(FIELD_LABELS)) {
        expect(screen.getByLabelText(label)).toBeRequired();
      }
      expect(screen.getAllByRole('textbox')).toHaveLength(8);
      expect(screen.getByLabelText('Description').tagName).toBe('TEXTAREA');
    });

    it('starts blank, or with the initial values it is given', () => {
      const { unmount } = setup();
      expect(screen.getByLabelText('Title')).toHaveValue('');
      unmount();

      setup({ initialValues: values });

      expect(screen.getByLabelText('Title')).toHaveValue('Large Flux Capacitor');
      expect(screen.getByLabelText('Price')).toHaveValue('19.99');
      expect(screen.getByLabelText('Weight')).toHaveValue('4.5');
    });

    it('uses the label it is given for the submit button', () => {
      setup({ submitLabel: 'Save changes' });

      expect(screen.getByRole('button', { name: 'Save changes' })).toHaveAttribute(
        'type',
        'submit',
      );
    });
  });

  describe('submitting valid values', () => {
    it('hands the converted and trimmed values to onsubmit, once', async () => {
      const { onsubmit } = setup();

      await fillForm({ title: '  Large Flux Capacitor  ' });
      await submit();

      expect(onsubmit).toHaveBeenCalledTimes(1);
      expect(onsubmit).toHaveBeenCalledWith({
        title: 'Large Flux Capacitor',
        description: 'Powers time travel.',
        category: 'dimensional-travel',
        price: 19.99,
        stock: 42,
        brand: 'ACME',
        sku: 'ACM-FC-001',
        weight: 4.5,
      });
      expect(screen.queryByText('Required')).not.toBeInTheDocument();
    });

    it('sends initial values that were not touched', async () => {
      const { onsubmit } = setup({ initialValues: values });

      await submit();

      expect(onsubmit).toHaveBeenCalledWith(expect.objectContaining({ sku: 'ACM-FC-001' }));
    });
  });

  describe('client validation', () => {
    it('shows "Required" on every blank field, sends nothing and focuses the first field', async () => {
      const { onsubmit } = setup();

      await submit();

      expect(screen.getAllByText('Required')).toHaveLength(8);
      expect(onsubmit).not.toHaveBeenCalled();
      await waitFor(() => expect(screen.getByLabelText('Title')).toHaveFocus());
      expect(screen.getByLabelText('Title')).toBeInvalid();
    });

    it('shows the rule that a value breaks, next to that field only', async () => {
      const { onsubmit } = setup();

      await fillForm({ price: 'abc', category: 'Tools' });
      await submit();

      expect(screen.getByLabelText('Price')).toHaveAccessibleDescription('Enter a number');
      expect(screen.getByLabelText('Category')).toHaveAccessibleDescription('Must be lowercase');
      expect(screen.getByLabelText('Title')).not.toBeInvalid();
      expect(onsubmit).not.toHaveBeenCalled();
      await waitFor(() => expect(screen.getByLabelText('Category')).toHaveFocus());
    });

    it('clears the message of a field as soon as the user edits it', async () => {
      setup();
      await submit();

      await type('Title', 'Flux');

      expect(screen.getByLabelText('Title')).not.toBeInvalid();
      expect(screen.getAllByText('Required')).toHaveLength(7);
    });

    it('lets the user fix the problems and send', async () => {
      const { onsubmit } = setup();
      await submit();

      await fillForm();
      await submit();

      expect(onsubmit).toHaveBeenCalledTimes(1);
      expect(screen.queryByText('Required')).not.toBeInTheDocument();
    });
  });

  describe('errors from the server', () => {
    it('shows a message on the field it names and moves the focus there', async () => {
      const { component } = setup({ initialValues: values });

      component.showErrors({ sku: 'This SKU is already in use' });

      await waitFor(() => expect(screen.getByLabelText('SKU')).toHaveFocus());
      expect(screen.getByLabelText('SKU')).toHaveAccessibleDescription(
        'This SKU is already in use',
      );
      expect(screen.getByLabelText('Title')).toHaveValue('Large Flux Capacitor');
    });

    it('replaces the messages it showed before', async () => {
      const { component } = setup({ initialValues: values });
      component.showErrors({ sku: 'This SKU is already in use' });
      await waitFor(() => expect(screen.getByLabelText('SKU')).toBeInvalid());

      component.showErrors({ price: 'Too small' });

      await waitFor(() => expect(screen.getByLabelText('Price')).toBeInvalid());
      expect(screen.getByLabelText('SKU')).not.toBeInvalid();
    });

    it('drops the message of a field the user edits', async () => {
      const { component } = setup({ initialValues: values });
      component.showErrors({ sku: 'This SKU is already in use' });
      await waitFor(() => expect(screen.getByLabelText('SKU')).toBeInvalid());

      await type('SKU', 'ACM-FC-002');

      expect(screen.getByLabelText('SKU')).not.toBeInvalid();
    });
  });

  describe('while saving', () => {
    it('disables both buttons and says it is saving', () => {
      setup({ busy: true, initialValues: values });

      expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    });

    it('does not send a second time even if the form is submitted again', async () => {
      const { onsubmit } = setup({ busy: true, initialValues: values });

      await fireEvent.submit(screen.getByRole('button', { name: 'Saving…' }).closest('form')!);

      expect(onsubmit).not.toHaveBeenCalled();
    });
  });

  it('asks to cancel without sending anything', async () => {
    const { onsubmit, oncancel } = setup({ initialValues: values });

    await fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(oncancel).toHaveBeenCalledTimes(1);
    expect(onsubmit).not.toHaveBeenCalled();
  });
});
