import type { Muscle } from '../types';

// UI label, dataset terms and GLB mesh names deliberately remain independent.
export const muscles: Muscle[] = [
  { id: 'chest', label: 'Pectoraux', datasetCategories: ['chest'], targets: ['pectoralis major', 'pectorals'], modelParts: ['pectoralis_major'], position: [0, .65, 3.9] },
  { id: 'back', label: 'Dos', datasetCategories: ['back'], targets: ['lats', 'traps', 'upper back', 'lower back'], modelParts: ['latissimus_dorsi', 'trapezius'], position: [0, .5, -4.2] },
  { id: 'shoulders', label: 'Épaules', datasetCategories: ['shoulders'], targets: ['delts'], modelParts: ['deltoid'], position: [0, 1.05, 4] },
  { id: 'biceps', label: 'Biceps', datasetCategories: ['upper arms'], targets: ['biceps'], modelParts: ['biceps_brachii'], position: [0, .65, 4.3] },
  { id: 'triceps', label: 'Triceps', datasetCategories: ['upper arms'], targets: ['triceps'], modelParts: ['triceps_brachii'], position: [0, .65, -4.3] },
  { id: 'abs', label: 'Abdominaux', datasetCategories: ['waist'], targets: ['abs'], modelParts: ['rectus_abdominis', 'obliques'], position: [0, .05, 4] },
  { id: 'glutes', label: 'Fessiers', datasetCategories: ['upper legs'], targets: ['glutes'], modelParts: ['gluteus_maximus'], position: [0, -.85, -4] },
  { id: 'quadriceps', label: 'Quadriceps', datasetCategories: ['upper legs'], targets: ['quadriceps'], modelParts: ['quadriceps'], position: [0, -1.35, 4] },
  { id: 'hamstrings', label: 'Ischio-jambiers', datasetCategories: ['upper legs'], targets: ['hamstrings'], modelParts: ['hamstrings'], position: [0, -1.35, -4] },
  { id: 'calves', label: 'Mollets', datasetCategories: ['lower legs'], targets: ['calves'], modelParts: ['gastrocnemius'], position: [0, -2.65, 4] }
];
export const byMuscle = (id: string) => muscles.find((m) => m.id === id);
