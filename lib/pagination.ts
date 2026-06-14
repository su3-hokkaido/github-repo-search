// Pure pagination helpers for the pager UI.
//
// The page count itself (capped at GitHub's 1000-result window) is computed in
// lib/github.ts via computePageCount. This module decides which page numbers to
// render in a fixed-size window, plus whether first/last jumps are needed.

export interface PageWindow {
  /** Consecutive page numbers to render (e.g. [4, 5, 6, 7, 8]). */
  pages: number[];
  /** Whether to show a jump to page 1 (window does not start at 1). */
  showFirst: boolean;
  /** Whether to show a jump to the last page (window does not end at pageCount). */
  showLast: boolean;
  hasPrev: boolean;
  hasNext: boolean;
  /** Current page clamped to the valid range. */
  current: number;
  pageCount: number;
}

/** Compute a window of up to `windowSize` pages centered on the current page. */
export function getPageWindow(
  current: number,
  pageCount: number,
  windowSize = 5,
): PageWindow {
  if (pageCount <= 0) {
    return {
      pages: [],
      showFirst: false,
      showLast: false,
      hasPrev: false,
      hasNext: false,
      current: 0,
      pageCount: 0,
    };
  }

  const clamped = Math.min(Math.max(1, Math.trunc(current) || 1), pageCount);
  const half = Math.floor(windowSize / 2);

  let start = Math.max(1, clamped - half);
  const end = Math.min(pageCount, start + windowSize - 1);
  // Re-anchor when the window runs past the last page.
  start = Math.max(1, end - windowSize + 1);

  const pages: number[] = [];
  for (let p = start; p <= end; p += 1) pages.push(p);

  return {
    pages,
    showFirst: start > 1,
    showLast: end < pageCount,
    hasPrev: clamped > 1,
    hasNext: clamped < pageCount,
    current: clamped,
    pageCount,
  };
}
