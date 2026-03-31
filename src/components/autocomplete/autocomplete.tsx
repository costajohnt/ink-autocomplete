import React from 'react';
import { Text, Box, useIsScreenReaderEnabled } from 'ink';
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
  errorText?: string;
  onChange?: (value: string) => void;
  onSelect?: (value: string) => void;
  onError?: (error: Error) => void;
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
  errorText,
  onChange,
  onSelect,
  onError,
}: AutocompleteProps) {
  const { state, dispatch } = useAutocompleteState({
    options,
    defaultValue,
    visibleOptionCount,
    debounceMs,
    onChange,
    onSelect,
    onError,
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

  const displayError = state.error
    ? (errorText ?? state.error.message)
    : null;

  const isScreenReaderEnabled = useIsScreenReaderEnabled();
  const focusedOption = state.isOpen && state.filteredOptions.length > 0
    ? state.filteredOptions[state.focusedIndex]
    : undefined;
  const inputAriaLabel = isScreenReaderEnabled && focusedOption
    ? focusedOption.option.label
    : undefined;

  return (
    <Box
      flexDirection="column"
      aria-role="combobox"
      aria-state={{expanded: state.isOpen, disabled: isDisabled}}
    >
      {inputAriaLabel && <Text aria-label={inputAriaLabel}>{''}</Text>}
      {/* Input line */}
      <Box aria-role="textbox">
        <Text aria-label={state.inputValue.length > 0 ? `${placeholder || 'Search'}: ${state.inputValue}` : (placeholder || 'Search')}>{theme.prefix(prefix)}{renderedInput}</Text>
      </Box>

      {/* Dropdown */}
      {state.isOpen && (
        <Box
          flexDirection="column"
          marginLeft={prefix.length}
          aria-role="listbox"
        >
          <Text aria-label="Suggestions">{''}</Text>
          {/* Loading indicator */}
          {state.isLoading && (
            <Box aria-role="progressbar" aria-state={{busy: true}}>
              <Text aria-label={loadingText}>{theme.loading(loadingText)}</Text>
            </Box>
          )}

          {/* Error message */}
          {!state.isLoading && displayError && (
            <Box aria-role="timer" aria-state={{busy: false}}>
              <Text aria-label={displayError} color="red">{displayError}</Text>
            </Box>
          )}

          {/* No matches */}
          {!state.isLoading &&
            !displayError &&
            state.filteredOptions.length === 0 &&
            state.inputValue.length > 0 && (
              <Text aria-label={noMatchesText}>{theme.noMatches(noMatchesText)}</Text>
            )}

          {/* Scroll up indicator */}
          {!state.isLoading && !displayError && aboveCount > 0 && (
            <Text aria-hidden>{theme.scrollIndicator(`\u2191 ${aboveCount} more`)}</Text>
          )}

          {/* Options */}
          {!state.isLoading &&
            !displayError &&
            visibleOptions.map((match, i) => {
              const actualIndex = state.visibleFromIndex + i;
              return (
                <AutocompleteOption
                  key={match.option.value}
                  label={match.option.label}
                  matchRanges={match.matchRanges}
                  isFocused={actualIndex === state.focusedIndex}
                  index={actualIndex}
                  totalCount={state.filteredOptions.length}
                />
              );
            })}

          {/* Scroll down indicator */}
          {!state.isLoading && !displayError && belowCount > 0 && (
            <Text aria-hidden>{theme.scrollIndicator(`\u2193 ${belowCount} more`)}</Text>
          )}
        </Box>
      )}
    </Box>
  );
}
