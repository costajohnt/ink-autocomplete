# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[0.1.0]: https://github.com/costajohnt/ink-autocomplete/releases/tag/v0.1.0
