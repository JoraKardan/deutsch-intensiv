// Pagina „Esențiale”: frazele și cuvintele cele mai folosite (content/essentials.json).
// Audio: public/audio/essentials/<id>.m4a (npm run audio -- essentials).
import data from '../../content/essentials.json'
import { lang } from './lang'

export interface EssentialItem {
  id: string
  de: string
  tr: string
  /** încă neînvățat în lecții (vine mai târziu în curs) */
  later: boolean
}
export interface EssentialSection {
  title: string
  note?: string
  items: EssentialItem[]
}

type Raw = {
  sections: {
    title: Record<string, string>
    note?: Record<string, string>
    items: { id: string; de: string; ro: string; ru: string; later?: boolean }[]
  }[]
}

export const ESSENTIALS_ID = 'essentials'

export const essentials: EssentialSection[] = (data as Raw).sections.map((s) => ({
  title: s.title[lang] ?? s.title.ro,
  note: s.note?.[lang] ?? s.note?.ro,
  items: s.items.map((x) => ({ id: x.id, de: x.de, tr: lang === 'ru' ? x.ru : x.ro, later: Boolean(x.later) })),
}))
