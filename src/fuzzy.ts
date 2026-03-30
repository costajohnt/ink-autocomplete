import type { Option, MatchRange, FuzzyMatch } from './types.js';

// --- Scoring constants ---
const SCORE_BASE = 1;
const BONUS_CONSECUTIVE = 4;
const BONUS_BOUNDARY = 10;
const BONUS_CAMEL = 7;
const FIRST_CHAR_MULTIPLIER = 2;
const PENALTY_GAP_START = -3;
const PENALTY_GAP_EXTENSION = -1;

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
 * Score a set of matched indices against a label.
 */
function scoreIndices(indices: number[], label: string): number {
  let score = 0;
  let prevMatchIndex = -2;

  for (let qi = 0; qi < indices.length; qi++) {
    const li = indices[qi]!;
    let charScore = SCORE_BASE;

    if (li === prevMatchIndex + 1) {
      charScore += BONUS_CONSECUTIVE;
    }

    if (isWordBoundary(label, li)) {
      charScore += BONUS_BOUNDARY;
    }

    if (isCamelCaseBoundary(label, li)) {
      charScore += BONUS_CAMEL;
    }

    if (qi === 0) {
      charScore *= FIRST_CHAR_MULTIPLIER;
    }

    score += charScore;
    prevMatchIndex = li;
  }

  // Gap penalty
  if (indices.length > 1) {
    for (let i = 1; i < indices.length; i++) {
      const gap = indices[i]! - indices[i - 1]! - 1;
      if (gap > 0) {
        score += PENALTY_GAP_START;
        score += (gap - 1) * PENALTY_GAP_EXTENSION;
      }
    }
  }

  return score;
}

/**
 * Fuzzy match a query against a label using a two-pass approach (similar to fzf v1).
 *
 * Pass 1 (forward): Greedy left-to-right scan to confirm a match exists and find initial indices.
 * Pass 2 (backward): From the last matched position, scan backward to find a tighter alignment
 * that produces higher consecutive bonuses.
 *
 * Returns null if no match. Case-insensitive.
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

  // --- Pass 1 (forward): greedy left-to-right scan ---
  const forwardIndices: number[] = [];
  let qi = 0;
  for (let li = 0; li < labelLower.length && qi < queryLower.length; li++) {
    if (labelLower[li] === queryLower[qi]) {
      forwardIndices.push(li);
      qi++;
    }
  }

  // Not all query characters found
  if (qi < queryLower.length) return null;

  // --- Pass 2 (backward): from the last matched position, scan backward ---
  // This finds a tighter alignment by starting from the end of the forward match
  // and working backward through the query characters.
  const backwardIndices: number[] = new Array(queryLower.length);
  const lastForwardIndex = forwardIndices[forwardIndices.length - 1]!;
  qi = queryLower.length - 1;
  for (let li = lastForwardIndex; li >= 0 && qi >= 0; li--) {
    if (labelLower[li] === queryLower[qi]) {
      backwardIndices[qi] = li;
      qi--;
    }
  }

  // Score both and pick the better one
  const forwardScore = scoreIndices(forwardIndices, label);
  const backwardScore = scoreIndices(backwardIndices, label);

  const bestIndices = backwardScore >= forwardScore ? backwardIndices : forwardIndices;
  const bestScore = Math.max(forwardScore, backwardScore);

  // Normalize to 0..1 range
  // The first character gets the 2x multiplier: max per-char score = (SCORE_BASE + BONUS_CONSECUTIVE + BONUS_BOUNDARY + BONUS_CAMEL) * FIRST_CHAR_MULTIPLIER = 44
  // Subsequent characters don't get the multiplier: max per-char score = SCORE_BASE + BONUS_CONSECUTIVE + BONUS_BOUNDARY + BONUS_CAMEL = 22
  const maxFirst = (SCORE_BASE + BONUS_CONSECUTIVE + BONUS_BOUNDARY + BONUS_CAMEL) * FIRST_CHAR_MULTIPLIER;
  const maxRest = SCORE_BASE + BONUS_CONSECUTIVE + BONUS_BOUNDARY + BONUS_CAMEL;
  const maxPossible = maxFirst + Math.max(0, query.length - 1) * maxRest;
  const normalized = Math.max(0, Math.min(1, bestScore / maxPossible));

  return { score: normalized, matchedIndices: bestIndices };
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
