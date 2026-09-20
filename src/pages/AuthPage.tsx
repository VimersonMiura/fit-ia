import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

export function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    const { error } =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })
    setBusy(false)
    if (error) setMsg(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message)
    else if (mode === 'signup') setMsg('Conta criada! Se pedir confirmação, verifique seu e-mail.')
  }

  return (
    <div className="center-screen">
      <div className="card auth-card">
        <h1 style={{ color: 'var(--accent)' }}>FitIA</h1>
        <p className="muted">Converse com a IA sobre seu dia. Ela registra treinos, refeições, água e suplementos e acompanha seu plano.</p>
        <form onSubmit={submit} className="stack">
          <label>
            E-mail
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </label>
          <label>
            Senha
            <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
          </label>
          {msg && <p className={msg.startsWith('Conta criada') ? 'ok' : 'error'}>{msg}</p>}
          <button className="btn-primary btn-block" disabled={busy}>
            {busy ? '…' : mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>
        <button className="btn-sm btn-link" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
          {mode === 'login' ? 'Não tem conta? Criar conta' : 'Já tem conta? Entrar'}
        </button>
      </div>
    </div>
  )
}
