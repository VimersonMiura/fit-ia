import { corsHeaders, json, openaiJSON, profileSummary, totals, totalsSummary, userClient, type EntryRow, type Profile } from '../_shared/common.ts'

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['content'],
  properties: {
    content: {
      type: 'string',
      description: 'Feedback do dia em português do Brasil, em Markdown simples, 6 a 12 linhas: nota geral (0-10), calorias consumidas x gastas x meta, proteína e carboidratos x meta, água, treino, 1-2 acertos, 1-2 pontos a ajustar amanhã e uma frase motivadora ligada ao objetivo/prazo.',
    },
  },
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { date } = (await req.json()) as { date: string; tz?: string }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? '')) return json({ error: 'Data inválida' }, 400)

    const sb = userClient(req)
    const { data: userData, error: uerr } = await sb.auth.getUser()
    if (uerr || !userData.user) return json({ error: 'Não autenticado' }, 401)
    const uid = userData.user.id

    const [{ data: profile }, { data: entries }] = await Promise.all([
      sb.from('profiles').select('*').eq('id', uid).maybeSingle(),
      sb.from('entries').select('*').eq('user_id', uid).eq('date', date).order('created_at'),
    ])
    const rows = (entries ?? []) as EntryRow[]
    if (!rows.length) return json({ error: 'Nenhum registro neste dia ainda. Converse com a IA sobre o seu dia primeiro.' }, 400)

    const t = totals(rows)
    const p = profile as Profile | null
    const list = rows.map((e) => `- [${e.kind}] ${e.title}: ${String(e.details?.items ?? '')} (${e.kcal} kcal, P ${e.protein_g} g, C ${e.carbs_g} g, G ${e.fat_g} g${e.kcal_burned ? `, gastou ${e.kcal_burned} kcal` : ''}${e.water_ml ? `, ${e.water_ml} ml` : ''})`).join('\n')

    const daysIn = p?.plan_start ? Math.max(1, Math.round((new Date(date).getTime() - new Date(p.plan_start).getTime()) / 86400000) + 1) : null
    const system = `Você é o coach de nutrição e treino do app FitIA. Gere o feedback do dia ${date} em português do Brasil.
PERFIL:
${profileSummary(p)}
${daysIn && p?.plan_months ? `Dia ${daysIn} de ${p.plan_months * 30} do plano.` : ''}
TOTAIS DO DIA: ${totalsSummary(t, p)}
Saldo calórico: ${t.kcal - t.kcal_burned} kcal líquidos vs meta ${p?.kcal_target ?? '-'} kcal.
REGISTROS:
${list}
Seja específico com os números; não invente registros.`

    const out = await openaiJSON<{ content: string }>(system, [{ role: 'user', content: 'Gere meu feedback do dia.' }], SCHEMA, 'daily_feedback')

    const stats = { ...t, net_kcal: t.kcal - t.kcal_burned, kcal_target: p?.kcal_target ?? 0, protein_target: p?.protein_g ?? 0, carbs_target: p?.carbs_g ?? 0, water_target: p?.water_ml ?? 0 }
    const { error } = await sb.from('daily_feedback').upsert({ user_id: uid, date, content: out.content, stats })
    if (error) throw error

    return json({ date, content: out.content, stats })
  } catch (e) {
    console.error(e)
    return json({ error: e instanceof Error ? e.message : 'Erro interno' }, 500)
  }
})
