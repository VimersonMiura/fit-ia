import { useState } from 'react'
import { useStore } from '../store'
import { ProfileForm } from './OnboardingPage'

export function SettingsPage() {
  const { profile, session, signOut } = useStore()
  const [saved, setSaved] = useState(false)

  return (
    <div className="stack">
      <div className="card row between">
        <div>
          <strong>{profile?.name ?? 'Seu perfil'}</strong>
          <br />
          <small className="muted">{session?.user.email}</small>
        </div>
        <button className="btn-sm" onClick={() => void signOut()}>Sair</button>
      </div>
      {saved && <p className="ok">Perfil e metas atualizados.</p>}
      <ProfileForm existing={profile} onDone={() => { setSaved(true); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />
      <small className="muted" style={{ textAlign: 'center' }}>Ao salvar, as metas diárias são recalculadas com seus dados atuais.</small>
    </div>
  )
}
