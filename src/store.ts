import type { Session } from '@supabase/supabase-js'
import { create } from 'zustand'
import { supabase } from './lib/supabase'
import type { DailyFeedback, Entry, Message, Profile } from './types'

interface State {
  session: Session | null | undefined
  profile: Profile | null | undefined
  entries: Entry[]
  messages: Message[]
  feedback: Record<string, DailyFeedback>
  init: () => void
  loadProfile: () => Promise<void>
  saveProfile: (p: Partial<Profile>) => Promise<void>
  loadEntries: (from: string, to: string) => Promise<void>
  deleteEntry: (id: string) => Promise<void>
  loadMessages: () => Promise<void>
  sendMessage: (content: string, date: string) => Promise<{ reply: string; entries: Entry[] }>
  loadFeedback: (date: string) => Promise<void>
  generateFeedback: (date: string) => Promise<DailyFeedback>
  signOut: () => Promise<void>
}

const fnUrl = (name: string) => `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`

async function callFn<T>(name: string, body: unknown): Promise<T> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Sessão expirada. Entre novamente.')
  const res = await fetch(fnUrl(name), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
    },
    body: JSON.stringify(body),
  })
  const json = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) throw new Error(json.error ?? `Erro ${res.status}`)
  return json
}

export const useStore = create<State>()((set, get) => ({
  session: undefined,
  profile: undefined,
  entries: [],
  messages: [],
  feedback: {},

  init: () => {
    supabase.auth.getSession().then(({ data }) => {
      set({ session: data.session })
      if (data.session) void get().loadProfile()
    })
    supabase.auth.onAuthStateChange((_e, session) => {
      set({ session })
      if (session) void get().loadProfile()
      else set({ profile: null, entries: [], messages: [], feedback: {} })
    })
  },

  loadProfile: async () => {
    const uid = get().session?.user.id
    if (!uid) return
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle()
    set({ profile: (data as Profile | null) ?? null })
  },

  saveProfile: async (p) => {
    const uid = get().session?.user.id
    if (!uid) return
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ ...p, id: uid, updated_at: new Date().toISOString() })
      .select()
      .single()
    if (error) throw error
    set({ profile: data as Profile })
  },

  loadEntries: async (from, to) => {
    const { data } = await supabase
      .from('entries')
      .select('*')
      .gte('date', from)
      .lte('date', to)
      .order('created_at', { ascending: true })
    set({ entries: (data as Entry[]) ?? [] })
  },

  deleteEntry: async (id) => {
    await supabase.from('entries').delete().eq('id', id)
    set((s) => ({ entries: s.entries.filter((e) => e.id !== id) }))
  },

  loadMessages: async () => {
    const { data } = await supabase
      .from('messages')
      .select('id, role, content, created_at')
      .order('created_at', { ascending: false })
      .limit(60)
    set({ messages: ((data as Message[]) ?? []).reverse() })
  },

  sendMessage: async (content, date) => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const optimistic: Message = { id: `tmp-${Date.now()}`, role: 'user', content, created_at: new Date().toISOString() }
    set((s) => ({ messages: [...s.messages, optimistic] }))
    const res = await callFn<{ reply: string; entries: Entry[] }>('chat', { message: content, date, tz })
    set((s) => ({
      messages: [
        ...s.messages,
        { id: `tmp-a-${Date.now()}`, role: 'assistant', content: res.reply, created_at: new Date().toISOString() },
      ],
      entries: [...s.entries, ...res.entries.filter((e) => e.date === date)],
    }))
    return res
  },

  loadFeedback: async (date) => {
    const { data } = await supabase.from('daily_feedback').select('date, content, stats').eq('date', date).maybeSingle()
    if (data) set((s) => ({ feedback: { ...s.feedback, [date]: data as DailyFeedback } }))
  },

  generateFeedback: async (date) => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const fb = await callFn<DailyFeedback>('daily-feedback', { date, tz })
    set((s) => ({ feedback: { ...s.feedback, [date]: fb } }))
    return fb
  },

  signOut: async () => {
    await supabase.auth.signOut()
  },
}))
