import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { todayISO } from '../lib/nutrition'
import { speak, speechSupported, stopSpeaking, ttsSupported, useSpeechInput } from '../lib/speech'
import { useStore } from '../store'
import { KIND_ICONS } from '../types'

const SUGGESTIONS = [
  'Café da manhã: 3 ovos mexidos, 2 fatias de pão integral e café sem açúcar',
  'Treinei jiu jitsu 1h30 e bebi 1 litro de água',
  'Tomei whey 30g e creatina 5g',
  'Pesei 82,4 kg hoje',
  'Como foi meu dia até agora?',
]

const VOICE_KEY = 'fitia.voiceReply'

export function ChatPage() {
  const { messages, loadMessages, sendMessage, profile } = useStore()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [lastSaved, setLastSaved] = useState<string[]>([])
  const [voiceReply, setVoiceReply] = useState(() => localStorage.getItem(VOICE_KEY) !== '0')
  const bottom = useRef<HTMLDivElement>(null)
  const busyRef = useRef(false)

  useEffect(() => {
    void loadMessages()
  }, [loadMessages])

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, busy])

  useEffect(() => () => stopSpeaking(), [])

  const send = useCallback(
    async (content: string, spoken = false) => {
      if (!content.trim() || busyRef.current) return
      setText('')
      setErr(null)
      setBusy(true)
      busyRef.current = true
      try {
        const res = await sendMessage(content.trim(), todayISO())
        setLastSaved(res.entries.map((e) => `${KIND_ICONS[e.kind]} ${e.title}`))
        if (spoken && voiceReply) speak(res.reply)
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Falha ao enviar')
      } finally {
        setBusy(false)
        busyRef.current = false
      }
    },
    [sendMessage, voiceReply],
  )

  const onSpeech = useCallback((t: string) => void send(t, true), [send])
  const mic = useSpeechInput(onSpeech)

  const toggleVoiceReply = () => {
    const v = !voiceReply
    setVoiceReply(v)
    localStorage.setItem(VOICE_KEY, v ? '1' : '0')
    if (!v) stopSpeaking()
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    void send(text)
  }

  const micError = mic.error

  return (
    <div className="chat">
      <div className="chat-log">
        {messages.length === 0 && (
          <div className="card">
            <h2>Olá{profile?.name ? `, ${profile.name}` : ''}! 👋</h2>
            <p className="muted">
              Toque no microfone e fale o que você comeu, bebeu, treinou ou tomou hoje — ou digite. Eu registro tudo e calculo calorias, proteínas,
              carboidratos e água. À noite peça o feedback do dia na aba "Hoje".
            </p>
            <div className="chips" style={{ marginTop: 8 }}>
              {SUGGESTIONS.map((s) => (
                <button key={s} className="chip" onClick={() => void send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`bubble ${m.role}`}>
            {m.content}
          </div>
        ))}
        {mic.listening && <div className="bubble user listening">{mic.interim || 'Ouvindo… fale agora'}</div>}
        {busy && <div className="bubble assistant muted">Analisando…</div>}
        {!busy && lastSaved.length > 0 && <div className="saved-note">Registrado: {lastSaved.join(' · ')}</div>}
        {(err || micError) && <p className="error">{err ?? micError}</p>}
        <div ref={bottom} />
      </div>
      <form className="chat-input" onSubmit={submit}>
        {ttsSupported && (
          <button
            type="button"
            className={`btn-icon round ${voiceReply ? 'on' : ''}`}
            onClick={toggleVoiceReply}
            title={voiceReply ? 'Resposta por voz ligada' : 'Resposta por voz desligada'}
            aria-label="Alternar resposta por voz"
          >
            {voiceReply ? '🔊' : '🔇'}
          </button>
        )}
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={mic.listening ? 'Ouvindo…' : 'Fale ou digite…'}
          disabled={busy || mic.listening}
          enterKeyHint="send"
        />
        {text.trim() ? (
          <button className="btn-primary round" disabled={busy} aria-label="Enviar">
            ➤
          </button>
        ) : speechSupported ? (
          <button
            type="button"
            className={`btn-primary round mic ${mic.listening ? 'listening' : ''}`}
            onClick={() => (mic.listening ? mic.stop() : (stopSpeaking(), mic.start()))}
            disabled={busy}
            aria-label={mic.listening ? 'Parar e enviar' : 'Falar'}
          >
            {mic.listening ? '■' : '🎤'}
          </button>
        ) : (
          <button className="btn-primary round" disabled aria-label="Enviar">
            ➤
          </button>
        )}
      </form>
      {mic.listening && <p className="mic-hint">Toque em ■ quando terminar de falar para enviar</p>}
    </div>
  )
}
