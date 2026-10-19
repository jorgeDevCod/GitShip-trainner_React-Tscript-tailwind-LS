// ─── Tipos centrales de la app ─────────────────────────────────────────────

export type Difficulty = 'Básico' | 'Intermedio' | 'Avanzado' | 'Profesional';

export type ChallengeKind = 'command' | 'choice' | 'conflict';

export type FileStatus = 'untracked' | 'modified' | 'staged-new' | 'staged-mod' | 'clean' | 'deleted';

export interface SimFile {
  name: string;
  status: FileStatus;
  /** contenido simplificado para mostrar diffs */
  content?: string;
  stagedContent?: string;
}

export interface SimCommit {
  id: string;
  msg: string;
  branch: string;
}

export type Platform = 'github' | 'gitlab' | 'bitbucket' | null;

export interface SimState {
  initialized: boolean;
  branches: string[];
  head: string;
  files: SimFile[];
  commits: SimCommit[];
  /** commits por rama para el grafo */
  graph: Record<string, number>; // branch -> nº commits
  remote: boolean;
  remoteName?: string;
  remoteUrl?: string;
  platform?: Platform;
  /** si true, pushear directo a main es rechazado (flujo con PR/MR) */
  protectMain?: boolean;
  ahead: number; // commits locales no pusheados
  behind: number;
  stash: string[];
  conflict?: {
    file: string;
    headContent: string;
    incomingContent: string;
    incomingBranch: string;
  } | null;
  mergedBranches: string[];
}

export interface Explanation {
  what: string;
  why: string;
  alt: string;
  realUse: string;
}

export interface Challenge {
  id: string;
  moduleId: string;
  title: string;
  situation: string;
  objective: string;
  kind: ChallengeKind;
  difficulty: Difficulty;
  concept: string;
  command: string; // comando principal que enseña (ej. "git init")
  initial: () => SimState;
  /** comandos aceptados (normalizados, minúsculas, sin $) */
  accepted: string[];
  choices?: { label: string; correct: boolean; feedback: string }[];
  hints: [string, string, string];
  solution: string;
  explanation: Explanation;
  successCheck?: string; // texto que describe la condición de éxito en el lab
}

export interface MicroLesson {
  command: string;
  what: string;
  when: string;
  example: string;
}

export interface Module {
  id: string;
  title: string;
  short: string;
  desc: string;
  icon: string;
  lessons: MicroLesson[];
  locked?: boolean;
  comingSoon?: boolean;
}

export type MasteryLevel = 'Nuevo' | 'Practicando' | 'Familiar' | 'Dominado';

export interface AttemptRecord {
  attempts: number;
  hintsUsed: number;
  solved: boolean;
  bestAttempts: number;
}

export interface ProgressState {
  completed: Record<string, AttemptRecord>;
  conceptStats: Record<string, { correct: number; total: number }>;
  streakDays: number;
  lastVisit: string; // yyyy-mm-dd
  minutes: number;
  diagnosticDone: boolean;
  diagnosticLevel: string;
  startedAt: string;
}
