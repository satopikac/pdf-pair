import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { PdfDocument, PdfLoader } from "../pdf/pdfLoader";
import { DocumentPane } from "./DocumentPane";

describe("DocumentPane zoom controls", () => {
  it("changes zoom independently for the loaded document", async () => {
    const document = {
      numPages: 0,
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

    expect(await screen.findByText("100%" )).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "放大左侧 PDF" }));
    expect(screen.getByText("110%" )).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "缩小左侧 PDF" }));
    expect(screen.getByText("100%" )).toBeTruthy();
  });
});
