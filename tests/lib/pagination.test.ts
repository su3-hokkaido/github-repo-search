import { describe, expect, it } from "vitest";
import { getPageWindow } from "@/lib/pagination";

describe("getPageWindow", () => {
  it("starts at page 1 with no first-jump", () => {
    const w = getPageWindow(1, 10);
    expect(w.pages).toEqual([1, 2, 3, 4, 5]);
    expect(w.showFirst).toBe(false);
    expect(w.showLast).toBe(true);
    expect(w.hasPrev).toBe(false);
    expect(w.hasNext).toBe(true);
  });

  it("centers the window on the current page", () => {
    const w = getPageWindow(6, 10);
    expect(w.pages).toEqual([4, 5, 6, 7, 8]);
    expect(w.showFirst).toBe(true);
    expect(w.showLast).toBe(true);
  });

  it("anchors to the last page without a last-jump", () => {
    const w = getPageWindow(10, 10);
    expect(w.pages).toEqual([6, 7, 8, 9, 10]);
    expect(w.showFirst).toBe(true);
    expect(w.showLast).toBe(false);
    expect(w.hasNext).toBe(false);
  });

  it("handles fewer pages than the window size", () => {
    const w = getPageWindow(2, 3);
    expect(w.pages).toEqual([1, 2, 3]);
    expect(w.showFirst).toBe(false);
    expect(w.showLast).toBe(false);
  });

  it("clamps an out-of-range current page", () => {
    expect(getPageWindow(99, 10).current).toBe(10);
    expect(getPageWindow(0, 10).current).toBe(1);
  });

  it("returns an empty window for zero pages", () => {
    const w = getPageWindow(1, 0);
    expect(w.pages).toEqual([]);
    expect(w.pageCount).toBe(0);
  });
});
