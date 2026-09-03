-- Handoff: Kanban tasks table
-- Run this in the Supabase SQL editor for your project.

create extension if not exists "pgcrypto";

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text default '',
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  source text not null default 'human' check (source in ('human', 'agent')),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep updated_at fresh on every change
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists tasks_set_updated_at on tasks;
create trigger tasks_set_updated_at
  before update on tasks
  for each row execute function set_updated_at();

-- Enable Realtime on this table
alter publication supabase_realtime add table tasks;

-- Hackathon-demo RLS: open read/write, no auth.
-- NOTE: this is intentionally permissive for judging convenience.
-- Do not use this policy for a real production app.
alter table tasks enable row level security;

drop policy if exists "public read" on tasks;
create policy "public read" on tasks
  for select using (true);

drop policy if exists "public write" on tasks;
create policy "public write" on tasks
  for all using (true) with check (true);

-- Seed a couple of demo tasks (optional)
insert into tasks (title, description, status, priority, source, position)
values
  ('Set up WebMCP tools', 'Register create/move/update/delete tools', 'in_progress', 'high', 'human', 0),
  ('Try asking your agent to add a task', 'Say: "add a task to buy milk"', 'todo', 'medium', 'human', 1)
on conflict do nothing;
