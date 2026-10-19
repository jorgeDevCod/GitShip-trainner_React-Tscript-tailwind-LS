import { useEffect, useRef, useState } from 'react';
import { applyCommand, matchesAccepted } from '../lib/gitSim';
import type { Challenge, SimState } from '../lib/types';
import GitVisual from './GitVisual';

const DIFF_STYLE: Record<string, string> = {
  'Básico': 'bg-emerald-500/15 text-emerald-300 border-emerald-700/50',
  'Intermedio': 'bg-amber-500/15 text-amber-300 border-amber-700/50',
  'Avanzado': 'bg-orange-500/15 text-orange-300 border-orange-700/50',
  'Profesional': 'bg-red-500/15 text-red-300 border-red-700/50',
};
const DIFF_EMOJI: Record<string, string> = { 'Básico': '🟢', 'Intermedio': '🟡', 'Avanzado': '🟠', 'Profesional': '🔴' };

interface Props {
  challenge: Challenge;
  onSolved: (challenge: Challenge, attempts: number, hintsUsed: number) => void;
  onNext: () => void;
  isLast: boolean;
}

export default function ChallengePlayer({ challenge, onSolved, onNext, isLast }: Props) {
  const [sim, setSim] = useState<SimState>(() => challenge.initial());
  const [lines, setLines] = useState<{ cmd: string; out: string; ok: boolean }[]>([]);
  const [input, setInput] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [hintsShown, setHintsShown] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [solved, setSolved] = useState(false);
  const [choiceFeedback, setChoiceFeedback] = useState<string | null>(null);
  const [mentorMsg, setMentorMsg] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

  // foco automático al entrar al reto (solo desktop: evita abrir el teclado en móvil)
  useEffect(() => {
    if (window.matchMedia('(pointer: fine)').matches) inputRef.current?.focus();
  }, [challenge.id]);

  // al resolver, lleva la vista al panel de éxito (antes quedaba fuera de pantalla)
  useEffect(() => {
    if (solved) successRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [solved]);

  // comandos de solo lectura: explorar (status, log, diff…) no cuenta como intento
  const isReadonly = (cmd: string) => {
    const n = cmd.trim().replace(/^\$\s*/, '').replace(/\s+/g, ' ').toLowerCase();
    return (
      n.startsWith('git status') || n.startsWith('git log') || n.startsWith('git diff') ||
      n.startsWith('git show') || n === 'git branch' || n === 'git remote' ||
      n === 'git tag' || n.startsWith('git fetch')
    );
  };

  const scrollDown = () => requestAnimationFrame(() => boxRef.current?.scrollTo({ top: 99999 }));

  const pushLine = (cmd: string, out: string, ok: boolean) => {
    setLines((l) => [...l, { cmd, out, ok }]);
    scrollDown();
  };

  const mentorFeedback = (ok: boolean, mutated: boolean) => {
    if (ok && mutated) { setMentorMsg(null); return; }
    if (ok) { setMentorMsg(null); return; }
    // error didáctico: orienta sin dar la respuesta
    const tips: Record<string, string> = {
      'git init': 'Casi. Tu comando afecta al historial, pero aquí el problema está antes: el repo ni siquiera existe todavía.',
      'git status': 'Buen instinto observar, pero observar no cambia el estado. ¿Qué zona quieres modificar?',
      'git add': 'Vas bien con el staging, pero revisa el nombre del archivo y su estado con `git status`.',
      'git commit': 'Casi. Tu comando sella snapshots, pero ¿hay algo preparado en staging?',
    };
    const hit = Object.entries(tips).find(([k]) => challenge.command.includes(k));
    setMentorMsg(hit ? `🧠 Mentor: ${hit[1]}` : '🧠 Mentor: lee el objetivo otra vez y piensa en qué zona (working / staging / repo) debe cambiar.');
  };

  const submitCommand = () => {
    const cmd = input.trim();
    if (!cmd) return;
    setInput('');
    setHistory((h) => [...h, cmd]);
    setHistIdx(-1);
    const res = applyCommand(sim, cmd);
    setSim(res.state);
    pushLine(cmd, res.output || (res.ok ? 'OK' : 'Error'), res.ok);
    const matched = matchesAccepted(cmd, challenge.accepted);
    if (matched) {
      setAttempts((a) => a + 1);
      setSolved(true);
      setMentorMsg(null);
      onSolved(challenge, attempts + 1, hintsShown);
      pushLine('✅', `Correcto. ${challenge.explanation.what}`, true);
    } else if (res.ok && res.mutated) {
      // funcionó pero no era lo pedido: avisar en vez de dejar al usuario adivinando
      setAttempts((a) => a + 1);
      setMentorMsg(`Tu comando funcionó y cambió el repo (mira el panel), pero no completa el objetivo: "${challenge.objective}". Si quieres intentarlo desde cero, usa "Reiniciar reto".`);
    } else if (res.ok) {
      mentorFeedback(true, false); // exploración válida: sin regaño y sin contar intento
    } else {
      if (!isReadonly(cmd)) setAttempts((a) => a + 1);
      mentorFeedback(false, false);
    }
    scrollDown();
    inputRef.current?.focus();
  };

  // historial con ↑ / ↓ como una terminal real
  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { submitCommand(); return; }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      if (history.length === 0) return;
      e.preventDefault();
      const next = e.key === 'ArrowUp'
        ? (histIdx === -1 ? history.length - 1 : Math.max(0, histIdx - 1))
        : (histIdx === -1 ? -1 : histIdx + 1);
      setHistIdx(next);
      setInput(next === -1 || next >= history.length ? '' : history[next]);
    }
  };

  const choose = (label: string, correct: boolean, feedback: string) => {
    setChoiceFeedback(feedback);
    setAttempts((a) => a + 1);
    pushLine(`elige: ${label}`, feedback, correct);
    if (correct) {
      // aplica el comando canónico en el simulador para visualizar el efecto
      const res = applyCommand(sim, challenge.solution);
      setSim(res.state);
      setSolved(true);
      onSolved(challenge, attempts + 1, hintsShown);
    } else {
      setMentorMsg('🧠 Mentor: no es incorrecto por azar — relee el feedback y piensa en el "por qué". ¡Intenta de nuevo!');
    }
  };

  const reset = () => {
    setSim(challenge.initial());
    setLines([]);
    setInput('');
    setHistory([]);
    setHistIdx(-1);
    setAttempts(0);
    setHintsShown(0);
    setShowSolution(false);
    setSolved(false);
    setChoiceFeedback(null);
    setMentorMsg(null);
  };

  return (
    <div className="rise space-y-4">
      {/* cabecera del reto */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${DIFF_STYLE[challenge.difficulty]}`}>
            {DIFF_EMOJI[challenge.difficulty]} {challenge.difficulty}
          </span>
          <span className="rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-0.5 font-mono text-xs text-zinc-300">{challenge.command}</span>
          <span className="text-xs text-zinc-500">Concepto: {challenge.concept}</span>
        </div>
        <h2 className="fluid-h2 font-bold text-white">{challenge.title}</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-zinc-300">📍 <b>Situación:</b> {challenge.situation}</p>
        <p className="mt-1 text-[15px] text-zinc-200">🎯 <b>Objetivo:</b> {challenge.objective}</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_1fr]">
        {/* terminal */}
        <div className="flex min-w-0 flex-col rounded-2xl border border-zinc-800 bg-[#0d1117]">
          <div className="flex items-center gap-1.5 border-b border-zinc-800/80 px-4 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
            <span className="ml-2 font-mono text-xs text-zinc-500">repo simulado — bash</span>
            <span className="ml-auto hidden font-mono text-[11px] text-zinc-600 sm:inline">↑↓ historial</span>
          </div>
          <div ref={boxRef} className="thin-scroll h-[52vh] min-h-[300px] overflow-y-auto p-4 font-mono text-[13px] leading-relaxed">
            {lines.length === 0 && (
              <div className="text-zinc-500">
                <div>Escribe un comando y observa el repositorio.</div>
                <div className="mt-1 text-zinc-600">Sugerencia: <span className="text-zinc-400">{challenge.command}</span></div>
              </div>
            )}
            {lines.map((l, i) => (
              <div key={i} className="mb-2.5">
                {l.cmd !== '✅' && <div className="text-zinc-200"><span className="select-none text-zinc-600">$ </span>{l.cmd}</div>}
                <pre className={`whitespace-pre-wrap ${l.ok ? 'text-zinc-400' : 'text-zinc-300'}`}>{!l.ok && <span className="text-red-400/80">✕ </span>}{l.out}</pre>
              </div>
            ))}
            {mentorMsg && <div className="mb-2 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-[12px] text-zinc-300">{mentorMsg}</div>}
            {choiceFeedback && <div className="mb-2 text-[12px] text-zinc-400">{choiceFeedback}</div>}
          </div>
          {challenge.kind === 'command' || challenge.kind === 'conflict' ? (
            <div className="flex items-center gap-2 border-t border-zinc-800/80 p-3">
              <span className="select-none font-mono text-sm text-zinc-600">$</span>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={`Prueba: ${challenge.command} …`}
                spellCheck={false}
                autoComplete="off"
                autoCapitalize="off"
                aria-label="Entrada de comando git"
                className="min-w-0 flex-1 bg-transparent font-mono text-sm text-zinc-100 caret-zinc-300 outline-none placeholder:text-zinc-600"
              />
              <button onClick={submitCommand} className="shrink-0 rounded-lg bg-zinc-100 px-3.5 py-1.5 text-sm font-semibold text-zinc-900 hover:bg-white">
                Ejecutar
              </button>
            </div>
          ) : (
            <div className="grid gap-2 border-t border-zinc-800 p-3">
              {challenge.choices?.map((c) => (
                <button
                  key={c.label}
                  onClick={() => choose(c.label, c.correct, c.feedback)}
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-left font-mono text-sm text-zinc-100 hover:border-zinc-400 hover:bg-zinc-800"
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* visual + pistas */}
        <div className="space-y-3">
          <GitVisual state={sim} />
          {/* pistas progresivas */}
          <div className="rounded-xl border border-zinc-700/70 bg-zinc-900/70 p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">💡 Pistas ({hintsShown}/3)</div>
            {challenge.hints.slice(0, hintsShown).map((h, i) => (
              <div key={i} className="pop mb-1.5 rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-[13px] text-amber-100">
                <b>Pista {i + 1}:</b> {h}
              </div>
            ))}
            {hintsShown < 3 ? (
              <button
                onClick={() => setHintsShown((h) => h + 1)}
                className="mt-1 rounded-lg border border-amber-700/50 px-3 py-1.5 text-[13px] text-amber-300 hover:bg-amber-500/10"
              >
                Pedir pista {hintsShown + 1} →
              </button>
            ) : !showSolution && !solved && (
              <button
                onClick={() => setShowSolution(true)}
                className="mt-1 rounded-lg border border-red-700/50 px-3 py-1.5 text-[13px] text-red-300 hover:bg-red-500/10"
              >
                Ver solución
              </button>
            )}
            {showSolution && (
              <div className="pop mt-2 rounded-lg bg-zinc-800 p-2.5 font-mono text-[13px] text-zinc-100">
                <span className="text-zinc-400">Solución: </span>{challenge.solution}
              </div>
            )}
            <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
              <span>Intentos: {attempts}</span>
              <button onClick={reset} className="underline hover:text-zinc-300">Reiniciar reto</button>
            </div>
          </div>
        </div>
      </div>

      {/* explicación post-resolución */}
      {solved && (
        <div ref={successRef} className="pop scroll-mt-24 rounded-2xl border border-zinc-700 bg-zinc-900 p-5">
          <div className="mb-1 text-lg font-bold text-white">Reto completado en {attempts} intento(s) {hintsShown > 0 && <span className="text-sm font-normal text-zinc-400">· {hintsShown} pista(s)</span>}</div>
          <div className="grid gap-3 text-sm leading-relaxed text-zinc-300 sm:grid-cols-2">
            <div><b className="text-white">Qué hizo:</b> {challenge.explanation.what}</div>
            <div><b className="text-white">Por qué funciona:</b> {challenge.explanation.why}</div>
            <div><b className="text-white">Ojo con:</b> {challenge.explanation.alt}</div>
            <div><b className="text-white">En tu trabajo:</b> {challenge.explanation.realUse}</div>
          </div>
          <button onClick={onNext} className="mt-4 rounded-xl bg-zinc-100 px-5 py-2.5 font-semibold text-zinc-900 hover:bg-white">
            {isLast ? 'Ver mi progreso →' : 'Siguiente reto →'}
          </button>
        </div>
      )}
    </div>
  );
}
