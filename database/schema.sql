-- CloudBase PostgreSQL: user_id stores the authenticated JWT sub as text.
-- Do not create foreign keys to auth.users; CloudBase Auth is managed separately.
create extension if not exists pgcrypto;

create table if not exists profiles (
  user_id text primary key default (current_setting('request.jwt.claims', true)::json ->> 'sub'),
  display_name text not null default '探索者',
  updated_at timestamptz not null default now()
);

create table if not exists people (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default (current_setting('request.jwt.claims', true)::json ->> 'sub'),
  kind text not null check(kind in ('self','father','mother','relative')),
  name text not null, nickname text, avatar_path text, birth_date date, birthplace text,
  created_at timestamptz not null default now()
);

create table if not exists materials (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default (current_setting('request.jwt.claims', true)::json ->> 'sub'),
  person_id uuid not null references people(id) on delete cascade,
  section text not null, content text not null,
  source text not null check(source in ('write','interview','voice','file')),
  storage_path text, created_at timestamptz not null default now()
);

create table if not exists insights (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default (current_setting('request.jwt.claims', true)::json ->> 'sub'),
  kind text not null check(kind in ('summary','hypothesis','dilemma','report')),
  title text not null, content text not null, source_ids uuid[] not null default '{}',
  status text not null default 'pending' check(status in ('pending','confirmed','partial','rejected')),
  model_tier text not null check(model_tier in ('cheap','deep')),
  created_at timestamptz not null default now()
);

create table if not exists inner_roles (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default (current_setting('request.jwt.claims', true)::json ->> 'sub'),
  kind text not null check(kind in ('innerFather','innerMother','innerChild')),
  name text not null, avatar_path text, trait text, created_at timestamptz not null default now(),
  unique(user_id,kind)
);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default (current_setting('request.jwt.claims', true)::json ->> 'sub'),
  version integer not null default 1, content jsonb not null, pdf_path text,
  share_token uuid unique, created_at timestamptz not null default now()
);

create index if not exists people_user_id_idx on people(user_id);
create index if not exists materials_user_id_idx on materials(user_id);
create index if not exists materials_person_id_idx on materials(person_id);
create index if not exists insights_user_id_idx on insights(user_id);

alter table profiles enable row level security;
alter table people enable row level security;
alter table materials enable row level security;
alter table insights enable row level security;
alter table inner_roles enable row level security;
alter table reports enable row level security;

create policy "own profile" on profiles using (user_id = (select auth.uid()::text)) with check (user_id = (select auth.uid()::text));
create policy "own people" on people using (user_id = (select auth.uid()::text)) with check (user_id = (select auth.uid()::text));
create policy "own materials" on materials using (user_id = (select auth.uid()::text)) with check (user_id = (select auth.uid()::text));
create policy "own insights" on insights using (user_id = (select auth.uid()::text)) with check (user_id = (select auth.uid()::text));
create policy "own roles" on inner_roles using (user_id = (select auth.uid()::text)) with check (user_id = (select auth.uid()::text));
create policy "own reports" on reports using (user_id = (select auth.uid()::text)) with check (user_id = (select auth.uid()::text));
