import React from 'react';
import { Text, Box } from 'ink';
import type { MatchRange } from '../../types.js';
import { theme } from './theme.js';

export interface AutocompleteOptionProps {
  label: string;
  matchRanges: MatchRange[];
  isFocused: boolean;
}

export function AutocompleteOption({
  label,
  matchRanges,
  isFocused,
}: AutocompleteOptionProps) {
  const pointer = isFocused ? theme.pointer() : theme.noPointer();
  const highlightedLabel = renderHighlightedLabel(label, matchRanges, isFocused);

  return (
    <Box>
      <Text>{pointer} {highlightedLabel}</Text>
    </Box>
  );
}

function renderHighlightedLabel(
  label: string,
  matchRanges: MatchRange[],
  isFocused: boolean,
): string {
  if (matchRanges.length === 0) {
    return isFocused ? theme.focusedOption(label) : theme.unfocusedOption(label);
  }

  let result = '';
  let pos = 0;

  for (const range of matchRanges) {
    // Non-matched chars before this range
    if (pos < range.start) {
      const segment = label.slice(pos, range.start);
      result += isFocused
        ? theme.focusedOption(segment)
        : theme.unfocusedOption(segment);
    }

    // Matched chars
    const matched = label.slice(range.start, range.end);
    result += theme.matchedChar(matched);

    pos = range.end;
  }

  // Remaining non-matched chars
  if (pos < label.length) {
    const segment = label.slice(pos);
    result += isFocused
      ? theme.focusedOption(segment)
      : theme.unfocusedOption(segment);
  }

  return result;
}
