import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Header from './Header.svelte';

describe('Header', () => {
  it('shows the app title as a link to the dashboard', () => {
    render(Header, { title: 'Product Catalog' });

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Product Catalog' })).toHaveAttribute('href', '/');
  });
});
