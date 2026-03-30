import React from 'react';
import { render, Text, Box } from 'ink';
import { Autocomplete } from '../src/index.js';
import type { Option } from '../src/index.js';

const languages: Option[] = [
  { label: 'C', value: 'c' },
  { label: 'C++', value: 'cpp' },
  { label: 'C#', value: 'csharp' },
  { label: 'Clojure', value: 'clojure' },
  { label: 'Dart', value: 'dart' },
  { label: 'Elixir', value: 'elixir' },
  { label: 'Erlang', value: 'erlang' },
  { label: 'Go', value: 'go' },
  { label: 'Haskell', value: 'haskell' },
  { label: 'Java', value: 'java' },
  { label: 'JavaScript', value: 'javascript' },
  { label: 'Kotlin', value: 'kotlin' },
  { label: 'Lua', value: 'lua' },
  { label: 'OCaml', value: 'ocaml' },
  { label: 'Perl', value: 'perl' },
  { label: 'PHP', value: 'php' },
  { label: 'Python', value: 'python' },
  { label: 'Ruby', value: 'ruby' },
  { label: 'Rust', value: 'rust' },
  { label: 'Scala', value: 'scala' },
  { label: 'Swift', value: 'swift' },
  { label: 'TypeScript', value: 'typescript' },
  { label: 'Zig', value: 'zig' },
];

function App() {
  const [selected, setSelected] = React.useState<string | null>(null);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">ink-combobox demo</Text>
      <Text dimColor>Type to fuzzy-filter, arrows to navigate, enter to select</Text>
      <Box marginTop={1}>
        <Autocomplete
          options={languages}
          placeholder="Pick a language..."
          visibleOptionCount={6}
          onSelect={(value) => setSelected(value)}
        />
      </Box>
      {selected && (
        <Box marginTop={1}>
          <Text>
            You picked: <Text bold color="green">{selected}</Text>
          </Text>
        </Box>
      )}
    </Box>
  );
}

render(<App />);
