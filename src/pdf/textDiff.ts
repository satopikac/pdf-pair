import type { TextItem } from "pdfjs-dist/types/src/display/api";
import type { PdfDocument } from "./pdfLoader";

export interface DiffOperation {
  kind: "equal" | "added" | "removed";
  text: string;
}

export interface PdfPageDiff {
  pageNumber: number;
  leftText: string;
  rightText: string;
  operations: DiffOperation[];
}

function tokenize(text: string) {
  return text.match(/\S+\s*/g) ?? [];
}

export function diffText(leftText: string, rightText: string): DiffOperation[] {
  const left = tokenize(leftText);
  const right = tokenize(rightText);
  const table = Array.from({ length: left.length + 1 }, () =>
    Array<number>(right.length + 1).fill(0),
  );

  for (let leftIndex = left.length - 1; leftIndex >= 0; leftIndex -= 1) {
    for (let rightIndex = right.length - 1; rightIndex >= 0; rightIndex -= 1) {
      table[leftIndex]![rightIndex] = left[leftIndex] === right[rightIndex]
        ? table[leftIndex + 1]![rightIndex + 1]! + 1
        : Math.max(table[leftIndex + 1]![rightIndex]!, table[leftIndex]![rightIndex + 1]!);
    }
  }

  const operations: DiffOperation[] = [];
  const append = (kind: DiffOperation["kind"], text: string) => {
    if (!text) return;
    const last = operations.at(-1);
    if (last?.kind === kind) last.text += text;
    else operations.push({ kind, text });
  };

  let leftIndex = 0;
  let rightIndex = 0;
  while (leftIndex < left.length || rightIndex < right.length) {
    if (left[leftIndex] === right[rightIndex]) {
      append("equal", left[leftIndex] ?? "");
      leftIndex += 1;
      rightIndex += 1;
    } else if (
      rightIndex < right.length &&
      (leftIndex === left.length || table[leftIndex]![rightIndex + 1]! > table[leftIndex + 1]![rightIndex]!)
    ) {
      append("added", right[rightIndex]!);
      rightIndex += 1;
    } else {
      append("removed", left[leftIndex]!);
      leftIndex += 1;
    }
  }
  return operations;
}

async function getPageText(document: PdfDocument, pageNumber: number) {
  const page = await document.getPage(pageNumber);
  const content = await page.getTextContent();
  return content.items
    .filter((item): item is TextItem => "str" in item)
    .map((item) => item.str)
    .join(" ");
}

export async function comparePdfDocuments(
  leftDocument: PdfDocument,
  rightDocument: PdfDocument,
): Promise<PdfPageDiff[]> {
  const pageCount = Math.max(leftDocument.numPages, rightDocument.numPages);
  const pages: PdfPageDiff[] = [];
  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    const [leftText, rightText] = await Promise.all([
      pageNumber <= leftDocument.numPages ? getPageText(leftDocument, pageNumber) : Promise.resolve(""),
      pageNumber <= rightDocument.numPages ? getPageText(rightDocument, pageNumber) : Promise.resolve(""),
    ]);
    const operations = diffText(leftText, rightText);
    if (operations.some((operation) => operation.kind !== "equal")) {
      pages.push({ pageNumber, leftText, rightText, operations });
    }
  }
  return pages;
}
