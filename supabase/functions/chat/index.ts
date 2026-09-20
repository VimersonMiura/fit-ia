import { corsHeaders, json, openaiJSON, profileSummary, totals, totalsSummary, userClient, type EntryRow, type Profile } from '../_shared/common.ts'

interface ExtractedEntry {
  kind: 'meal' | 'workout' | 'water' | 'supplement' | 'weight' | 'sleep' | 'note'
  title: string
  items: string
  kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
  water_ml: number
  kcal_burned: number
  duration_min: number
  weight_kg: number
}

interface ChatOut {
  reply: string
  entries: ExtractedEntry[]
  profile_updates: { weight_kg: number }
}

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['reply', 'entries', 'profile_updates'],
  properties: {
    reply: { type: 'string', description: 'Resposta curta e amigável em português do Brasil (máx. 3 frases + no máximo 1 dica).' },
    entries: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['kind', 'title', 'items', 'kcal', 'protein_g', 'carbs_g', 'fat_g', 'water_ml', 'kcal_burned', 'duration_min', 'weight_kg'],
        properties: {
          kind: { type: 'string', enum: ['meal', 'workout', 'water', 'supplement', 'weight', 'sleep', 'note'] },
          title: { type: 'string', description: 'Título curto, ex: "Almoço", "Jiu jitsu", "Whey", "Água".' },
          items: { type: 'string', description: 'Descrição dos itens/quantidades estimadas, ex: "150g frango, 4 col arroz, salada".' },
          kcal: { type: 'number', description: 'Calorias consumidas (0 se não for refeição/suplemento calórico).' },
          protein_g: { type: 'number' },
          carbs_g: { type: 'number' },
          fat_g: { type: 'number' },
          water_ml: { type: 'number', description: 'Água em ml (0 se não for água).' },
          kcal_burned: { type: 'number', description: 'Calorias gastas no treino (0 se não for treino).' },
          duration_min: { type: 'number', description: 'Duração em minutos (0 se não se aplica).' },
          weight_kg: { type: 'number', description: 'Peso corporal informado (0 se não se aplica).' },
        },
      },
    },
    profile_updates: {
      type: 'object',
      additionalProperties: false,
      required: ['weight_kg'],
      properties: { weight_kg: { type: 'number', description: 'Novo peso corporal se o usuário informou pesagem, senão 0.' } },
    },
  },
}

const SYSTEM = (profile: Profile | null, todayStr: string, date: string) => `Você é o coach pessoal de nutrição e treino do app FitIA, falando português do Brasil, direto, motivador e realista.
O usuário conversa livremente sobre seu dia: refeições, água, treinos (musculação, jiu jitsu, corrida...), suplementos, manipulados, vitaminas, peso, sono.
Sua tarefa: (1) extrair TUDO que for registrável em "entries" com estimativas nutricionais razoáveis para porções brasileiras (use tabela TACO/USDA como referência; se a porção não foi dita, assuma porção média e diga isso na resposta); (2) estimar calorias gastas em treinos usando peso do usuário e MET (jiu jitsu ~10 MET, musculação ~5 MET, corrida leve ~8 MET, caminhada ~3.5 MET); (3) responder de forma curta com um comentário útil relacionado ao objetivo dele.
Regras: não registre nada se a mensagem for só pergunta ou conversa; não duplique itens já registrados hoje; suplementos como whey/creatina contam calorias/proteína; manipulados e vitaminas registre como kind=supplement com kcal 0; água em ml (1 copo = 250 ml, 1 garrafa = 500 ml se não especificado). Se o usuário informou o peso, preencha profile_updates.weight_kg.
Se o usuário pedir um resumo, use o resumo do dia abaixo. Não invente dados que não estão no resumo.

Data de hoje: ${todayStr}. Data em que os registros serão salvos: ${date}.
PERFIL:
${profileSummary(profile)}
RESUMO DO DIA (${date}):
{{TOTALS}}`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { message, date, tz } = (await req.json()) as { message: string; date: string; tz?: string }
    if (!message?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(date ?? '')) return json({ error: 'Parâmetros inválidos' }, 400)

    const sb = userClient(req)
    const { data: userData, error: uerr } = await sb.auth.getUser()
    if (uerr || !userData.user) return json({ error: 'Não autenticado' }, 401)
    const uid = userData.user.id

    const [{ data: profile }, { data: todayEntries }, { data: history }] = await Promise.all([
      sb.from('profiles').select('*').eq('id', uid).maybeSingle(),
      sb.from('entries').select('*').eq('user_id', uid).eq('date', date),
      sb.from('messages').select('role, content').eq('user_id', uid).order('created_at', { ascending: false }).limit(12),
    ])

    const t = totals((todayEntries ?? []) as EntryRow[])
    const todayStr = new Date().toLocaleDateString('pt-BR', { timeZone: tz ?? 'America/Sao_Paulo', dateStyle: 'full' })
    const registered = ((todayEntries ?? []) as EntryRow[]).map((e) => `- [${e.kind}] ${e.title}: ${String(e.details?.items ?? '')}`).join('\n')
    const system = SYSTEM(profile as Profile | null, todayStr, date).replace(
      '{{TOTALS}}',
      `${totalsSummary(t, profile as Profile | null)}\nJá registrado hoje:\n${registered || '(nada)'}`,
    )

    const convo = ((history ?? []) as { role: 'user' | 'assistant'; content: string }[]).reverse()
    const out = await openaiJSON<ChatOut>(system, [...convo, { role: 'user', content: message }], SCHEMA, 'chat_result')

    const rows: EntryRow[] = out.entries.map((e) => ({
      user_id: uid,
      date,
      kind: e.kind,
      title: e.title,
      details: { items: e.items },
      kcal: Math.max(0, Math.round(e.kcal)),
      protein_g: Math.max(0, Math.round(e.protein_g)),
      carbs_g: Math.max(0, Math.round(e.carbs_g)),
      fat_g: Math.max(0, Math.round(e.fat_g)),
      water_ml: Math.max(0, Math.round(e.water_ml)),
      kcal_burned: Math.max(0, Math.round(e.kcal_burned)),
      duration_min: e.duration_min > 0 ? Math.round(e.duration_min) : null,
      weight_kg: e.weight_kg > 0 ? e.weight_kg : null,
    }))

    let inserted: EntryRow[] = []
    if (rows.length) {
      const { data, error } = await sb.from('entries').insert(rows).select()
      if (error) throw error
      inserted = data as EntryRow[]
    }

    const newWeight = out.profile_updates?.weight_kg
    if (newWeight && newWeight > 30 && newWeight < 300) {
      await sb.from('profiles').update({ weight_kg: newWeight, updated_at: new Date().toISOString() }).eq('id', uid)
    }

    await sb.from('messages').insert([
      { user_id: uid, role: 'user', content: message },
      { user_id: uid, role: 'assistant', content: out.reply },
    ])

    return json({ reply: out.reply, entries: inserted })
  } catch (e) {
    console.error(e)
    return json({ error: e instanceof Error ? e.message : 'Erro interno' }, 500)
  }
})
