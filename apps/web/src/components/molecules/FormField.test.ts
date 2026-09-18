import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import FormField from './FormField.svelte';

describe('FormField', () => {
  it('labels a single-line field, so it is found by its label', () => {
    render(FormField, { label: 'Title', value: 'Flux Capacitor' });

    expect(screen.getByLabelText('Title')).toHaveValue('Flux Capacitor');
    expect(screen.getByRole('textbox', { name: 'Title' }).tagName).toBe('INPUT');
  });

  it('renders a multi-line field when asked to', () => {
    render(FormField, { label: 'Description', multiline: true, value: 'Line one' });

    const field = screen.getByLabelText('Description');
    expect(field.tagName).toBe('TEXTAREA');
    expect(field).toHaveValue('Line one');
  });

  it('marks the field as required and passes the input mode', () => {
    render(FormField, { label: 'Price', required: true, inputmode: 'decimal' });

    const field = screen.getByLabelText('Price');
    expect(field).toBeRequired();
    expect(field).toHaveAttribute('inputmode', 'decimal');
  });

  it('reports what the user types', async () => {
    const oninput = vi.fn();
    render(FormField, { label: 'Title', oninput });

    await fireEvent.input(screen.getByLabelText('Title'), { target: { value: 'Flux' } });

    expect(screen.getByLabelText('Title')).toHaveValue('Flux');
    expect(oninput).toHaveBeenCalledTimes(1);
  });

  it('shows the error and ties it to the field', () => {
    render(FormField, { label: 'SKU', error: 'This SKU is already in use' });

    const field = screen.getByLabelText('SKU');
    expect(field).toBeInvalid();
    expect(field).toHaveAccessibleDescription('This SKU is already in use');
  });

  it('is not marked invalid and has no description without an error', () => {
    render(FormField, { label: 'SKU' });

    const field = screen.getByLabelText('SKU');
    expect(field).not.toHaveAttribute('aria-invalid');
    expect(field).not.toHaveAttribute('aria-describedby');
  });

  it('ties the error to a multi-line field too', () => {
    render(FormField, { label: 'Description', multiline: true, error: 'Required' });

    expect(screen.getByLabelText('Description')).toHaveAccessibleDescription('Required');
  });
});
