import { useReducer, useEffect, useRef, useMemo } from 'react';
import { fuzzyFilter, fuzzyMatch, collapseIndices } from '../../fuzzy.js';
import { prevGraphemeOffset, nextGraphemeOffset } from './text.js';
import type { Option, FuzzyMatch, OptionsSource, AsyncOptionsProvider } from '../../types.js';

// --- State ---
export interface AutocompleteState {
  inputValue: string;
  cursorOffset: number;
  isOpen: boolean;
  filteredOptions: FuzzyMatch[];
  focusedIndex: number;
  visibleFromIndex: number;
  visibleToIndex: number;
  selectedValue: string | null;
  selectedOption: Option | null;
  isLoading: boolean;
  error: Error | null;
  // Set by SELECT/ACCEPT so the filtering effect skips the programmatic
  // inputValue change and does not re-fetch (or spuriously error) after a pick.
  skipFilter: boolean;
}

// --- Actions ---
export type AutocompleteAction =
  | { type: 'INSERT_TEXT'; text: string }
  | { type: 'DELETE_BACKWARD' }
  | { type: 'DELETE_FORWARD' }
  | { type: 'MOVE_CURSOR_LEFT' }
  | { type: 'MOVE_CURSOR_RIGHT' }
  | { type: 'MOVE_CURSOR_START' }
  | { type: 'MOVE_CURSOR_END' }
  | { type: 'FOCUS_NEXT' }
  | { type: 'FOCUS_PREV' }
  | { type: 'SELECT'; value: string; label: string }
  | { type: 'ACCEPT' }
  | { type: 'CLOSE' }
  | { type: 'SET_FILTERED'; options: FuzzyMatch[] }
  | { type: 'SET_LOADING'; isLoading: boolean }
  | { type: 'SET_ERROR'; error: Error };

function clampVisible(
  focusedIndex: number,
  visibleFromIndex: number,
  visibleToIndex: number,
  visibleCount: number,
  totalCount: number,
): { visibleFromIndex: number; visibleToIndex: number } {
  if (totalCount <= visibleCount) {
    return { visibleFromIndex: 0, visibleToIndex: totalCount };
  }

  let from = visibleFromIndex;
  // Establish a full-height window. The initial/reset window is [0, 0]; without
  // this, the branch below would compute from = to - visibleCount = -2 on first
  // open, and slice() with a negative start rendered zero options under a
  // "N more" indicator.
  let to =
    visibleToIndex - visibleFromIndex === visibleCount
      ? visibleToIndex
      : from + visibleCount;

  if (focusedIndex < from) {
    from = focusedIndex;
    to = from + visibleCount;
  } else if (focusedIndex >= to) {
    to = focusedIndex + 1;
    from = to - visibleCount;
  }

  // Keep the window within bounds regardless of the entry state.
  if (from < 0) {
    from = 0;
    to = visibleCount;
  }
  if (to > totalCount) {
    to = totalCount;
    from = totalCount - visibleCount;
  }

  return { visibleFromIndex: from, visibleToIndex: to };
}

export function createReducer(visibleOptionCount: number) {
  return function reducer(
    state: AutocompleteState,
    action: AutocompleteAction,
  ): AutocompleteState {
    switch (action.type) {
      case 'INSERT_TEXT': {
        const before = state.inputValue.slice(0, state.cursorOffset);
        const after = state.inputValue.slice(state.cursorOffset);
        const newValue = before + action.text + after;
        return {
          ...state,
          inputValue: newValue,
          // action.text is inserted whole, so advancing by its full code-unit
          // length keeps the cursor on a grapheme boundary. (Caveat: if the
          // inserted text combines with the following character — regional
          // indicators, combining marks — the offset can momentarily land
          // mid-cluster; it self-heals on the next grapheme-aware move and is
          // not corrected here.)
          cursorOffset: state.cursorOffset + action.text.length,
          isOpen: true,
          focusedIndex: 0,
          selectedValue: null,
          selectedOption: null,
          error: null,
          skipFilter: false,
        };
      }

      case 'DELETE_BACKWARD': {
        if (state.cursorOffset === 0) return state;
        const start = prevGraphemeOffset(state.inputValue, state.cursorOffset);
        const before = state.inputValue.slice(0, start);
        const after = state.inputValue.slice(state.cursorOffset);
        const newValue = before + after;
        const willClose = newValue.length === 0;
        return {
          ...state,
          inputValue: newValue,
          cursorOffset: start,
          isOpen: !willClose,
          focusedIndex: 0,
          selectedValue: null,
          selectedOption: null,
          error: null,
          skipFilter: false,
          visibleFromIndex: willClose ? 0 : state.visibleFromIndex,
          visibleToIndex: willClose ? 0 : state.visibleToIndex,
        };
      }

      case 'DELETE_FORWARD': {
        if (state.cursorOffset >= state.inputValue.length) return state;
        const end = nextGraphemeOffset(state.inputValue, state.cursorOffset);
        const before = state.inputValue.slice(0, state.cursorOffset);
        const after = state.inputValue.slice(end);
        const newValue = before + after;
        const willClose = newValue.length === 0;
        return {
          ...state,
          inputValue: newValue,
          isOpen: !willClose,
          focusedIndex: 0,
          selectedValue: null,
          selectedOption: null,
          error: null,
          skipFilter: false,
          visibleFromIndex: willClose ? 0 : state.visibleFromIndex,
          visibleToIndex: willClose ? 0 : state.visibleToIndex,
        };
      }

      case 'MOVE_CURSOR_LEFT': {
        if (state.cursorOffset === 0) return state;
        return {
          ...state,
          cursorOffset: prevGraphemeOffset(state.inputValue, state.cursorOffset),
        };
      }

      case 'MOVE_CURSOR_RIGHT': {
        if (state.cursorOffset >= state.inputValue.length) return state;
        return {
          ...state,
          cursorOffset: nextGraphemeOffset(state.inputValue, state.cursorOffset),
        };
      }

      case 'MOVE_CURSOR_START': {
        return { ...state, cursorOffset: 0 };
      }

      case 'MOVE_CURSOR_END': {
        return { ...state, cursorOffset: state.inputValue.length };
      }

      case 'FOCUS_NEXT': {
        if (!state.isOpen || state.filteredOptions.length === 0) return state;
        const next = Math.min(
          state.focusedIndex + 1,
          state.filteredOptions.length - 1,
        );
        const { visibleFromIndex, visibleToIndex } = clampVisible(
          next,
          state.visibleFromIndex,
          state.visibleToIndex,
          visibleOptionCount,
          state.filteredOptions.length,
        );
        return {
          ...state,
          focusedIndex: next,
          visibleFromIndex,
          visibleToIndex,
        };
      }

      case 'FOCUS_PREV': {
        if (!state.isOpen || state.filteredOptions.length === 0) return state;
        const prev = Math.max(state.focusedIndex - 1, 0);
        const { visibleFromIndex, visibleToIndex } = clampVisible(
          prev,
          state.visibleFromIndex,
          state.visibleToIndex,
          visibleOptionCount,
          state.filteredOptions.length,
        );
        return {
          ...state,
          focusedIndex: prev,
          visibleFromIndex,
          visibleToIndex,
        };
      }

      case 'SELECT': {
        return {
          ...state,
          selectedValue: action.value,
          selectedOption: { value: action.value, label: action.label },
          isOpen: false,
          inputValue: action.label,
          cursorOffset: action.label.length,
          focusedIndex: 0,
          skipFilter: true,
          // Clear any pending loading/error state from a fetch that was in
          // flight at pick time (that fetch is invalidated in the effect).
          isLoading: false,
          error: null,
        };
      }

      case 'ACCEPT': {
        if (
          !state.isOpen ||
          state.filteredOptions.length === 0 ||
          state.focusedIndex >= state.filteredOptions.length
        ) {
          return state;
        }
        const focused = state.filteredOptions[state.focusedIndex]!;
        const label = focused.option.label;
        return {
          ...state,
          inputValue: label,
          cursorOffset: label.length,
          isOpen: true,
          focusedIndex: 0,
          selectedValue: null,
          selectedOption: null,
          skipFilter: true,
          // Clear any pending loading/error state from a fetch that was in
          // flight at accept time (that fetch is invalidated in the effect).
          // Matters more than for SELECT because the dropdown stays open.
          isLoading: false,
          error: null,
        };
      }

      case 'CLOSE': {
        return {
          ...state,
          isOpen: false,
          inputValue: '',
          cursorOffset: 0,
          focusedIndex: 0,
          selectedValue: null,
          selectedOption: null,
        };
      }

      case 'SET_FILTERED': {
        const total = action.options.length;
        const clampedFocus = total === 0 ? 0 : Math.min(state.focusedIndex, total - 1);
        const { visibleFromIndex, visibleToIndex } = clampVisible(
          clampedFocus,
          state.visibleFromIndex,
          state.visibleToIndex,
          visibleOptionCount,
          total,
        );
        return {
          ...state,
          filteredOptions: action.options,
          focusedIndex: clampedFocus,
          visibleFromIndex,
          visibleToIndex,
          isLoading: false,
        };
      }

      case 'SET_LOADING': {
        return { ...state, isLoading: action.isLoading };
      }

      case 'SET_ERROR': {
        return {
          ...state,
          error: action.error,
          isLoading: false,
        };
      }

      default:
        return state;
    }
  };
}

export interface UseAutocompleteStateOptions {
  options: OptionsSource;
  defaultValue?: string;
  visibleOptionCount?: number;
  debounceMs?: number;
  onChange?: (value: string) => void;
  onSelect?: (value: string, option?: Option) => void;
  onError?: (error: Error) => void;
}

export function useAutocompleteState(opts: UseAutocompleteStateOptions) {
  const {
    options,
    defaultValue = '',
    visibleOptionCount = 5,
    debounceMs,
    onChange,
    onSelect,
    onError,
  } = opts;

  const isAsync = typeof options === 'function';
  const effectiveDebounce = debounceMs ?? (isAsync ? 150 : 0);

  const initialState: AutocompleteState = {
    inputValue: defaultValue,
    cursorOffset: defaultValue.length,
    isOpen: false,
    filteredOptions: [],
    focusedIndex: 0,
    visibleFromIndex: 0,
    visibleToIndex: 0,
    selectedValue: null,
          selectedOption: null,
    isLoading: false,
    error: null,
    skipFilter: false,
  };

  const reducer = useMemo(
    () => createReducer(visibleOptionCount),
    [visibleOptionCount],
  );

  const [state, dispatch] = useReducer(reducer, initialState);

  // Track onChange/onSelect/onError with refs to avoid stale closures
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  // Previous inputValue for change detection
  const prevInputRef = useRef(state.inputValue);
  const prevSelectedRef = useRef(state.selectedValue);
  const prevErrorRef = useRef(state.error);

  useEffect(() => {
    if (state.inputValue !== prevInputRef.current) {
      prevInputRef.current = state.inputValue;
      onChangeRef.current?.(state.inputValue);
    }
  }, [state.inputValue]);

  useEffect(() => {
    if (
      state.selectedValue !== null &&
      state.selectedValue !== prevSelectedRef.current
    ) {
      prevSelectedRef.current = state.selectedValue;
      onSelectRef.current?.(
        state.selectedValue,
        state.selectedOption ?? undefined,
      );
    } else if (state.selectedValue === null) {
      prevSelectedRef.current = null;
    }
  }, [state.selectedValue, state.selectedOption]);

  useEffect(() => {
    if (state.error !== null && state.error !== prevErrorRef.current) {
      prevErrorRef.current = state.error;
      onErrorRef.current?.(state.error);
    }
  }, [state.error]);

  // Stabilize options reference so inline array literals don't cause infinite re-renders.
  // For arrays, do a shallow JSON comparison; for functions, compare by reference.
  const optionsRef = useRef(options);
  const optionsChanged = isAsync
    ? options !== optionsRef.current
    : JSON.stringify(options) !== JSON.stringify(optionsRef.current);
  if (optionsChanged) {
    optionsRef.current = options;
  }
  const stableOptions = optionsRef.current;

  // Filtering logic with debounce and async support
  const requestCounterRef = useRef(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // SELECT/ACCEPT set inputValue programmatically; don't re-filter (which
    // would fire a redundant async fetch and, if it rejects, a spurious error).
    // Also bump the request counter so any fetch already in flight at pick time
    // is discarded when it settles (its stale result can't overwrite the picked
    // value, and a rejection can't surface a spurious error).
    if (state.skipFilter) {
      requestCounterRef.current++;
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const doFilter = () => {
      if (isAsync) {
        // Async provider: the provider is responsible for filtering.
        // We only run fuzzyMatch on the results for highlight data, not for filtering/sorting.
        const counter = ++requestCounterRef.current;
        dispatch({ type: 'SET_LOADING', isLoading: true });
        (stableOptions as AsyncOptionsProvider)(state.inputValue).then(
          (result) => {
            if (counter === requestCounterRef.current) {
              const matches: FuzzyMatch[] = result.map((option) => {
                const match = state.inputValue.length > 0
                  ? fuzzyMatch(state.inputValue, option.label)
                  : null;
                return {
                  option,
                  score: match?.score ?? 1,
                  matchRanges: match ? collapseIndices(match.matchedIndices) : [],
                };
              });
              dispatch({ type: 'SET_FILTERED', options: matches });
            }
          },
          (err) => {
            if (counter === requestCounterRef.current) {
              const error = err instanceof Error ? err : new Error(String(err));
              dispatch({ type: 'SET_ERROR', error });
            }
          },
        );
      } else {
        const filtered = fuzzyFilter(state.inputValue, stableOptions as Option[]);
        dispatch({ type: 'SET_FILTERED', options: filtered });
      }
    };

    if (effectiveDebounce > 0) {
      debounceTimerRef.current = setTimeout(doFilter, effectiveDebounce);
    } else {
      doFilter();
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [state.inputValue, state.skipFilter, stableOptions, isAsync, effectiveDebounce]);

  return { state, dispatch };
}
