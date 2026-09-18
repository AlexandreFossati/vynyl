import { fireEvent, render, screen } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App.svelte';

// The dashboard would call the real API; give it an empty catalog instead.
vi.mock('./lib/api/products-api', () => ({
  productsApi: {
    list: vi.fn().mockResolvedValue({ data: [], total: 0, limit: 30, offset: 0 }),
  },
}));

// What the browser does when the user presses Back: change the URL, then fire popstate.
const goBackTo = (path: string) => {
  window.history.replaceState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

describe('App routing', () => {
  beforeEach(() => {
    goBackTo('/');
  });

  it('shows the dashboard at /', async () => {
    render(App);

    expect(await screen.findByRole('heading', { level: 1, name: 'Products' })).toBeInTheDocument();
    expect(screen.getByText('Product Catalog')).toBeInTheDocument();
  });

  it('shows the not found page, with a way back, for an unknown path', async () => {
    render(App);
    goBackTo('/does-not-exist');

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to products' })).toHaveAttribute('href', '/');
    expect(screen.queryByRole('heading', { name: 'Products' })).not.toBeInTheDocument();
  });

  it('goes back to the dashboard from the not found page without reloading', async () => {
    render(App);
    goBackTo('/does-not-exist');
    await fireEvent.click(await screen.findByRole('link', { name: 'Back to products' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Products' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/');
  });

  it('follows the browser history', async () => {
    render(App);
    goBackTo('/somewhere');
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();

    goBackTo('/');

    expect(await screen.findByRole('heading', { level: 1, name: 'Products' })).toBeInTheDocument();
  });
});
