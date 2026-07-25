import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { Autocomplete } from '../components/autocomplete/autocomplete.js';
import { createReducer } from '../components/autocomplete/use-autocomplete-state.js';
import type { AutocompleteState } from '../components/autocomplete/use-autocomplete-state.js';
import type { Option } from '../types.js';

const defaultOptions: Option[] = [
  { label: 'Apple', value: 'apple' },
  { label: 'Application', value: 'application' },
  { label: 'Banana', value: 'banana' },
  { label: 'Cherry', value: 'cherry' },
  { label: 'Date', value: 'date' },
  { label: 'Elderberry', value: 'elderberry' },
  { label: 'Fig', value: 'fig' },
  { label: 'Grape', value: 'grape' },
];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Strip ANSI escape codes so text assertions don't break under FORCE_COLOR,
// where chalk wraps substrings in codes that split words (e.g. 'Ban<esc>[22mana').
const ANSI_PATTERN = new RegExp('\\u001B\\[[0-9;]*m', 'g');
const clean = (frame: () => string | undefined): string =>
  (frame() ?? '').replace(ANSI_PATTERN, '');

// Poll a predicate until it holds, instead of sleeping a fixed amount and hoping
// Ink has re-rendered. Fixed sleeps raced Ink's render/effect scheduling and
// made the suite flaky; polling waits exactly as long as needed, no longer.
//
// After the predicate first holds we yield one more tick: Ink's useInput
// re-subscribes its handler (carrying the latest state) in a *passive* effect
// that runs after the frame commit. Returning the instant the frame shows the
// expected content would let a subsequent keypress hit the previous handler
// closure (e.g. empty filteredOptions) and be dropped.
const waitFor = async (
  predicate: () => boolean,
  { timeout = 3000, interval = 15 }: { timeout?: number; interval?: number } = {},
): Promise<void> => {
  const start = Date.now();
  const check = () => {
    try {
      return predicate();
    } catch {
      return false;
    }
  };
  while (Date.now() - start < timeout) {
    if (check()) {
      await delay(interval); // let post-commit passive effects flush
      return;
    }
    await delay(interval);
  }
  if (check()) return;
  throw new Error(`waitFor: condition not met within ${timeout}ms`);
};

// Give Ink a beat to commit a dispatch and re-subscribe its input handler before
// sending a second key that depends on the first (e.g. move-cursor then delete);
// there's no rendered signal for cursor position to poll on.
const settle = () => delay(40);

type Stdin = ReturnType<typeof render>['stdin'];

// Ink attaches a 'readable' listener to stdin (in an effect, once raw mode is
// enabled by an active useInput) before it can receive input. Waiting for it
// prevents early writes from being dropped.
const waitForReady = (stdin: Stdin): Promise<void> =>
  waitFor(() => stdin.listenerCount('readable') > 0);

const frameHas = (lastFrame: () => string | undefined, text: string): boolean =>
  clean(lastFrame).includes(text);
const waitForText = (
  lastFrame: () => string | undefined,
  text: string,
): Promise<void> => waitFor(() => frameHas(lastFrame, text));

function makeDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('Autocomplete', () => {
  it('renders with placeholder', async () => {
    const { lastFrame } = render(
      <Autocomplete options={defaultOptions} placeholder="Search fruits..." />,
    );
    await waitForText(lastFrame, 'Search fruits');
  });

  it('renders with custom prefix', async () => {
    const { lastFrame } = render(
      <Autocomplete options={defaultOptions} prefix="$ " />,
    );
    await waitForText(lastFrame, '$');
  });

  it('opens dropdown when typing', async () => {
    const { lastFrame, stdin } = render(
      <Autocomplete options={defaultOptions} />,
    );
    await waitForReady(stdin);

    stdin.write('a');
    await waitForText(lastFrame, 'Apple');
  });

  it('filters options based on input', async () => {
    const { lastFrame, stdin } = render(
      <Autocomplete options={defaultOptions} />,
    );
    await waitForReady(stdin);

    stdin.write('ban');
    await waitFor(
      () => frameHas(lastFrame, 'Banana') && !frameHas(lastFrame, 'Apple'),
    );
  });

  it('navigates with arrow keys', async () => {
    const { lastFrame, stdin } = render(
      <Autocomplete options={defaultOptions} />,
    );
    await waitForReady(stdin);

    stdin.write('a');
    await waitForText(lastFrame, 'Apple');

    // Press down arrow
    stdin.write('\x1B[B');
    // Dropdown stays open with Apple still visible
    await waitForText(lastFrame, 'Apple');
  });

  it('selects with enter', async () => {
    const onSelect = vi.fn();
    const { lastFrame, stdin } = render(
      <Autocomplete options={defaultOptions} onSelect={onSelect} />,
    );
    await waitForReady(stdin);

    stdin.write('app');
    await waitForText(lastFrame, 'Apple');

    // Press enter to select
    stdin.write('\r');
    await waitFor(() => onSelect.mock.calls.length > 0);

    expect(onSelect).toHaveBeenCalled();
  });

  it('passes the full Option as the second onSelect argument', async () => {
    const onSelect = vi.fn();
    const { lastFrame, stdin } = render(
      <Autocomplete options={defaultOptions} onSelect={onSelect} />,
    );
    await waitForReady(stdin);

    stdin.write('app');
    await waitForText(lastFrame, 'Apple');
    stdin.write('\r');
    await waitFor(() => onSelect.mock.calls.length > 0);

    expect(onSelect).toHaveBeenCalledWith('apple', {
      label: 'Apple',
      value: 'apple',
    });
  });

  it('accepts with tab (fills input, keeps dropdown open)', async () => {
    const onChange = vi.fn();
    const { lastFrame, stdin } = render(
      <Autocomplete options={defaultOptions} onChange={onChange} />,
    );
    await waitForReady(stdin);

    stdin.write('app');
    await waitForText(lastFrame, 'Apple');

    // Press tab to accept (fills input with the focused label)
    stdin.write('\t');
    await waitForText(lastFrame, 'Apple');

    expect(onChange).toHaveBeenCalled();
  });

  it('closes dropdown on escape', async () => {
    const { lastFrame, stdin } = render(
      <Autocomplete options={defaultOptions} />,
    );
    await waitForReady(stdin);

    stdin.write('a');
    await waitForText(lastFrame, 'Apple');

    // Press escape: input is cleared and dropdown closes
    stdin.write('\x1B');
    await waitFor(() => !frameHas(lastFrame, 'Apple'));
  });

  it('handles backspace', async () => {
    const { lastFrame, stdin } = render(
      <Autocomplete options={defaultOptions} />,
    );
    await waitForReady(stdin);

    stdin.write('ban');
    await waitForText(lastFrame, 'Banana');

    // Backspace (0x7F triggers key.delete in ink). Input becomes "ba"; the
    // lowercase echo of "ban" disappears while Banana still matches.
    stdin.write('\x7F');
    await waitFor(
      () => !frameHas(lastFrame, 'ban') && frameHas(lastFrame, 'Banana'),
    );
  });

  it('shows no matches text when nothing matches', async () => {
    const { lastFrame, stdin } = render(
      <Autocomplete options={defaultOptions} noMatchesText="Nothing found" />,
    );
    await waitForReady(stdin);

    stdin.write('zzzzz');
    await waitForText(lastFrame, 'Nothing found');
  });

  it('respects isDisabled prop', async () => {
    // Disabled: useInput is inactive so Ink never attaches its readable
    // listener; a bounded wait is enough to prove onChange never fires.
    const onChange = vi.fn();
    const { stdin } = render(
      <Autocomplete options={defaultOptions} isDisabled onChange={onChange} />,
    );
    await delay(150);

    stdin.write('a');
    await delay(150);

    expect(onChange).not.toHaveBeenCalled();
  });

  it('respects visibleOptionCount for scrolling', async () => {
    // 'a' matches 5 options; a 3-row window must show the top 3 (starting at the
    // focused first match) plus a "more" indicator — not an empty window.
    const { lastFrame, stdin } = render(
      <Autocomplete options={defaultOptions} visibleOptionCount={3} />,
    );
    await waitForReady(stdin);

    stdin.write('a');
    await waitFor(
      () =>
        frameHas(lastFrame, 'Apple') &&
        frameHas(lastFrame, 'Application') &&
        frameHas(lastFrame, 'Banana') &&
        frameHas(lastFrame, 'more'),
    );
    // The 4th match must not be in the 3-row window.
    expect(frameHas(lastFrame, 'Date')).toBe(false);
  });

  it('shows scroll indicators', async () => {
    const manyOptions: Option[] = Array.from({ length: 20 }, (_, i) => ({
      label: `Option ${i + 1}`,
      value: `option-${i + 1}`,
    }));

    const { lastFrame, stdin } = render(
      <Autocomplete options={manyOptions} visibleOptionCount={3} />,
    );
    await waitForReady(stdin);

    stdin.write('o');
    await waitFor(
      () => frameHas(lastFrame, '↓') && frameHas(lastFrame, 'more'),
    );
  });

  it('calls onChange when input changes', async () => {
    const onChange = vi.fn();
    const { stdin } = render(
      <Autocomplete options={defaultOptions} onChange={onChange} />,
    );
    await waitForReady(stdin);

    stdin.write('a');
    await waitFor(() => onChange.mock.calls.some((c) => c[0] === 'a'));

    expect(onChange).toHaveBeenCalledWith('a');
  });

  it('calls onSelect when option is selected', async () => {
    const onSelect = vi.fn();
    const { lastFrame, stdin } = render(
      <Autocomplete options={defaultOptions} onSelect={onSelect} />,
    );
    await waitForReady(stdin);

    stdin.write('apple');
    await waitForText(lastFrame, 'Apple');

    stdin.write('\r');
    await waitFor(() => onSelect.mock.calls.length > 0);

    expect(onSelect).toHaveBeenCalled();
  });

  it('fires onSelect again when the same option is re-selected', async () => {
    const onSelect = vi.fn();
    const { lastFrame, stdin } = render(
      <Autocomplete options={defaultOptions} onSelect={onSelect} />,
    );
    await waitForReady(stdin);

    // First selection
    stdin.write('apple');
    await waitForText(lastFrame, 'Apple');
    stdin.write('\r');
    await waitFor(() => onSelect.mock.calls.length === 1);

    // Escape to clear, then re-type and re-select the same option
    stdin.write('\x1B');
    await waitFor(() => !frameHas(lastFrame, 'Apple'));
    stdin.write('apple');
    await waitForText(lastFrame, 'Apple');

    // Re-select the same option
    stdin.write('\r');
    await waitFor(() => onSelect.mock.calls.length === 2);
    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  it('highlights matched characters', async () => {
    const { lastFrame, stdin } = render(
      <Autocomplete options={defaultOptions} />,
    );
    await waitForReady(stdin);

    stdin.write('app');
    // The label should appear (with ANSI styling for highlights, stripped here)
    await waitForText(lastFrame, 'Apple');
  });

  it('handles async options', async () => {
    const asyncProvider = vi.fn(async (query: string) => {
      await delay(10);
      return defaultOptions.filter((o) =>
        o.label.toLowerCase().includes(query.toLowerCase()),
      );
    });

    const { lastFrame, stdin } = render(
      <Autocomplete options={asyncProvider} debounceMs={10} />,
    );
    await waitForReady(stdin);

    stdin.write('app');
    await waitForText(lastFrame, 'Apple');
    expect(asyncProvider).toHaveBeenCalled();
  });

  it('shows loading text during async fetch', async () => {
    const asyncProvider = async (_query: string) => {
      await delay(500);
      return defaultOptions;
    };

    const { lastFrame, stdin } = render(
      <Autocomplete
        options={asyncProvider}
        loadingText="Searching..."
        debounceMs={0}
      />,
    );
    await waitForReady(stdin);

    stdin.write('a');
    await waitForText(lastFrame, 'Searching...');
  });

  it('handles long labels', async () => {
    const longOptions: Option[] = [
      {
        label: 'This is a very long option label that should still render correctly',
        value: 'long',
      },
    ];

    const { lastFrame, stdin } = render(
      <Autocomplete options={longOptions} />,
    );
    await waitForReady(stdin);

    stdin.write('long');
    await waitForText(lastFrame, 'long option label');
  });

  it('handles special characters in input', async () => {
    const specialOptions: Option[] = [
      { label: 'C++ Programming', value: 'cpp' },
      { label: 'C# Development', value: 'csharp' },
      { label: 'Node.js', value: 'nodejs' },
    ];

    const { lastFrame, stdin } = render(
      <Autocomplete options={specialOptions} />,
    );
    await waitForReady(stdin);

    stdin.write('c');
    await waitForText(lastFrame, 'C++');
  });

  it('handles empty options array', async () => {
    const { lastFrame, stdin } = render(
      <Autocomplete options={[]} noMatchesText="No items" />,
    );
    await waitForReady(stdin);

    stdin.write('a');
    await waitForText(lastFrame, 'No items');
  });

  it('handles async error: displays error, fires onError, typing clears error', async () => {
    const asyncProvider = vi.fn(async (_query: string): Promise<Option[]> => {
      throw new Error('Network failure');
    });

    const onError = vi.fn();
    const { lastFrame, stdin } = render(
      <Autocomplete options={asyncProvider} debounceMs={0} onError={onError} />,
    );
    await waitForReady(stdin);

    // Type to trigger async fetch that will fail
    stdin.write('a');
    await waitForText(lastFrame, 'Network failure');

    // onError callback should have been called
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    expect(onError.mock.calls[0]![0]!.message).toBe('Network failure');

    // Now set up provider to succeed, then type to clear the error
    asyncProvider.mockImplementation(async () => [
      { label: 'Alpha', value: 'alpha' },
    ]);

    stdin.write('l');
    await waitFor(
      () =>
        !frameHas(lastFrame, 'Network failure') && frameHas(lastFrame, 'Alpha'),
    );
  });

  it('renders with defaultValue', async () => {
    const { lastFrame } = render(
      <Autocomplete options={defaultOptions} defaultValue="ban" />,
    );
    // The input should show "ban" (the default value text is rendered)
    await waitForText(lastFrame, 'ban');
  });

  it('handles forward delete key (DELETE_FORWARD)', async () => {
    const onChange = vi.fn();
    const { lastFrame, stdin } = render(
      <Autocomplete options={defaultOptions} onChange={onChange} />,
    );
    await waitForReady(stdin);

    // Type "ban"
    stdin.write('ban');
    await waitForText(lastFrame, 'Banana');

    // Move cursor to the start (Ctrl+A), let it commit, then forward delete (Ctrl+D).
    stdin.write('\x01');
    await settle();
    stdin.write('\x04');

    // After deleting the first char, input is "an"
    await waitFor(() => onChange.mock.calls.at(-1)?.[0] === 'an');
  });

  it('debounces async calls', async () => {
    const asyncProvider = vi.fn(async (_query: string) => defaultOptions);

    const { stdin } = render(
      <Autocomplete options={asyncProvider} debounceMs={100} />,
    );
    await waitForReady(stdin);

    // Type quickly within the debounce window
    stdin.write('a');
    await delay(10);
    stdin.write('p');
    await delay(10);
    stdin.write('p');

    await waitFor(() => asyncProvider.mock.calls.length > 0);
    expect(asyncProvider).toHaveBeenCalled();
  });

  it('deletes an emoji as a single unit on backspace', async () => {
    const onChange = vi.fn();
    const { stdin } = render(
      <Autocomplete options={defaultOptions} onChange={onChange} />,
    );
    await waitForReady(stdin);

    stdin.write('😀');
    await waitFor(() => onChange.mock.calls.at(-1)?.[0] === '😀');

    // One backspace should clear the whole emoji, not leave a lone surrogate.
    stdin.write('\x7F');
    await waitFor(() => onChange.mock.calls.at(-1)?.[0] === '');
  });

  it('deletes a ZWJ emoji sequence as one grapheme cluster', async () => {
    const onChange = vi.fn();
    const { stdin } = render(
      <Autocomplete options={defaultOptions} onChange={onChange} />,
    );
    await waitForReady(stdin);

    // Family emoji: 👨 ZWJ 👩 ZWJ 👧 — one grapheme, five code points.
    stdin.write('👨‍👩‍👧');
    await waitFor(() => onChange.mock.calls.at(-1)?.[0] === '👨‍👩‍👧');

    stdin.write('\x7F');
    await waitFor(() => onChange.mock.calls.at(-1)?.[0] === '');
  });

  it('cursor-left lands on a grapheme boundary, never mid-glyph', async () => {
    const onChange = vi.fn();
    const { stdin } = render(
      <Autocomplete options={defaultOptions} onChange={onChange} />,
    );
    await waitForReady(stdin);

    stdin.write('a😀');
    await waitFor(() => onChange.mock.calls.at(-1)?.[0] === 'a😀');

    // Left arrow moves the cursor before the emoji (not into its surrogate
    // pair); forward delete (Ctrl+D) then removes the whole emoji, leaving "a".
    stdin.write('\x1B[D');
    await settle();
    stdin.write('\x04');
    await waitFor(() => onChange.mock.calls.at(-1)?.[0] === 'a');
  });

  it('does not re-fetch or fire onError after selecting an async option', async () => {
    const asyncProvider = vi.fn(async (query: string): Promise<Option[]> => {
      // A re-filter with the selected label would throw and surface a spurious error.
      if (query === 'Apple') throw new Error('should not re-fetch after select');
      return [{ label: 'Apple', value: 'apple' }];
    });
    const onError = vi.fn();
    const onSelect = vi.fn();

    const { lastFrame, stdin } = render(
      <Autocomplete
        options={asyncProvider}
        debounceMs={0}
        onError={onError}
        onSelect={onSelect}
      />,
    );
    await waitForReady(stdin);

    stdin.write('app');
    await waitForText(lastFrame, 'Apple');

    const callsBefore = asyncProvider.mock.calls.length;

    // Select the focused option (Apple) with enter.
    stdin.write('\r');
    await waitFor(() => onSelect.mock.calls.length > 0);
    // Give any (erroneous) re-fetch a chance to fire before asserting absence.
    await delay(100);

    expect(asyncProvider.mock.calls.length).toBe(callsBefore);
    expect(asyncProvider).not.toHaveBeenCalledWith('Apple');
    expect(onError).not.toHaveBeenCalled();
  });

  it('discards an in-flight fetch that rejects after a selection (no onError)', async () => {
    const inflight = makeDeferred<Option[]>();
    const onError = vi.fn();
    const onSelect = vi.fn();
    // 'ap' is held in flight; every other query resolves so a list is selectable.
    const asyncProvider = vi.fn((query: string): Promise<Option[]> =>
      query === 'ap'
        ? inflight.promise
        : Promise.resolve([{ label: 'Apple', value: 'apple' }]),
    );

    const { lastFrame, stdin } = render(
      <Autocomplete
        options={asyncProvider}
        debounceMs={0}
        onError={onError}
        onSelect={onSelect}
      />,
    );
    await waitForReady(stdin);

    stdin.write('a');
    await waitForText(lastFrame, 'Apple');

    // Start a fetch we keep pending, then select the still-focused option.
    stdin.write('p');
    await waitFor(() => asyncProvider.mock.calls.some((c) => c[0] === 'ap'));
    stdin.write('\r');
    await waitFor(() => onSelect.mock.calls.length > 0);

    // The in-flight fetch now rejects — it must be discarded, not surfaced.
    inflight.reject(new Error('boom'));
    await delay(50);

    expect(onError).not.toHaveBeenCalled();
    expect(clean(lastFrame)).not.toContain('boom');
  });

  it('discards an in-flight fetch that resolves after an accept (stale results not shown)', async () => {
    const inflight = makeDeferred<Option[]>();
    const asyncProvider = vi.fn((query: string): Promise<Option[]> =>
      query === 'ap'
        ? inflight.promise
        : Promise.resolve([{ label: 'Apple', value: 'apple' }]),
    );

    const { lastFrame, stdin } = render(
      <Autocomplete options={asyncProvider} debounceMs={0} />,
    );
    await waitForReady(stdin);

    stdin.write('a');
    await waitForText(lastFrame, 'Apple');

    // Start a fetch we keep pending, then accept (Tab) the focused option.
    stdin.write('p');
    await waitFor(() => asyncProvider.mock.calls.some((c) => c[0] === 'ap'));
    stdin.write('\t');
    await waitForText(lastFrame, 'Apple');

    // The in-flight fetch resolves with a different list — must be discarded.
    inflight.resolve([{ label: 'ZEBRA', value: 'zebra' }]);
    await delay(50);

    expect(clean(lastFrame)).not.toContain('ZEBRA');
  });

  it('resumes filtering after a selection', async () => {
    const asyncProvider = vi.fn(async (query: string) =>
      defaultOptions.filter((o) =>
        o.label.toLowerCase().includes(query.toLowerCase()),
      ),
    );
    const { lastFrame, stdin } = render(
      <Autocomplete options={asyncProvider} debounceMs={0} />,
    );
    await waitForReady(stdin);

    stdin.write('app');
    await waitForText(lastFrame, 'Apple');

    // Select the focused option.
    stdin.write('\r');
    await waitFor(() => !frameHas(lastFrame, 'Application'));
    const callsBefore = asyncProvider.mock.calls.length;

    // Typing after a selection must resume filtering (skipFilter isn't stuck).
    stdin.write('x');
    await waitFor(() => asyncProvider.mock.calls.length > callsBefore);
    await waitForText(lastFrame, 'No matches');
  });
});

const makeState = (
  overrides: Partial<AutocompleteState> = {},
): AutocompleteState => ({
  inputValue: '',
  cursorOffset: 0,
  isOpen: true,
  filteredOptions: [],
  focusedIndex: 0,
  visibleFromIndex: 0,
  visibleToIndex: 0,
  selectedValue: null,
  isLoading: false,
  error: null,
  skipFilter: false,
  ...overrides,
});

describe('reducer DELETE_FORWARD', () => {
  it('resets the scroll window when it empties the input', () => {
    const reducer = createReducer(3);
    const next = reducer(
      makeState({
        inputValue: 'a',
        cursorOffset: 0,
        visibleFromIndex: 5,
        visibleToIndex: 8,
      }),
      { type: 'DELETE_FORWARD' },
    );
    expect(next.inputValue).toBe('');
    expect(next.isOpen).toBe(false);
    expect(next.visibleFromIndex).toBe(0);
    expect(next.visibleToIndex).toBe(0);
  });

  it('leaves the scroll window intact when the input is not emptied', () => {
    const reducer = createReducer(3);
    const next = reducer(
      makeState({
        inputValue: 'abc',
        cursorOffset: 0,
        visibleFromIndex: 2,
        visibleToIndex: 5,
      }),
      { type: 'DELETE_FORWARD' },
    );
    expect(next.inputValue).toBe('bc');
    expect(next.visibleFromIndex).toBe(2);
    expect(next.visibleToIndex).toBe(5);
  });
});

describe('reducer grapheme cursor math', () => {
  it('MOVE_CURSOR_RIGHT steps over an emoji as one unit', () => {
    const reducer = createReducer(5);
    let state = makeState({ inputValue: '😀a', cursorOffset: 0 });
    state = reducer(state, { type: 'MOVE_CURSOR_RIGHT' });
    expect(state.cursorOffset).toBe(2); // past the 2-code-unit emoji
    state = reducer(state, { type: 'MOVE_CURSOR_RIGHT' });
    expect(state.cursorOffset).toBe(3); // past 'a'
  });

  it('INSERT_TEXT of a multi-emoji paste stays cluster-aligned for deletion', () => {
    const reducer = createReducer(5);
    let state = makeState({ inputValue: '', cursorOffset: 0 });
    state = reducer(state, { type: 'INSERT_TEXT', text: '😀😀' });
    expect(state.inputValue).toBe('😀😀');
    expect(state.cursorOffset).toBe(4); // two 2-code-unit emoji

    // Backspace removes exactly one emoji cluster.
    state = reducer(state, { type: 'DELETE_BACKWARD' });
    expect(state.inputValue).toBe('😀');
    expect(state.cursorOffset).toBe(2);
  });
});
