# MUSCLE 3D

Explorateur d'anatomie et de mouvements, construit avec React, TypeScript, Three.js / React Three Fiber et Vite.

## Lancer

```bash
npm install
npm run dev
```

Pour valider la version de production : `npm run build`.

## Publier sur GitHub

Le dépôt local est configuré sur `https://github.com/moss75pvris/Muscle3d.git`. Après le premier commit, sa publication se fait avec :

```bash
git push -u origin main
```

Les dépendances, fichiers de build, caches TypeScript, réglages locaux et fichiers `.env` sont exclus par `.gitignore`.

## Architecture

- `src/components/Anatomy.tsx` : atlas musculaire Z-Anatomy, chargement GLB/Draco, interactions souris/tactiles et surbrillance des groupes.
- `src/data/muscles.ts` : mapping centralisé entre libellés UI, catégories/cibles du dataset et groupes de meshes anatomiques.
- `src/data/adapter.ts` : adaptation de la structure brute du dépôt vers le modèle `Exercise` de l’application.
- `src/App.tsx` : sélection, recherche, filtres, pagination progressive et fiche exercice.

## Dataset et attribution

Les 1 324 entrées proviennent du dépôt public [hasaneyldrm/exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset). L’application utilise une copie locale compacte de 1 Mo dans `public/data/exercises.min.json`, au lieu du JSON multilingue source d’environ 17 Mo. Pour la régénérer après une mise à jour du dépôt source :

```bash
npm run sync:dataset -- /chemin/vers/exercises.json
```

Les miniatures sont chargées paresseusement. Sur ordinateur, le GIF ne démarre qu’au survol ; sur mobile, il est chargé dans la fiche de détail afin d’éviter plusieurs décodages animés simultanés.

Les données, structures et instructions sont sous licence MIT. Les médias sont © Gym visual et l’attribution est affichée dans la fiche : conservez-la. Leur réutilisation est régie par les conditions Gym visual ; obtenez votre propre licence avant toute diffusion commerciale. Voir [`NOTICE.md`](NOTICE.md) et la licence du dataset source.

## Modèle anatomique 3D

Le corps utilise l'atlas musculaire réel de [Z-Anatomy](https://github.com/Z-Anatomy), dérivé de BodyParts3D. L'export web segmenté se trouve dans `public/models/muscular.glb` et est compressé avec Draco. Chaque structure anatomique reste un mesh indépendant et cliquable.

Le modèle est sous licence **CC BY-SA 4.0** : l'attribution Z-Anatomy / BodyParts3D doit rester visible et toute version dérivée du modèle doit conserver cette licence. Le code de correspondance reconnaît les noms anatomiques réels — pectoralis, deltoid, biceps/triceps brachii, rectus abdominis, latissimus dorsi, gluteus, vastus, hamstrings et gastrocnemius.

Les composants tiers et leurs obligations sont détaillés dans [`NOTICE.md`](NOTICE.md). Aucune licence n'est appliquée au code original de l'application pour le moment ; ajoutez-en une explicitement si vous souhaitez autoriser sa réutilisation.

## Performance mobile

- Bundle Three.js séparé du premier chargement par import dynamique.
- Rendu 3D à la demande, limité à 1× DPR sur écran tactile.
- Ombres, environnement HDR et anticrénelage désactivés sur mobile.
- Bourses, gaines synoviales et tissus internes inutiles masqués sur mobile, tout en conservant les fascias semi-transparents et les muscles interactifs.
- Modèle GLB Draco de 8,4 Mo et dataset local compact de 1 Mo.
- Layout mobile dédié avec contrôles tactiles, navigation collante et cartes horizontales.
