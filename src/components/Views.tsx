import { useMemo, useRef, useState } from 'react';
import { applyCommand, baseState } from '../lib/gitSim';
import { CHALLENGES, DIAGNOSTIC, MENTOR_RULES, MODULES } from '../lib/curriculum';
import { masteryLevel } from '../lib/store';
import type { ProgressApi } from '../lib/store';
import type { Challenge, SimState } from '../lib/types';
import GitVisual from './GitVisual';

/* ─── Dashboard ─── */
export function Dashboard({ api, onContinue, onGo }: { api: ProgressApi; onContinue: () => void; onGo: (v: string) => void }) {
  const { pct, solvedCount, totalCount, dominated, state } = api;
  const next = useMemo(() => CHALLENGES.find((c) => !api.state.completed[c.id]?.solved), [api.state.completed]);
  return (
    <div className="rise space-y-4">
      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="text-sm font-medium text-zinc-400">Git · Remotos · CI/CD · DevOps</div>
        <h1 className="fluid-h1 mt-1 font-extrabold text-white">Tu progreso: {pct}%</h1>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
          <div className="h-full rounded-full bg-zinc-300 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-zinc-800/80 px-3 py-1">🟢 {dominated} conceptos dominados</span>
          <span className="rounded-full bg-zinc-800/80 px-3 py-1">🧩 {solvedCount}/{totalCount} retos</span>
          <span className="rounded-full bg-zinc-800/80 px-3 py-1">🔥 {state.streakDays} día(s) de racha</span>
          <span className="rounded-full bg-zinc-800/80 px-3 py-1">⏱️ ~{solvedCount * 4} min practicados</span>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button onClick={onContinue} className="rounded-xl bg-zinc-100 px-5 py-2.5 font-bold text-zinc-900 hover:bg-white">
            {solvedCount === 0 ? 'Comenzar entrenamiento →' : 'Continuar entrenamiento →'}
          </button>
          {next && <span className="text-sm text-zinc-400">Próximo objetivo: <b className="text-zinc-200">{next.title}</b> ({next.command})</span>}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { t: 'Ruta de aprendizaje', d: '6 módulos progresivos', v: 'ruta', e: '🗺️' },
          { t: 'Laboratorio libre', d: 'Repo + objetivo, sin pasos', v: 'lab', e: '🧪' },
          { t: 'No sé qué comando usar', d: 'Describe tu problema', v: 'mentor', e: '🧠' },
        ].map((c) => (
          <button key={c.v} onClick={() => onGo(c.v)} className="rounded-2xl border border-zinc-700/70 bg-zinc-900/70 p-4 text-left hover:border-violet-600">
            <div className="text-2xl">{c.e}</div>
            <div className="mt-1 font-bold text-white">{c.t}</div>
            <div className="text-sm text-zinc-400">{c.d}</div>
          </button>
        ))}
      </div>
      {/* progreso por módulo */}
      <div className="rounded-2xl border border-zinc-700/70 bg-zinc-900/70 p-4">
        <div className="mb-2 font-bold text-white">Progreso por módulo</div>
        {MODULES.filter((m) => !m.comingSoon).map((m) => {
          const cs = CHALLENGES.filter((c) => c.moduleId === m.id);
          const done = cs.filter((c) => api.state.completed[c.id]?.solved).length;
          const p = Math.round((done / cs.length) * 100);
          return (
            <div key={m.id} className="mb-1.5 flex items-center gap-2 text-sm">
              <span className="w-28 shrink-0 truncate text-zinc-300 sm:w-36">{m.icon} {m.short}</span>
              <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-zinc-800">
                <div className="h-full rounded-full bg-zinc-300" style={{ width: `${p}%` }} />
              </div>
              <span className="w-10 shrink-0 text-right font-mono text-xs text-zinc-400">{p}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Ruta ─── */
export function PathView({ api, onPlay }: { api: ProgressApi; onPlay: (c: Challenge, list: Challenge[]) => void }) {
  const [open, setOpen] = useState<string | null>('fundamentos');
  return (
    <div className="rise space-y-3">
      {MODULES.map((m) => {
        const cs = CHALLENGES.filter((c) => c.moduleId === m.id);
        const done = cs.filter((c) => api.state.completed[c.id]?.solved).length;
        const isOpen = open === m.id;
        return (
          <div key={m.id} className={`rounded-2xl border ${isOpen ? 'border-zinc-500' : 'border-zinc-800'} bg-zinc-900`}>
            <button onClick={() => setOpen(isOpen ? null : m.id)} className="flex w-full items-center gap-3 p-4 text-left">
              <span className="text-2xl">{m.icon}</span>
              <span className="flex-1">
                <span className="font-bold text-white">{m.title}</span>
                {m.comingSoon && <span className="ml-2 rounded bg-zinc-700 px-1.5 py-0.5 text-[11px] text-zinc-300">🔒 se desbloquea dominando ramas</span>}
                <span className="block text-sm text-zinc-400">{m.desc}</span>
              </span>
              <span className="font-mono text-xs text-zinc-400">{m.comingSoon ? '' : `${done}/${cs.length}`}</span>
            </button>
            {isOpen && (
              <div className="space-y-3 border-t border-zinc-800 p-4">
                {/* microlecciones */}
                <div className="grid gap-2 sm:grid-cols-2">
                  {m.lessons.map((l) => (
                    <div key={l.command} className="rounded-xl bg-zinc-800/60 p-3">
                      <div className="font-mono text-[13px] font-bold text-zinc-100">{l.command}</div>
                      <div className="mt-0.5 text-[13px] text-zinc-300">{l.what}</div>
                      <div className="text-[12px] text-zinc-500">Cuándo: {l.when}</div>
                      <div className="mt-1 rounded bg-black/40 px-2 py-1 font-mono text-[12px] text-emerald-300">{l.example}</div>
                    </div>
                  ))}
                </div>
                {/* retos */}
                {!m.comingSoon && cs.map((c, i) => {
                  const rec = api.state.completed[c.id];
                  return (
                    <button
                      key={c.id}
                      onClick={() => onPlay(c, cs)}
                      className="flex w-full items-center gap-3 rounded-xl border border-zinc-700/70 bg-black/30 p-3 text-left hover:border-emerald-600"
                    >
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${rec?.solved ? 'bg-zinc-100 text-zinc-900' : 'bg-zinc-800 text-zinc-300'}`}>
                        {rec?.solved ? '✓' : i + 1}
                      </span>
                      <span className="flex-1">
                        <span className="block text-sm font-semibold text-zinc-100">{c.title}</span>
                        <span className="block font-mono text-xs text-zinc-500">{c.command} · {c.difficulty}</span>
                      </span>
                      <span className="text-emerald-400">→</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Modo mentor "no sé qué comando usar" ─── */
export function MentorMode() {
  const [text, setText] = useState('');
  const [step, setStep] = useState<null | { rule: (typeof MENTOR_RULES)[number]; picked: string | null }>(null);
  const analyze = () => {
    const t = text.toLowerCase();
    const rule = MENTOR_RULES.find((r) => r.keys.some((k) => t.includes(k))) ?? MENTOR_RULES[3];
    setStep({ rule, picked: null });
  };
  return (
    <div className="rise space-y-4">
      <div className="rounded-2xl border border-violet-800/40 bg-zinc-900/70 p-5">
        <h2 className="text-xl font-bold text-white">🧠 No sé qué comando usar</h2>
        <p className="mt-1 text-sm text-zinc-400">Describe tu problema con tus palabras. Te guiaré con preguntas antes de mostrar la solución.</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') analyze(); }}
            placeholder='Ej. "quiero deshacer los cambios de un archivo pero todavía no hice commit"'
            className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-black/40 px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-zinc-400"
          />
          <button onClick={analyze} className="shrink-0 rounded-xl bg-zinc-100 px-4 py-2.5 text-sm font-bold text-zinc-900 hover:bg-white">Analizar</button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {['Quiero deshacer un archivo sin commit', 'Necesito cambiar de rama', 'Quiero subir a GitHub', 'Hay un conflicto en mi merge'].map((s) => (
            <button key={s} onClick={() => { setText(s); }} className="rounded-full bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300 hover:bg-zinc-700">{s}</button>
          ))}
        </div>
      </div>
      {step && (
        <div className="pop space-y-3 rounded-2xl border border-zinc-700 bg-zinc-900 p-5">
          <div className="text-sm text-zinc-400">Tema detectado: <b className="font-mono text-zinc-200">{step.rule.concept}</b>. Pero antes de darte la respuesta…</div>
          <div className="font-bold text-white">❓ {step.rule.question}</div>
          <div className="flex flex-wrap gap-2">
            {step.rule.options.map((o) => (
              <button
                key={o}
                onClick={() => setStep({ ...step, picked: o })}
                className={`rounded-xl border px-3 py-2 text-sm ${step.picked === o ? 'border-zinc-300 bg-zinc-800 text-white' : 'border-zinc-700 text-zinc-300 hover:border-zinc-400'}`}
              >
                {o}
              </button>
            ))}
          </div>
          {step.picked && (
            <div className="pop rounded-xl bg-black/40 p-3 text-sm leading-relaxed text-zinc-200">
              <div>💡 <b>Pista:</b> {step.rule.hint}</div>
              <div className="mt-2 font-mono text-[13px] text-zinc-100">Solución: {step.rule.solution}</div>
              <div className="mt-1 text-xs text-zinc-500">Regla del mentor: primero piensas tú, después te ayudo, al final explico. Practícalo en el reto correspondiente de la Ruta. →</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Laboratorio ─── */
const LAB_STEPS = [
  { label: 'Crea la rama feature/login-form', test: (s: SimState) => s.branches.includes('feature/login-form') },
  { label: 'Mueve index.html al staging (add)', test: (s: SimState) => s.files.find((f) => f.name === 'index.html')?.status.startsWith('staged') || s.commits.length > 1 },
  { label: 'Crea un commit con mensaje', test: (s: SimState) => s.commits.length > 1 },
  { label: 'Sube la rama al remoto (push)', test: (s: SimState) => s.remote && s.ahead === 0 && s.commits.length > 1 },
];

export function LabView({ api }: { api: ProgressApi }) {
  const [sim, setSim] = useState<SimState>(() => ({
    ...baseState({ remote: true, remoteName: 'origin', files: [{ name: 'index.html', status: 'modified', content: 'formulario login' }] }),
  }));
  const [input, setInput] = useState('');
  const [log, setLog] = useState<string[]>(['Laboratorio: repo con index.html modificado + remoto configurado. Objetivo: dejar la feature lista para PR. Sin instrucciones paso a paso: tú decides.']);
  const [done, setDone] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  const run = () => {
    if (!input.trim()) return;
    const res = applyCommand(sim, input);
    setSim(res.state);
    setHistory((h) => [...h, input.trim()]);
    setInput('');
    setLog((l) => [...l, `$ ${input.trim()}`, res.output]);
    const passed = LAB_STEPS.map((s) => s.test(res.state));
    if (passed.every(Boolean)) {
      setDone(true);
      api.recordAttempt('lab-1', 'flujo PR', true, 0);
    }
  };

  const labKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { run(); return; }
    if (e.key === 'ArrowUp' && history.length > 0) {
      e.preventDefault();
      setInput(history[history.length - 1]);
    }
  };

  return (
    <div className="rise space-y-4">
      <div className="rounded-2xl border border-zinc-700/70 bg-zinc-900/70 p-5">
        <h2 className="text-xl font-bold text-white">🧪 Laboratorio: prepara el login para un Pull Request</h2>
        <p className="mt-1 text-sm text-zinc-400">Sin pasos guiados. Decide tú los comandos. Te evalúo al final por resultado, orden y buenas prácticas.</p>
        <div className="mt-3 space-y-1.5">
          {LAB_STEPS.map((s, i) => {
            const ok = s.test(sim);
            return <div key={i} className={`rounded-lg border px-3 py-1.5 text-sm ${ok ? 'border-zinc-600 bg-zinc-800 text-zinc-100' : 'border-transparent bg-zinc-800/50 text-zinc-500'}`}>{ok ? '✓' : `${i + 1}.`} {s.label}</div>;
          })}
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.05fr_1fr]">
        <div className="rounded-2xl border border-zinc-800 bg-[#0d1117]">
          <div className="thin-scroll h-[45vh] min-h-[240px] space-y-1 overflow-y-auto p-4 font-mono text-[13px]">
            {log.map((l, i) => <pre key={i} className={`whitespace-pre-wrap ${l.startsWith('$') ? 'text-zinc-100' : 'text-zinc-400'}`}>{l}</pre>)}
          </div>
          <div className="flex items-center gap-2 border-t border-zinc-800 p-3">
            <span className="select-none font-mono text-sm text-zinc-600">$</span>
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={labKey}
              placeholder="git branch feature/login-form …" spellCheck={false} autoComplete="off" autoCapitalize="off"
              aria-label="Entrada de comando git"
              className="min-w-0 flex-1 bg-transparent font-mono text-sm text-zinc-100 caret-zinc-300 outline-none placeholder:text-zinc-600" />
            <button onClick={run} className="shrink-0 rounded-lg bg-zinc-100 px-3.5 py-1.5 text-sm font-semibold text-zinc-900 hover:bg-white">Ejecutar</button>
          </div>
        </div>
        <GitVisual state={sim} compact />
      </div>
      {done && (
        <div className="pop rounded-2xl border border-zinc-700 bg-zinc-900 p-5 text-sm leading-relaxed text-zinc-300">
          <div className="text-lg font-bold text-white">Listo para el Pull Request</div>
          <div className="mt-2"><b>Evaluación:</b> resultado ✓ · ¿usaste rama feature? {sim.branches.includes('feature/login-form') ? 'sí' : 'no'} · ¿commiteaste con mensaje? {sim.commits.length > 1 ? 'sí' : 'no'} · ¿pusheaste? {sim.ahead === 0 ? 'sí' : 'no'}</div>
          <div className="mt-1 text-zinc-400">En un equipo real, el siguiente paso sería abrir el PR de <span className="font-mono">feature/login-form → main</span> y pedir review.</div>
        </div>
      )}
    </div>
  );
}

/* ─── Repaso ─── */
export function ReviewView({ api, onPlay }: { api: ProgressApi; onPlay: (c: Challenge, list: Challenge[]) => void }) {
  const weak = useMemo(() => {
    const entries = Object.entries(api.state.conceptStats)
      .map(([concept, s]) => ({ concept, ...s, level: masteryLevel(s.correct, s.total) }))
      .filter((e) => e.level === 'Practicando' || (e.level === 'Familiar' && e.correct / e.total < 1))
      .sort((a, b) => (a.correct / a.total) - (b.correct / b.total));
    return entries;
  }, [api.state.conceptStats]);

  const pickChallenge = (concept: string) => CHALLENGES.find((c) => c.concept === concept);

  if (weak.length === 0) {
    return (
      <div className="rise rounded-2xl border border-zinc-700/70 bg-zinc-900/70 p-6 text-center">
        <div className="text-3xl">⚡</div>
        <div className="mt-2 font-bold text-white">Nada que repasar por ahora</div>
        <p className="mt-1 text-sm text-zinc-400">Completa retos y aquí aparecerán tus conceptos débiles con repasos de 3 minutos.</p>
      </div>
    );
  }
  return (
    <div className="rise space-y-3">
      <div className="rounded-2xl border border-amber-800/40 bg-amber-950/20 p-4 text-sm text-amber-100">⚡ Repaso rápido — prioriza donde fallaste. Cada tarjeta es ~3 min.</div>
      {weak.map((w) => {
        const ch = pickChallenge(w.concept);
        return (
          <div key={w.concept} className="flex items-center gap-3 rounded-2xl border border-zinc-700/70 bg-zinc-900/70 p-4">
            <div className="flex-1">
              <div className="font-mono text-sm font-bold text-white">{w.concept}</div>
              <div className="text-xs text-zinc-400">{w.correct}/{w.total} correctos · {w.level}</div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                <div className="h-full bg-amber-400" style={{ width: `${Math.round((w.correct / w.total) * 100)}%` }} />
              </div>
            </div>
            {ch && <button onClick={() => onPlay(ch, [ch])} className="shrink-0 rounded-xl bg-zinc-100 px-3 py-2 text-sm font-bold text-zinc-900 hover:bg-white">Practicar →</button>}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Progreso ─── */
export function ProgressView({ api, onReset, next, onContinue, onGoReview }: {
  api: ProgressApi;
  onReset: () => void;
  next: Challenge | null;
  onContinue: (c: Challenge) => void;
  onGoReview: () => void;
}) {
  const concepts = useMemo(() => {
    const map = new Map<string, { correct: number; total: number }>();
    CHALLENGES.forEach((c) => {
      if (!map.has(c.concept)) map.set(c.concept, api.state.conceptStats[c.concept] ?? { correct: 0, total: 0 });
    });
    return [...map.entries()].map(([concept, s]) => ({ concept, ...s, level: masteryLevel(s.correct, s.total) }));
  }, [api.state.conceptStats]);

  return (
    <div className="rise space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="fluid-h2 font-bold text-white">Tu progreso</h2>
        {(() => {
          if (!next) {
            return (
              <div className="flex w-full items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 sm:w-auto sm:justify-end">
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-wide text-zinc-500">Ruta completada</div>
                  <div className="truncate text-sm text-zinc-300">Repasa tus puntos débiles</div>
                </div>
                <button
                  onClick={onGoReview}
                  className="shrink-0 rounded-lg border border-zinc-700 px-3.5 py-1.5 text-sm font-medium text-zinc-200 hover:border-zinc-400 hover:text-white"
                >
                  Repasar →
                </button>
              </div>
            );
          }
          const mod = MODULES.find((m) => m.id === next.moduleId);
          return (
            <div className="flex w-full items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 sm:w-auto sm:max-w-md sm:justify-end">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-xl" aria-hidden="true">
                {mod?.icon ?? '🧩'}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] uppercase tracking-wide text-zinc-500">Continuar en</div>
                <div className="truncate text-[15px] font-semibold text-white" title={mod?.title ?? ''}>
                  {mod?.title ?? 'Práctica'}
                </div>
                <div className="truncate text-xs text-zinc-400" title={next.title}>
                  Siguiente reto: {next.title} <span className="font-mono text-zinc-500">· {next.command}</span>
                </div>
              </div>
              <button
                onClick={() => onContinue(next)}
                className="shrink-0 rounded-lg border border-zinc-700 px-3.5 py-1.5 text-sm font-medium text-zinc-200 hover:border-zinc-400 hover:text-white"
              >
                Continuar →
              </button>
            </div>
          );
        })()}
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          [`${api.pct}%`, 'progreso total'],
          [`${api.solvedCount}/${api.totalCount}`, 'retos'],
          [`${api.dominated}`, 'dominados'],
          [`${api.state.streakDays}🔥`, 'racha (días)'],
        ].map(([v, l]) => (
          <div key={l} className="rounded-2xl border border-zinc-700/70 bg-zinc-900/70 p-4 text-center">
            <div className="text-2xl font-extrabold text-white">{v}</div>
            <div className="text-xs text-zinc-400">{l}</div>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-zinc-700/70 bg-zinc-900/70 p-4">
        <div className="mb-3 font-bold text-white">Dominio por concepto <span className="text-xs font-normal text-zinc-500">Nuevo → Practicando → Familiar → Dominado</span></div>
        <div className="space-y-2">
          {concepts.map((c) => (
            <div key={c.concept} className="flex items-center gap-2 text-sm">
              <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-zinc-200">{c.concept}</span>
              <span className={`w-24 shrink-0 rounded px-1.5 py-0.5 text-center text-[11px] ${c.level === 'Dominado' ? 'bg-zinc-100 text-zinc-900' : c.level === 'Familiar' ? 'bg-amber-500/15 text-amber-300' : c.level === 'Practicando' ? 'bg-orange-500/15 text-orange-300' : 'bg-zinc-800 text-zinc-400'}`}>{c.level}</span>
              <span className="w-10 shrink-0 text-right font-mono text-xs text-zinc-500">{c.correct}/{c.total}</span>
            </div>
          ))}
        </div>
      </div>
      <button onClick={onReset} className="rounded-xl border border-red-800/60 px-4 py-2 text-sm text-red-300 hover:bg-red-950/40">Reiniciar todo mi progreso</button>
    </div>
  );
}

/* ─── Diagnóstico inicial ─── */
const LEVELS = [
  { max: 2, label: 'Principiante 🌱' },
  { max: 5, label: 'Intermedio 🌿' },
  { max: Infinity, label: 'Avanzado 🚀' },
];
const levelFor = (score: number) => LEVELS.find((l) => score <= l.max)!.label;

export function Diagnostic({ onFinish }: { onFinish: (level: string) => void }) {
  const [answers, setAnswers] = useState<number[]>([]);
  const lockRef = useRef(0);
  const done = answers.length === DIAGNOSTIC.length;
  const score = answers.reduce((acc, a, idx) => acc + (a === DIAGNOSTIC[idx].answer ? 1 : 0), 0);
  const level = levelFor(score);

  // ignora clics repetidos por ~300 ms: evita responder sin querer la pregunta siguiente
  const pick = (idx: number) => {
    const now = Date.now();
    if (now - lockRef.current < 300) return;
    lockRef.current = now;
    setAnswers((prev) => (prev.length >= DIAGNOSTIC.length ? prev : [...prev, idx]));
  };

  if (done) {
    return (
      <div className="pop mx-auto flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-zinc-700 bg-zinc-900">
        <div className="overflow-y-auto p-6 pb-4">
          <div className="text-sm text-zinc-400">Resultado del diagnóstico</div>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
            <div className="text-2xl font-extrabold text-white">{score} / {DIAGNOSTIC.length} correctas</div>
            <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-300">{level}</span>
          </div>
          <div className="mt-4 space-y-2">
            {DIAGNOSTIC.map((item, idx) => {
              const ok = answers[idx] === item.answer;
              return (
                <div key={item.q} className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                  <div className="flex items-start gap-2 text-sm">
                    <span className={ok ? 'text-emerald-300' : 'text-red-300'}>{ok ? '✓' : '✗'}</span>
                    <span className="min-w-0 flex-1 text-zinc-200">{item.q}</span>
                  </div>
                  <div className="mt-1 pl-6 text-xs text-zinc-400">
                    Tu respuesta: <span className={ok ? 'text-zinc-300' : 'text-red-300/90'}>{item.options[answers[idx]]}</span>
                  </div>
                  {!ok && (
                    <div className="mt-1 pl-6 text-xs">
                      <div className="text-zinc-300">Correcta: <span className="font-mono text-zinc-100">{item.options[item.answer]}</span></div>
                      <div className="mt-0.5 text-zinc-500">{item.why}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div className="border-t border-zinc-800 p-4">
          <button onClick={() => onFinish(level)} className="w-full rounded-xl bg-zinc-100 px-5 py-2.5 font-bold text-zinc-900 hover:bg-white">
            Comenzar entrenamiento →
          </button>
        </div>
      </div>
    );
  }

  const q = DIAGNOSTIC[answers.length];
  return (
    <div className="pop mx-auto max-w-lg rounded-2xl border border-zinc-700 bg-zinc-900 p-6">
      <div className="text-sm text-zinc-400">Diagnóstico {answers.length + 1}/{DIAGNOSTIC.length}</div>
      <h3 className="mt-1 text-lg font-bold text-white">{q.q}</h3>
      <div className="mt-3 grid gap-2">
        {q.options.map((o, idx) => (
          <button key={o} onClick={() => pick(idx)} className="rounded-xl border border-zinc-700 px-3 py-2.5 text-left font-mono text-sm text-zinc-100 hover:border-zinc-400 hover:bg-zinc-800">{o}</button>
        ))}
      </div>
    </div>
  );
}
