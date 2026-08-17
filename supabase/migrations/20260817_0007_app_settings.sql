-- ============================================================================
--  0007  App settings
--
--  A tiny key/value store so Ms Betty can change behaviour from the admin panel
--  without a deploy: how first-time sign-in is verified, whether new parents
--  can register, which social buttons show, which emails go out.
--
--  Key/value rather than a one-row table with a column per setting: adding a
--  setting is then an insert, not a migration, and the app keeps its defaults
--  in code so a missing row is never an error.
-- ============================================================================

create table if not exists public.app_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users(id) on delete set null
);

comment on table public.app_settings is
  'Admin-editable runtime settings. Defaults live in src/lib/settings.ts; a
   missing row means "use the default". Read server-side only.';

alter table public.app_settings enable row level security;

-- Admins do everything. Everyone else gets nothing: the app reads these with
-- the service-role key from server components, so no anon/authenticated policy
-- is needed and none is given.
drop policy if exists "admins manage settings" on public.app_settings;
create policy "admins manage settings" on public.app_settings
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

revoke all on public.app_settings from anon;

drop trigger if exists app_settings_touch on public.app_settings;
create trigger app_settings_touch
  before update on public.app_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
--  Sign-in audit
--
--  Records verification attempts so a locked-out parent can be diagnosed
--  ("did the code even arrive?") and so brute-force attempts are visible.
--  Deliberately stores no code or token, hashed or otherwise.
-- ---------------------------------------------------------------------------
create table if not exists public.auth_events (
  id          uuid primary key default gen_random_uuid(),
  email       citext,
  kind        text not null,       -- code_sent | link_sent | verified | failed | reset_sent
  detail      text,
  ip          text,
  created_at  timestamptz not null default now()
);

create index if not exists auth_events_email_idx on public.auth_events (email, created_at desc);
create index if not exists auth_events_created_idx on public.auth_events (created_at desc);

alter table public.auth_events enable row level security;

drop policy if exists "admins read auth events" on public.auth_events;
create policy "admins read auth events" on public.auth_events
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

revoke all on public.auth_events from anon;
