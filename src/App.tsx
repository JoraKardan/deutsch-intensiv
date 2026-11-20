import { useRoute } from './router'
import { useProgress } from './lib/store'
import { Dashboard } from './pages/Dashboard'
import { PlanPage } from './pages/PlanPage'
import { LessonPage } from './pages/LessonPage'
import { ReviewPage, dueCards } from './pages/ReviewPage'
import { GrammarPage } from './pages/GrammarPage'
import { SettingsPage } from './pages/SettingsPage'
import { t } from './lib/i18n'
import { lang, LANGS, setLang } from './lib/lang'

export function App() {
  const route = useRoute()
  const progress = useProgress()
  const due = dueCards(progress).length
  const [page, a, b] = route

  const nav = [
    { href: '#/', label: t.nav.home, active: !page },
    { href: '#/review', label: `${t.nav.review}${due ? ` (${due})` : ''}`, active: page === 'review' },
    { href: '#/plan', label: t.nav.plan, active: page === 'plan' || page === 'lesson' },
    { href: '#/grammar', label: t.nav.grammar, active: page === 'grammar' },
    { href: '#/settings', label: t.nav.progress, active: page === 'settings' },
  ]

  return (
    <>
      <header className="topbar">
        <a href="#/" className="brand">
          🇩🇪 Deutsch Intensiv
        </a>
        <nav>
          {nav.map((n) => (
            <a key={n.href} href={n.href} className={n.active ? 'active' : ''}>
              {n.label}
            </a>
          ))}
        </nav>
        <span className="lang-switch">
          {LANGS.map((l) => (
            <button key={l} className={l === lang ? 'active' : ''} onClick={() => setLang(l)} aria-pressed={l === lang}>
              {l.toUpperCase()}
            </button>
          ))}
        </span>
      </header>
      <main>
        {!page && <Dashboard />}
        {page === 'review' && <ReviewPage />}
        {page === 'plan' && <PlanPage />}
        {page === 'lesson' && a && <LessonPage key={a} id={a} section={b} />}
        {page === 'grammar' && <GrammarPage />}
        {page === 'settings' && <SettingsPage />}
      </main>
    </>
  )
}
