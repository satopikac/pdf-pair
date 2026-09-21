import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "./App";

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
});
