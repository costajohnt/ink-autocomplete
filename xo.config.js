import base from '@costajohnt/ink-config/xo';

/**
@type {import('xo').FlatXoConfig}
*/
const xoConfig = [
	...base,
	{
		rules: {
			// AutocompleteState.selectedValue/selectedOption/error and fuzzyMatch() use `null` by design; switching to `undefined` changes the public API.
			'@typescript-eslint/no-restricted-types': 'off',
			// The reducer switches over every action, the input handler branches once per key, and the component renders conditional JSX per state; splitting them only scatters the logic.
			complexity: 'off',
			// Latest-ref pattern (`onChangeRef.current = onChange`) and the options-stabilizing ref are deliberately updated during render; moving them into effects would change when callbacks and filtering see new values.
			'react-hooks/refs': 'off',
			// The two-argument `.then(onFulfilled, onRejected)` is deliberate: `.catch()` would also turn errors thrown by the success handler into SET_ERROR.
			'unicorn/prefer-then-catch': 'off',
		},
	},
	{
		files: ['test/**', 'src/**/__tests__/**'],
		rules: {
			// The `waitFor` poll-until helper awaits in a loop by design.
			'no-await-in-loop': 'off',
			// `__tests__` is the conventional Vitest/Jest test directory name.
			'unicorn/filename-case': 'off',
		},
	},
];

export default xoConfig;
