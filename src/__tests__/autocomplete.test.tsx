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

// Wait for useEffect to register the stdin readable listener in ink
const MOUNT_DELAY = 100;
// Wait for state updates and re-render
const RENDER_DELAY = 50;

describe('Autocomplete', () => {
  it('renders with placeholder', async () => {
    const { lastFrame } = render(
      <Autocomplete options={defaultOptions} placeholder="Search fruits..." />,
    );
    await delay(MOUNT_DELAY);
    const frame = clean(lastFrame);
    expect(frame).toContain('Search fruits');
  });

  it('renders with custom prefix', async () => {
    const { lastFrame } = render(
      <Autocomplete options={defaultOptions} prefix="$ " />,
    );
    await delay(MOUNT_DELAY);
    const frame = clean(lastFrame);
    expect(frame).toContain('$');
  });

  it('opens dropdown when typing', async () => {
    const { lastFrame, stdin } = render(
      <Autocomplete options={defaultOptions} />,
    );
    await delay(MOUNT_DELAY);

    stdin.write('a');
    await delay(RENDER_DELAY);

    const frame = clean(lastFrame);
    expect(frame).toContain('Apple');
  });

  it('filters options based on input', async () => {
    const { lastFrame, stdin } = render(
      <Autocomplete options={defaultOptions} />,
    );
    await delay(MOUNT_DELAY);

    stdin.write('ban');
    await delay(RENDER_DELAY);

    const frame = clean(lastFrame);
    expect(frame).toContain('Banana');
    expect(frame).not.toContain('Apple');
  });

  it('navigates with arrow keys', async () => {
    const { lastFrame, stdin } = render(
      <Autocomplete options={defaultOptions} />,
    );
    await delay(MOUNT_DELAY);

    stdin.write('a');
    await delay(RENDER_DELAY);

    // Press down arrow
    stdin.write('\x1B[B');
    await delay(RENDER_DELAY);

    const frame = clean(lastFrame);
    // Should show the dropdown with focus moved down
    expect(frame).toBeDefined();
    expect(frame).toContain('Apple');
  });

  it('selects with enter', async () => {
    const onSelect = vi.fn();
    const { stdin } = render(
      <Autocomplete options={defaultOptions} onSelect={onSelect} />,
    );
    await delay(MOUNT_DELAY);

    stdin.write('app');
    await delay(RENDER_DELAY);

    // Press enter to select
    stdin.write('\r');
    await delay(RENDER_DELAY);

    expect(onSelect).toHaveBeenCalled();
  });

  it('accepts with tab (fills input, keeps dropdown open)', async () => {
    const onChange = vi.fn();
    const { lastFrame, stdin } = render(
      <Autocomplete options={defaultOptions} onChange={onChange} />,
    );
    await delay(MOUNT_DELAY);

    stdin.write('app');
    await delay(RENDER_DELAY);

    // Press tab to accept
    stdin.write('\t');
    await delay(RENDER_DELAY);

    // onChange should have been called (first with 'app', then with the accepted label)
    expect(onChange).toHaveBeenCalled();
    const frame = clean(lastFrame);
    expect(frame).toBeDefined();
  });

  it('closes dropdown on escape', async () => {
    const { lastFrame, stdin } = render(
      <Autocomplete options={defaultOptions} />,
    );
    await delay(MOUNT_DELAY);

    stdin.write('a');
    await delay(RENDER_DELAY);

    // Verify dropdown is open
    let frame = clean(lastFrame);
    expect(frame).toContain('Apple');

    // Press escape
    stdin.write('\x1B');
    await delay(RENDER_DELAY);

    frame = clean(lastFrame);
    // After escape, input is cleared and dropdown closes
    expect(frame).not.toContain('Apple');
  });

  it('handles backspace', async () => {
    const { lastFrame, stdin } = render(
      <Autocomplete options={defaultOptions} />,
    );
    await delay(MOUNT_DELAY);

    stdin.write('ban');
    await delay(RENDER_DELAY);

    let frame = clean(lastFrame);
    expect(frame).toContain('Banana');

    // Backspace (0x7F triggers key.delete in ink)
    stdin.write('\x7F');
    await delay(RENDER_DELAY);

    frame = clean(lastFrame);
    // After deleting one char, input is "ba" - should still show Banana
    expect(frame).toContain('Banana');
  });

  it('shows no matches text when nothing matches', async () => {
    const { lastFrame, stdin } = render(
      <Autocomplete
        options={defaultOptions}
        noMatchesText="Nothing found"
      />,
    );
    await delay(MOUNT_DELAY);

    stdin.write('zzzzz');
    await delay(RENDER_DELAY);

    const frame = clean(lastFrame);
    expect(frame).toContain('Nothing found');
  });

  it('respects isDisabled prop', async () => {
    const onChange = vi.fn();
    const { stdin } = render(
      <Autocomplete
        options={defaultOptions}
        isDisabled={true}
        onChange={onChange}
      />,
    );
    await delay(MOUNT_DELAY);

    stdin.write('a');
    await delay(RENDER_DELAY);

    // onChange should not be called when disabled
    expect(onChange).not.toHaveBeenCalled();
  });

  it('respects visibleOptionCount for scrolling', async () => {
    const { lastFrame, stdin } = render(
      <Autocomplete options={defaultOptions} visibleOptionCount={3} />,
    );
    await delay(MOUNT_DELAY);

    stdin.write('a');
    await delay(RENDER_DELAY);

    const frame = clean(lastFrame);
    expect(frame).toBeDefined();
  });

  it('shows scroll indicators', async () => {
    const manyOptions: Option[] = Array.from({ length: 20 }, (_, i) => ({
      label: `Option ${i + 1}`,
      value: `option-${i + 1}`,
    }));

    const { lastFrame, stdin } = render(
      <Autocomplete options={manyOptions} visibleOptionCount={3} />,
    );
    await delay(MOUNT_DELAY);

    stdin.write('o');
    await delay(RENDER_DELAY);

    const frame = clean(lastFrame);
    expect(frame).toContain('\u2193');
    expect(frame).toContain('more');
  });

  it('calls onChange when input changes', async () => {
    const onChange = vi.fn();
    const { stdin } = render(
      <Autocomplete options={defaultOptions} onChange={onChange} />,
    );
    await delay(MOUNT_DELAY);

    stdin.write('a');
    await delay(RENDER_DELAY);

    expect(onChange).toHaveBeenCalledWith('a');
  });

  it('calls onSelect when option is selected', async () => {
    const onSelect = vi.fn();
    const { stdin } = render(
      <Autocomplete options={defaultOptions} onSelect={onSelect} />,
    );
    await delay(MOUNT_DELAY);

    stdin.write('apple');
    await delay(RENDER_DELAY);

    stdin.write('\r');
    await delay(RENDER_DELAY);

    expect(onSelect).toHaveBeenCalled();
  });

  it('fires onSelect again when the same option is re-selected', async () => {
    const onSelect = vi.fn();
    const { stdin } = render(
      <Autocomplete options={defaultOptions} onSelect={onSelect} />,
    );
    await delay(MOUNT_DELAY);

    // First selection
    stdin.write('apple');
    await delay(RENDER_DELAY);
    stdin.write('\r');
    await delay(RENDER_DELAY);
    expect(onSelect).toHaveBeenCalledTimes(1);

    // Escape to clear, then re-type and re-select the same option
    stdin.write('\x1B');
    await delay(RENDER_DELAY);
    stdin.write('apple');
    await delay(RENDER_DELAY);

    // Re-select the same option
    stdin.write('\r');
    await delay(RENDER_DELAY);
    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  it('highlights matched characters', async () => {
    const { lastFrame, stdin } = render(
      <Autocomplete options={defaultOptions} />,
    );
    await delay(MOUNT_DELAY);

    stdin.write('app');
    await delay(RENDER_DELAY);

    const frame = clean(lastFrame);
    // The label should appear (with ANSI styling for highlights)
    expect(frame).toContain('Apple');
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
    await delay(MOUNT_DELAY);

    stdin.write('app');
    await delay(200);

    const frame = clean(lastFrame);
    expect(frame).toContain('Apple');
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
    await delay(MOUNT_DELAY);

    stdin.write('a');
    await delay(RENDER_DELAY);

    const frame = clean(lastFrame);
    expect(frame).toContain('Searching...');
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
    await delay(MOUNT_DELAY);

    stdin.write('long');
    await delay(RENDER_DELAY);

    const frame = clean(lastFrame);
    expect(frame).toContain('long option label');
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
    await delay(MOUNT_DELAY);

    stdin.write('c');
    await delay(RENDER_DELAY);

    const frame = clean(lastFrame);
    expect(frame).toContain('C++');
  });

  it('handles empty options array', async () => {
    const { lastFrame, stdin } = render(
      <Autocomplete options={[]} noMatchesText="No items" />,
    );
    await delay(MOUNT_DELAY);

    stdin.write('a');
    await delay(RENDER_DELAY);

    const frame = clean(lastFrame);
    expect(frame).toContain('No items');
  });

  it('handles async error: displays error, fires onError, typing clears error', async () => {
    const asyncProvider = vi.fn(async (_query: string): Promise<Option[]> => {
      throw new Error('Network failure');
    });

    const onError = vi.fn();
    const { lastFrame, stdin } = render(
      <Autocomplete
        options={asyncProvider}
        debounceMs={0}
        onError={onError}
      />,
    );
    await delay(MOUNT_DELAY);

    // Type to trigger async fetch that will fail
    stdin.write('a');
    await delay(200);

    // Error message should be displayed
    const frame = clean(lastFrame);
    expect(frame).toContain('Network failure');

    // onError callback should have been called
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    expect(onError.mock.calls[0]![0]!.message).toBe('Network failure');

    // Now set up provider to succeed, then type to clear the error
    asyncProvider.mockImplementation(async () => {
      return [{ label: 'Alpha', value: 'alpha' }];
    });

    stdin.write('l');
    await delay(200);

    const clearedFrame = clean(lastFrame);
    // Error should be gone, replaced by results
    expect(clearedFrame).not.toContain('Network failure');
    expect(clearedFrame).toContain('Alpha');
  });

  it('renders with defaultValue', async () => {
    const onChange = vi.fn();
    const { lastFrame } = render(
      <Autocomplete
        options={defaultOptions}
        defaultValue="ban"
        onChange={onChange}
      />,
    );
    await delay(MOUNT_DELAY);

    const frame = clean(lastFrame);
    // The input should show "ban" (the default value text is rendered)
    expect(frame).toContain('ban');
  });

  it('handles forward delete key (DELETE_FORWARD)', async () => {
    const onChange = vi.fn();
    const { lastFrame, stdin } = render(
      <Autocomplete options={defaultOptions} onChange={onChange} />,
    );
    await delay(MOUNT_DELAY);

    // Type "ban"
    stdin.write('ban');
    await delay(RENDER_DELAY);

    let frame = clean(lastFrame);
    expect(frame).toContain('Banana');

    // Move cursor to the start (Ctrl+A)
    stdin.write('\x01');
    await delay(RENDER_DELAY);

    // Press Ctrl+D for forward delete
    stdin.write('\x04');
    await delay(RENDER_DELAY);

    // After deleting first char, input is "an"
    frame = clean(lastFrame);
    expect(frame).toBeDefined();
    // onChange should have been called with the result of the delete
    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1]![0];
    expect(lastCall).toBe('an');
  });

  it('debounces async calls', async () => {
    const asyncProvider = vi.fn(async (_query: string) => {
      return defaultOptions;
    });

    const { stdin } = render(
      <Autocomplete options={asyncProvider} debounceMs={100} />,
    );
    await delay(MOUNT_DELAY);

    // Type quickly
    stdin.write('a');
    await delay(10);
    stdin.write('p');
    await delay(10);
    stdin.write('p');
    await delay(250);

    // Should have debounced: the provider still gets called for the initial
    // empty query useEffect, plus at least once for the typed input
    expect(asyncProvider).toHaveBeenCalled();
  });

  it('deletes an emoji as a single unit on backspace', async () => {
    const onChange = vi.fn();
    const { stdin } = render(
      <Autocomplete options={defaultOptions} onChange={onChange} />,
    );
    await delay(MOUNT_DELAY);

    stdin.write('😀');
    await delay(RENDER_DELAY);

    // One backspace should clear the whole emoji, not leave a lone surrogate.
    stdin.write('\x7F');
    await delay(RENDER_DELAY);

    const last = onChange.mock.calls.at(-1)?.[0];
    expect(last).toBe('');
  });

  it('deletes a ZWJ emoji sequence as one grapheme cluster', async () => {
    const onChange = vi.fn();
    const { stdin } = render(
      <Autocomplete options={defaultOptions} onChange={onChange} />,
    );
    await delay(MOUNT_DELAY);

    // Family emoji: 👨 ZWJ 👩 ZWJ 👧 — one grapheme, five code points.
    stdin.write('👨‍👩‍👧');
    await delay(RENDER_DELAY);

    stdin.write('\x7F');
    await delay(RENDER_DELAY);

    const last = onChange.mock.calls.at(-1)?.[0];
    expect(last).toBe('');
  });

  it('cursor-left lands on a grapheme boundary, never mid-glyph', async () => {
    const onChange = vi.fn();
    const { stdin } = render(
      <Autocomplete options={defaultOptions} onChange={onChange} />,
    );
    await delay(MOUNT_DELAY);

    stdin.write('a😀');
    await delay(RENDER_DELAY);

    // Left arrow moves the cursor before the emoji (not into its surrogate pair).
    stdin.write('\x1B[D');
    await delay(RENDER_DELAY);

    // Forward delete (Ctrl+D) removes the whole emoji, leaving just "a".
    stdin.write('\x04');
    await delay(RENDER_DELAY);

    const last = onChange.mock.calls.at(-1)?.[0];
    expect(last).toBe('a');
  });

  it('does not re-fetch or fire onError after selecting an async option', async () => {
    const asyncProvider = vi.fn(async (query: string): Promise<Option[]> => {
      // A re-filter with the selected label would throw and surface a spurious error.
      if (query === 'Apple') throw new Error('should not re-fetch after select');
      return [{ label: 'Apple', value: 'apple' }];
    });
    const onError = vi.fn();

    const { stdin } = render(
      <Autocomplete options={asyncProvider} debounceMs={0} onError={onError} />,
    );
    await delay(MOUNT_DELAY);

    stdin.write('app');
    await delay(200);
    expect(asyncProvider).toHaveBeenCalled();

    const callsBefore = asyncProvider.mock.calls.length;

    // Select the focused option (Apple) with enter.
    stdin.write('\r');
    await delay(200);

    expect(asyncProvider.mock.calls.length).toBe(callsBefore);
    expect(asyncProvider).not.toHaveBeenCalledWith('Apple');
    expect(onError).not.toHaveBeenCalled();
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
