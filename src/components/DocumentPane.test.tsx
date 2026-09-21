import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DocumentPane } from "./DocumentPane";
import type { PdfDocument, PdfLoader } from "../pdf/pdfLoader";

describe("DocumentPane", () => {
  it("loads a selected PDF and reports its page count", async () => {
    const document = {
      numPages: 2,
      destroy: vi.fn().mockResolvedValue(undefined),
    } as unknown as PdfDocument;
    const loader: PdfLoader = {
      load: vi.fn().mockResolvedValue(document),
    };
    const user = userEvent.setup();

    render(<DocumentPane side="left" loader={loader} />);
    const file = new File(["pdf bytes"], "paper.pdf", { type: "application/pdf" });

    await user.upload(screen.getByLabelText("选择左侧 PDF 文件"), file);

    expect(loader.load).toHaveBeenCalledWith(file);
    expect(await screen.findByText("paper.pdf")).toBeTruthy();
    expect(screen.getByText("2 页")).toBeTruthy();
  });
});
