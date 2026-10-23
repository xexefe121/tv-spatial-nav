# tv-spatial-nav

D-pad focus navigation for TV web apps: Fire TV and Android TV WebViews, smart-TV browsers (Samsung, LG) and anything else driven by a remote. No dependencies, about 200 lines.

Mark what can take focus with `data-focus`. Arrow keys then move to the nearest element in that direction by on-screen geometry, so layouts need no hand-wired "next/previous" maps and keep working when they reflow.

Extracted from [FireJam](https://github.com/xexefe121/firejam), a multiplayer TV app for Fire TV, where it drives every screen with nothing but a remote.

## Install

```bash
npm install tv-spatial-nav
```

or copy `src/index.js` into your project (it's a single ES module).

## Use

```html
<nav data-group>
  <button data-focus data-group-entry>Home</button>
  <button data-focus>Search</button>
</nav>
<main data-group>
  <button data-focus data-autofocus>Card 1</button>
  <button data-focus>Card 2</button>
</main>
<div role="dialog" data-trap hidden>…</div>
```

```js
import { createNavigator } from 'tv-spatial-nav';

const nav = createNavigator({
  // Every remote button comes here first; return true to consume it.
  onKey(key) {
    if (key === 'back') return closeTopDialog();
  },
});
nav.install();
nav.focusFirst();
```

| Attribute | Meaning |
|---|---|
| `data-focus` | Can take focus. |
| `data-autofocus` | Preferred first focus inside a screen or dialog (`focusFirst`). |
| `data-trap` | Confines movement to itself (dialogs, player controls). The last one in the document wins. |
| `data-group` | A preferred region (side rail, main stage). Up/Down stay inside it; only Left/Right leave it, so Down from a row of cards finds the next row instead of the rail beside it. |
| `data-group-entry` | Where focus lands when entering that group, e.g. the rail item for the current screen. Without one, focus returns to wherever it last was in the group. |
| `data-nav-rect` | A child whose box stands in for the element's, e.g. a map pin's avatar when its label is much wider. |

## How a move is scored

For a move in a direction, each candidate must have its centre beyond the current element's edge (not just beyond its centre). Among those, the lowest score wins:

```
max(distance along the move, 0) + 4 × gap across the move + 0.15 × misalignment
```

- **Distance along the move** is clamped at 0. If overlaps counted as negative, a wide element just above a row (a video scrubber) would beat the next button along that row.
- **Gap across the move** is 0 when the boxes overlap sideways, so the same row or column wins over a diagonal.
- **Misalignment** is centre-to-centre. Moving down from something much wider than its targets (a text field above a keyboard grid) lines up left edges instead, so Down lands on the first column like every TV keyboard.

The scoring is a pure function, `score(fromRect, dir, candidateRect)`, with `pick(fromRect, dir, rects)` on top, so you can test layouts without a DOM.

## Remote keys

`keyOf(event)` maps a `keydown` to `up | down | left | right | enter | back | playpause | rewind | ffwd | menu`. It covers browser key names plus the bare key codes some TV runtimes send: Fire TV / Android TV WebViews (`4` Back, `85` Play/Pause, `89`/`90` Rewind/Fast-forward, `82` Menu) and Samsung Tizen (`10009` Back).

On Fire TV and Android TV, Back and the media keys never reach a WebView's JavaScript. Forward them from your activity's `dispatchKeyEvent` with `evaluateJavascript`, and call `nav` or your `onKey` handler.

## Test

```bash
npm test
```

Node's built-in test runner; no dependencies.

## License

MIT
