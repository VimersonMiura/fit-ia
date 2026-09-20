import { useCallback, useEffect, useRef, useState } from 'react'

interface RecognitionResultEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}
interface RecognitionErrorEvent extends Event {
  error: string
}
interface Recognition extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  start(): void
  stop(): void
  abort(): void
  onresult: ((e: RecognitionResultEvent) => void) | null
  onerror: ((e: RecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}
type RecognitionCtor = new () => Recognition

const getCtor = (): RecognitionCtor | null => {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export const speechSupported = typeof window !== 'undefined' && getCtor() !== null

const ERRORS: Record<string, string> = {
  'not-allowed': 'Permita o uso do microfone nas configurações do navegador.',
  'no-speech': 'Não ouvi nada. Tente falar de novo.',
  'audio-capture': 'Microfone não encontrado.',
  network: 'Sem conexão para reconhecer a voz.',
}

export function useSpeechInput(onFinal: (text: string) => void) {
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<string | null>(null)
  const rec = useRef<Recognition | null>(null)
  const finalRef = useRef('')
  const interimRef = useRef('')

  const stop = useCallback(() => {
    rec.current?.stop()
  }, [])

  const start = useCallback(() => {
    const Ctor = getCtor()
    if (!Ctor) return
    setError(null)
    finalRef.current = ''
    setInterim('')
    const r = new Ctor()
    r.lang = 'pt-BR'
    r.continuous = true
    r.interimResults = true
    r.onresult = (e) => {
      let interimText = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]
        if (res.isFinal) finalRef.current += res[0].transcript + ' '
        else interimText += res[0].transcript
      }
      interimRef.current = interimText
      setInterim(finalRef.current + interimText)
    }
    r.onerror = (e) => {
      if (e.error !== 'aborted') setError(ERRORS[e.error] ?? `Erro no microfone (${e.error})`)
    }
    r.onend = () => {
      setListening(false)
      const text = (finalRef.current + interimRef.current).trim()
      interimRef.current = ''
      setInterim('')
      if (text) onFinal(text)
    }
    rec.current = r
    r.start()
    setListening(true)
  }, [onFinal])

  useEffect(() => () => rec.current?.abort(), [])

  return { listening, interim, error, start, stop }
}

export const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

export function speak(text: string) {
  if (!ttsSupported) return
  window.speechSynthesis.cancel()
  const clean = text.replace(/[*#_`>]/g, '').replace(/[\p{Extended_Pictographic}]/gu, '')
  const u = new SpeechSynthesisUtterance(clean)
  u.lang = 'pt-BR'
  const voice = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith('pt-BR')) ?? null
  if (voice) u.voice = voice
  window.speechSynthesis.speak(u)
}

export function stopSpeaking() {
  if (ttsSupported) window.speechSynthesis.cancel()
}
