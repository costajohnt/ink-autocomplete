import chalk from 'chalk';

export const theme = {
  /** Style the cursor character */
  cursor: (char: string) => chalk.inverse(char),

  /** Style the placeholder text */
  placeholder: (text: string) => chalk.dim(text),

  /** Style a matched (highlighted) character in an option label */
  matchedChar: (char: string) => chalk.bold.cyan(char),

  /** Style the focused option pointer */
  pointer: () => chalk.cyan('❯'),

  /** Style an unfocused option (indented space) */
  noPointer: () => ' ',

  /** Style the prefix */
  prefix: (text: string) => chalk.green(text),

  /** Style the "no matches" text */
  noMatches: (text: string) => chalk.dim(text),

  /** Style the loading text */
  loading: (text: string) => chalk.dim.yellow(text),

  /** Style scroll indicators */
  scrollIndicator: (text: string) => chalk.dim(text),

  /** Style the input text */
  inputText: (text: string) => text,

  /** Style a focused option label (non-highlighted chars) */
  focusedOption: (text: string) => chalk.cyan(text),

  /** Style a non-focused option label (non-highlighted chars) */
  unfocusedOption: (text: string) => text,
};

export type Theme = typeof theme;
