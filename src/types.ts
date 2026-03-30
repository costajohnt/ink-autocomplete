export interface Option {
  label: string;
  value: string;
}

export interface MatchRange {
  start: number;
  end: number;
}

export interface FuzzyMatch {
  option: Option;
  score: number;
  matchRanges: MatchRange[];
}

export type AsyncOptionsProvider = (query: string) => Promise<Option[]>;

export type OptionsSource = Option[] | AsyncOptionsProvider;
