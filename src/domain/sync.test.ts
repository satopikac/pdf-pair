import { describe, expect, it } from "vitest";
import { mapScrollProgress } from "./sync";

describe("mapScrollProgress", () => {
  it("maps a source scroll position to the same normalized progress in the target", () => {
    expect(
      mapScrollProgress({ scrollTop: 400, maxScrollTop: 1000 }, { maxScrollTop: 2000 }),
    ).toBe(800);
  });

  it("clamps source progress before mapping it", () => {
    expect(
      mapScrollProgress({ scrollTop: -10, maxScrollTop: 100 }, { maxScrollTop: 300 }),
    ).toBe(0);
    expect(
      mapScrollProgress({ scrollTop: 120, maxScrollTop: 100 }, { maxScrollTop: 300 }),
    ).toBe(300);
  });

  it("keeps a target with no scrollable range at the top", () => {
    expect(
      mapScrollProgress({ scrollTop: 50, maxScrollTop: 100 }, { maxScrollTop: 0 }),
    ).toBe(0);
  });
});
