import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { THEME_STORAGE_KEY } from "./theme/theme";

afterEach(() => {
  window.localStorage.clear();
  delete document.documentElement.dataset.theme;
  document.documentElement.style.removeProperty("color-scheme");
});

describe("PDF Pair workspace", () => {
  it("opens with two document panels", () => {
    render(<App />);

    expect(screen.getAllByRole("region", { name: /pdf 面板/i })).toHaveLength(2);
  });

  it("lets the user bind and unbind scrolling", async () => {
    const user = userEvent.setup();
    render(<App />);

    const bindButton = screen.getByRole("button", { name: "绑定滚动" });
    expect(bindButton.getAttribute("aria-pressed")).toBe("false");

    await user.click(bindButton);

    const unbindButton = screen.getByRole("button", { name: "解绑滚动" });
    expect(unbindButton.getAttribute("aria-pressed")).toBe("true");
  });

  it("switches themes and remembers the user's choice", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "深色主题" }));
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");

    await user.click(screen.getByRole("button", { name: "浅色主题" }));
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });
});
