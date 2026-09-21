import { describe, expect, it } from "vitest";
import { diffText } from "./textDiff";

describe("diffText", () => {
  it("groups equal, removed, and added words in document order", () => {
    expect(diffText("same old text", "same new text")).toEqual([
      { kind: "equal", text: "same " },
      { kind: "removed", text: "old " },
      { kind: "added", text: "new " },
      { kind: "equal", text: "text" },
    ]);
  });
});
