import type { TextItem } from "pdfjs-dist/types/src/display/api";
import type { PdfDocument } from "./pdfLoader";

export interface PdfSearchResult {
  pageNumber: number;
  occurrences: number;
}

function countOccurrences(text: string, query: string) {
  let count = 0;
  let position = 0;
  while ((position = text.indexOf(query, position)) !== -1) {
    count += 1;
    position += query.length;
  }
  return count;
}

export async function searchPdf(
  document: PdfDocument,
  rawQuery: string,
): Promise<PdfSearchResult[]> {
  const query = rawQuery.trim().toLocaleLowerCase();
  if (!query) {
    return [];
  }

  const results: PdfSearchResult[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items
      .filter((item): item is TextItem => "str" in item)
      .map((item) => item.str)
      .join(" ")
      .toLocaleLowerCase();
    const occurrences = countOccurrences(text, query);
    if (occurrences > 0) {
      results.push({ pageNumber, occurrences });
    }
  }
  return results;
}
