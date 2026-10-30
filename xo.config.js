import base from '@costajohnt/ink-config/xo';

/**
@type {import('xo').FlatXoConfig}
*/
const xoConfig = [
	...base,
	{
		// Rules this codebase does not satisfy yet under the shared config.
		// Burn these down by fixing the code and deleting the line.
		rules: {
			'@stylistic/no-mixed-operators': 'off',
			'@stylistic/no-mixed-spaces-and-tabs': 'off',
			'@typescript-eslint/no-restricted-types': 'off',
			'@typescript-eslint/strict-boolean-expressions': 'off',
			'@typescript-eslint/switch-exhaustiveness-check': 'off',
			'@typescript-eslint/use-unknown-in-catch-callback-variable': 'off',
			complexity: 'off',
			'func-names': 'off',
			'jsx-a11y-x/aria-props': 'off',
			'max-params': 'off',
			'react-hooks/refs': 'off',
			'unicorn/name-replacements': 'off',
			'unicorn/prefer-combined-guards': 'off',
			'unicorn/prefer-export-from': 'off',
			'unicorn/prefer-includes-over-repeated-comparisons': 'off',
			'unicorn/prefer-then-catch': 'off',
		},
	},
	{
		files: ['test/**', 'src/**/__tests__/**'],
		rules: {
			'no-await-in-loop': 'off',
			'prefer-regex-literals': 'off',
			'regexp/no-control-character': 'off',
			'unicorn/consistent-boolean-name': 'off',
			'unicorn/filename-case': 'off',
			'unicorn/prefer-promise-with-resolvers': 'off',
		},
	},
	{
		files: ['**/*.md'],
		rules: {
			'markdown/fenced-code-language': 'off',
		},
	},
	{
		files: ['package.json'],
		rules: {
			'package-json/prefer-side-effects-field': 'off',
		},
	},
];

export default xoConfig;
