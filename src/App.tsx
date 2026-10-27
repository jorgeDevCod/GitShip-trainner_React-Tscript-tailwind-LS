import { useMemo, useState } from 'react';
import ChallengePlayer from './components/ChallengePlayer';
import { Dashboard, Diagnostic, LabView, MentorMode, PathView, ProgressView, ReviewView } from './components/Views';
import { CHALLENGES, DIAGNOSTIC } from './lib/curriculum';
import { useProgress } from './lib/store';
import type { Challenge } from './lib/types';

type View = 'inicio' | 'ruta' | 'practica' | 'lab' | 'mentor' | 'repaso' | 'progreso';

const NAV: { id: View; label: string; icon: string }[] = [
  { id: 'inicio', label: 'Inicio', icon: '🏠' },
  { id: 'ruta', label: 'Ruta', icon: '🗺️' },
  { id: 'practica', label: 'Práctica', icon: '🧩' },
  { id: 'lab', label: 'Lab', icon: '🧪' },
  { id: 'mentor', label: 'Mentor', icon: '🧠' },
  { id: 'repaso', label: 'Repaso', icon: '⚡' },
  { id: 'progreso', label: 'Progreso', icon: '📊' },
];

// en móvil: 4 accesos directos + "Más" con el resto
const MOBILE_MAIN: View[] = ['inicio', 'ruta', 'practica', 'lab'];
const MOBILE_MORE: View[] = ['mentor', 'repaso', 'progreso'];

export default function App() {
  const api = useProgress();
  const [view, setView] = useState<View>('inicio');
  const [queue, setQueue] = useState<Challenge[]>([]);
  const [qi, setQi] = useState(0);
  const [showDiag, setShowDiag] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const current = queue[qi];

  const startPractice = (list?: Challenge[]) => {
    // adaptativo: primero no resueltos; si el usuario falla un concepto, se reinyecta variante
    const pending = (list ?? CHALLENGES).filter((c) => !api.state.completed[c.id]?.solved);
    const ordered = pending.length > 0 ? pending : (list ?? CHALLENGES);
    setQueue(ordered);
    setQi(0);
    setView('practica');
  };

  const playSingle = (c: Challenge, list: Challenge[]) => {
    const idx = list.indexOf(c);
    setQueue(idx >= 0 ? list.slice(idx).concat(list.slice(0, idx)) : [c]);
    setQi(0);
    setView('practica');
  };

  const handleSolved = (ch: Challenge, attempts: number, hints: number) => {
    api.recordAttempt(ch.id, ch.concept, true, hints);
    // repetición inteligente: si necesitó >2 intentos o pistas, reinyecta otro reto del mismo módulo más tarde
    if (attempts > 2 || hints >= 2) {
      const sibling = CHALLENGES.find(
        (c) => c.moduleId === ch.moduleId && c.id !== ch.id && !api.state.completed[c.id]?.solved && !queue.includes(c),
      );
      if (sibling) setQueue((q) => [...q, sibling]);
    }
    void attempts;
  };

  const nextInQueue = () => {
    if (qi + 1 < queue.length) setQi(qi + 1);
    else setView('progreso');
  };

  const continueTraining = () => {
    if (!api.state.diagnosticDone) setShowDiag(true);
    else startPractice();
  };

  const nextUnresolved = useMemo(
    () => CHALLENGES.find((c) => !api.state.completed[c.id]?.solved) ?? null,
    [api.state.completed],
  );

  // "Continuar" desde Progreso: arranca el siguiente reto pendiente dentro de su módulo
  const continueFromProgress = (c: Challenge) => {
    if (!api.state.diagnosticDone) { setShowDiag(true); return; }
    playSingle(c, CHALLENGES.filter((x) => x.moduleId === c.moduleId));
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-zinc-100">
      {/* header */}
      <header className="sticky top-0 z-20 border-b border-zinc-800/80 bg-[#0d1117]/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center gap-2 px-4 py-2.5 sm:px-6 lg:px-8">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800 text-base">🚀</span>
          <span className="font-extrabold text-white">GitShip</span>
          <span className="hidden rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400 sm:inline">{api.pct}%</span>
          <div className="ml-auto hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <button
                key={n.id}
                onClick={() => setView(n.id)}
                className={`rounded-lg px-2.5 py-1.5 text-[13px] ${view === n.id ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`}
              >
                {n.icon} {n.label}
              </button>
            ))}
          </div>
        </div>
        {/* barra de progreso fina */}
        <div className="h-0.5 bg-zinc-800/60">
          <div className="h-full bg-zinc-400 transition-all" style={{ width: `${api.pct}%` }} />
        </div>
      </header>

      {/* hero primera visita */}
      {!api.state.diagnosticDone && !showDiag && view === 'inicio' && api.solvedCount === 0 && (
        <div className="mx-auto max-w-[1400px] px-4 pt-6 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-center sm:p-8">
            <h1 className="fluid-h1 font-extrabold text-white">De git init al deploy, practicando.</h1>
            <p className="mx-auto mt-2 max-w-xl text-sm text-zinc-400">
              Domina Git, GitHub/GitLab/Bitbucket, CI/CD y DevOps frontend resolviendo problemas reales: del primer commit al preview deploy.
            </p>
            <button onClick={() => setShowDiag(true)} className="mt-4 rounded-xl bg-zinc-100 px-6 py-2.5 font-bold text-zinc-900 hover:bg-white">
              Comenzar diagnóstico ({DIAGNOSTIC.length} preguntas) →
            </button>
            <div className="mt-2 text-xs text-zinc-500">20% teoría · 80% práctica · sesiones desde 5 minutos</div>
          </div>
        </div>
      )}

      {showDiag && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Diagnóstico de nivel">
          <Diagnostic
            onFinish={(level) => {
              api.setState((s) => ({ ...s, diagnosticDone: true, diagnosticLevel: level }));
              setShowDiag(false);
              startPractice();
            }}
          />
        </div>
      )}

      {/* contenido */}
      <main className="mx-auto max-w-[1400px] px-4 pb-28 pt-5 sm:px-6 md:pb-12 lg:px-8">
        {view === 'inicio' && <Dashboard api={api} onContinue={continueTraining} onGo={(v) => setView(v as View)} />}
        {view === 'ruta' && <PathView api={api} onPlay={playSingle} />}
        {view === 'practica' && (
          current ? (
            <ChallengePlayer key={current.id} challenge={current} onSolved={handleSolved} onNext={nextInQueue} isLast={qi + 1 >= queue.length} />
          ) : (
            <div className="rounded-2xl border border-zinc-700/70 bg-zinc-900/70 p-6 text-center">
              <div className="text-3xl">🧩</div>
              <div className="mt-2 font-bold text-white">Elige por dónde seguir</div>
              <p className="mt-1 text-sm text-zinc-400">Sesiones cortas: 5 min = 1 reto · 15 min = 3–5 retos · 30 min = sesión completa.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button onClick={() => startPractice()} className="rounded-xl bg-zinc-100 px-5 py-2.5 font-bold text-zinc-900 hover:bg-white">Sesión adaptativa →</button>
                <button onClick={() => setView('ruta')} className="rounded-xl border border-zinc-700 px-5 py-2.5 text-sm text-zinc-200 hover:border-zinc-400">Elegir reto en la Ruta</button>
              </div>
            </div>
          )
        )}
        {view === 'lab' && <LabView api={api} />}
        {view === 'mentor' && <MentorMode />}
        {view === 'repaso' && <ReviewView api={api} onPlay={playSingle} />}
        {view === 'progreso' && <ProgressView api={api} next={nextUnresolved} onContinue={continueFromProgress} onGoReview={() => setView('repaso')} onReset={() => { if (confirm('¿Borrar todo tu progreso?')) api.resetAll(); }} />}
      </main>

      {/* menú "Más" en móvil */}
      {showMore && (
        <div className="fixed inset-0 z-30 md:hidden" onClick={() => setShowMore(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="pop absolute bottom-16 left-4 right-4 rounded-2xl border border-zinc-700 bg-zinc-900 p-2" onClick={(e) => e.stopPropagation()}>
            {MOBILE_MORE.map((id) => {
              const n = NAV.find((x) => x.id === id)!;
              return (
                <button
                  key={id}
                  onClick={() => { setView(id); setShowMore(false); }}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm ${view === id ? 'bg-zinc-800 text-white' : 'text-zinc-300'}`}
                >
                  <span className="text-xl">{n.icon}</span>{n.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* nav móvil */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-zinc-800 bg-[#0d1117]/95 backdrop-blur md:hidden">
        <div className="grid grid-cols-5">
          {MOBILE_MAIN.map((id) => {
            const n = NAV.find((x) => x.id === id)!;
            return (
              <button key={id} onClick={() => setView(id)} className={`flex min-w-0 flex-col items-center py-2 text-[11px] ${view === id ? 'text-white' : 'text-zinc-500'}`}>
                <span className="text-lg">{n.icon}</span><span className="truncate">{n.label}</span>
              </button>
            );
          })}
          <button onClick={() => setShowMore((s) => !s)} className={`flex min-w-0 flex-col items-center py-2 text-[11px] ${MOBILE_MORE.includes(view) ? 'text-white' : 'text-zinc-500'}`}>
            <span className="text-lg">···</span><span className="truncate">Más</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
