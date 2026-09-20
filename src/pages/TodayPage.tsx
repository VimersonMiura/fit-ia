import { useEffect, useMemo, useState } from 'react'
import { addDaysISO, fmtDate, todayISO } from '../lib/nutrition'
import { useStore } from '../store'
import { KIND_ICONS, KIND_LABELS, type Entry } from '../types'

function Bar({ label, value, target, unit, color }: { label: string; value: number; target: number; unit: string; color: string }) {
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0
  return (
    <div className="bar">
      <div className="row between"><span>{label}</span><small className="muted">{Math.round(value)}{unit} / {target}{unit}</small></div>
      <div className="bar-track"><div className="bar-fill" style={{ width: `${pct}%`, background: color }} /></div>
    </div>
  )
}

export function TodayPage() {
  const { entries, loadEntries, deleteEntry, profile, feedback, loadFeedback, generateFeedback } = useStore()
  const [date, setDate] = useState(todayISO())
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    void loadEntries(date, date)
    void loadFeedback(date)
  }, [date, loadEntries, loadFeedback])

  const day = useMemo(() => entries.filter((e) => e.date === date), [entries, date])
  const t = useMemo(() => {
    const s = { kcal: 0, protein: 0, carbs: 0, fat: 0, water: 0, burned: 0 }
    for (const e of day) {
      s.kcal += e.kcal; s.protein += e.protein_g; s.carbs += e.carbs_g; s.fat += e.fat_g; s.water += e.water_ml; s.burned += e.kcal_burned
    }
    return s
  }, [day])

  const fb = feedback[date]
  const gen = async () => {
    setBusy(true); setErr(null)
    try { await generateFeedback(date) } catch (e) { setErr(e instanceof Error ? e.message : 'Erro') } finally { setBusy(false) }
  }

  const net = Math.round(t.kcal - t.burned)
  const target = profile?.kcal_target ?? 0

  return (
    <div className="stack">
      <div className="row between">
        <button className="btn-sm" onClick={() => setDate(addDaysISO(date, -1))}>‹</button>
        <strong>{date === todayISO() ? 'Hoje' : fmtDate(date)}</strong>
        <button className="btn-sm" disabled={date >= todayISO()} onClick={() => setDate(addDaysISO(date, 1))}>›</button>
      </div>

      <div className="card">
        <div className="grid-3">
          <div className="stat"><div className="value">{Math.round(t.kcal)}</div><div className="label">kcal consumidas</div></div>
          <div className="stat"><div className="value" style={{ color: '#f87171' }}>-{Math.round(t.burned)}</div><div className="label">kcal treino</div></div>
          <div className="stat"><div className="value" style={{ color: net <= target ? '#4ade80' : '#fbbf24' }}>{net}</div><div className="label">líquido / meta {target}</div></div>
        </div>
        <div className="stack" style={{ marginTop: 8 }}>
          <Bar label="Calorias" value={t.kcal} target={target} unit=" kcal" color="var(--accent)" />
          <Bar label="Proteína" value={t.protein} target={profile?.protein_g ?? 0} unit="g" color="#4ade80" />
          <Bar label="Carboidrato" value={t.carbs} target={profile?.carbs_g ?? 0} unit="g" color="#60a5fa" />
          <Bar label="Gordura" value={t.fat} target={profile?.fat_g ?? 0} unit="g" color="#f472b6" />
          <Bar label="Água" value={t.water} target={profile?.water_ml ?? 0} unit=" ml" color="#38bdf8" />
        </div>
      </div>

      <div className="card">
        <div className="row between">
          <h2>Feedback do dia</h2>
          <button className="btn-sm btn-primary" disabled={busy || day.length === 0} onClick={gen}>{busy ? 'Gerando…' : fb ? 'Atualizar' : 'Gerar'}</button>
        </div>
        {err && <p className="error">{err}</p>}
        {fb ? <div className="feedback">{fb.content}</div> : <p className="muted">{day.length ? 'Toque em "Gerar" no fim do dia para receber a análise da IA.' : 'Registre seu dia no chat para gerar o feedback.'}</p>}
      </div>

      <h2>Registros</h2>
      {day.length === 0 && <div className="empty">Nada registrado neste dia.</div>}
      {day.map((e) => <EntryCard key={e.id} e={e} onDelete={() => void deleteEntry(e.id)} />)}
    </div>
  )
}

function EntryCard({ e, onDelete }: { e: Entry; onDelete: () => void }) {
  const items = typeof e.details.items === 'string' ? e.details.items : ''
  const time = new Date(e.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return (
    <div className="card entry">
      <div className="row between">
        <strong>{KIND_ICONS[e.kind]} {e.title}</strong>
        <div className="row"><small className="muted">{time}</small><button className="btn-sm btn-danger" onClick={onDelete} aria-label="Excluir">✕</button></div>
      </div>
      {items && <small className="muted">{items}</small>}
      <div className="chips" style={{ marginTop: 6 }}>
        <span className="badge">{KIND_LABELS[e.kind]}</span>
        {e.kcal > 0 && <span className="badge accent">{e.kcal} kcal</span>}
        {e.protein_g > 0 && <span className="badge green">P {e.protein_g}g</span>}
        {e.carbs_g > 0 && <span className="badge blue">C {e.carbs_g}g</span>}
        {e.fat_g > 0 && <span className="badge">G {e.fat_g}g</span>}
        {e.water_ml > 0 && <span className="badge blue">{e.water_ml} ml</span>}
        {e.kcal_burned > 0 && <span className="badge accent">-{e.kcal_burned} kcal</span>}
        {e.duration_min ? <span className="badge">{e.duration_min} min</span> : null}
        {e.weight_kg ? <span className="badge">{e.weight_kg} kg</span> : null}
      </div>
    </div>
  )
}
