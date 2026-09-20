import { useEffect } from 'react'
import { HashRouter, Navigate, NavLink, Route, Routes } from 'react-router-dom'
import { supabaseConfigured } from './lib/supabase'
import { AuthPage } from './pages/AuthPage'
import { ChatPage } from './pages/ChatPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { ProgressPage } from './pages/ProgressPage'
import { SettingsPage } from './pages/SettingsPage'
import { TodayPage } from './pages/TodayPage'
import { useStore } from './store'

const tabs = [
  { to: '/', label: 'Chat', icon: '💬' },
  { to: '/hoje', label: 'Hoje', icon: '📊' },
  { to: '/progresso', label: 'Progresso', icon: '📈' },
  { to: '/config', label: 'Perfil', icon: '👤' },
]

function Shell() {
  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">FitIA</span>
        <small className="muted">seu coach por conversa</small>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<ChatPage />} />
          <Route path="/hoje" element={<TodayPage />} />
          <Route path="/progresso" element={<ProgressPage />} />
          <Route path="/config" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <nav className="tabbar tabbar-4">
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="icon">{t.icon}</span>
            {t.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export default function App() {
  const { session, profile, init } = useStore()
  useEffect(() => init(), [init])

  if (!supabaseConfigured) {
    return (
      <div className="center-screen">
        <div className="card">
          <h2>Configuração pendente</h2>
          <p className="muted">Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env e reinicie.</p>
        </div>
      </div>
    )
  }
  if (session === undefined || (session && profile === undefined)) return <div className="center-screen muted">Carregando…</div>
  if (!session) return <AuthPage />
  if (!profile?.goal) return <OnboardingPage />

  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  )
}
