import type { Option, MatchRange, FuzzyMatch } from './types.js';

/**
 * Collapse an array of matched character indices into contiguous ranges.
 * e.g. [0, 1, 2, 5, 6] -> [{ start: 0, end: 3 }, { start: 5, end: 7 }]
 */
export function collapseIndices(indices: number[]): MatchRange[] {
  if (indices.length === 0) return [];

  const ranges: MatchRange[] = [];
  let start = indices[0]!;
  let prev = start;

  for (let i = 1; i < indices.length; i++) {
    const idx = indices[i]!;
    if (idx === prev + 1) {
      prev = idx;
    } else {
      ranges.push({ start, end: prev + 1 });
      start = idx;
      prev = idx;
    }
  }
  ranges.push({ start, end: prev + 1 });

  return ranges;
}

function isWordBoundary(label: string, index: number): boolean {
  if (index === 0) return true;
  const prev = label[index - 1]!;
  return prev === ' ' || prev === '-' || prev === '_' || prev === '/' || prev === '.';
}

function isCamelCaseBoundary(label: string, index: number): boolean {
  if (index === 0) return false;
  const prev = label[index - 1]!;
  const curr = label[index]!;
  // lowercase -> uppercase
  if (prev >= 'a' && prev <= 'z' && curr >= 'A' && curr <= 'Z') return true;
  // non-digit -> digit
  if ((prev < '0' || prev > '9') && curr >= '0' && curr <= '9') return true;
  return false;
}

/**
 * Fuzzy match a query against a label. Returns null if no match.
 * Case-insensitive left-to-right scan.
 */
export function fuzzyMatch(
  query: string,
  label: string,
): { score: number; matchedIndices: number[] } | null {
  if (query.length === 0) {
    return { score: 1, matchedIndices: [] };
  }

  const queryLower = query.toLowerCase();
  const labelLower = label.toLowerCase();

  // Quick check: does the label contain all query chars in order?
  let qi = 0;
  for (let li = 0; li < labelLower.length && qi < queryLower.length; li++) {
    if (labelLower[li] === queryLower[qi]) {
      qi++;
    }
  }
  if (qi < queryLower.length) return null;

  // Now do the actual scoring pass
  const matchedIndices: number[] = [];
  let score = 0;
  let prevMatchIndex = -2; // so first match is never "consecutive"
  qi = 0;

  for (let li = 0; li < label.length && qi < queryLower.length; li++) {
    if (labelLower[li] === queryLower[qi]) {
      matchedIndices.push(li);

      // Base score per match
      let charScore = 1;

      // Consecutive bonus
      if (li === prevMatchIndex + 1) {
        charScore += 4;
      }

      // Word boundary bonus
      if (isWordBoundary(label, li)) {
        charScore += 10;
      }

      // CamelCase bonus
      if (isCamelCaseBoundary(label, li)) {
        charScore += 7;
      }

      // First char multiplier
      if (qi === 0) {
        charScore *= 2;
      }

      score += charScore;
      prevMatchIndex = li;
      qi++;
    }
  }

  // Gap penalty
  if (matchedIndices.length > 1) {
    for (let i = 1; i < matchedIndices.length; i++) {
      const gap = matchedIndices[i]! - matchedIndices[i - 1]! - 1;
      if (gap > 0) {
        score -= 3; // starting gap penalty
        score -= (gap - 1); // extension penalty
      }
    }
  }

  // Normalize to 0..1 range
  // The first character gets the 2x multiplier: max per-char score = (1 + 4 + 10 + 7) * 2 = 44
  // Subsequent characters don't get the multiplier: max per-char score = 1 + 4 + 10 + 7 = 22
  const maxPossible = 44 + Math.max(0, query.length - 1) * 22;
  const normalized = Math.max(0, Math.min(1, score / maxPossible));

  return { score: normalized, matchedIndices };
}

/**
 * Filter and sort options by fuzzy match score.
 */
export function fuzzyFilter(query: string, options: Option[]): FuzzyMatch[] {
  if (query.length === 0) {
    return options.map((option) => ({
      option,
      score: 1,
      matchRanges: [],
    }));
  }

  const results: FuzzyMatch[] = [];

  for (const option of options) {
    const result = fuzzyMatch(query, option.label);
    if (result) {
      results.push({
        option,
        score: result.score,
        matchRanges: collapseIndices(result.matchedIndices),
      });
    }
  }

  results.sort((a, b) => b.score - a.score);

  return results;
}
