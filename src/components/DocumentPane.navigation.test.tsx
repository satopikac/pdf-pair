import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PdfDocument, PdfLoader } from "../pdf/pdfLoader";
import { DocumentPane } from "./DocumentPane";

describe("DocumentPane page navigation", () => {
  const scrollIntoView = vi.fn();

  beforeEach(() => {
    Object.defineProperty(Element.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });
  });

  afterEach(() => {
    scrollIntoView.mockReset();
  });

  it("moves through pages and jumps to a typed page number", async () => {
    const document = {
      numPages: 4,
      getPage: vi.fn(),
      destroy: vi.fn().mockResolvedValue(undefined),
    } satisfies PdfDocument;
    const loader: PdfLoader = { load: vi.fn().mockResolvedValue(document) };
    const user = userEvent.setup();

    render(<DocumentPane side="left" loader={loader} />);
    await user.upload(
      screen.getByLabelText("选择左侧 PDF 文件"),
      new File(["pdf"], "paper.pdf", { type: "application/pdf" }),
    );

    const pageInput = await screen.findByRole("spinbutton", {
      name: "跳转左侧 PDF 页码",
    });
    expect((pageInput as HTMLInputElement).value).toBe("1");

    await user.click(screen.getByRole("button", { name: "下一页（左侧）" }));
    expect((pageInput as HTMLInputElement).value).toBe("2");
    expect(scrollIntoView).toHaveBeenLastCalledWith({ block: "start" });

    await user.clear(pageInput);
    await user.type(pageInput, "4{Enter}");
    expect((pageInput as HTMLInputElement).value).toBe("4");
    expect(screen.getByText("/ 4")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "下一页（左侧）" }));
    expect((pageInput as HTMLInputElement).value).toBe("4");
  });
});
