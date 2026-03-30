export { Autocomplete } from './components/autocomplete/autocomplete.js';
export type { AutocompleteProps } from './components/autocomplete/autocomplete.js';

export { useAutocompleteState } from './components/autocomplete/use-autocomplete-state.js';
export type {
  AutocompleteState,
  AutocompleteAction,
  UseAutocompleteStateOptions,
} from './components/autocomplete/use-autocomplete-state.js';

export { useAutocomplete } from './components/autocomplete/use-autocomplete.js';
export type { UseAutocompleteOptions } from './components/autocomplete/use-autocomplete.js';

export { AutocompleteOption } from './components/autocomplete/autocomplete-option.js';
export type { AutocompleteOptionProps } from './components/autocomplete/autocomplete-option.js';

export { theme } from './components/autocomplete/theme.js';
export type { Theme } from './components/autocomplete/theme.js';

export { fuzzyMatch, fuzzyFilter, collapseIndices } from './fuzzy.js';

export type {
  Option,
  MatchRange,
  FuzzyMatch,
  AsyncOptionsProvider,
  OptionsSource,
} from './types.js';
