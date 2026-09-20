# FitIA

App (PWA) em que o usuário conversa com a IA sobre o dia — refeições, água, treinos, suplementos, manipulados, peso — e ela registra tudo, calcula calorias/macros/gasto e gera o feedback diário, acompanhando um plano de 3, 6 ou 12 meses (emagrecer, secar, manter, ganhar massa, performance).

## Stack
- Frontend: React + TypeScript + Vite (PWA), Supabase Auth.
- Backend: Supabase (Postgres + RLS, Edge Functions `chat` e `daily-feedback`).
- IA: OpenAI (`gpt-4o-mini` por padrão) com saída estruturada.

## Rodar local
```
nvm use 22
npm install
cp .env.example .env   # preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm run dev
```

## Backend (Supabase)
```
npx supabase link --project-ref <ref>
npx supabase db push
npx supabase secrets set OPENAI_API_KEY=sk-...
npx supabase functions deploy chat daily-feedback
```
Em Authentication → Providers → Email, desative "Confirm email" para login imediato (ou configure SMTP).
