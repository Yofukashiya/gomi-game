-- DEADLINE DASH の共有スコアボード
-- 研修用: 匿名 insert / select を許可し、CHECK 制約だけで守る。
create table if not exists public.scores (
  id         bigint generated always as identity primary key,
  name       text not null check (char_length(name) between 1 and 12),
  score      int  not null check (score between 0 and 5000),
  created_at timestamptz not null default now()
);

create index if not exists scores_score_idx on public.scores (score desc);

alter table public.scores enable row level security;

drop policy if exists "anon read" on public.scores;
create policy "anon read" on public.scores
  for select to anon, authenticated using (true);

drop policy if exists "anon insert" on public.scores;
create policy "anon insert" on public.scores
  for insert to anon, authenticated with check (true);
