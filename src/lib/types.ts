// Formatul datelor pentru programă și lecții.
// Documentat și în CLAUDE.md — păstrează-le sincronizate.

export type Phase = 'A1' | 'A2' | 'B1'

export interface CurriculumLesson {
  id: string // ex. "w01-1"
  title: string // titlu în germană
  titleRo: string
  focus: string // gramatica / abilitatea principală (în română)
}

export interface CurriculumWeek {
  week: number
  phase: Phase
  title: string
  titleRo: string
  lessons: CurriculumLesson[]
}

export interface Curriculum {
  weeks: CurriculumWeek[]
}

/** Text german + traducere. `id` = numele fișierului audio (public/audio/<lessonId>/<id>.m4a). */
export interface Phrase {
  id: string
  de: string
  ro: string
  note?: string // explicație scurtă în română
  /** traducerea mot-à-mot: câte o glosă pentru fiecare cuvânt din `de`, separate prin „ | ” */
  lit?: string
}

export interface Speaker {
  name: string
  voice: string // vocea Azure (ex. "de-DE-KatjaNeural") sau macOS (ex. "Anna (Premium)")
}

export interface DialogLine {
  id: string
  speaker: string // cheie din `speakers`
  de: string
  ro: string
  /** traducerea mot-à-mot (ca la Phrase) */
  lit?: string
}

export interface Dialog {
  title: string
  situation: string // descriere în română
  speakers: Record<string, Speaker>
  lines: DialogLine[]
}

export interface GrammarTable {
  caption?: string
  headers: string[]
  rows: string[][]
  /** audio pentru celule: "conjugation" (prima coloană = pronumele), "row" (rândul = o propoziție)
   *  sau indicii coloanelor în germană, ex. [0, 1]. Vezi src/lib/tableAudio.ts. */
  audio?: 'conjugation' | 'row' | number[]
}

export interface Grammar {
  title: string
  /** paragrafe în română; **text** = bold */
  explanation: string[]
  tables?: GrammarTable[]
  examples: { de: string; ro: string }[]
  tip?: string
}

export interface Pronunciation {
  title: string
  intro: string
  items: { id: string; sound: string; de: string; tip: string }[]
}

export type Exercise =
  | {
      type: 'mcq'
      id: string
      question: string
      audio?: string // id-ul unei replici/expresii de redat
      options: string[]
      answer: number
      explain?: string
    }
  | {
      type: 'dictation'
      id: string
      audio: string // id-ul replicii/expresiei
      text: string // textul corect
      ro?: string
    }
  | {
      type: 'order'
      id: string
      ro: string
      answer: string // propoziția corectă; cuvintele se amestecă automat
    }
  | {
      type: 'gap'
      id: string
      text: string // "Ich ___ Anna." — fiecare ___ e un gol
      answers: string[][] // pentru fiecare gol: variante acceptate
      ro?: string
      hint?: string
    }

export interface Speaking {
  scenario: string // în română, pentru elev
  claudeRole: string // ce rol joacă Claude (în română)
  tasks: string[] // ce trebuie să reușească elevul
  starter?: string // prima replică a lui Claude, în germană
}

export interface ExternalResource {
  title: string
  url: string
  note: string
}

export interface Lesson {
  id: string
  week: number
  day: number
  phase: Phase
  kind: 'lesson' | 'review'
  title: string
  titleRo: string
  goals: string[]
  intro: string
  pronunciation?: Pronunciation
  dialog: Dialog
  phrases: Phrase[]
  grammar: Grammar
  exercises: Exercise[]
  speaking: Speaking
  external?: ExternalResource[]
}

// ── Traduceri ────────────────────────────────────────────────────────────────
// Lecțiile de bază (content/lessons) au traducerile în română (`ro`, `titleRo` etc.).
// O altă limbă (ex. rusa) stă în content/<lang>/lessons/<id>.json și conține DOAR textele de
// tradus, legate de lecția de bază prin id-uri. La încărcare, src/lib/localize.ts le pune în
// câmpurile `ro`, `titleRo`… (care înseamnă deci „traducerea în limba elevului”).
// `null` într-un tabel sau într-o listă de opțiuni = celula / opțiunea rămâne ca în lecția de bază (germana).

export interface LessonTranslation {
  id: string
  titleTr: string
  goals: string[]
  intro: string
  pronunciation?: { title: string; intro: string; items: Record<string, { sound?: string; tip: string }> }
  dialog: { situation: string; lines: Record<string, { tr: string; lit?: string }> }
  phrases: Record<string, { tr: string; lit?: string; note?: string }>
  grammar: {
    title: string
    explanation: string[]
    tables?: { caption?: string; headers?: (string | null)[]; rows?: (string | null)[][] }[]
    /** traducerea fiecărui exemplu, în ordine */
    examples: string[]
    tip?: string
  }
  /** pe id-ul exercițiului: mcq → question / options / explain; gap → tr / hint / text; order, dictation → tr */
  exercises: Record<string, { question?: string; options?: (string | null)[]; explain?: string; tr?: string; hint?: string; text?: string }>
  speaking: { scenario: string; claudeRole: string; tasks: string[]; starter?: string }
  /** nota fiecărei resurse externe, în ordine */
  external?: string[]
}

export interface CurriculumTranslation {
  weeks: Record<string, { titleTr: string; lessons: Record<string, { titleTr: string; focus: string }> }>
}
