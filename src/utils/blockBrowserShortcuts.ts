/**
 * App-wide guard against browser/WebView default actions that would reload or
 * navigate away from the app (and wipe in-memory state such as the cart).
 *
 * Runs in the capture phase on window so it fires before any page handler and
 * regardless of which modal is open. It only calls preventDefault() — it never
 * stops propagation — so page-level F-key shortcuts keep working as before.
 */

const isDev = import.meta.env.DEV;

function handleKeyDown(e: KeyboardEvent) {
  const key = e.key;
  const ctrlOrMeta = e.ctrlKey || e.metaKey;

  // Reload: F5, Shift+F5, Ctrl+F5, Ctrl+R, Ctrl+Shift+R
  if (key === 'F5' || (ctrlOrMeta && (key === 'r' || key === 'R'))) {
    e.preventDefault();
    return;
  }

  // Function keys are used as POS shortcuts; suppress their browser defaults
  // (F1 help, F3 find, F7 caret browsing, F11 fullscreen, ...).
  // F12 is left alone in dev so DevTools remain reachable.
  if (/^F([1-9]|1[0-2])$/.test(key)) {
    if (key === 'F12' && isDev) return;
    e.preventDefault();
    return;
  }

  // History navigation: Alt+Left / Alt+Right, BrowserBack / BrowserForward keys
  if (
    (e.altKey && (key === 'ArrowLeft' || key === 'ArrowRight')) ||
    key === 'BrowserBack' ||
    key === 'BrowserForward' ||
    key === 'BrowserRefresh'
  ) {
    e.preventDefault();
  }
}

// Mouse side buttons (3 = back, 4 = forward) trigger history navigation.
function handleMouseNav(e: MouseEvent) {
  if (e.button === 3 || e.button === 4) e.preventDefault();
}

let installed = false;

export function installBrowserShortcutGuard() {
  if (installed) return;
  installed = true;
  window.addEventListener('keydown', handleKeyDown, { capture: true });
  window.addEventListener('mouseup', handleMouseNav, { capture: true });
  window.addEventListener('auxclick', handleMouseNav, { capture: true });
}
