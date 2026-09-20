import { useMemo, useState } from 'react'
import { ageFromBirthYear, computeTargets, suggestTargetWeight, todayISO } from '../lib/nutrition'
import { useStore } from '../store'
import { ACTIVITY_LABELS, GOAL_LABELS, type Activity, type Goal, type PlanMonths, type Profile, type Sex } from '../types'

interface Props {
  existing?: Profile | null
  onDone?: () => void
}

export function ProfileForm({ existing, onDone }: Props) {
  const saveProfile = useStore((s) => s.saveProfile)
  const [name, setName] = useState(existing?.name ?? '')
  const [sex, setSex] = useState<Sex>(existing?.sex ?? 'm')
  const [birthYear, setBirthYear] = useState(existing?.birth_year ?? 1990)
  const [height, setHeight] = useState(existing?.height_cm ?? 175)
  const [weight, setWeight] = useState(existing?.weight_kg ?? 80)
  const [activity, setActivity] = useState<Activity>(existing?.activity ?? 'moderado')
  const [goal, setGoal] = useState<Goal>(existing?.goal ?? 'secar')
  const [months, setMonths] = useState<PlanMonths>(existing?.plan_months ?? 3)
  const [targetWeight, setTargetWeight] = useState<number | ''>(existing?.target_weight_kg ?? '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const targets = useMemo(
    () => computeTargets({ sex, age: ageFromBirthYear(birthYear), heightCm: height, weightKg: weight, activity, goal }),
    [sex, birthYear, height, weight, activity, goal],
  )
  const suggested = suggestTargetWeight(goal, weight, months)

  const save = async () => {
    setBusy(true)
    setErr(null)
    try {
      await saveProfile({
        name: name || null,
        sex,
        birth_year: birthYear,
        height_cm: height,
        weight_kg: weight,
        activity,
        goal,
        plan_months: months,
        plan_start: existing?.plan_start ?? todayISO(),
        target_weight_kg: targetWeight === '' ? suggested : Number(targetWeight),
        kcal_target: targets.kcal,
        protein_g: targets.protein_g,
        carbs_g: targets.carbs_g,
        fat_g: targets.fat_g,
        water_ml: targets.water_ml,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })
      onDone?.()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stack">
      <div className="card stack">
        <h2>Sobre você</h2>
        <label>
          Nome
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Como quer ser chamado" />
        </label>
        <div className="grid-2">
          <label>
            Sexo
            <select value={sex} onChange={(e) => setSex(e.target.value as Sex)}>
              <option value="m">Masculino</option>
              <option value="f">Feminino</option>
            </select>
          </label>
          <label>
            Ano de nascimento
            <input type="number" value={birthYear} onChange={(e) => setBirthYear(Number(e.target.value))} />
          </label>
          <label>
            Altura (cm)
            <input type="number" value={height} onChange={(e) => setHeight(Number(e.target.value))} />
          </label>
          <label>
            Peso atual (kg)
            <input type="number" step="0.1" value={weight} onChange={(e) => setWeight(Number(e.target.value))} />
          </label>
        </div>
        <label>
          Nível de atividade
          <select value={activity} onChange={(e) => setActivity(e.target.value as Activity)}>
            {(Object.keys(ACTIVITY_LABELS) as Activity[]).map((a) => (
              <option key={a} value={a}>{ACTIVITY_LABELS[a]}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="card stack">
        <h2>Objetivo</h2>
        <div className="stack">
          {(Object.keys(GOAL_LABELS) as Goal[]).map((g) => (
            <button key={g} className={`option ${goal === g ? 'active' : ''}`} onClick={() => setGoal(g)}>
              {GOAL_LABELS[g]}
            </button>
          ))}
        </div>
        <h3 style={{ marginTop: 8 }}>Prazo do projeto</h3>
        <div className="grid-3">
          {([3, 6, 12] as PlanMonths[]).map((m) => (
            <button key={m} className={`option ${months === m ? 'active' : ''}`} onClick={() => setMonths(m)}>
              {m === 12 ? '1 ano' : `${m} meses`}
            </button>
          ))}
        </div>
        <label>
          Peso alvo (kg) — sugerido: {suggested}
          <input type="number" step="0.1" value={targetWeight} placeholder={String(suggested)} onChange={(e) => setTargetWeight(e.target.value === '' ? '' : Number(e.target.value))} />
        </label>
      </div>

      <div className="card">
        <h2>Suas metas diárias</h2>
        <div className="grid-3">
          <div className="stat"><div className="value">{targets.kcal}</div><div className="label">kcal</div></div>
          <div className="stat"><div className="value">{targets.protein_g}g</div><div className="label">proteína</div></div>
          <div className="stat"><div className="value">{targets.carbs_g}g</div><div className="label">carboidrato</div></div>
          <div className="stat"><div className="value">{targets.fat_g}g</div><div className="label">gordura</div></div>
          <div className="stat"><div className="value">{(targets.water_ml / 1000).toFixed(1)}L</div><div className="label">água</div></div>
          <div className="stat"><div className="value">{targets.tdee}</div><div className="label">gasto diário est.</div></div>
        </div>
        <small className="muted">Calculado por Mifflin-St Jeor + nível de atividade, ajustado ao objetivo. A IA recalibra conforme seu progresso.</small>
      </div>

      {err && <p className="error">{err}</p>}
      <button className="btn-primary btn-block" disabled={busy} onClick={save}>
        {busy ? 'Salvando…' : existing?.goal ? 'Salvar alterações' : 'Começar meu plano'}
      </button>
    </div>
  )
}

export function OnboardingPage() {
  return (
    <div className="app">
      <header className="topbar"><span className="brand">FitIA</span><small className="muted">configuração inicial</small></header>
      <main style={{ paddingBottom: 24 }}>
        <h1>Vamos montar seu plano</h1>
        <p className="muted">Leva 1 minuto. Depois é só conversar com a IA todo dia.</p>
        <ProfileForm />
      </main>
    </div>
  )
}
