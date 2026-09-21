import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { App } from "../App";
import type { SessionSnapshot, SessionStore } from "./sessionStore";

const restoredSession: SessionSnapshot = {
  version: 1,
  isScrollBound: true,
  splitRatio: 0.5,
  panes: {
    left: { filePath: null, scrollProgress: 0.25, scale: 1 },
    right: { filePath: null, scrollProgress: 0.4, scale: 1 },
  },
  recentPairs: [],
};

describe("session restore", () => {
  it("restores and persists the scroll binding state", async () => {
    const save = vi.fn().mockReturnValue(true);
    const store: SessionStore = {
      load: vi.fn().mockReturnValue(restoredSession),
      save,
      clear: vi.fn(),
    };
    const user = userEvent.setup();

    render(<App sessionStore={store} />);
    expect(screen.getByRole("button", { name: "解绑滚动" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "解绑滚动" }));

    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ isScrollBound: false, version: 1 }),
    );
  });
});
