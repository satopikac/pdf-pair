export interface ScrollPosition {
  scrollTop: number;
  maxScrollTop: number;
}

export function mapScrollProgress(
  source: ScrollPosition,
  target: Pick<ScrollPosition, "maxScrollTop">,
): number {
  const sourceMax = Math.max(0, source.maxScrollTop);
  const targetMax = Math.max(0, target.maxScrollTop);

  if (sourceMax === 0 || targetMax === 0) {
    return 0;
  }

  const sourceTop = clamp(source.scrollTop, 0, sourceMax);
  const progress = sourceTop / sourceMax;

  return Math.round(progress * targetMax);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
