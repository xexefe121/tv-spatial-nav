// tv-spatial-nav: D-pad focus navigation for TV web apps (Fire TV, Android TV, smart-TV browsers).
//
// Mark focusable things with `data-focus`. Arrow keys move focus to the nearest element in that
// direction by on-screen geometry, so layouts need no hand-wired neighbours.
//   data-focus          can take focus
//   data-autofocus      preferred first focus inside a screen or dialog
//   data-trap           confines movement to itself (dialogs, player controls); the last one wins
//   data-group          preferred region (side rail, main stage): focus leaves it only sideways
//   data-group-entry    where focus lands when entering that group (e.g. the current rail item)
//   data-nav-rect       a child whose box stands in for the element's (e.g. a map pin's avatar)

/** @typedef {'up' | 'down' | 'left' | 'right'} Dir */
/** @typedef {Dir | 'enter' | 'back' | 'playpause' | 'rewind' | 'ffwd' | 'menu'} Key */
/** @typedef {{ left: number, top: number, right: number, bottom: number, width: number, height: number }} Rect */

/** Distance between two 1-D ranges; 0 when they overlap. */
function gap(a1, a2, b1, b2) {
  return Math.max(0, Math.max(a1, b1) - Math.min(a2, b2));
}

/**
 * Score a candidate box for a move from `r` in `dir`; lower is better, null when it isn't in
 * that direction at all. Pure geometry, so it can be tested without a DOM.
 * @param {Rect} r
 * @param {Dir} dir
 * @param {Rect} e
 * @returns {number | null}
 */
export function score(r, dir, e) {
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  const ex = e.left + e.width / 2;
  const ey = e.top + e.height / 2;
  let primary;
  let secondary;
  if (dir === 'left' || dir === 'right') {
    // The candidate's centre must lie past our edge, not just past our centre.
    if (dir === 'right' ? ex <= r.right - 1 : ex >= r.left + 1) return null;
    primary = dir === 'right' ? e.left - r.right : r.left - e.right;
    secondary = gap(r.top, r.bottom, e.top, e.bottom);
  } else {
    if (dir === 'down' ? ey <= r.bottom - 1 : ey >= r.top + 1) return null;
    primary = dir === 'down' ? e.top - r.bottom : r.top - e.bottom;
    secondary = gap(r.left, r.right, e.left, e.right);
  }
  // Leaving something much wider than its targets (a text field over a grid), line up left edges
  // so Down lands on the first column, as on every TV keyboard.
  const align =
    dir === 'left' || dir === 'right'
      ? Math.abs(ey - cy)
      : r.width > e.width * 1.8
        ? Math.abs(e.left - r.left)
        : Math.abs(ex - cx);
  // Overlapping candidates count as distance 0, not less, so a wide bar just above a row
  // (a video scrubber) doesn't beat the next button along that row.
  return Math.max(primary, 0) + secondary * 4 + align * 0.15;
}

/**
 * The index of the best candidate for a move, or -1.
 * @param {Rect} from
 * @param {Dir} dir
 * @param {Rect[]} candidates
 */
export function pick(from, dir, candidates) {
  let best = -1;
  let bestScore = Infinity;
  candidates.forEach((c, i) => {
    const s = score(from, dir, c);
    if (s !== null && s < bestScore) {
      bestScore = s;
      best = i;
    }
  });
  return best;
}

/**
 * Map a keydown to a remote button. Covers browsers, Fire TV / Android TV WebViews (which report
 * some buttons only by keyCode) and smart-TV browsers.
 * @param {{ key?: string, keyCode?: number }} e
 * @returns {Key | null}
 */
export function keyOf(e) {
  switch (e.key) {
    case 'ArrowUp': return 'up';
    case 'ArrowDown': return 'down';
    case 'ArrowLeft': return 'left';
    case 'ArrowRight': return 'right';
    case 'Enter': return 'enter';
    case 'Escape': case 'GoBack': case 'BrowserBack': return 'back';
    case 'MediaPlayPause': case 'MediaPlay': case 'MediaPause': return 'playpause';
    case 'MediaRewind': case 'MediaTrackPrevious': return 'rewind';
    case 'MediaFastForward': case 'MediaTrackNext': return 'ffwd';
    case 'ContextMenu': return 'menu';
  }
  switch (e.keyCode) {
    case 4: case 8: case 10009: return 'back';
    case 179: case 85: case 415: case 19: return 'playpause';
    case 227: case 412: case 89: return 'rewind';
    case 228: case 417: case 90: return 'ffwd';
    case 82: return 'menu';
  }
  return null;
}

const FOCUSABLE = '[data-focus]:not([disabled])';

/**
 * Wire D-pad navigation into a document.
 * @param {{ document?: Document, onKey?: (key: Key, e: KeyboardEvent) => boolean | void }} [options]
 *   `onKey` sees every remote button first; return true to consume it (e.g. Back closing a dialog).
 */
export function createNavigator(options = {}) {
  const doc = options.document ?? document;
  /** @type {WeakMap<Element, HTMLElement>} */
  const lastInGroup = new WeakMap();

  /** @param {HTMLElement} el */
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && doc.defaultView?.getComputedStyle(el).visibility !== 'hidden';
  };
  const scopeRoot = () => {
    const traps = doc.querySelectorAll('[data-trap]');
    return /** @type {HTMLElement} */ (traps.length ? traps[traps.length - 1] : doc.body);
  };
  /** @param {HTMLElement} [root] */
  const focusables = (root = scopeRoot()) => [...root.querySelectorAll(FOCUSABLE)].filter(visible);
  /** @param {HTMLElement} el */
  const rectOf = (el) => (el.querySelector('[data-nav-rect]') ?? el).getBoundingClientRect();
  /** @param {HTMLElement | null | undefined} el */
  const focus = (el) => {
    if (!el) return;
    el.focus({ preventScroll: true });
    el.scrollIntoView?.({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  };
  /** @param {HTMLElement} [root] */
  const focusFirst = (root = scopeRoot()) => {
    const auto = root.querySelector('[data-autofocus]:not([disabled])');
    focus(auto && visible(auto) ? auto : focusables(root)[0]);
  };
  /** @param {HTMLElement} cur @param {Dir} dir @param {HTMLElement[]} els */
  const nearest = (cur, dir, els) => {
    const pool = els.filter((el) => el !== cur && !el.contains(cur) && !cur.contains(el));
    const i = pick(rectOf(cur), dir, pool.map(rectOf));
    return i < 0 ? null : pool[i];
  };
  /** Entering a group lands on its marked entry, else where focus last was in it. */
  const entryOf = (group, all) => {
    const marked = group.querySelector('[data-group-entry]');
    if (marked && all.includes(marked)) return marked;
    const last = lastInGroup.get(group);
    return last && last.isConnected && all.includes(last) ? last : null;
  };

  /** @param {Dir} dir @returns {boolean} whether focus moved */
  const move = (dir) => {
    const root = scopeRoot();
    const cur = /** @type {HTMLElement | null} */ (doc.activeElement);
    if (!cur || !root.contains(cur) || !cur.matches(FOCUSABLE)) {
      focusFirst(root);
      return true;
    }
    const group = cur.closest('[data-group]');
    const all = focusables(root);
    let best = nearest(cur, dir, group ? all.filter((el) => group.contains(el)) : all);
    // Only sideways moves may cross into another group (content <-> rail).
    if (!best && (dir === 'left' || dir === 'right')) {
      best = nearest(cur, dir, all);
      const into = best?.closest('[data-group]');
      if (best && into && into !== group) best = entryOf(into, all) ?? best;
    }
    if (best) focus(best);
    return !!best;
  };

  /** @param {FocusEvent} e */
  const onFocusIn = (e) => {
    const el = /** @type {HTMLElement} */ (e.target);
    const group = el.closest?.('[data-group]');
    if (group) lastInGroup.set(group, el);
  };
  /** @param {KeyboardEvent} e */
  const onKeyDown = (e) => {
    const key = keyOf(e);
    if (!key) return;
    const t = /** @type {HTMLElement} */ (e.target);
    const typing = t.tagName === 'INPUT' || t.tagName === 'TEXTAREA';
    // Text fields keep their caret keys.
    if (typing && (key === 'left' || key === 'right')) return;
    if (options.onKey?.(key, e)) return e.preventDefault();
    if ((key === 'up' || key === 'down' || key === 'left' || key === 'right') && move(key)) e.preventDefault();
  };

  return {
    move,
    focus,
    focusFirst,
    focusables,
    scopeRoot,
    /** Start listening for remote keys; returns a function that stops. */
    install() {
      doc.addEventListener('focusin', onFocusIn);
      doc.addEventListener('keydown', onKeyDown, true);
      return () => {
        doc.removeEventListener('focusin', onFocusIn);
        doc.removeEventListener('keydown', onKeyDown, true);
      };
    },
  };
}
