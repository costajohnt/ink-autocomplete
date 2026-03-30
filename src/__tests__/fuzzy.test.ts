import { describe, it, expect } from 'vitest';
import { fuzzyMatch, fuzzyFilter, collapseIndices } from '../fuzzy.js';

describe('collapseIndices', () => {
  it('collapses contiguous indices into ranges', () => {
    expect(collapseIndices([0, 1, 2, 5, 6])).toEqual([
      { start: 0, end: 3 },
      { start: 5, end: 7 },
    ]);
  });

  it('returns empty array for empty input', () => {
    expect(collapseIndices([])).toEqual([]);
  });

  it('handles single index', () => {
    expect(collapseIndices([3])).toEqual([{ start: 3, end: 4 }]);
  });

  it('handles all contiguous', () => {
    expect(collapseIndices([0, 1, 2, 3])).toEqual([{ start: 0, end: 4 }]);
  });

  it('handles all non-contiguous', () => {
    expect(collapseIndices([0, 2, 4])).toEqual([
      { start: 0, end: 1 },
      { start: 2, end: 3 },
      { start: 4, end: 5 },
    ]);
  });
});

describe('fuzzyMatch', () => {
  it('matches exact string', () => {
    const result = fuzzyMatch('hello', 'hello');
    expect(result).not.toBeNull();
    expect(result!.matchedIndices).toEqual([0, 1, 2, 3, 4]);
    expect(result!.score).toBeGreaterThan(0);
  });

  it('matches prefix', () => {
    const result = fuzzyMatch('hel', 'hello world');
    expect(result).not.toBeNull();
    expect(result!.matchedIndices).toEqual([0, 1, 2]);
  });

  it('matches non-contiguous characters', () => {
    const result = fuzzyMatch('hw', 'hello world');
    expect(result).not.toBeNull();
    expect(result!.matchedIndices).toEqual([0, 6]);
  });

  it('returns null when no match', () => {
    const result = fuzzyMatch('xyz', 'hello world');
    expect(result).toBeNull();
  });

  it('is case insensitive', () => {
    const result = fuzzyMatch('HEL', 'hello');
    expect(result).not.toBeNull();
    expect(result!.matchedIndices).toEqual([0, 1, 2]);
  });

  it('gives word boundary bonus', () => {
    // "fw" matching "foo world" should match "f" at 0 and "w" at 4 (word boundary)
    const withBoundary = fuzzyMatch('fw', 'foo world');
    // "fw" matching "fooworld" should match "f" at 0 and "w" at 3 (not word boundary)
    const withoutBoundary = fuzzyMatch('fw', 'fooworld');
    expect(withBoundary).not.toBeNull();
    expect(withoutBoundary).not.toBeNull();
    expect(withBoundary!.score).toBeGreaterThan(withoutBoundary!.score);
  });

  it('gives camelCase bonus', () => {
    const camelResult = fuzzyMatch('gN', 'getName');
    const noCamelResult = fuzzyMatch('gn', 'getname');
    expect(camelResult).not.toBeNull();
    expect(noCamelResult).not.toBeNull();
    // The camelCase version should score higher because N is a camelCase boundary
    expect(camelResult!.score).toBeGreaterThan(noCamelResult!.score);
  });

  it('gives consecutive bonus', () => {
    // "abc" matching "abcdef" (all consecutive) vs "axbxcx" (all non-consecutive)
    const consecutive = fuzzyMatch('abc', 'abcdef');
    const nonConsecutive = fuzzyMatch('abc', 'axbxcx');
    expect(consecutive).not.toBeNull();
    expect(nonConsecutive).not.toBeNull();
    expect(consecutive!.score).toBeGreaterThan(nonConsecutive!.score);
  });

  it('returns score 1 for empty query', () => {
    const result = fuzzyMatch('', 'hello');
    expect(result).not.toBeNull();
    expect(result!.score).toBe(1);
    expect(result!.matchedIndices).toEqual([]);
  });

  it('returns correct match ranges via collapseIndices', () => {
    const result = fuzzyMatch('hw', 'hello world');
    expect(result).not.toBeNull();
    const ranges = collapseIndices(result!.matchedIndices);
    expect(ranges).toEqual([
      { start: 0, end: 1 },
      { start: 6, end: 7 },
    ]);
  });
});

describe('fuzzyFilter', () => {
  const options = [
    { label: 'apple', value: 'apple' },
    { label: 'application', value: 'application' },
    { label: 'banana', value: 'banana' },
    { label: 'grape', value: 'grape' },
    { label: 'grapefruit', value: 'grapefruit' },
  ];

  it('returns all options for empty query', () => {
    const results = fuzzyFilter('', options);
    expect(results).toHaveLength(5);
    expect(results[0]!.matchRanges).toEqual([]);
  });

  it('filters to matching options', () => {
    const results = fuzzyFilter('app', options);
    // "apple" and "application" match "app"
    expect(results.length).toBeGreaterThanOrEqual(2);
    const labels = results.map((r) => r.option.label);
    expect(labels).toContain('apple');
    expect(labels).toContain('application');
    expect(labels).not.toContain('banana');
  });

  it('sorts by score descending', () => {
    const results = fuzzyFilter('grap', options);
    expect(results.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1]!.score).toBeGreaterThanOrEqual(results[i]!.score);
    }
  });

  it('includes match ranges in results', () => {
    const results = fuzzyFilter('app', options);
    const appleResult = results.find((r) => r.option.label === 'apple');
    expect(appleResult).toBeDefined();
    expect(appleResult!.matchRanges.length).toBeGreaterThan(0);
  });

  it('returns empty array when nothing matches', () => {
    const results = fuzzyFilter('xyz', options);
    expect(results).toHaveLength(0);
  });
});
