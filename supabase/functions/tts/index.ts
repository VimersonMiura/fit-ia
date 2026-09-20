import { corsHeaders, json, userClient } from '../_shared/common.ts'

const MAX_CHARS = 1500

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { text } = (await req.json()) as { text?: string }
    const input = (text ?? '').trim().slice(0, MAX_CHARS)
    if (!input) return json({ error: 'Texto vazio' }, 400)

    const sb = userClient(req)
    const { data: userData, error: uerr } = await sb.auth.getUser()
    if (uerr || !userData.user) return json({ error: 'Não autenticado' }, 401)

    const key = Deno.env.get('OPENAI_API_KEY')
    if (!key) return json({ error: 'OPENAI_API_KEY não configurada' }, 500)

    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: Deno.env.get('OPENAI_TTS_MODEL') ?? 'gpt-4o-mini-tts',
        voice: Deno.env.get('OPENAI_TTS_VOICE') ?? 'nova',
        input,
        instructions: 'Fale em português do Brasil, com voz feminina calorosa, natural e encorajadora, como uma coach de saúde conversando com um amigo.',
        response_format: 'mp3',
      }),
    })
    if (!res.ok) return json({ error: `OpenAI ${res.status}: ${(await res.text()).slice(0, 300)}` }, 502)

    return new Response(res.body, { headers: { ...corsHeaders, 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' } })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
})
