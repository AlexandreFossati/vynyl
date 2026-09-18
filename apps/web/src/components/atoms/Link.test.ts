import { fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { textSnippet } from '../../test/snippet';
import Link from './Link.svelte';

// What the browser would do with a click nobody handled is follow the href, which jsdom cannot.
// Recording defaultPrevented at the document tells the two outcomes apart, and cancels the
// navigation so the test does not try it.
let handledByApp: boolean | undefined;
const recordAndCancel = (event: Event) => {
  handledByApp = event.defaultPrevented;
  event.preventDefault();
};

describe('Link', () => {
  beforeEach(() => {
    handledByApp = undefined;
    window.history.replaceState(null, '', '/start');
    document.addEventListener('click', recordAndCancel);
  });

  afterEach(() => {
    document.removeEventListener('click', recordAndCancel);
  });

  it('is a real link to its destination', () => {
    render(Link, { href: '/products/1', children: textSnippet('Flux Capacitor') });

    expect(screen.getByRole('link', { name: 'Flux Capacitor' })).toHaveAttribute(
      'href',
      '/products/1',
    );
  });

  it('navigates in the app, without following the href, on a plain click', async () => {
    render(Link, { href: '/products/1', children: textSnippet('Open') });

    await fireEvent.click(screen.getByRole('link', { name: 'Open' }));

    expect(handledByApp).toBe(true);
    expect(window.location.pathname).toBe('/products/1');
  });

  it.each([
    ['Ctrl', { ctrlKey: true }],
    ['Cmd', { metaKey: true }],
    ['Shift', { shiftKey: true }],
    ['Alt', { altKey: true }],
    ['the middle button', { button: 1 }],
  ])('leaves a click with %s to the browser', async (_name, init) => {
    render(Link, { href: '/products/1', children: textSnippet('Open') });

    await fireEvent.click(screen.getByRole('link', { name: 'Open' }), init);

    expect(handledByApp).toBe(false);
    expect(window.location.pathname).toBe('/start');
  });

  it('leaves a link with a target to the browser', async () => {
    // `target` is also the name of a Svelte mount option, so the props are passed explicitly.
    render(Link, {
      props: { href: '/products/1', target: '_blank', children: textSnippet('Open') },
    });

    await fireEvent.click(screen.getByRole('link', { name: 'Open' }));

    expect(handledByApp).toBe(false);
    expect(window.location.pathname).toBe('/start');
  });

  it.each(['link', 'primary', 'secondary'] as const)('renders the %s variant', (variant) => {
    render(Link, { href: '/', variant, children: textSnippet('Home') });

    expect(screen.getByRole('link', { name: 'Home' })).toHaveClass(variant);
  });
});
