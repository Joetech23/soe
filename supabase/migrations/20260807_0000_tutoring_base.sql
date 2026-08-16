-- ============================================================================
--  Tutoring base schema — Ms Betty's parent portal.
--
--  Ported from the original Lovable-managed project so a fresh, self-owned
--  Supabase project can stand this up from scratch. Behaviour is preserved
--  exactly, with two deliberate changes:
--
--    1. The original repo contained a migration that reset the owner's account
--       password to a PLAINTEXT literal via crypt(). That is NOT ported. The
--       credential is considered compromised and is set through the Supabase
--       dashboard instead.
--    2. The admin-grant email is read from a settable GUC where possible so it
--       is not hard-coded in two places; it falls back to the known address.
--
--  Runs first: everything else builds on this schema.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
--  Roles
-- ---------------------------------------------------------------------------
create type public.app_role as enum ('admin', 'parent');

create table public.user_roles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all    on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles where user_id = _user_id and role = _role
  );
$$;

create policy "users see their own roles" on public.user_roles
  for select to authenticated using (auth.uid() = user_id);
create policy "admins manage roles" on public.user_roles
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------------
--  Groups & children
-- ---------------------------------------------------------------------------
create table public.groups (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  description   text,
  is_one_to_one boolean not null default false,
  created_at    timestamptz not null default now()
);
grant select, insert, update, delete on public.groups to authenticated;
grant all on public.groups to service_role;
alter table public.groups enable row level security;

create table public.children (
  id             uuid primary key default gen_random_uuid(),
  parent_user_id uuid references auth.users(id) on delete set null,
  group_id       uuid references public.groups(id) on delete set null,
  name           text not null,
  year_group     text,
  username       text unique,
  created_at     timestamptz not null default now()
);
grant select, insert, update, delete on public.children to authenticated;
grant all on public.children to service_role;
alter table public.children enable row level security;

create policy "admin manages children" on public.children
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
create policy "parent views own child" on public.children
  for select to authenticated using (parent_user_id = auth.uid());

create policy "admin manages groups" on public.groups
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
create policy "parents view groups of their children" on public.groups
  for select to authenticated using (
    exists (
      select 1 from public.children c
       where c.group_id = groups.id and c.parent_user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
--  Invite codes — how a parent links to their child
-- ---------------------------------------------------------------------------
create table public.invite_codes (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  child_id   uuid not null references public.children(id) on delete cascade,
  used_by    uuid references auth.users(id) on delete set null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.invite_codes to authenticated;
grant all on public.invite_codes to service_role;
alter table public.invite_codes enable row level security;

create policy "admin manages invite codes" on public.invite_codes
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create or replace function public.redeem_invite_code(_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare _child_id uuid; _used_by uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;

  select child_id, used_by into _child_id, _used_by
    from public.invite_codes where code = _code;

  if _child_id is null    then raise exception 'Invalid invite code'; end if;
  if _used_by is not null then raise exception 'Invite code already used'; end if;

  update public.children    set parent_user_id = auth.uid() where id = _child_id;
  update public.invite_codes set used_by = auth.uid(), used_at = now() where code = _code;
  insert into public.user_roles (user_id, role)
    values (auth.uid(), 'parent') on conflict do nothing;

  return _child_id;
end $$;

-- ---------------------------------------------------------------------------
--  Homework & feedback
-- ---------------------------------------------------------------------------
create table public.homework_items (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid references public.groups(id) on delete cascade,
  child_id    uuid references public.children(id) on delete cascade,
  title       text not null,
  description text,
  file_path   text,
  due_date    date,
  created_at  timestamptz not null default now(),
  check (group_id is not null or child_id is not null)
);
grant select, insert, update, delete on public.homework_items to authenticated;
grant all on public.homework_items to service_role;
alter table public.homework_items enable row level security;

create policy "admin manages homework" on public.homework_items
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
create policy "parent views their child's homework" on public.homework_items
  for select to authenticated using (
    exists (
      select 1 from public.children c
       where c.parent_user_id = auth.uid()
         and (homework_items.child_id = c.id or homework_items.group_id = c.group_id)
    )
  );

create table public.feedback_notes (
  id          uuid primary key default gen_random_uuid(),
  child_id    uuid not null references public.children(id) on delete cascade,
  note        text not null,
  lesson_date date,
  created_at  timestamptz not null default now()
);
grant select, insert, update, delete on public.feedback_notes to authenticated;
grant all on public.feedback_notes to service_role;
alter table public.feedback_notes enable row level security;

create policy "admin manages feedback" on public.feedback_notes
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
create policy "parent views own child feedback" on public.feedback_notes
  for select to authenticated using (
    exists (
      select 1 from public.children c
       where c.id = feedback_notes.child_id and c.parent_user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
--  Function grants — never expose these to anon
-- ---------------------------------------------------------------------------
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
revoke execute on function public.redeem_invite_code(text)        from public, anon;
grant  execute on function public.has_role(uuid, public.app_role) to authenticated;
grant  execute on function public.redeem_invite_code(text)        to authenticated;

-- ---------------------------------------------------------------------------
--  Homework storage bucket (private) + policies
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('homework', 'homework', false)
on conflict (id) do nothing;

create policy "admin manages homework files" on storage.objects
  for all to authenticated
  using      (bucket_id = 'homework' and public.has_role(auth.uid(), 'admin'))
  with check (bucket_id = 'homework' and public.has_role(auth.uid(), 'admin'));

create policy "parent reads own child homework files" on storage.objects
  for select to authenticated using (
    bucket_id = 'homework' and exists (
      select 1 from public.homework_items h
        join public.children c
          on (h.child_id = c.id or h.group_id = c.group_id)
       where h.file_path = storage.objects.name
         and c.parent_user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
--  Auto-grant admin to the owner on signup
-- ---------------------------------------------------------------------------
create or replace function public.grant_admin_if_owner()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email = coalesce(
       current_setting('app.owner_email', true),
       'soetuition@gmail.com'
     ) then
    insert into public.user_roles (user_id, role)
      values (new.id, 'admin') on conflict do nothing;
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created_grant_admin on auth.users;
create trigger on_auth_user_created_grant_admin
  after insert on auth.users
  for each row execute function public.grant_admin_if_owner();

revoke execute on function public.grant_admin_if_owner() from public, anon, authenticated;

-- NOTE: the original project also shipped a migration that set the owner's
-- password to a plaintext literal. It is deliberately NOT ported. Set Ms
-- Betty's password through the Supabase dashboard or a password-reset email.
