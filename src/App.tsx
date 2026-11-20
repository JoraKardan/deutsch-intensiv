import { settingsHref, useRoute } from './router'
import { Dashboard } from './pages/Dashboard'
import { PlanPage } from './pages/PlanPage'
import { LessonPage } from './pages/LessonPage'
import { ReviewPage } from './pages/ReviewPage'
import { GrammarPage } from './pages/GrammarPage'
import { SettingsPage } from './pages/SettingsPage'
import { EssentialsPage } from './pages/EssentialsPage'
import { t } from './lib/i18n'
import { BookIcon, FlagDE, GearIcon, HomeIcon, ListIcon, StarIcon } from './components/Icons'

export function App() {
  const route = useRoute()
  const [page, a, b] = route
  const inLesson = page === 'lesson' && a

  const nav = [
    { href: '#/', label: t.nav.home, Icon: HomeIcon, active: !page },
    { href: '#/plan', label: t.nav.plan, Icon: ListIcon, active: page === 'plan' },
    { href: '#/grammar', label: t.nav.grammar, Icon: BookIcon, active: page === 'grammar' },
    { href: '#/essentials', label: t.nav.essentials, Icon: StarIcon, active: page === 'essentials' },
  ]

  // În lecție, antetul și bara de jos sunt ale lecției (LessonPage).
  if (inLesson) return <LessonPage key={a} id={a} section={b} />

  return (
    <>
      <header className="topbar">
        <a href="#/" className="brand">
          <FlagDE size={24} />
          <span>Deutsch Intensiv</span>
        </a>
        <a href={settingsHref()} className={`square-btn ${page === 'settings' ? 'active' : ''}`} aria-label={t.nav.settings} title={t.nav.settings}>
          <GearIcon size={22} />
        </a>
      </header>
      <main className="with-nav">
        {!page && <Dashboard />}
        {page === 'review' && <ReviewPage />}
        {page === 'plan' && <PlanPage />}
        {page === 'grammar' && <GrammarPage />}
        {page === 'essentials' && <EssentialsPage />}
        {page === 'settings' && <SettingsPage />}
      </main>
      <nav className="bottom-nav" aria-label={t.nav.label}>
        {nav.map(({ href, label, Icon, active }) => (
          <a key={href} href={href} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined}>
            <Icon size={24} />
            <span>{label}</span>
          </a>
        ))}
      </nav>
    </>
  )
}
