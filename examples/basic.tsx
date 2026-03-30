import React from 'react';
import { render, Text, Box } from 'ink';
import { Autocomplete } from '../src/index.js';
import type { Option } from '../src/index.js';

const fruits: Option[] = [
  { label: 'Apple', value: 'apple' },
  { label: 'Apricot', value: 'apricot' },
  { label: 'Banana', value: 'banana' },
  { label: 'Blackberry', value: 'blackberry' },
  { label: 'Blueberry', value: 'blueberry' },
  { label: 'Cherry', value: 'cherry' },
  { label: 'Coconut', value: 'coconut' },
  { label: 'Cranberry', value: 'cranberry' },
  { label: 'Date', value: 'date' },
  { label: 'Elderberry', value: 'elderberry' },
  { label: 'Fig', value: 'fig' },
  { label: 'Grape', value: 'grape' },
  { label: 'Grapefruit', value: 'grapefruit' },
  { label: 'Guava', value: 'guava' },
  { label: 'Kiwi', value: 'kiwi' },
  { label: 'Lemon', value: 'lemon' },
  { label: 'Lime', value: 'lime' },
  { label: 'Mango', value: 'mango' },
  { label: 'Nectarine', value: 'nectarine' },
  { label: 'Orange', value: 'orange' },
  { label: 'Papaya', value: 'papaya' },
  { label: 'Peach', value: 'peach' },
  { label: 'Pear', value: 'pear' },
  { label: 'Pineapple', value: 'pineapple' },
  { label: 'Plum', value: 'plum' },
  { label: 'Raspberry', value: 'raspberry' },
  { label: 'Strawberry', value: 'strawberry' },
  { label: 'Watermelon', value: 'watermelon' },
];

function App() {
  const [selected, setSelected] = React.useState<string | null>(null);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Fruit Picker</Text>
      <Text dimColor>Type to search, arrows to navigate, enter to select</Text>
      <Box marginTop={1}>
        <Autocomplete
          options={fruits}
          placeholder="Search for a fruit..."
          visibleOptionCount={7}
          onSelect={(value) => setSelected(value)}
          onChange={(value) => {
            // You could do live filtering here
          }}
        />
      </Box>
      {selected && (
        <Box marginTop={1}>
          <Text>
            Selected: <Text bold color="green">{selected}</Text>
          </Text>
        </Box>
      )}
    </Box>
  );
}

render(<App />);
