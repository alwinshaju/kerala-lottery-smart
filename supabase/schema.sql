create table if not exists draws (
  id text primary key,
  code text not null,
  name text not null,
  draw_no text not null,
  date date not null,
  pdf_url text,
  verified boolean not null default false,
  prizes jsonb not null,
  amounts jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz not null default now()
);

create or replace function touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;
drop trigger if exists draws_touch on draws;
create trigger draws_touch before update on draws for each row execute function touch_updated_at();
create index if not exists draws_date_idx on draws (date desc);
alter table draws enable row level security;
create policy "public read" on draws for select using (true);
-- if the table already exists: alter table draws add column if not exists updated_at timestamptz not null default now();
-- writes happen only with the service-role key (server side); enable Realtime for live ticker:
alter publication supabase_realtime add table draws;

-- Web push subscriptions (written only by the server with the service-role key)
create table if not exists push_subs (
  endpoint text primary key,
  sub jsonb not null,
  codes text[] not null default '{}',   -- lottery codes the user follows; empty = all
  created_at timestamptz default now()
);
alter table push_subs enable row level security;

-- Live entry support (run once on an existing database):
alter table draws add column if not exists status text not null default 'verified' check (status in ('live','verified'));

-- Alert de-duplication for the sync workflow (run once):
create table if not exists sync_state (key text primary key, value text);
alter table sync_state enable row level security;

-- Trust level of each row (run once): 'official_pdf' = parsed from the LOTIS PDF; 'consensus' = two public sources agreed, awaiting the PDF.
alter table draws add column if not exists source text not null default 'official_pdf';
