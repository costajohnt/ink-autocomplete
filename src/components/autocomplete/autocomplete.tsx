import React from 'react';
import { Text, Box } from 'ink';
import { useAutocompleteState } from './use-autocomplete-state.js';
import { useAutocomplete } from './use-autocomplete.js';
import { AutocompleteOption } from './autocomplete-option.js';
import { theme } from './theme.js';
import type { OptionsSource } from '../../types.js';

export interface AutocompleteProps {
  options: OptionsSource;
  placeholder?: string;
  defaultValue?: string;
  visibleOptionCount?: number;
  debounceMs?: number;
  isDisabled?: boolean;
  prefix?: string;
  noMatchesText?: string;
  loadingText?: string;
  onChange?: (value: string) => void;
  onSelect?: (value: string) => void;
}

export function Autocomplete({
  options,
  placeholder = '',
  defaultValue = '',
  visibleOptionCount = 5,
  debounceMs,
  isDisabled = false,
  prefix = '> ',
  noMatchesText = 'No matches',
  loadingText = 'Loading...',
  onChange,
  onSelect,
}: AutocompleteProps) {
  const { state, dispatch } = useAutocompleteState({
    options,
    defaultValue,
    visibleOptionCount,
    debounceMs,
    onChange,
    onSelect,
  });

  const { renderedInput } = useAutocomplete({
    state,
    dispatch,
    isDisabled,
    placeholder,
  });

  const visibleOptions = state.filteredOptions.slice(
    state.visibleFromIndex,
    state.visibleToIndex,
  );

  const aboveCount = state.visibleFromIndex;
  const belowCount = state.filteredOptions.length - state.visibleToIndex;

  return (
    <Box flexDirection="column">
      {/* Input line */}
      <Box>
        <Text>{theme.prefix(prefix)}{renderedInput}</Text>
      </Box>

      {/* Dropdown */}
      {state.isOpen && (
        <Box flexDirection="column" marginLeft={prefix.length}>
          {/* Loading indicator */}
          {state.isLoading && (
            <Text>{theme.loading(loadingText)}</Text>
          )}

          {/* No matches */}
          {!state.isLoading &&
            state.filteredOptions.length === 0 &&
            state.inputValue.length > 0 && (
              <Text>{theme.noMatches(noMatchesText)}</Text>
            )}

          {/* Scroll up indicator */}
          {!state.isLoading && aboveCount > 0 && (
            <Text>{theme.scrollIndicator(`\u2191 ${aboveCount} more`)}</Text>
          )}

          {/* Options */}
          {!state.isLoading &&
            visibleOptions.map((match, i) => {
              const actualIndex = state.visibleFromIndex + i;
              return (
                <AutocompleteOption
                  key={match.option.value}
                  label={match.option.label}
                  matchRanges={match.matchRanges}
                  isFocused={actualIndex === state.focusedIndex}
                />
              );
            })}

          {/* Scroll down indicator */}
          {!state.isLoading && belowCount > 0 && (
            <Text>{theme.scrollIndicator(`\u2193 ${belowCount} more`)}</Text>
          )}
        </Box>
      )}
    </Box>
  );
}
