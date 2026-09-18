// Minimal client-side routing on the History API: the app reads the current path and asks to
// navigate; which page a path shows is decided in App.svelte.
let path = $state(window.location.pathname);

// Back and forward buttons change the URL without going through navigate().
window.addEventListener('popstate', () => {
  path = window.location.pathname;
});

export const router = {
  get path() {
    return path;
  },

  navigate(to: string) {
    window.history.pushState(null, '', to);
    path = window.location.pathname;
  },
};
