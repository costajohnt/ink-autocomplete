# ink-combobox

[![CI](https://github.com/costajohnt/ink-combobox/actions/workflows/ci.yml/badge.svg)](https://github.com/costajohnt/ink-combobox/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/ink-combobox)](https://www.npmjs.com/package/ink-combobox)
[![license](https://img.shields.io/npm/l/ink-combobox)](https://github.com/costajohnt/ink-combobox/blob/main/LICENSE)

A combobox/fuzzy-search autocomplete input component for [Ink](https://github.com/vadimdemedes/ink). Provides a fully interactive dropdown with fuzzy matching, keyboard navigation, async data loading, and scroll indicators -- all inside your terminal.

## Features

- **Fuzzy matching with highlighting** -- matched characters are highlighted in the dropdown so users can see why each result was returned
- **Keyboard navigation** -- arrow keys, enter to select, tab to autofill, escape to close
- **Async options** -- pass a function that returns a promise to load options from an API or database
- **Error handling** -- async failures surface via `onError` callback and show an error message in the dropdown
- **Debounce** -- configurable debounce for both sync and async filtering
- **Scroll indicators** -- when the list overflows the visible window, arrow indicators show how many items are above/below
- **Cursor movement** -- full input editing with left/right arrows, home/end, and forward/backward delete
- **Headless hooks** -- use the exported hooks to build your own custom UI on top of the autocomplete logic
- **Themeable** -- swap out the default chalk-based theme to match your CLI's style

## Install

```
npm install ink-combobox
```

Peer dependencies: `ink >= 5.0.0`, `react >= 18.0.0`, and `chalk >= 5.0.0`.

> **Note:** `chalk` is a peer dependency because Ink bundles it internally. Keeping it as a peer avoids version conflicts. If your project already depends on Ink, chalk is likely already available.

## Quick Start

```tsx
import React from 'react';
import { render } from 'ink';
import { Autocomplete } from 'ink-combobox';

const fruits = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
  { label: 'Cherry', value: 'cherry' },
  { label: 'Grape', value: 'grape' },
  { label: 'Strawberry', value: 'strawberry' },
];

function App() {
  return (
    <Autocomplete
      options={fruits}
      placeholder="Search fruits..."
      onSelect={(value) => console.log('Selected:', value)}
    />
  );
}

render(<App />);
```

## Props

The `<Autocomplete>` component accepts the following props:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `options` | `Option[] \| AsyncOptionsProvider` | *(required)* | Static array of options or an async function `(query: string) => Promise<Option[]>` |
| `placeholder` | `string` | `''` | Placeholder text shown when input is empty |
| `defaultValue` | `string` | `''` | Initial input value (the input starts pre-filled with this string) |
| `visibleOptionCount` | `number` | `5` | Maximum number of options visible in the dropdown at once |
| `debounceMs` | `number` | `0` (sync) / `150` (async) | Milliseconds to debounce filtering. Defaults to 150ms for async providers |
| `isDisabled` | `boolean` | `false` | When true, the input ignores all keyboard input |
| `prefix` | `string` | `'> '` | Text displayed before the input |
| `noMatchesText` | `string` | `'No matches'` | Text shown when no options match the current query |
| `loadingText` | `string` | `'Loading...'` | Text shown while an async provider is fetching results |
| `errorText` | `string` | `undefined` | Text shown when an async provider rejects. If not set, the error's `.message` is displayed |
| `onChange` | `(value: string) => void` | -- | Called whenever the input value changes |
| `onSelect` | `(value: string) => void` | -- | Called when the user selects an option (Enter key) |
| `onError` | `(error: Error) => void` | -- | Called when an async options provider rejects. The error is also exposed in state as `error` |

Each `Option` has the shape `{ label: string; value: string }`.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Any character | Appends to the input and opens the dropdown |
| `Backspace` | Deletes the character before the cursor |
| `Delete` | Deletes the character after the cursor |
| `Ctrl+D` | Forward delete (alternative binding) |
| `Left Arrow` | Moves cursor left |
| `Right Arrow` | Moves cursor right |
| `Ctrl+A` | Moves cursor to start of input |
| `Ctrl+E` | Moves cursor to end of input |
| `Down Arrow` | Moves focus to the next option |
| `Up Arrow` | Moves focus to the previous option |
| `Enter` | Selects the focused option, shows its label in the input, and closes the dropdown |
| `Tab` | Fills the input with the focused option's label (keeps dropdown open) |
| `Escape` | Closes the dropdown and clears the input |

## Async Options

Pass a function instead of an array to load options dynamically. The function receives the current query string and should return a promise that resolves to an array of `Option` objects. The provider is responsible for its own filtering -- the component will not re-filter the results, but it will compute match highlight ranges for display.

```tsx
import { Autocomplete } from 'ink-combobox';

async function searchUsers(query: string) {
  const response = await fetch(`/api/users?q=${encodeURIComponent(query)}`);
  const users = await response.json();
  return users.map((u) => ({ label: u.name, value: u.id }));
}

function App() {
  return (
    <Autocomplete
      options={searchUsers}
      placeholder="Search users..."
      debounceMs={200}
      loadingText="Searching..."
      errorText="Failed to load users"
      onError={(err) => console.error('Search failed:', err)}
      onSelect={(userId) => console.log('Selected user:', userId)}
    />
  );
}
```

When the async provider rejects, the component displays the error message (or the `errorText` prop if provided) in place of the "No matches" text. The `onError` callback fires so you can log or handle the failure. Typing new input clears the error and retries.

## Fuzzy Matching

The built-in fuzzy matcher uses a two-pass approach (similar to fzf v1) for better match alignment:

1. **Forward pass** -- greedy left-to-right scan to confirm a match exists and find initial character positions
2. **Backward pass** -- from the last matched position, scans backward to find a tighter alignment with more consecutive characters

Both passes are scored and the better result is used. This is still O(n) per candidate but produces much better alignments. For example, matching `"ab"` against `"xaxxab"` finds the consecutive `[4,5]` alignment rather than the greedy `[1,4]`.

Scoring factors:

- **Consecutive character bonus** -- characters matched in a row score higher
- **Word boundary bonus** -- matches at the start of words (after spaces, hyphens, underscores, slashes, dots) get a boost
- **CamelCase boundary bonus** -- matches at camelCase transitions (e.g., the `N` in `getName`) score higher
- **First character multiplier** -- the first matched character gets a 2x score multiplier
- **Gap penalty** -- gaps between matched characters reduce the score

Scores are normalized to a 0-1 range. Results are sorted by score descending, so the best matches appear first.

### Standalone Usage

The fuzzy matching utilities are exported for use outside the component:

```ts
import { fuzzyMatch, fuzzyFilter, collapseIndices } from 'ink-combobox';

// Match a single query against a label
const result = fuzzyMatch('gn', 'getName');
// => { score: 0.39, matchedIndices: [0, 3] }

// Convert matched indices to contiguous ranges (for highlighting)
const ranges = collapseIndices(result.matchedIndices);
// => [{ start: 0, end: 1 }, { start: 3, end: 4 }]

// Filter and sort an array of options
const options = [
  { label: 'getName', value: 'getName' },
  { label: 'setName', value: 'setName' },
  { label: 'getAge', value: 'getAge' },
];
const matches = fuzzyFilter('gn', options);
// => sorted array of { option, score, matchRanges }
```

## Scroll Indicators

When the number of matching options exceeds `visibleOptionCount`, the dropdown shows scroll indicators:

```
> app
  ❯ Apple
    Application
    Pineapple
  ↓ 2 more
```

Scrolling down reveals more items and shows an upward indicator:

```
> app
  ↑ 1 more
    Application
  ❯ Pineapple
  ↓ 1 more
```

## Headless Usage

For full control over rendering, use the exported hooks directly instead of the `<Autocomplete>` component:

```tsx
import React, { useMemo } from 'react';
import { Text, Box } from 'ink';
import {
  useAutocompleteState,
  useAutocomplete,
  AutocompleteOption,
} from 'ink-combobox';

function CustomAutocomplete() {
  const options = useMemo(() => [
    { label: 'Red', value: 'red' },
    { label: 'Green', value: 'green' },
    { label: 'Blue', value: 'blue' },
  ], []);

  const { state, dispatch } = useAutocompleteState({
    options,
    visibleOptionCount: 10,
    onSelect: (value) => console.log('Picked:', value),
  });

  const { renderedInput } = useAutocomplete({
    state,
    dispatch,
    placeholder: 'Pick a color...',
  });

  return (
    <Box flexDirection="column">
      <Text>{renderedInput}</Text>
      {state.isOpen && state.filteredOptions.map((match, i) => (
        <AutocompleteOption
          key={match.option.value}
          label={match.option.label}
          matchRanges={match.matchRanges}
          isFocused={i === state.focusedIndex}
        />
      ))}
    </Box>
  );
}
```

### `useAutocompleteState(options)`

Manages the reducer state for the autocomplete: input value, cursor position, filtered options, focused index, scroll window, loading state, error state, and selection. Returns `{ state, dispatch }`.

### `useAutocomplete({ state, dispatch, isDisabled?, placeholder? })`

Binds keyboard input handling via Ink's `useInput` and builds the rendered input string with cursor visualization. Returns `{ renderedInput }`.

## Performance Tips

**Memoize large option arrays.** When passing a static `options` array, wrap it with `useMemo` (or define it outside the component) to avoid creating a new array reference on every render. The component uses a `JSON.stringify` shallow comparison as a safety guard against inline array literals, but this runs on every render cycle. For large arrays, always memoize to avoid unnecessary serialization:

```tsx
// Good: stable reference, no serialization overhead
const options = useMemo(() => [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
], []);

// Good: defined outside the component
const OPTIONS = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
];

// Avoid: new array every render triggers JSON.stringify comparison
<Autocomplete options={[{ label: 'Apple', value: 'apple' }]} />
```

## TypeScript

All types are exported from the package:

```ts
import type {
  Option,              // { label: string; value: string }
  MatchRange,          // { start: number; end: number }
  FuzzyMatch,          // { option: Option; score: number; matchRanges: MatchRange[] }
  AsyncOptionsProvider,// (query: string) => Promise<Option[]>
  OptionsSource,       // Option[] | AsyncOptionsProvider

  AutocompleteProps,
  AutocompleteState,
  AutocompleteAction,
  AutocompleteOptionProps,
  UseAutocompleteOptions,
  UseAutocompleteStateOptions,
  Theme,
} from 'ink-combobox';
```

## Contributing

Contributions are welcome. Please open an issue to discuss larger changes before submitting a PR.

```bash
git clone https://github.com/costajohnt/ink-combobox.git
cd ink-combobox
npm install
npm run build
npm test
```

The test suite uses [vitest](https://vitest.dev/) with [ink-testing-library](https://github.com/vadimdemedes/ink-testing-library). CI runs against Node 20 and 22.

## Changelog

This project does not yet maintain a formal CHANGELOG. See [GitHub Releases](https://github.com/costajohnt/ink-combobox/releases) for version history and release notes.

## License

MIT
