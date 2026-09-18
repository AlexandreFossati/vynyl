import { render, screen, within } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import AppShell from './AppShell.svelte';

const snippet = (html: string) => createRawSnippet(() => ({ render: () => html }));

describe('AppShell', () => {
  it('puts the header outside and the page content inside the main landmark', () => {
    render(AppShell, {
      header: snippet('<header>Site header</header>'),
      children: snippet('<p>Page content</p>'),
    });

    const main = screen.getByRole('main');
    expect(within(main).getByText('Page content')).toBeInTheDocument();
    expect(within(main).queryByText('Site header')).not.toBeInTheDocument();
    expect(screen.getByRole('banner')).toHaveTextContent('Site header');
  });
});
