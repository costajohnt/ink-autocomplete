// Grapheme-aware cursor math.
//
// Cursor offsets are code-unit indices into the input string, but they must
// only ever land on grapheme-cluster boundaries so that emoji (including
// surrogate pairs and ZWJ sequences like 👨‍👩‍👧) are treated as a single
// character by cursor movement and deletion. Intl.Segmenter with granularity
// 'grapheme' is available in Node 20+.
const graphemeSegmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

/**
 * Sorted list of grapheme-cluster boundary offsets (code units), always
 * including 0 and the string length.
 */
function graphemeBoundaries(value: string): number[] {
  const boundaries = [0];
  for (const { segment } of graphemeSegmenter.segment(value)) {
    boundaries.push(boundaries[boundaries.length - 1]! + segment.length);
  }
  return boundaries;
}

/** Offset of the grapheme boundary immediately before `offset`. */
export function prevGraphemeOffset(value: string, offset: number): number {
  const boundaries = graphemeBoundaries(value);
  let prev = 0;
  for (const boundary of boundaries) {
    if (boundary >= offset) break;
    prev = boundary;
  }
  return prev;
}

/** Offset of the grapheme boundary immediately after `offset`. */
export function nextGraphemeOffset(value: string, offset: number): number {
  const boundaries = graphemeBoundaries(value);
  for (const boundary of boundaries) {
    if (boundary > offset) return boundary;
  }
  return value.length;
}

/** Iterate a string as grapheme clusters, exposing each cluster's start offset. */
export function graphemeSegments(value: string): Array<{ segment: string; start: number }> {
  const segments: Array<{ segment: string; start: number }> = [];
  let start = 0;
  for (const { segment } of graphemeSegmenter.segment(value)) {
    segments.push({ segment, start });
    start += segment.length;
  }
  return segments;
}
