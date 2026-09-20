import { useEffect, useRef, useState, type FormEvent } from 'react'
import { todayISO } from '../lib/nutrition'
import { useStore } from '../store'
import { KIND_ICONS } from '../types'

const SUGGESTIONS = [
  'Café da manhã: 3 ovos mexidos, 2 fatias de pão integral e café sem açúcar',
  'Treinei jiu jitsu 1h30 e bebi 1 litro de água',
  'Tomei whey 30g e creatina 5g',
  'Pesei 82,4 kg hoje',
  'Como foi meu dia até agora?',
]

export function ChatPage() {
  const { messages, loadMessages, sendMessage, profile } = useStore()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [lastSaved, setLastSaved] = useState<string[]>([])
  const bottom = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void loadMessages()
  }, [loadMessages])

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, busy])

  const send = async (content: string) => {
    if (!content.trim() || busy) return
    setText('')
    setErr(null)
    setBusy(true)
    try {
      const res = await sendMessage(content.trim(), todayISO())
      setLastSaved(res.entries.map((e) => `${KIND_ICONS[e.kind]} ${e.title}`))
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao enviar')
    } finally {
      setBusy(false)
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    void send(text)
  }

  return (
    <div className="chat">
      <div className="chat-log">
        {messages.length === 0 && (
          <div className="card">
            <h2>Olá{profile?.name ? `, ${profile.name}` : ''}! 👋</h2>
            <p className="muted">Me conte o que você comeu, bebeu, treinou ou tomou hoje. Eu registro tudo e calculo calorias, proteínas, carboidratos e água. À noite peça o feedback do dia na aba "Hoje".</p>
            <div className="chips" style={{ marginTop: 8 }}>
              {SUGGESTIONS.map((s) => (
                <button key={s} className="chip" onClick={() => void send(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`bubble ${m.role}`}>{m.content}</div>
        ))}
        {busy && <div className="bubble assistant muted">Analisando…</div>}
        {!busy && lastSaved.length > 0 && (
          <div className="saved-note">Registrado: {lastSaved.join(' · ')}</div>
        )}
        {err && <p className="error">{err}</p>}
        <div ref={bottom} />
      </div>
      <form className="chat-input" onSubmit={submit}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ex.: almocei 150g de frango, arroz e salada"
          disabled={busy}
        />
        <button className="btn-primary" disabled={busy || !text.trim()}>Enviar</button>
      </form>
    </div>
  )
}
