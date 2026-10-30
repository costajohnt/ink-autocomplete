import React from 'react';
import {Text, Box, useIsScreenReaderEnabled} from 'ink';
import type {Option, OptionsSource} from '../../types.js';
import {useAutocompleteState} from './use-autocomplete-state.js';
import {useAutocomplete} from './use-autocomplete.js';
import {AutocompleteOption} from './autocomplete-option.js';
import {theme} from './theme.js';

// Ink's aria-role type doesn't include 'alert', but its renderer honors any
// role string (it prefixes screen-reader output with `${role}: `). 'alert' is
// the correct WAI-ARIA role for an error message; 'timer' wrongly implied a
// live countdown.
const alertRole = {'aria-role': 'alert'} as unknown as React.ComponentProps<typeof Box>;

export type AutocompleteProps = {
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
  onSelect?: (value: string, option?: Option) => void;
  onError?: (error: Error) => void;
};

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
  const {state, dispatch} = useAutocompleteState({
    options,
    defaultValue,
    visibleOptionCount,
    debounceMs,
    onChange,
    onSelect,
    onError,
  });

  const {renderedInput} = useAutocomplete({
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
  const hasError = displayError !== null && displayError !== '';

  const isScreenReaderEnabled = useIsScreenReaderEnabled();
  const focusedOption = state.isOpen && state.filteredOptions.length > 0
    ? state.filteredOptions[state.focusedIndex]
    : undefined;
  const inputAriaLabel = isScreenReaderEnabled && focusedOption
    ? focusedOption.option.label
    : undefined;
  const inputLabel = placeholder === '' ? 'Search' : placeholder;

  return (
    <Box
      flexDirection="column"
      aria-role="combobox"
      aria-state={{expanded: state.isOpen, disabled: isDisabled}}
    >
      {inputAriaLabel !== undefined && inputAriaLabel !== '' && <Text aria-label={inputAriaLabel} />}
      {/* Input line */}
      <Box aria-role="textbox">
        <Text aria-label={state.inputValue.length > 0 ? `${inputLabel}: ${state.inputValue}` : inputLabel}>{theme.prefix(prefix)}{renderedInput}</Text>
      </Box>

      {/* Dropdown */}
      {state.isOpen && (
        <Box
          flexDirection="column"
          marginLeft={prefix.length}
          aria-role="listbox"
        >
          <Text aria-label="Suggestions" />
          {/* Loading indicator */}
          {state.isLoading && (
            <Box aria-role="progressbar" aria-state={{busy: true}}>
              <Text aria-label={loadingText}>{theme.loading(loadingText)}</Text>
            </Box>
          )}

          {/* Error message */}
          {!state.isLoading && hasError && (
            <Box {...alertRole}>
              <Text aria-label={displayError} color="red">{displayError}</Text>
            </Box>
          )}

          {/* No matches */}
          {!state.isLoading && !hasError && state.filteredOptions.length === 0 && state.inputValue.length > 0 && (
            <Text aria-label={noMatchesText}>{theme.noMatches(noMatchesText)}</Text>
          )}

          {/* Scroll up indicator */}
          {!state.isLoading && !hasError && aboveCount > 0 && (
            <Text aria-hidden>{theme.scrollIndicator(`\u{2191} ${aboveCount} more`)}</Text>
          )}

          {/* Options */}
          {!state.isLoading && !hasError && visibleOptions.map((match, i) => {
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
          {!state.isLoading && !hasError && belowCount > 0 && (
            <Text aria-hidden>{theme.scrollIndicator(`\u{2193} ${belowCount} more`)}</Text>
          )}
        </Box>
      )}
    </Box>
  );
}
