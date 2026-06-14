import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import ja from "@/messages/ja.json";

/** Collect dotted key paths for every leaf string in a messages object. */
function keyPaths(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return value && typeof value === "object"
      ? keyPaths(value as Record<string, unknown>, path)
      : [path];
  });
}

describe("message catalogs", () => {
  it("en and ja define exactly the same keys", () => {
    const enKeys = keyPaths(en).sort();
    const jaKeys = keyPaths(ja).sort();
    expect(jaKeys).toEqual(enKeys);
  });
});
