import '@testing-library/jest-dom/vitest';

// jsdom does not implement the modal methods of <dialog>. This stands in for the part the tests
// rely on (the open state and the close event); the real modal behavior (focus trap, Esc, focus
// restored on close) is the browser's own and is checked in a real browser.
if (typeof HTMLDialogElement.prototype.showModal !== 'function') {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
}
