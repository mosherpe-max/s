// Keeping the field a patron is using in view while they fill in a form. The delta maths is pure so it can be
// tested; the DOM part scrolls the right container (the page, or an inner scroll area).

export interface VerticalRange { top: number; bottom: number }

// How far to scroll (positive = down, negative = up) so rect sits inside view with a margin. 0 when it already
// does. A rect that needs moving is placed a little way down from the top of the free area rather than hard against
// an edge, so the next field is usually in view too. A rect taller than the free area is lined up at the top.
export function scrollDeltaToReveal(rect: VerticalRange, view: VerticalRange, margin = 16): number {
  const areaTop = view.top + margin;
  const areaBottom = view.bottom - margin;
  const room = areaBottom - areaTop;
  if (room <= 0) return 0;
  const height = rect.bottom - rect.top;
  if (height > room) return Math.round(rect.top - areaTop);
  if (rect.top >= areaTop && rect.bottom <= areaBottom) return 0;
  const target = areaTop + Math.min(room * 0.25, room - height);
  return Math.round(rect.top - target);
}

function scrollParentOf(el: HTMLElement): HTMLElement | null {
  for (let node = el.parentElement; node && node !== document.body && node !== document.documentElement; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) return node;
  }
  return null;
}

// Scrolls just enough to bring el into the part of the screen that is actually visible: below any sticky header
// (topInset) and above the on-screen keyboard (the visual viewport shrinks when it opens).
export function revealElement(el: HTMLElement, options: { topInset?: number; margin?: number; smooth?: boolean } = {}): void {
  if (typeof window === 'undefined') return;
  const vv = window.visualViewport;
  const viewTop = (vv?.offsetTop ?? 0) + (options.topInset ?? 0);
  const viewBottom = (vv?.offsetTop ?? 0) + (vv?.height ?? window.innerHeight);
  const rect = el.getBoundingClientRect();
  const delta = scrollDeltaToReveal(rect, { top: viewTop, bottom: viewBottom }, options.margin ?? 16);
  if (delta === 0) return;
  const behavior: ScrollBehavior = options.smooth !== false && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'auto';
  const parent = scrollParentOf(el);
  if (parent) parent.scrollBy({ top: delta, behavior });
  else window.scrollBy({ top: delta, behavior });
}
