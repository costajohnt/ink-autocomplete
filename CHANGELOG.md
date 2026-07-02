# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.1] - 2026-07-01

### Fixed

- Cursor movement and deletion now operate on whole grapheme clusters, so emoji, surrogate pairs, and ZWJ sequences (e.g. 👨‍👩‍👧) are inserted, moved over, and deleted as a single character instead of being split.
- Selecting or accepting an option no longer triggers a redundant re-filter; async providers are no longer called an extra time per selection, and a rejecting provider no longer fires a spurious error after a successful pick.
- Selecting or accepting an option now also discards any fetch still in flight, so a late rejection no longer fires a spurious error and a late resolution no longer overwrites the picked value with stale results. Loading and error state are cleared on the pick.
- Fixed an empty dropdown on first open: when more options matched than fit the visible window, no options rendered (only a "N more" indicator). The visible window is now sized and bounds-clamped correctly.
- Forward delete (Ctrl+D) now resets the scroll window when it empties the input, matching backspace behavior.
- The error message now uses the `alert` aria-role instead of `timer`.
- Corrected the documented peer dependencies (`ink >= 6`, `react >= 19`, Node.js >= 20) and fixed the package import in `examples/basic.tsx`.

### Changed

- Added `xo` linting with a CI step.

## [0.1.0] - 2026-03-29

### Added

- Fuzzy-search autocomplete component for Ink with highlighted matching characters
- Keyboard navigation (arrow keys, enter, tab, escape, home/end, cursor movement)
- Async options support with configurable debounce, loading, and error states
- Scroll indicators when the dropdown overflows the visible window
- Headless hooks (`useAutocompleteState`, `useAutocomplete`) for custom UIs
- Themeable rendering via a `Theme` interface
- Standalone fuzzy matching utilities (`fuzzyMatch`, `fuzzyFilter`, `collapseIndices`)
- Full TypeScript type exports

[0.2.1]: https://github.com/costajohnt/ink-autocomplete/releases/tag/v0.2.1
[0.1.0]: https://github.com/costajohnt/ink-autocomplete/releases/tag/v0.1.0
