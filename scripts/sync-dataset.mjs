import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const input = process.argv[2];
if (!input) throw new Error('Usage: node scripts/sync-dataset.mjs /path/to/exercises.json');

const raw = JSON.parse(await readFile(resolve(input), 'utf8'));
const compact = raw.map((exercise) => ({
  id: exercise.id,
  name: exercise.name,
  category: exercise.category,
  equipment: exercise.equipment,
  target: exercise.target,
  secondary_muscles: exercise.secondary_muscles ?? [],
  steps_fr: exercise.instruction_steps?.fr ?? [],
  gif_url: exercise.gif_url,
  image: exercise.image,
  attribution: exercise.attribution,
}));

const output = resolve('public/data/exercises.min.json');
await mkdir(dirname(output), { recursive: true });
await writeFile(output, JSON.stringify(compact));
console.log(`${compact.length} exercices synchronisés vers ${output}`);
