export type Option = {
  label: string;
  value: string;
};

export type MatchRange = {
  start: number;
  end: number;
};

export type FuzzyMatch = {
  option: Option;
  score: number;
  matchRanges: MatchRange[];
};

export type AsyncOptionsProvider = (query: string) => Promise<Option[]>;

export type OptionsSource = Option[] | AsyncOptionsProvider;
