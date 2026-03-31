import React from 'react';
import { Text, Box, useIsScreenReaderEnabled } from 'ink';
import type { MatchRange } from '../../types.js';
import { theme } from './theme.js';

export interface AutocompleteOptionProps {
  label: string;
  matchRanges: MatchRange[];
  isFocused: boolean;
  index: number;
  totalCount: number;
}

export function AutocompleteOption({
  label,
  matchRanges,
  isFocused,
  index,
  totalCount,
}: AutocompleteOptionProps) {
  const isScreenReaderEnabled = useIsScreenReaderEnabled();
  const pointer = isFocused ? theme.pointer() : theme.noPointer();
  const highlightedLabel = renderHighlightedLabel(label, matchRanges, isFocused);
  const ariaLabel = isScreenReaderEnabled
    ? `${label}, ${index + 1} of ${totalCount}`
    : label;

  return (
    <Box
      aria-role="option"
      aria-state={{selected: isFocused}}
    >
      <Text aria-hidden>{pointer} </Text>
      <Text aria-label={ariaLabel}>{highlightedLabel}</Text>
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
