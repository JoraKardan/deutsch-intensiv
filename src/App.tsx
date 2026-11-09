import { useRoute } from './router'
import { useProgress } from './lib/store'
import { Dashboard } from './pages/Dashboard'
import { PlanPage } from './pages/PlanPage'
import { LessonPage } from './pages/LessonPage'
import { ReviewPage, dueCards } from './pages/ReviewPage'
import { GrammarPage } from './pages/GrammarPage'
import { SettingsPage } from './pages/SettingsPage'

export function App() {
  const route = useRoute()
  const progress = useProgress()
  const due = dueCards(progress.cards).length
  const [page, a, b] = route

  const nav = [
    { href: '#/', label: 'Acasă', active: !page },
    { href: '#/review', label: `Repetiție${due ? ` (${due})` : ''}`, active: page === 'review' },
    { href: '#/plan', label: 'Plan', active: page === 'plan' || page === 'lesson' },
    { href: '#/grammar', label: 'Gramatică', active: page === 'grammar' },
    { href: '#/settings', label: 'Progres', active: page === 'settings' },
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
