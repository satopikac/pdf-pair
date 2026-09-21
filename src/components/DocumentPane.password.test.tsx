import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { PdfDocument, PdfLoader } from "../pdf/pdfLoader";
import { DocumentPane } from "./DocumentPane";

describe("DocumentPane password prompt", () => {
  it("opens an encrypted PDF after receiving its password", async () => {
    const document = {
      numPages: 0,
      getPage: vi.fn(),
      destroy: vi.fn().mockResolvedValue(undefined),
    } satisfies PdfDocument;
    const loader: PdfLoader = {
      supportsPassword: true,
      load: vi.fn().mockImplementation(async (_file, requestPassword) => {
        const password = await requestPassword(false);
        if (password !== "secret") {
          throw new Error("incorrect password");
        }
        return document;
      }),
    };
    const user = userEvent.setup();

    render(<DocumentPane side="left" loader={loader} />);
    await user.upload(
      screen.getByLabelText("选择左侧 PDF 文件"),
      new File(["encrypted"], "locked.pdf", { type: "application/pdf" }),
    );

    const dialog = await screen.findByRole("dialog", { name: "PDF 密码" });
    const passwordInput = within(dialog).getByLabelText("PDF 密码");
    await user.type(passwordInput, "secret");
    await user.click(screen.getByRole("button", { name: "打开" }));

    expect(await screen.findByText("locked.pdf")).toBeTruthy();
    expect(screen.queryByRole("dialog", { name: "PDF 密码" })).toBeNull();
  });
});
