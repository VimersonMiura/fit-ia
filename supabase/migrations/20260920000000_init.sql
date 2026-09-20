create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  sex text check (sex in ('m', 'f')),
  birth_year int,
  height_cm int,
  weight_kg numeric,
  activity text check (activity in ('sedentario', 'leve', 'moderado', 'intenso', 'atleta')),
  goal text check (goal in ('emagrecer', 'secar', 'manter', 'ganhar_massa', 'performance')),
  plan_months int check (plan_months in (3, 6, 12)),
  plan_start date default current_date,
  target_weight_kg numeric,
  kcal_target int,
  protein_g int,
  carbs_g int,
  fat_g int,
  water_ml int,
  timezone text default 'America/Sao_Paulo',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  kind text not null check (kind in ('meal', 'workout', 'water', 'supplement', 'weight', 'sleep', 'note')),
  title text not null,
  details jsonb not null default '{}'::jsonb,
  kcal numeric not null default 0,
  protein_g numeric not null default 0,
  carbs_g numeric not null default 0,
  fat_g numeric not null default 0,
  water_ml int not null default 0,
  kcal_burned numeric not null default 0,
  duration_min int,
  weight_kg numeric,
  created_at timestamptz default now()
);
create index entries_user_date on public.entries (user_id, date);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now()
);
create index messages_user_created on public.messages (user_id, created_at);

create table public.daily_feedback (
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  content text not null,
  stats jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  primary key (user_id, date)
);

alter table public.profiles enable row level security;
alter table public.entries enable row level security;
alter table public.messages enable row level security;
alter table public.daily_feedback enable row level security;

create policy "own profile" on public.profiles for all
  using (auth.uid() = id) with check (auth.uid() = id);
create policy "own entries" on public.entries for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own messages" on public.messages for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own feedback" on public.daily_feedback for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
