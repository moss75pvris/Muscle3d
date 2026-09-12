import type { CompactExercise, Exercise, RawExercise } from '../types';

const repositoryBase = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/';
const assetUrl = (path: string) => path.startsWith('http') ? path : `${repositoryBase}${path}`;

function normalize(data: CompactExercise): Exercise {
  return {
    id: data.id,
    name: data.name,
    category: data.category,
    equipment: data.equipment,
    primaryMuscle: data.target,
    secondaryMuscles: data.secondary_muscles ?? [],
    steps: data.steps_fr ?? [],
    gif: assetUrl(data.gif_url),
    image: assetUrl(data.image),
    attribution: data.attribution,
  };
}

function compactRaw(data: RawExercise): CompactExercise {
  return {
    id: data.id,
    name: data.name,
    category: data.category,
    equipment: data.equipment,
    target: data.target,
    secondary_muscles: data.secondary_muscles ?? [],
    steps_fr: data.instruction_steps?.fr ?? data.instructions.fr?.split(/(?<=[.!?])\s+/) ?? [],
    gif_url: data.gif_url,
    image: data.image,
    attribution: data.attribution,
  };
}

export async function loadExercises(): Promise<Exercise[]> {
  const local = await fetch('/data/exercises.min.json');
  if (local.ok) return (await local.json() as CompactExercise[]).map(normalize);

  const remote = await fetch(`${repositoryBase}data/exercises.json`);
  if (!remote.ok) throw new Error('Dataset unavailable');
  return (await remote.json() as RawExercise[]).map(compactRaw).map(normalize);
}
