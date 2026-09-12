import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { loadExercises } from './data/adapter';
import { byMuscle, muscles } from './data/muscles';
import type { Exercise } from './types';

const PAGE_SIZE = 8;
const Anatomy = lazy(() => import('./components/Anatomy').then((module) => ({ default: module.Anatomy })));

function LazyImage({ src, alt }: { src: string; alt: string }) {
  const [unavailable, setUnavailable] = useState(false);
  return <div className="media">
    {unavailable
      ? <span>Asset indisponible</span>
      : <img src={src} alt={alt} loading="lazy" onError={() => setUnavailable(true)} />}
  </div>;
}

function ExercisePreview({ exercise }: { exercise: Exercise }) {
  const [animated, setAnimated] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  return <div className="media exercise-preview"
    onPointerEnter={(event) => { if (event.pointerType !== 'touch') setAnimated(true); }}
    onPointerLeave={() => setAnimated(false)}>
    {unavailable
      ? <span>Asset indisponible</span>
      : <img src={animated ? exercise.gif : exercise.image} alt={`Démonstration de ${exercise.name}`} loading="lazy" onError={() => setUnavailable(true)} />}
    <small className="preview-hint">{animated ? 'ANIMATION' : 'SURVOLER POUR ANIMER'}</small>
  </div>;
}

function ExerciseDetail({ exercise, close }: { exercise: Exercise; close: () => void }) {
  return <div className="modalBackdrop" role="presentation" onMouseDown={close}>
    <article className="detail" role="dialog" aria-modal="true" aria-label={exercise.name} onMouseDown={(event) => event.stopPropagation()}>
      <button className="close" onClick={close}>Fermer ×</button>
      <p className="eyebrow">{exercise.category}</p>
      <h2>{exercise.name}</h2>
      <LazyImage src={exercise.gif} alt={`Animation de ${exercise.name}`} />
      <div className="detailGrid">
        <section><small>MUSCLE PRINCIPAL</small><p>{exercise.primaryMuscle}</p></section>
        <section><small>ÉQUIPEMENT</small><p>{exercise.equipment}</p></section>
        <section><small>MUSCLES SECONDAIRES</small><p>{exercise.secondaryMuscles.join(' · ') || '—'}</p></section>
      </div>
      <section className="steps">
        <small>COMMENT EXÉCUTER</small>
        {exercise.steps.map((step, index) => <p key={step}><b>{String(index + 1).padStart(2, '0')}</b>{step}</p>)}
      </section>
      <footer>{exercise.attribution}</footer>
    </article>
  </div>;
}

export function App() {
  const [items, setItems] = useState<Exercise[]>([]);
  const [error, setError] = useState(false);
  const [selectedId, setSelectedId] = useState('chest');
  const [query, setQuery] = useState('');
  const [equipment, setEquipment] = useState('all');
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [detail, setDetail] = useState<Exercise>();
  const selected = byMuscle(selectedId);

  useEffect(() => { loadExercises().then(setItems).catch(() => setError(true)); }, []);
  useEffect(() => setVisible(PAGE_SIZE), [selectedId, query, equipment]);

  const matches = useMemo(() => items.filter((exercise) => {
    const matchesMuscle = !selected || selected.datasetCategories.includes(exercise.category) || selected.targets.includes(exercise.primaryMuscle.toLowerCase());
    const searchable = [exercise.name, exercise.primaryMuscle, exercise.category, exercise.equipment, ...exercise.secondaryMuscles].join(' ').toLowerCase();
    return matchesMuscle && (equipment === 'all' || exercise.equipment === equipment) && searchable.includes(query.toLowerCase());
  }), [items, selected, query, equipment]);

  const equipments = useMemo(() => [...new Set(items.map((exercise) => exercise.equipment))].slice(0, 9), [items]);

  return <main>
    <header>
      <a className="brand" href="#top">MUSCLE<span>3D</span></a>
      <p>ANATOMY / MOTION / STRENGTH</p>
      <button className="menu" onClick={() => setSelectedId('chest')}>Réinitialiser</button>
    </header>

    <section className="hero" id="top">
      <div className="copy">
        <p className="eyebrow">EXPLORE YOUR BODY</p>
        <h1>Le mouvement<br /><i>commence ici.</i></h1>
        <p className="intro">Touchez une structure anatomique pour révéler les mouvements qui la construisent.</p>
        <div className="status"><span /> ATLAS ANATOMIQUE Z-ANATOMY · 3D TEMPS RÉEL</div>
      </div>
      <div className="bodyStage">
        <Suspense fallback={<div className="canvas-fallback"><span />Chargement du moteur 3D…</div>}>
          <Anatomy selected={selected} onPick={setSelectedId} />
        </Suspense>
        <p className="gesture">GLISSER POUR TOURNER · CLIQUER POUR SÉLECTIONNER</p>
      </div>
      <div className="focus">
        <p className="eyebrow">ZONE SÉLECTIONNÉE</p>
        <h2>{selected?.label}</h2>
        <p>{matches.length || '—'} exercices dans la collection</p>
        <button onClick={() => document.getElementById('explorer')?.scrollIntoView({ behavior: 'smooth' })}>Explorer <b>↓</b></button>
      </div>
    </section>

    <nav className="muscles" aria-label="Groupes musculaires">
      {muscles.map((muscle) => <button className={muscle.id === selectedId ? 'active' : ''} onClick={() => setSelectedId(muscle.id)} key={muscle.id}>{muscle.label}</button>)}
    </nav>

    <section className="explorer" id="explorer">
      <div className="explorerHead">
        <div><p className="eyebrow">BIBLIOTHÈQUE DE MOUVEMENTS</p><h2>{selected?.label} <em>{matches.length}</em></h2></div>
        <label className="search">⌕ <input aria-label="Rechercher un exercice" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un exercice" /></label>
      </div>
      <div className="filters">
        <button className={equipment === 'all' ? 'active' : ''} onClick={() => setEquipment('all')}>Tout l’équipement</button>
        {equipments.map((item) => <button className={equipment === item ? 'active' : ''} onClick={() => setEquipment(item)} key={item}>{item}</button>)}
      </div>
      {error
        ? <div className="notice">Le dataset n’est pas accessible. Vérifiez votre connexion puis rechargez la page.</div>
        : !items.length
          ? <div className="notice">Chargement de la collection d’exercices…</div>
          : !matches.length
            ? <div className="notice">Aucun exercice trouvé pour ces critères.</div>
            : <>
              <div className="grid">
                {matches.slice(0, visible).map((exercise) => <button className="card" key={exercise.id} onClick={() => setDetail(exercise)}>
                  <ExercisePreview exercise={exercise} />
                  <div><small>{exercise.primaryMuscle}</small><h3>{exercise.name}</h3><p>{exercise.equipment}<span>{exercise.secondaryMuscles.slice(0, 2).join(' · ')}</span></p></div>
                </button>)}
              </div>
              {visible < matches.length && <button className="more" onClick={() => setVisible((count) => count + PAGE_SIZE)}>Afficher plus <b>↓</b></button>}
            </>}
    </section>

    <footer className="siteFooter">
      Anatomie 3D : Z-Anatomy / BodyParts3D, CC BY-SA 4.0 · Exercices et médias : © Gym visual — attributions conservées.
    </footer>
    {detail && <ExerciseDetail exercise={detail} close={() => setDetail(undefined)} />}
  </main>;
}
