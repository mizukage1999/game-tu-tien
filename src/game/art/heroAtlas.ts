export const HERO_ATLASES = {
  children: { width: 1284, height: 1225 },
  adults: { width: 1286, height: 1223 },
  casting: { width: 1536, height: 1024 },
} as const;

// The authored children are NOT eight equal-height rows. These transparent
// gutters retain shoes and hats; dividing 1225 by eight cuts through their legs.
const CHILD_ROWS = [
  [0, 164, 319, 473, 636, 784, 936, 1077, 1225],
  [0, 164, 319, 473, 635, 784, 938, 1080, 1225],
  [0, 164, 319, 473, 636, 784, 938, 1080, 1225],
  [0, 164, 319, 473, 636, 784, 937, 1079, 1225],
  [0, 163, 319, 473, 636, 784, 935, 1077, 1225],
  [0, 164, 319, 473, 636, 784, 937, 1078, 1225],
  [0, 164, 319, 473, 636, 784, 938, 1080, 1225],
  [0, 164, 319, 473, 636, 784, 937, 1077, 1225],
] as const;

export function directionalCell(
  source: keyof typeof HERO_ATLASES,
  row: number,
  col: number,
): [number, number, number, number] {
  const { width, height } = HERO_ATLASES[source];
  const x = Math.round((width * col) / 8);
  const y = source === 'children' ? CHILD_ROWS[col][row] : Math.round((height * row) / 8);
  const bottom =
    source === 'children' ? CHILD_ROWS[col][row + 1] : Math.round((height * (row + 1)) / 8);
  return [x, y, Math.round((width * (col + 1)) / 8) - x, bottom - y];
}
