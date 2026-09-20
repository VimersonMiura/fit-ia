import { useEffect, useMemo } from 'react'
import { addDaysISO, fmtDate, todayISO } from '../lib/nutrition'
import { useStore } from '../store'
import { GOAL_LABELS } from '../types'

interface DayAgg { date: string; kcal: number; burned: number; protein: number; water: number; workouts: number; weight: number | null }

export function ProgressPage() {
  const { entries, loadEntries, profile } = useStore()
  const today = todayISO()
  const from = addDaysISO(today, -29)

  useEffect(() => {
    void loadEntries(from, today)
  }, [from, today, loadEntries])

  const days = useMemo<DayAgg[]>(() => {
    const map = new Map<string, DayAgg>()
    for (let i = 0; i < 30; i++) {
      const d = addDaysISO(from, i)
      map.set(d, { date: d, kcal: 0, burned: 0, protein: 0, water: 0, workouts: 0, weight: null })
    }
    for (const e of entries) {
      const a = map.get(e.date)
      if (!a) continue
      a.kcal += e.kcal; a.burned += e.kcal_burned; a.protein += e.protein_g; a.water += e.water_ml
      if (e.kind === 'workout') a.workouts++
      if (e.weight_kg) a.weight = e.weight_kg
    }
    return [...map.values()]
  }, [entries, from])

  const active = days.filter((d) => d.kcal > 0 || d.workouts > 0)
  const avg = (k: keyof Omit<DayAgg, 'date' | 'weight'>) => (active.length ? Math.round(active.reduce((s, d) => s + d[k], 0) / active.length) : 0)
  const weights = days.filter((d) => d.weight)
  const firstW = weights[0]?.weight ?? profile?.weight_kg ?? null
  const lastW = weights[weights.length - 1]?.weight ?? profile?.weight_kg ?? null

  const planDays = (profile?.plan_months ?? 3) * 30
  const elapsed = profile?.plan_start ? Math.max(0, Math.round((new Date(today).getTime() - new Date(profile.plan_start).getTime()) / 86400000)) : 0
  const planPct = Math.min(100, Math.round((elapsed / planDays) * 100))
  const maxKcal = Math.max(1, ...days.map((d) => d.kcal), profile?.kcal_target ?? 0)

  return (
    <div className="stack">
      <div className="card">
        <div className="row between">
          <h2>Seu projeto</h2>
          <span className="badge accent">{profile?.goal ? GOAL_LABELS[profile.goal] : ''}</span>
        </div>
        <div className="row between"><small className="muted">Dia {elapsed + 1} de {planDays}</small><small className="muted">{planPct}%</small></div>
        <div className="bar-track"><div className="bar-fill" style={{ width: `${planPct}%`, background: 'var(--accent)' }} /></div>
        <div className="grid-3" style={{ marginTop: 10 }}>
          <div className="stat"><div className="value">{firstW ?? '-'}</div><div className="label">peso inicial</div></div>
          <div className="stat"><div className="value">{lastW ?? '-'}</div><div className="label">peso atual</div></div>
          <div className="stat"><div className="value">{profile?.target_weight_kg ?? '-'}</div><div className="label">peso alvo</div></div>
        </div>
        {firstW && lastW && firstW !== lastW && (
          <p className="muted" style={{ textAlign: 'center' }}>
            {lastW < firstW ? `Perdeu ${(firstW - lastW).toFixed(1)} kg` : `Ganhou ${(lastW - firstW).toFixed(1)} kg`} no período
          </p>
        )}
      </div>

      <div className="card">
        <h2>Últimos 30 dias</h2>
        <div className="grid-3">
          <div className="stat"><div className="value">{active.length}</div><div className="label">dias registrados</div></div>
          <div className="stat"><div className="value">{days.reduce((s, d) => s + d.workouts, 0)}</div><div className="label">treinos</div></div>
          <div className="stat"><div className="value">{avg('kcal')}</div><div className="label">kcal média/dia</div></div>
          <div className="stat"><div className="value">{avg('burned')}</div><div className="label">gasto médio treino</div></div>
          <div className="stat"><div className="value">{avg('protein')}g</div><div className="label">proteína média</div></div>
          <div className="stat"><div className="value">{(avg('water') / 1000).toFixed(1)}L</div><div className="label">água média</div></div>
        </div>
      </div>

      <div className="card">
        <h2>Calorias por dia</h2>
        <div className="chart">
          {days.map((d) => (
            <div key={d.date} className="chart-col" title={`${fmtDate(d.date)}: ${Math.round(d.kcal)} kcal`}>
              <div className="chart-bar" style={{ height: `${(d.kcal / maxKcal) * 100}%`, background: d.workouts ? '#4ade80' : 'var(--accent)' }} />
            </div>
          ))}
          {profile?.kcal_target ? <div className="chart-target" style={{ bottom: `${(profile.kcal_target / maxKcal) * 100}%` }} /> : null}
        </div>
        <small className="muted">Linha = meta diária. Verde = dia com treino.</small>
      </div>

      {weights.length > 1 && (
        <div className="card">
          <h2>Pesagens</h2>
          {weights.map((w) => (
            <div key={w.date} className="row between"><span>{fmtDate(w.date)}</span><strong>{w.weight} kg</strong></div>
          ))}
        </div>
      )}
    </div>
  )
}
