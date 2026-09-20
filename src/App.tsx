import { useEffect, lazy, Suspense } from 'react'
import { HashRouter, Routes, Route, NavLink } from 'react-router-dom'
import { MissionMap } from './app/MissionMap'
import { ModulePage } from './app/ModulePage'
import { ShipLogPage } from './app/ShipLog'
import { SettingsPage } from './app/SettingsPage'
import { useSettings, applySettings } from './store/settings'
import { useProgress } from './store/progress'
import { modules } from './content/registry'

const StyleReference = lazy(() => import('./design/StyleReference'))

function Shell() {
  const settings = useSettings()
  useEffect(() => applySettings(settings), [settings.textSize, settings.motion, settings.theme, settings.storyDensity]) // eslint-disable-line react-hooks/exhaustive-deps
  const completed = useProgress((s) => Object.keys(s.completed).length)
  return (
    <div className="dr-shell">
      <header className="dr-topbar">
        <NavLink to="/" className="dr-topbar__brand">
          <span className="dr-topbar__title">DEAD RECKONING</span>
          <span className="dr-topbar__sub">BOOK ONE</span>
        </NavLink>
        <nav className="dr-topbar__nav" aria-label="Primary">
          <NavLink to="/">MISSION MAP</NavLink>
          <NavLink to="/log">SHIP’S LOG</NavLink>
          <NavLink to="/settings">SETTINGS</NavLink>
          <NavLink to="/style" className="dr-topbar__nav-aux">STYLE</NavLink>
        </nav>
        <span className="dr-topbar__status" aria-label="Progress">
          {completed}/{modules.length} MODULES
        </span>
      </header>
      <main className="dr-main" id="main">
        <Routes>
          <Route path="/" element={<MissionMap />} />
          <Route path="/module/:id" element={<ModulePage />} />
          <Route path="/log" element={<ShipLogPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route
            path="/style"
            element={
              <Suspense fallback={<p className="dr-muted">Loading style reference…</p>}>
                <StyleReference />
              </Suspense>
            }
          />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  )
}
