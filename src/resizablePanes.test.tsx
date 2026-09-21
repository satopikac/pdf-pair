import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { App } from "./App";
import type { SessionSnapshot, SessionStore } from "./session/sessionStore";

function createSession(splitRatio: number): SessionSnapshot {
  return {
    version: 1,
    isScrollBound: false,
    splitRatio,
    panes: {
      left: { filePath: null, scrollProgress: 0, scale: 1 },
      right: { filePath: null, scrollProgress: 0, scale: 1 },
    },
    recentPairs: [],
  };
}

describe("resizable reader panes", () => {
  it("restores the split and resizes it with the keyboard", async () => {
    const save = vi.fn().mockReturnValue(true);
    const sessionStore: SessionStore = {
      load: () => createSession(0.6),
      save,
      clear: vi.fn(),
    };
    const user = userEvent.setup();

    render(<App sessionStore={sessionStore} />);

    const separator = screen.getByRole("separator", { name: "调整文档宽度" });
    expect(separator.getAttribute("aria-valuenow")).toBe("60");
    expect(separator.parentElement?.style.getPropertyValue("--left-pane")).toBe("60%");

    separator.focus();
    await user.keyboard("{ArrowRight}");

    expect(separator.getAttribute("aria-valuenow")).toBe("65");
    expect(save).toHaveBeenLastCalledWith(
      expect.objectContaining({ splitRatio: 0.65 }),
    );
  });

  it("clamps pointer resizing to the supported range", () => {
    render(<App />);
    const separator = screen.getByRole("separator", { name: "调整文档宽度" });
    const workspace = separator.parentElement as HTMLDivElement;
    vi.spyOn(workspace, "getBoundingClientRect").mockReturnValue({
      left: 100,
      width: 1000,
    } as DOMRect);
    Object.defineProperty(separator, "setPointerCapture", {
      configurable: true,
      value: vi.fn(),
    });

    fireEvent.pointerDown(separator, { pointerId: 1 });
    fireEvent.pointerMove(separator, { pointerId: 1, clientX: 1050 });

    expect(separator.getAttribute("aria-valuenow")).toBe("75");
  });
});
