import type { SimState } from '../lib/types';

function statusBadge(status: string) {
  switch (status) {
    case 'untracked': return <span className="rounded bg-zinc-700/60 px-1.5 py-0.5 text-[11px] text-zinc-300">?? sin seguimiento</span>;
    case 'modified': return <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[11px] text-amber-300">✏️ modificado</span>;
    case 'staged-new': return <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[11px] text-emerald-300">A en staging</span>;
    case 'staged-mod': return <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[11px] text-emerald-300">M en staging</span>;
    case 'deleted': return <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[11px] text-red-300">D eliminado</span>;
    default: return <span className="rounded bg-zinc-700/40 px-1.5 py-0.5 text-[11px] text-zinc-400">✓ sin cambios</span>;
  }
}

/** Visualización del repo simulado: zonas + grafo de ramas + remoto */
export default function GitVisual({ state, compact = false }: { state: SimState; compact?: boolean }) {
  if (!state.initialized) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-600 bg-zinc-900/60 p-4 text-sm text-zinc-400">
        📁 Carpeta sin Git — todavía no es un repositorio.
        <div className="mt-1 font-mono text-xs text-zinc-500">sin .git · sin ramas · sin commits</div>
      </div>
    );
  }
  const working = state.files.filter((f) => f.status === 'modified' || f.status === 'untracked' || f.status === 'deleted' || f.status === 'clean');
  const staged = state.files.filter((f) => f.status === 'staged-new' || f.status === 'staged-mod');
  const maxGraph = Math.max(1, ...Object.values(state.graph));

  return (
    <div className="space-y-3">
      {/* zonas */}
      <div className={`grid gap-2 ${compact ? 'grid-cols-1' : 'sm:grid-cols-3'}`}>
        <div className="min-w-0 rounded-xl border border-zinc-800 bg-zinc-900 p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Working directory</div>
          <div className="space-y-1.5">
            {working.filter((f) => f.name !== '__conflict__').length === 0 && <div className="text-xs text-zinc-500">— vacío —</div>}
            {working.filter((f) => f.name !== '__conflict__').map((f) => (
              <div key={f.name} className="flex min-w-0 items-center justify-between gap-2 text-sm">
                <span className="truncate font-mono text-[13px] text-zinc-200">📄 {f.name}</span>
                <span className="shrink-0">{statusBadge(f.status)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="min-w-0 rounded-xl border border-zinc-800 bg-zinc-900 p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Staging area</div>
          <div className="space-y-1.5">
            {staged.length === 0 && <div className="text-xs text-zinc-500">— vacío —</div>}
            {staged.map((f) => (
              <div key={f.name} className="flex min-w-0 items-center justify-between gap-2 text-sm">
                <span className="truncate font-mono text-[13px] text-zinc-100">📄 {f.name}</span>
                <span className="shrink-0">{statusBadge(f.status)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
          <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-zinc-400">
            <span>Commits · HEAD → {state.head}</span>
          </div>
          <div className="space-y-1">
            {[...state.commits].reverse().slice(0, compact ? 3 : 5).map((c, i) => (
              <div key={c.id} className="flex min-w-0 items-center gap-2 text-[13px]">
                <span className={i === 0 ? 'text-zinc-100' : 'text-zinc-600'}>●</span>
                <span className="truncate text-zinc-200">{c.msg}</span>
                <span className="shrink-0 font-mono text-[11px] text-zinc-500">{c.branch}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* grafo de ramas */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Ramas</div>
        <div className="space-y-1.5">
          {state.branches.map((b) => (
            <div key={b} className="flex min-w-0 items-center gap-2">
              <span className={`shrink-0 font-mono text-[13px] ${b === state.head ? 'font-bold text-zinc-100' : 'text-zinc-400'}`}>
                {b === state.head ? '● ' : '○ '}{b}{b === state.head ? '  ← HEAD' : ''}
              </span>
              <div className="flex min-w-0 flex-1 items-center gap-1">
                {Array.from({ length: state.graph[b] ?? 1 }).map((_, i) => (
                  <span key={i} className={`inline-block h-2 w-6 shrink-0 rounded-full ${b === state.head ? 'bg-zinc-300' : 'bg-zinc-700'}`} />
                ))}
              </div>
              <span className="shrink-0 font-mono text-[11px] text-zinc-500">{state.graph[b] ?? 1}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-zinc-400">
          <span className="rounded bg-zinc-800 px-2 py-0.5">☁️ {state.remote ? `origin ✓${state.ahead > 0 ? ` · +${state.ahead} por subir` : ' · al día'}` : 'sin remoto'}</span>
          {state.stash.length > 0 && <span className="rounded bg-zinc-800 px-2 py-0.5">📦 stash: {state.stash.length}</span>}
          {state.behind > 0 && <span className="rounded bg-amber-900/60 px-2 py-0.5 text-amber-200">↓ {state.behind} por descargar</span>}
        </div>
      </div>

      {/* conflicto */}
      {state.conflict && (
        <div className="pop rounded-xl border border-red-700/60 bg-red-950/40 p-3">
          <div className="mb-1 text-sm font-semibold text-red-200">⚠️ Conflicto en {state.conflict.file}</div>
          <pre className="thin-scroll overflow-x-auto rounded bg-black/50 p-2 font-mono text-xs leading-relaxed text-zinc-200">{`<<<<<<< HEAD\n${state.conflict.headContent}\n=======\n${state.conflict.incomingContent}\n>>>>>>> ${state.conflict.incomingBranch}`}</pre>
        </div>
      )}
      {maxGraph === 0 && <span className="hidden" />}
    </div>
  );
}
