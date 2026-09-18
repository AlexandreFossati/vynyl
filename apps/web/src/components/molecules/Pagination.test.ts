import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import Pagination from './Pagination.svelte';

const renderPagination = (props: { page: number; total: number }) =>
  render(Pagination, { pageSize: 30, onpagechange: vi.fn(), ...props });

describe('Pagination', () => {
  it('shows the range on the first page and disables Previous', () => {
    renderPagination({ page: 1, total: 44 });

    expect(screen.getByText('Showing 1–30 of 44')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
  });

  it('shows the partial range on the last page and disables Next', () => {
    renderPagination({ page: 2, total: 44 });

    expect(screen.getByText('Showing 31–44 of 44')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('asks for the neighbouring page', async () => {
    const onpagechange = vi.fn();
    render(Pagination, { page: 2, pageSize: 30, total: 100, onpagechange });

    await fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Previous' }));

    expect(onpagechange.mock.calls).toEqual([[3], [1]]);
  });

  it('has a single page and no way to move when everything fits', () => {
    renderPagination({ page: 1, total: 30 });

    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('says so when there are no results', () => {
    renderPagination({ page: 1, total: 0 });

    expect(screen.getByText('No results')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('announces the range politely to assistive technology', () => {
    renderPagination({ page: 1, total: 44 });

    expect(screen.getByText('Showing 1–30 of 44')).toHaveAttribute('aria-live', 'polite');
  });
});
