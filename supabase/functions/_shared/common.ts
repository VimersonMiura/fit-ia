import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

export function userClient(req: Request): SupabaseClient {
  const auth = req.headers.get('Authorization') ?? ''
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  })
}

export interface Profile {
  id: string
  name: string | null
  sex: 'm' | 'f' | null
  birth_year: number | null
  height_cm: number | null
  weight_kg: number | null
  activity: string | null
  goal: string | null
  plan_months: number | null
  plan_start: string | null
  target_weight_kg: number | null
  kcal_target: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  water_ml: number | null
}

export interface EntryRow {
  id?: string
  user_id: string
  date: string
  kind: string
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
}

export interface Totals {
  kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
  water_ml: number
  kcal_burned: number
  workouts: number
  meals: number
}

export function totals(entries: EntryRow[]): Totals {
  const t: Totals = { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, water_ml: 0, kcal_burned: 0, workouts: 0, meals: 0 }
  for (const e of entries) {
    t.kcal += Number(e.kcal)
    t.protein_g += Number(e.protein_g)
    t.carbs_g += Number(e.carbs_g)
    t.fat_g += Number(e.fat_g)
    t.water_ml += Number(e.water_ml)
    t.kcal_burned += Number(e.kcal_burned)
    if (e.kind === 'workout') t.workouts++
    if (e.kind === 'meal') t.meals++
  }
  for (const k of Object.keys(t) as (keyof Totals)[]) t[k] = Math.round(t[k])
  return t
}

const GOAL_PT: Record<string, string> = {
  emagrecer: 'emagrecer',
  secar: 'secar mantendo massa magra',
  manter: 'manter peso',
  ganhar_massa: 'ganhar massa magra',
  performance: 'performance esportiva (jiu jitsu)',
}

export function profileSummary(p: Profile | null): string {
  if (!p) return 'Perfil ainda não preenchido.'
  const age = p.birth_year ? new Date().getFullYear() - p.birth_year : '?'
  return [
    `Nome: ${p.name ?? '-'}; sexo: ${p.sex ?? '-'}; idade: ${age}; altura: ${p.height_cm ?? '-'} cm; peso atual: ${p.weight_kg ?? '-'} kg.`,
    `Objetivo: ${GOAL_PT[p.goal ?? ''] ?? p.goal ?? '-'}; plano de ${p.plan_months ?? '-'} meses iniciado em ${p.plan_start ?? '-'}; peso alvo: ${p.target_weight_kg ?? '-'} kg.`,
    `Metas diárias: ${p.kcal_target ?? '-'} kcal, ${p.protein_g ?? '-'} g proteína, ${p.carbs_g ?? '-'} g carboidrato, ${p.fat_g ?? '-'} g gordura, ${p.water_ml ?? '-'} ml água.`,
  ].join('\n')
}

export function totalsSummary(t: Totals, p: Profile | null): string {
  return `Consumido: ${t.kcal} kcal (meta ${p?.kcal_target ?? '-'}), proteína ${t.protein_g} g (meta ${p?.protein_g ?? '-'}), carboidrato ${t.carbs_g} g (meta ${p?.carbs_g ?? '-'}), gordura ${t.fat_g} g (meta ${p?.fat_g ?? '-'}), água ${t.water_ml} ml (meta ${p?.water_ml ?? '-'}). Gasto em treinos: ${t.kcal_burned} kcal em ${t.workouts} treino(s). Refeições registradas: ${t.meals}.`
}

export async function openaiJSON<T>(system: string, messages: { role: 'user' | 'assistant'; content: string }[], schema: Record<string, unknown>, name: string): Promise<T> {
  const key = Deno.env.get('OPENAI_API_KEY')
  if (!key) throw new Error('OPENAI_API_KEY não configurada')
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini',
      temperature: 0.3,
      messages: [{ role: 'system', content: system }, ...messages],
      response_format: { type: 'json_schema', json_schema: { name, strict: true, schema } },
    }),
  })
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const data = await res.json()
  return JSON.parse(data.choices[0].message.content) as T
}
