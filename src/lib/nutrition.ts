import type { Activity, Goal, PlanMonths, Sex } from '../types'

const ACTIVITY_FACTOR: Record<Activity, number> = {
  sedentario: 1.2,
  leve: 1.375,
  moderado: 1.55,
  intenso: 1.725,
  atleta: 1.9,
}

// kcal/dia ajustado sobre o gasto total, e g de proteína por kg
const GOAL_RULES: Record<Goal, { kcalDelta: number; proteinPerKg: number; fatPct: number }> = {
  emagrecer: { kcalDelta: -500, proteinPerKg: 1.8, fatPct: 0.28 },
  secar: { kcalDelta: -350, proteinPerKg: 2.2, fatPct: 0.25 },
  manter: { kcalDelta: 0, proteinPerKg: 1.8, fatPct: 0.28 },
  ganhar_massa: { kcalDelta: 300, proteinPerKg: 2.0, fatPct: 0.25 },
  performance: { kcalDelta: 100, proteinPerKg: 1.8, fatPct: 0.27 },
}

export interface BodyInput {
  sex: Sex
  age: number
  heightCm: number
  weightKg: number
  activity: Activity
  goal: Goal
}

export interface Targets {
  bmr: number
  tdee: number
  kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
  water_ml: number
}

export const bmrMifflin = ({ sex, age, heightCm, weightKg }: Omit<BodyInput, 'activity' | 'goal'>): number =>
  10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'm' ? 5 : -161)

export function computeTargets(b: BodyInput): Targets {
  const bmr = bmrMifflin(b)
  const tdee = bmr * ACTIVITY_FACTOR[b.activity]
  const rule = GOAL_RULES[b.goal]
  const kcal = Math.max(1200, Math.round(tdee + rule.kcalDelta))
  const protein_g = Math.round(rule.proteinPerKg * b.weightKg)
  const fat_g = Math.round((kcal * rule.fatPct) / 9)
  const carbs_g = Math.max(50, Math.round((kcal - protein_g * 4 - fat_g * 9) / 4))
  const water_ml = Math.round((b.weightKg * 35) / 50) * 50
  return { bmr: Math.round(bmr), tdee: Math.round(tdee), kcal, protein_g, carbs_g, fat_g, water_ml }
}

// Meta de peso realista para o prazo: ~0,5 kg/semana perdendo, ~0,25 kg/semana ganhando
export function suggestTargetWeight(goal: Goal, weightKg: number, months: PlanMonths): number {
  const weeks = months * 4.33
  const perWeek = goal === 'emagrecer' ? -0.5 : goal === 'secar' ? -0.35 : goal === 'ganhar_massa' ? 0.25 : 0
  return Math.round((weightKg + perWeek * weeks) * 10) / 10
}

export const ageFromBirthYear = (y: number): number => new Date().getFullYear() - y

export const todayISO = (): string => {
  const d = new Date()
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10)
}

export const addDaysISO = (iso: string, days: number): string => {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export const fmtDate = (iso: string): string =>
  new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
