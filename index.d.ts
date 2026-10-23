export type Dir = 'up' | 'down' | 'left' | 'right';
export type Key = Dir | 'enter' | 'back' | 'playpause' | 'rewind' | 'ffwd' | 'menu';
export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

/** Score a candidate box for a move; lower is better, null when it isn't in that direction. */
export function score(from: Rect, dir: Dir, candidate: Rect): number | null;
/** Index of the best candidate for a move, or -1. */
export function pick(from: Rect, dir: Dir, candidates: Rect[]): number;
/** Map a keydown to a remote button (browsers, Fire TV / Android TV WebViews, smart-TV browsers). */
export function keyOf(e: { key?: string; keyCode?: number }): Key | null;

export interface Navigator {
  /** Move focus; returns whether it moved. */
  move(dir: Dir): boolean;
  focus(el: HTMLElement | null | undefined): void;
  /** Focus the `data-autofocus` element in `root` (default: the active trap or body), else the first focusable. */
  focusFirst(root?: HTMLElement): void;
  focusables(root?: HTMLElement): HTMLElement[];
  /** The last `data-trap` element, or the body. */
  scopeRoot(): HTMLElement;
  /** Start listening for remote keys; returns a function that stops. */
  install(): () => void;
}

export function createNavigator(options?: {
  document?: Document;
  /** Sees every remote button first; return true to consume it. */
  onKey?: (key: Key, e: KeyboardEvent) => boolean | void;
}): Navigator;
