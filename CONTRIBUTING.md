# Contributing

Thanks for your interest in contributing to ink-combobox! Here's how to get started.

## Setup

```bash
git clone https://github.com/costajohnt/ink-autocomplete.git
cd ink-autocomplete
npm install
```

## Development workflow

```bash
npm run build      # build with tsup
npm run typecheck   # run tsc --noEmit
npm test           # run vitest
npm run test:watch # run vitest in watch mode
```

## Running examples

```bash
npx tsx examples/basic.tsx
npx tsx examples/demo-recording.tsx
```

## Making changes

1. Fork the repo and create a feature branch from `main`.
2. Make your changes. Add or update tests as needed.
3. Run `npm run typecheck && npm test` to make sure everything passes.
4. Open a pull request against `main`.

## Code style

- TypeScript strict mode is enabled.
- The project uses ESM (`"type": "module"` in package.json).
- Keep imports explicit (no barrel re-exports from subdirectories).

## Tests

Tests live in `src/__tests__/` and use [vitest](https://vitest.dev/) with [ink-testing-library](https://github.com/vadimdemedes/ink-testing-library). CI runs against Node 20 and 22.

## Reporting issues

Please open an issue on [GitHub](https://github.com/costajohnt/ink-autocomplete/issues) with a clear description and reproduction steps. For larger changes, open an issue first to discuss the approach before submitting a PR.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
