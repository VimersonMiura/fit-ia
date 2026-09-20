export type Sex = 'm' | 'f'
export type Activity = 'sedentario' | 'leve' | 'moderado' | 'intenso' | 'atleta'
export type Goal = 'emagrecer' | 'secar' | 'manter' | 'ganhar_massa' | 'performance'
export type PlanMonths = 3 | 6 | 12
export type EntryKind = 'meal' | 'workout' | 'water' | 'supplement' | 'weight' | 'sleep' | 'note'

export interface Profile {
  id: string
  name: string | null
  sex: Sex | null
  birth_year: number | null
  height_cm: number | null
  weight_kg: number | null
  activity: Activity | null
  goal: Goal | null
  plan_months: PlanMonths | null
  plan_start: string | null
  target_weight_kg: number | null
  kcal_target: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  water_ml: number | null
  timezone: string | null
}

export interface Entry {
  id: string
  user_id: string
  date: string
  kind: EntryKind
  title: string
  details: Record<string, unknown>
  kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
  water_ml: number
  kcal_burned: number
  duration_min: number | null
  weight_kg: number | null
  created_at: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export interface DailyFeedback {
  date: string
  content: string
  stats: Record<string, number>
}

export const GOAL_LABELS: Record<Goal, string> = {
  emagrecer: 'Emagrecer',
  secar: 'Secar mantendo massa magra',
  manter: 'Manter peso e composição',
  ganhar_massa: 'Ganhar massa magra',
  performance: 'Performance (jiu jitsu / esporte)',
}

export const ACTIVITY_LABELS: Record<Activity, string> = {
  sedentario: 'Sedentário (pouco ou nenhum exercício)',
  leve: 'Leve (1–2 treinos/semana)',
  moderado: 'Moderado (3–4 treinos/semana)',
  intenso: 'Intenso (5–6 treinos/semana)',
  atleta: 'Atleta (2x por dia ou trabalho físico)',
}

export const KIND_LABELS: Record<EntryKind, string> = {
  meal: 'Refeição',
  workout: 'Treino',
  water: 'Água',
  supplement: 'Suplemento / manipulado',
  weight: 'Peso',
  sleep: 'Sono',
  note: 'Anotação',
}

export const KIND_ICONS: Record<EntryKind, string> = {
  meal: '🍽️',
  workout: '🥋',
  water: '💧',
  supplement: '💊',
  weight: '⚖️',
  sleep: '😴',
  note: '📝',
}
