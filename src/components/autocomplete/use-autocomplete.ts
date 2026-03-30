import { useInput } from 'ink';
import { theme } from './theme.js';
import type { AutocompleteState, AutocompleteAction } from './use-autocomplete-state.js';

export interface UseAutocompleteOptions {
  state: AutocompleteState;
  dispatch: React.Dispatch<AutocompleteAction>;
  isDisabled?: boolean;
  placeholder?: string;
}

export function useAutocomplete(opts: UseAutocompleteOptions) {
  const { state, dispatch, isDisabled = false, placeholder = '' } = opts;

  useInput(
    (input, key) => {
      if (isDisabled) return;

      // Escape: close dropdown and clear input
      if (key.escape) {
        dispatch({ type: 'CLOSE' });
        return;
      }

      // Enter: select focused option
      if (key.return) {
        if (
          state.isOpen &&
          state.filteredOptions.length > 0 &&
          state.focusedIndex < state.filteredOptions.length
        ) {
          const focused = state.filteredOptions[state.focusedIndex]!;
          dispatch({ type: 'SELECT', value: focused.option.value, label: focused.option.label });
        }
        return;
      }

      // Tab: accept (fill input with focused option label)
      if (key.tab) {
        dispatch({ type: 'ACCEPT' });
        return;
      }

      // Arrow keys
      if (key.downArrow) {
        dispatch({ type: 'FOCUS_NEXT' });
        return;
      }
      if (key.upArrow) {
        dispatch({ type: 'FOCUS_PREV' });
        return;
      }

      // Backspace
      if (key.backspace) {
        dispatch({ type: 'DELETE_BACKWARD' });
        return;
      }

      // Forward delete
      if (key.delete) {
        dispatch({ type: 'DELETE_FORWARD' });
        return;
      }

      // Ctrl+D: forward delete (alternative binding)
      if (input === 'd' && key.ctrl) {
        dispatch({ type: 'DELETE_FORWARD' });
        return;
      }

      // Left/Right cursor movement
      if (key.leftArrow) {
        dispatch({ type: 'MOVE_CURSOR_LEFT' });
        return;
      }
      if (key.rightArrow) {
        dispatch({ type: 'MOVE_CURSOR_RIGHT' });
        return;
      }

      // Ctrl+A: move to start
      if (input === 'a' && key.ctrl) {
        dispatch({ type: 'MOVE_CURSOR_START' });
        return;
      }

      // Ctrl+E: move to end
      if (input === 'e' && key.ctrl) {
        dispatch({ type: 'MOVE_CURSOR_END' });
        return;
      }

      // Regular character input (may be multi-char if pasted)
      if (input && !key.ctrl && !key.meta) {
        dispatch({ type: 'INSERT_TEXT', text: input });
      }
    },
    { isActive: !isDisabled },
  );

  // Build the rendered input string with cursor visualization
  const renderedInput = buildRenderedInput(
    state.inputValue,
    state.cursorOffset,
    placeholder,
    isDisabled,
  );

  return { renderedInput };
}

function buildRenderedInput(
  value: string,
  cursorOffset: number,
  placeholder: string,
  isDisabled: boolean,
): string {
  if (isDisabled) {
    return value || theme.placeholder(placeholder);
  }

  if (value.length === 0) {
    // Show placeholder with cursor on first char
    if (placeholder.length > 0) {
      return theme.cursor(placeholder[0]!) + theme.placeholder(placeholder.slice(1));
    }
    return theme.cursor(' ');
  }

  let result = '';
  for (let i = 0; i < value.length; i++) {
    if (i === cursorOffset) {
      result += theme.cursor(value[i]!);
    } else {
      result += theme.inputText(value[i]!);
    }
  }

  // Cursor at end: show inverse space
  if (cursorOffset >= value.length) {
    result += theme.cursor(' ');
  }

  return result;
}
