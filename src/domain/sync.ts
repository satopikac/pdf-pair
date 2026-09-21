export interface ScrollPosition {
  scrollTop: number;
  maxScrollTop: number;
}

export function mapScrollProgress(
  source: ScrollPosition,
  target: Pick<ScrollPosition, "maxScrollTop">,
  anchor?: { sourceProgress: number; targetProgress: number } | null,
): number {
  const sourceMax = Math.max(0, source.maxScrollTop);
  const targetMax = Math.max(0, target.maxScrollTop);

  if (sourceMax === 0 || targetMax === 0) {
    return 0;
  }

  const sourceTop = clamp(source.scrollTop, 0, sourceMax);
  const progress = sourceTop / sourceMax;
  const mappedProgress = anchor
    ? mapProgressAroundAnchor(progress, anchor.sourceProgress, anchor.targetProgress)
    : progress;

  return Math.round(mappedProgress * targetMax);
}

export function mapProgressAroundAnchor(
  progress: number,
  sourceAnchor: number,
  targetAnchor: number,
): number {
  const source = clamp(progress, 0, 1);
  const from = clamp(sourceAnchor, 0, 1);
  const to = clamp(targetAnchor, 0, 1);

  if (source <= from) {
    return from === 0 ? to : (source / from) * to;
  }
  return from === 1 ? to : to + ((source - from) / (1 - from)) * (1 - to);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
