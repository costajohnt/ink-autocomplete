import base from '@costajohnt/ink-config/xo';

/** @type {import('xo').FlatXoConfig} */
const xoConfig = [
	...base,
	{
		// Rules this codebase does not satisfy yet under the shared config.
		// Burn these down by fixing the code and deleting the line.
		rules: {
			'@stylistic/arrow-parens': 'off',
			'@stylistic/indent-binary-ops': 'off',
			'@stylistic/jsx-curly-brace-presence': 'off',
			'@stylistic/no-mixed-operators': 'off',
			'@stylistic/object-curly-newline': 'off',
			'@stylistic/object-curly-spacing': 'off',
			'@stylistic/padding-line-between-statements': 'off',
			'@typescript-eslint/consistent-type-definitions': 'off',
			'@typescript-eslint/no-restricted-types': 'off',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/strict-boolean-expressions': 'off',
			'@typescript-eslint/switch-exhaustiveness-check': 'off',
			'@typescript-eslint/use-unknown-in-catch-callback-variable': 'off',
			complexity: 'off',
			curly: 'off',
			'func-names': 'off',
			'import-x/order': 'off',
			'jsdoc/require-asterisk-prefix': 'off',
			'jsx-a11y-x/aria-props': 'off',
			'max-params': 'off',
			'prefer-destructuring': 'off',
			'react-hooks/refs': 'off',
			'unicorn/catch-error-name': 'off',
			'unicorn/consistent-boolean-name': 'off',
			'unicorn/name-replacements': 'off',
			'unicorn/no-for-loop': 'off',
			'unicorn/no-new-array': 'off',
			'unicorn/prefer-combined-guards': 'off',
			'unicorn/prefer-continue': 'off',
			'unicorn/prefer-early-return': 'off',
			'unicorn/prefer-export-from': 'off',
			'unicorn/prefer-includes-over-repeated-comparisons': 'off',
			'unicorn/prefer-ternary': 'off',
			'unicorn/prefer-then-catch': 'off',
			'unicorn/prefer-unicode-code-point-escapes': 'off',
			'unicorn/single-line-block-comment-style': 'off',
			'unicorn/switch-case-braces': 'off',
		},
	},
	{
		files: ['test/**', 'src/**/__tests__/**'],
		rules: {
			'@typescript-eslint/promise-function-async': 'off',
			'import-x/no-duplicates': 'off',
			'no-await-in-loop': 'off',
			'no-control-regex': 'off',
			'prefer-regex-literals': 'off',
			'regexp/no-control-character': 'off',
			'unicorn/filename-case': 'off',
			'unicorn/prefer-promise-with-resolvers': 'off',
			'unicorn/prefer-split-limit': 'off',
			'unicorn/prefer-string-raw': 'off',
			'unicorn/prefer-string-replace-all': 'off',
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
			'package-json/prefer-shorthand': 'off',
			'package-json/prefer-side-effects-field': 'off',
			'package-json/sort-properties': 'off',
		},
	},
];

export default xoConfig;
