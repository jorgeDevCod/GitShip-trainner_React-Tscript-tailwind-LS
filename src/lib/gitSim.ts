import type { SimState } from './types';

// ─── Motor Git simulado en memoria ───────────────────────────────────────────
// Arquitectura limpia: toda la mutación pasa por applyCommand(state, input).
// Preparado para sustituirse por un motor real (isomorphic-git / API).

let commitCounter = 0;
export function resetCounter() { commitCounter = 100; }
function nextId() { commitCounter += 1; return `c${commitCounter}`; }

export function baseState(partial: Partial<SimState> = {}): SimState {
  return {
    initialized: true,
    branches: ['main'],
    head: 'main',
    files: [],
    commits: [{ id: 'c1', msg: 'Initial commit', branch: 'main' }],
    graph: { main: 1 },
    remote: false,
    platform: null,
    protectMain: false,
    ahead: 0,
    behind: 0,
    stash: [],
    conflict: null,
    mergedBranches: [],
    ...partial,
  };
}

export interface CmdResult {
  state: SimState;
  output: string;
  ok: boolean;
  mutated: boolean;
}

export function normalize(input: string): string {
  return input.trim().replace(/^\$\s*/, '').replace(/\s+/g, ' ').toLowerCase();
}

/** Detecta la plataforma por la URL del remoto (GitHub / GitLab / Bitbucket) */
export function detectPlatform(url: string): 'github' | 'gitlab' | 'bitbucket' {
  const u = url.toLowerCase();
  if (u.includes('gitlab')) return 'gitlab';
  if (u.includes('bitbucket') || u.includes('bb.')) return 'bitbucket';
  return 'github';
}

export const PLATFORM_LABEL: Record<string, string> = {
  github: 'GitHub',
  gitlab: 'GitLab',
  bitbucket: 'Bitbucket',
};

function platformOf(s: SimState): 'github' | 'gitlab' | 'bitbucket' {
  return (s.platform as 'github' | 'gitlab' | 'bitbucket' | null) ?? 'github';
}

/** Bloque de CI simulado que aparece tras un push, según la plataforma */
function ciBlock(s: SimState): string {
  const p = platformOf(s);
  if (p === 'gitlab') return `\n\n⚙️ GitLab CI/CD: pipeline #42 en marcha…\n   stages: install → build → test → deploy\n   ✓ passed en 1m 05s · la Merge Request muestra los checks en verde`;
  if (p === 'bitbucket') return `\n\n⚙️ Bitbucket Pipelines: build #18 en marcha…\n   ✓ build y tests en verde · listo para pedir review del PR`;
  return `\n\n⚙️ GitHub Actions: workflow "CI" en marcha…\n   ✓ build y tests en verde (1m 12s) · el PR muestra los checks aprobados`;
}

function clone(s: SimState): SimState {
  return JSON.parse(JSON.stringify(s)) as SimState;
}

function fileList(s: SimState): string {
  if (s.files.length === 0) return '(sin archivos)';
  return s.files
    .map((f) => {
      const tag =
        f.status === 'untracked' ? '?? sin seguimiento' :
        f.status === 'modified' ? ' M modificado (working dir)' :
        f.status === 'staged-new' ? 'A  nuevo en staging' :
        f.status === 'staged-mod' ? 'M  modificado en staging' :
        f.status === 'deleted' ? ' D eliminado' : '✓ sin cambios';
      return ` ${tag}  ${f.name}`;
    })
    .join('\n');
}

export function statusOutput(s: SimState): string {
  if (!s.initialized) return 'fatal: not a git repository (o algún directorio padre): .git';
  const staged = s.files.filter((f) => f.status === 'staged-new' || f.status === 'staged-mod');
  const unstaged = s.files.filter((f) => f.status === 'modified' || f.status === 'deleted');
  const untracked = s.files.filter((f) => f.status === 'untracked');
  let out = `En la rama ${s.head}\n`;
  if (s.remote) {
    if (s.ahead > 0) out += `Tu rama está adelantada a 'origin/${s.head}' por ${s.ahead} commit(s).\n`;
    else out += `Tu rama está actualizada con 'origin/${s.head}'.\n`;
  }
  if (staged.length === 0 && unstaged.length === 0 && untracked.length === 0) out += '\nnada para confirmar, el árbol de trabajo está limpio';
  if (staged.length > 0) out += `\nCambios preparados para confirmar:\n${staged.map((f) => `  nuevo archivo: ${f.name}`).join('\n')}`;
  if (unstaged.length > 0) out += `\n\nCambios no preparados:\n${unstaged.map((f) => `  modificado: ${f.name}`).join('\n')}`;
  if (untracked.length > 0) out += `\n\nArchivos sin seguimiento:\n${untracked.map((f) => `  ${f.name}`).join('\n')}\n\nnada agregado al commit pero hay archivos sin seguimiento`;
  return out;
}

function logOutput(s: SimState): string {
  if (!s.initialized) return 'fatal: not a git repository';
  const list = [...s.commits].reverse().slice(0, 6);
  return list.map((c, i) => `${i === 0 ? '* ' : '  '}commit ${c.id} (${c.branch})${i === 0 ? '  ← HEAD' : ''}\n    ${c.msg}`).join('\n\n');
}

export function applyCommand(prev: SimState, rawInput: string): CmdResult {
  const s = clone(prev);
  const input = normalize(rawInput);
  if (!input) return { state: prev, output: '', ok: false, mutated: false };
  const fail = (output: string): CmdResult => ({ state: prev, output, ok: false, mutated: false });
  const done = (output: string, mutated = true): CmdResult => ({ state: s, output, ok: true, mutated });

  // estado sin inicializar: solo git init / status permitido
  if (!s.initialized && !['git init', 'git status'].includes(input)) {
    return fail('fatal: not a git repository (o algún directorio padre): .git\nPista: este proyecto aún no tiene repositorio. ¿Con qué comando se empieza?');
  }

  // ── init ──
  if (input === 'git init') {
    if (s.initialized) return fail('Repositorio ya inicializado en .git/');
    s.initialized = true;
    return done('Inicializado repositorio Git vacío en .git/\nTip: ahora Git puede observar tus archivos. Prueba con `git status`.');
  }

  // ── status ──
  if (input === 'git status' || input === 'git status -s' || input === 'git status --short') {
    return { state: s, output: statusOutput(s), ok: true, mutated: false };
  }

  // ── add ──
  const addMatch = input.match(/^git add (.+)$/);
  if (addMatch) {
    const target = addMatch[1].trim();
    if (target === '.' || target === '-a' || target === '--all' || target === '*') {
      let n = 0;
      s.files.forEach((f) => {
        if (f.status === 'untracked') { f.status = 'staged-new'; n++; }
        else if (f.status === 'modified') { f.status = 'staged-mod'; n++; }
      });
      if (n === 0) return fail('nada que agregar: el árbol de trabajo está limpio.');
      return done(`Agregados ${n} archivo(s) al staging area. ✅\nUsa \`git status\` para comprobarlo.`);
    }
    const f = s.files.find((x) => x.name === target || x.name.endsWith(target));
    if (!f) return fail(`fatal: pathspec '${target}' no coincide con ningún archivo.\nRevisa el nombre con \`git status\`. Archivos:\n${fileList(s)}`);
    if (f.status === 'untracked') { f.status = 'staged-new'; return done(`nuevo archivo '${f.name}' agregado al staging. ✅`); }
    if (f.status === 'modified') { f.status = 'staged-mod'; return done(`cambios de '${f.name}' agregados al staging. ✅`); }
    return fail(`'${f.name}' no tiene cambios que agregar.`);
  }

  // ── commit ──
  const commitMatch = input.match(/^git commit(-m\s+.*|-am\s+.*|-a -m\s+.*)?$/);
  if (input === 'git commit' || commitMatch) {
    const m = input.match(/-m\s+["']?(.+?)["']?$/);
    const hasA = input.includes('-a');
    if (hasA) {
      s.files.forEach((f) => { if (f.status === 'modified') f.status = 'staged-mod'; });
    }
    const staged = s.files.filter((f) => f.status === 'staged-new' || f.status === 'staged-mod');
    if (staged.length === 0) return fail('nada para confirmar: no hay cambios en staging.\nUsa `git add` primero (o `git commit -am` para archivos ya rastreados).');
    const msg = m ? m[1] : 'Merge branch / actualización confirmada';
    if (!m && input !== 'git commit') return fail('Por favor incluye un mensaje: `git commit -m "tu mensaje"`.\nUn buen mensaje describe QUÉ y POR QUÉ.');
    const id = nextId();
    s.commits.push({ id, msg, branch: s.head });
    s.graph[s.head] = (s.graph[s.head] ?? 0) + 1;
    s.files.forEach((f) => { if (f.status.startsWith('staged')) f.status = 'clean'; });
    s.ahead += 1;
    return done(`[${s.head} ${id}] ${msg}\n ${staged.length} archivo(s) cambiados. Commit creado ✅`);
  }

  // ── log ──
  if (input.startsWith('git log')) {
    return { state: s, output: logOutput(s), ok: true, mutated: false };
  }

  // ── show ──
  if (input.startsWith('git show')) {
    const last = s.commits[s.commits.length - 1];
    return { state: s, output: `commit ${last.id} (${last.branch})\n    ${last.msg}\n\n diff --git\n + cambios confirmados en este snapshot`, ok: true, mutated: false };
  }

  // ── diff ──
  if (input === 'git diff' || input === 'git diff --staged' || input === 'git diff --cached' || input.startsWith('git diff ')) {
    if (input.includes('--staged') || input.includes('--cached')) {
      const staged = s.files.filter((f) => f.status.startsWith('staged'));
      if (staged.length === 0) return { state: s, output: '(staging vacío: nada que comparar)', ok: true, mutated: false };
      return { state: s, output: staged.map((f) => `diff --git a/${f.name} b/${f.name}\n+ ${f.stagedContent ?? '(cambios preparados)'}`).join('\n'), ok: true, mutated: false };
    }
    const mod = s.files.filter((f) => f.status === 'modified' || f.status === 'untracked');
    if (mod.length === 0) return { state: s, output: '(sin diferencias en working directory)', ok: true, mutated: false };
    return { state: s, output: mod.map((f) => `diff --git a/${f.name} b/${f.name}\n- línea original\n+ ${f.content ?? 'línea modificada'}`).join('\n'), ok: true, mutated: false };
  }

  // ── branch ──
  if (input === 'git branch') {
    return { state: s, output: s.branches.map((b) => `${b === s.head ? '* ' : '  '}${b}`).join('\n'), ok: true, mutated: false };
  }
  const branchCreate = input.match(/^git branch ([a-z0-9/_-]+)$/);
  if (branchCreate) {
    const name = branchCreate[1];
    if (s.branches.includes(name)) return fail(`fatal: la rama '${name}' ya existe.`);
    s.branches.push(name);
    s.graph[name] = s.graph[s.head] ?? 1;
    return done(`Rama '${name}' creada desde '${s.head}'. 🌱\nUsa \`git switch ${name}\` para moverte a ella.`);
  }
  const branchDel = input.match(/^git branch -d ([a-z0-9/_-]+)$/);
  if (branchDel) {
    const name = branchDel[1];
    if (name === s.head) return fail(`error: no puedes eliminar la rama en la que estás ('${name}').\nCambia a otra rama primero.`);
    if (!s.branches.includes(name)) return fail(`error: la rama '${name}' no existe.`);
    if (!s.mergedBranches.includes(name)) return fail(`error: la rama '${name}' no está fusionada.\nSi estás seguro, usa -D (mayúscula). Pero piénsalo: ¿ya integraste su trabajo?`);
    s.branches = s.branches.filter((b) => b !== name);
    return done(`Rama '${name}' eliminada. 🧹`);
  }

  // ── switch / checkout ──
  const switchMatch = input.match(/^git (switch|checkout) ([a-z0-9/_-]+)$/);
  if (switchMatch) {
    const name = switchMatch[2];
    if (!s.branches.includes(name)) return fail(`error: pathspec '${name}' no coincide con ninguna rama conocida.\nCréala con \`git branch ${name}\` o lista ramas con \`git branch\`.`);
    const dirty = s.files.some((f) => f.status === 'modified' || f.status === 'untracked');
    if (dirty && s.stash.length === 0) {
      // permitimos el cambio pero avisamos (versión didáctica)
      s.head = name;
      return done(`Cambiado a la rama '${name}'. ⚠️ Trajiste cambios sin confirmar; en la vida real considera \`git stash\` o un commit.`);
    }
    s.head = name;
    return done(`Cambiado a la rama '${name}'. ✅`);
  }
  const switchCreate = input.match(/^git (switch -c|checkout -b) ([a-z0-9/_-]+)$/);
  if (switchCreate) {
    const name = switchCreate[2];
    if (s.branches.includes(name)) return fail(`fatal: la rama '${name}' ya existe.`);
    s.branches.push(name);
    s.graph[name] = s.graph[s.head] ?? 1;
    s.head = name;
    return done(`Creada y cambiada a la rama '${name}'. 🌱✅`);
  }

  // ── merge ──
  const mergeMatch = input.match(/^git merge ([a-z0-9/_-]+)$/);
  if (mergeMatch) {
    const name = mergeMatch[1];
    if (!s.branches.includes(name)) return fail(`merge: la rama '${name}' no existe.`);
    if (name === s.head) return fail('Ya estás en esa rama: no hay nada que fusionar.');
    if (s.conflict) return fail('Ya hay un conflicto sin resolver. Edita el archivo, haz `git add` y `git commit`.');
    // si el reto define conflicto, lo disparamos
    if (s.files.some((f) => f.name === '__conflict__')) {
      s.files = s.files.filter((f) => f.name !== '__conflict__');
      s.conflict = {
        file: 'styles.css',
        headContent: 'color: blue;',
        incomingContent: 'color: green;',
        incomingBranch: name,
      };
      return { state: s, output: `Auto-fusión styles.css\nCONFLICTO (contenido): conflicto de fusión en styles.css\nfusión automática falló; arregla los conflictos y confirma el resultado. ⚠️`, ok: true, mutated: true };
    }
    s.mergedBranches.push(name);
    const id = nextId();
    s.commits.push({ id, msg: `Merge branch '${name}' into ${s.head}`, branch: s.head });
    s.graph[s.head] = (s.graph[s.head] ?? 0) + 1;
    s.ahead += 1;
    return done(`Fusión de '${name}' en '${s.head}' completada. 🎉 (merge commit ${id})`);
  }

  // ── resolver conflicto vía add + commit ──
  if (s.conflict && (input.startsWith('git add ') || input === 'git add .')) {
    const f = s.files.find((x) => x.name === s.conflict!.file);
    if (f) { f.status = 'staged-mod'; }
    else s.files.push({ name: s.conflict.file, status: 'staged-mod' });
    (s as SimState).conflict = null;
    s.mergedBranches.push('feature');
    return done(`Conflicto marcado como resuelto. ✅\nAhora completa el merge con \`git commit\`.`);
  }

  // ── restore ──
  const restoreStaged = input.match(/^git restore --staged (.+)$/);
  if (restoreStaged) {
    const target = restoreStaged[1].trim();
    const all = target === '.' || target === ':';
    const targets = all ? s.files.filter((f) => f.status.startsWith('staged')) : s.files.filter((f) => f.name === target || f.name.endsWith(target));
    if (targets.length === 0) return fail('No hay archivos en staging que coincidan. Revisa con `git status`.');
    targets.forEach((f) => { f.status = f.status === 'staged-new' ? 'untracked' : 'modified'; });
    return done(`Sacado(s) del staging sin perder cambios: ${targets.map((f) => f.name).join(', ')} ✅\nLos cambios siguen en tu working directory.`);
  }
  const restoreFile = input.match(/^git restore ([a-z0-9_./-]+)$/);
  if (restoreFile) {
    const target = restoreFile[1];
    const f = s.files.find((x) => x.name === target || x.name.endsWith(target));
    if (!f) return fail(`pathspec '${target}' no coincide con ningún archivo modificado.`);
    if (f.status !== 'modified' && f.status !== 'deleted') return fail(`'${f.name}' no tiene cambios descartables en working directory.`);
    f.status = 'clean';
    return done(`Descartados los cambios de '${f.name}'. El archivo volvió a su último commit. ♻️`);
  }

  // ── reset ──
  if (input.match(/^git reset( --soft|--mixed|--hard)?( head~1| head\^)?$/)) {
    if (s.commits.length <= 1) return fail('No hay commits que deshacer (solo queda el inicial).');
    const hard = input.includes('--hard');
    const soft = input.includes('--soft');
    s.commits.pop();
    s.graph[s.head] = Math.max(1, (s.graph[s.head] ?? 1) - 1);
    s.ahead = Math.max(0, s.ahead - 1);
    if (hard) { s.files.forEach((f) => { if (f.status !== 'untracked') f.status = 'clean'; }); return done('HEAD movido atrás y cambios descartados (--hard). ⚠️ Peligroso si ya compartiste el commit.'); }
    if (soft) return done('HEAD movido atrás, cambios conservados en staging (--soft).');
    s.files.forEach((f) => { if (f.status.startsWith('staged')) f.status = 'modified'; });
    return done('HEAD movido atrás; los cambios quedaron en working directory (modo --mixed). ↩️');
  }

  // ── revert ──
  if (input.match(/^git revert (head|c[0-9]+)$/)) {
    const id = nextId();
    s.commits.push({ id, msg: 'Revert "commit anterior"', branch: s.head });
    s.graph[s.head] = (s.graph[s.head] ?? 0) + 1;
    s.ahead += 1;
    return done(`Commit ${id} creado para revertir el cambio anterior. ↩️✅\n(El historial se conserva: seguro para ramas compartidas.)`);
  }

  // ── stash ──
  if (input === 'git stash' || input === 'git stash push' || input === 'git stash push -m wip') {
    const dirty = s.files.filter((f) => f.status === 'modified' || f.status === 'untracked');
    if (dirty.length === 0) return fail('No hay cambios locales que guardar.');
    s.stash.push(`WIP en ${s.head}: ${dirty.map((f) => f.name).join(', ')}`);
    dirty.forEach((f) => { if (f.status === 'modified') f.status = 'clean'; });
    return done(`Cambios guardados en el stash. 📦\nAhora puedes cambiar de rama con la mesa limpia. Recupéralos con \`git stash pop\`.`);
  }
  if (input === 'git stash pop' || input === 'git stash apply') {
    if (s.stash.length === 0) return fail('El stash está vacío.');
    const top = s.stash.pop()!;
    s.files.push({ name: 'cambios-recuperados.js', status: 'modified', content: 'cambios del stash' });
    return done(`Recuperado: ${top} ✅`);
  }

  // ── remote / clone / push / pull / fetch ──
  if (input.startsWith('git remote')) {
    if (!s.remote) return { state: s, output: '(sin remotos configurados)', ok: true, mutated: false };
    const url = s.remoteUrl ?? `git@${platformOf(s)}.com:tu-usuario/mi-proyecto.git`;
    return { state: s, output: `${s.remoteName ?? 'origin'}\t${url} (fetch)\n${s.remoteName ?? 'origin'}\t${url} (push)`, ok: true, mutated: false };
  }
  const remoteAdd = input.match(/^git remote add origin (.+)$/);
  if (remoteAdd) {
    s.remote = true; s.remoteName = 'origin';
    s.remoteUrl = remoteAdd[1];
    s.platform = detectPlatform(remoteAdd[1]);
    return done(`Remoto 'origin' → ${remoteAdd[1]} configurado en ${PLATFORM_LABEL[s.platform]}. 🔗\nAhora puedes usar \`git push -u origin ${s.head}\`.`);
  }
  if (input.match(/^git clone .+$/)) {
    const url = input.replace(/^git clone\s+/, '').trim();
    s.initialized = true; s.remote = true; s.remoteName = 'origin';
    s.remoteUrl = url; s.platform = detectPlatform(url);
    if (s.commits.length === 0) s.commits = [{ id: 'c1', msg: 'Initial commit', branch: 'main' }];
    return done(`Clonado el repositorio desde ${PLATFORM_LABEL[s.platform]} en ./mi-proyecto. 📥\nYa tienes historial, ramas y remoto 'origin' configurado.`);
  }
  // push de tags → releases
  if (input.match(/^git push( origin)? --tags$/)) {
    if (!s.remote) return fail("fatal: no hay remoto configurado.");
    return done(`Tags subidos a ${PLATFORM_LABEL[platformOf(s)]}. 🏷️\nDesde el tag ya puedes crear la Release (notas + binarios) en la plataforma.`);
  }
  if (input.match(/^git push( -u origin .+| origin .+)?$/)) {
    if (!s.remote) return fail("fatal: 'origin' no parece un repositorio git.\nPrimero conecta el remoto: `git remote add origin <url>`.");
    if (s.protectMain && s.head === 'main' && s.ahead > 0) {
      return fail(`remote: error: GH006: la rama 'main' está protegida.\nNo puedes pushear directo: crea una rama, sube tu trabajo y abre un Pull/Merge Request.\nPrueba: \`git switch -c fix/mi-cambio\``);
    }
    if (s.ahead === 0) return done('Todo actualizado. Nada que subir.');
    const n = s.ahead; s.ahead = 0;
    return done(`Subidos ${n} commit(s) a origin/${s.head} en ${PLATFORM_LABEL[platformOf(s)]}. 🚀${ciBlock(s)}`);
  }
  if (input === 'git pull' || input.match(/^git pull origin .+$/)) {
    if (!s.remote) return fail("fatal: no hay remoto configurado.");
    if (s.behind > 0) { const n = s.behind; s.behind = 0; const id = nextId(); s.commits.push({ id, msg: 'Actualizar desde remoto', branch: s.head }); return done(`Actualizado: descargados y fusionados ${n} commit(s) del remoto. 📥✅`); }
    return done('Ya estás actualizado con el remoto. ✅');
  }
  if (input === 'git fetch' || input === 'git fetch origin') {
    if (!s.remote) return fail("fatal: no hay remoto configurado.");
    return { state: s, output: 'Descargadas las referencias del remoto (sin fusionar).\nUsa `git log origin/main` o `git pull` para integrarlas. 🔍', ok: true, mutated: false };
  }

  // ── rebase / cherry-pick / tag / reflog (simulados, didácticos) ──
  if (input.match(/^git rebase .+$/)) {
    return done('Rebase simulado: tus commits se reaplicaron sobre la punta de la rama base.\nHistorial lineal ✨ (Evita rebase en ramas compartidas).');
  }
  if (input.match(/^git cherry-pick .+$/)) {
    const id = nextId();
    s.commits.push({ id, msg: 'cherry-pick aplicado', branch: s.head });
    s.graph[s.head] = (s.graph[s.head] ?? 0) + 1;
    return done(`Commit cherry-pickeado como ${id} en '${s.head}'. 🍒`);
  }
  if (input === 'git tag' || input === 'git tag -l') {
    return { state: s, output: 'v1.0.0\nv1.1.0 🏷️', ok: true, mutated: false };
  }
  const tagCreate = input.match(/^git tag (v?[0-9]+\.[0-9]+\.[0-9]+[a-z0-9.-]*|[a-z0-9._-]+)$/);
  if (tagCreate) {
    return done(`Tag '${tagCreate[1]}' creado apuntando a HEAD. 🏷️\nLos tags marcan releases (v1.2.0 = versión). Súbelo con \`git push --tags\`.`);
  }
  if (input === 'git reflog') {
    return { state: s, output: s.commits.map((c) => `${c.id} HEAD@{n}: ${c.msg}`).reverse().join('\n'), ok: true, mutated: false };
  }

  // ── ayuda genérica ──
  const known = ['init', 'status', 'add', 'commit', 'log', 'diff', 'show', 'branch', 'switch', 'checkout', 'merge', 'restore', 'reset', 'revert', 'stash', 'remote', 'clone', 'push', 'pull', 'fetch', 'rebase', 'cherry-pick', 'tag', 'reflog'];
  const verb = input.replace(/^git\s*/, '').split(' ')[0];
  if (!input.startsWith('git ')) return fail(`'${rawInput.trim()}' no es un comando git. Prueba \`git status\` para empezar.`);
  if (!known.includes(verb)) return fail(`git: '${verb}' no es un comando git válido en este simulador.\nComandos soportados: ${known.join(', ')}`);
  return fail(`El comando está incompleto o mal formado. Revisa la sintaxis de \`git ${verb}\` (usa --help en tu terminal real).`);
}

/** Comprueba si el input del usuario coincide con alguna respuesta aceptada del reto */
export function matchesAccepted(input: string, accepted: string[]): boolean {
  const n = normalize(input);
  return accepted.some((a) => {
    const an = normalize(a);
    if (an.endsWith('*')) return n.startsWith(an.slice(0, -1));
    // permite comillas simples/dobles indistintamente
    const canon = (x: string) => x.replace(/["']/g, '');
    return canon(n) === canon(an);
  });
}
