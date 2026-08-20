-- ============================================================================
--  0008  Lifetime download links, reviews, group capacity, lesson summaries
-- ============================================================================

-- ---------------------------------------------------------------------------
--  Lifetime download links
--
--  NULL expires_at now means "never expires". Ms Betty sells a PDF once and a
--  parent may want it again in three years on a new device; that is a good
--  customer, not an attacker. Revocation still works through revoked_at, which
--  is what actually matters for refunds.
-- ---------------------------------------------------------------------------
alter table public.download_tokens alter column expires_at drop not null;
alter table public.download_tokens alter column expires_at drop default;

comment on column public.download_tokens.expires_at is
  'NULL = never expires. Revoke via revoked_at instead.';

-- Existing links become lifetime too, rather than stranding earlier customers.
update public.download_tokens set expires_at = null where revoked_at is null;

-- ---------------------------------------------------------------------------
--  Parent-submitted reviews, held for approval
--
--  Nothing reaches the website until Ms Betty approves it: the public policy
--  below only exposes rows whose status is 'approved'.
-- ---------------------------------------------------------------------------
create table if not exists public.reviews (
  id           uuid primary key default gen_random_uuid(),
  author_name  text not null,
  author_email citext,
  topic        text,                    -- "Year 4", "11+", "Reception phonics"
  rating       smallint not null default 5 check (rating between 1 and 5),
  quote        text not null,
  status       text not null default 'pending' check (status in ('pending','approved','rejected')),
  featured     boolean not null default false,
  admin_notes  text,
  user_id      uuid references auth.users(id) on delete set null,
  ip           text,
  approved_at  timestamptz,
  approved_by  uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists reviews_status_idx on public.reviews (status, created_at desc);

alter table public.reviews enable row level security;

-- Anyone may read APPROVED reviews only.
drop policy if exists "public reads approved reviews" on public.reviews;
create policy "public reads approved reviews" on public.reviews
  for select to anon, authenticated
  using (status = 'approved');

-- Anyone may submit one; the status default keeps it out of sight. The check
-- is belt and braces so a crafted insert cannot self-approve.
drop policy if exists "anyone may submit a review" on public.reviews;
create policy "anyone may submit a review" on public.reviews
  for insert to anon, authenticated
  with check (status = 'pending' and approved_at is null and featured = false);

drop policy if exists "admins manage reviews" on public.reviews;
create policy "admins manage reviews" on public.reviews
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

drop trigger if exists reviews_touch on public.reviews;
create trigger reviews_touch before update on public.reviews
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
--  Group capacity + waitlist
-- ---------------------------------------------------------------------------
alter table public.groups
  add column if not exists capacity integer check (capacity is null or capacity > 0);

comment on column public.groups.capacity is
  'Maximum children in this group. NULL = no limit.';

create table if not exists public.waitlist_entries (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references public.groups(id) on delete cascade,
  parent_name  text not null,
  email        citext not null,
  phone        text,
  child_name   text,
  year_group   text,
  notes        text,
  status       text not null default 'waiting'
                 check (status in ('waiting','offered','joined','declined')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- One live entry per family per group; re-applying updates rather than piles up.
  unique (group_id, email)
);

create index if not exists waitlist_group_idx on public.waitlist_entries (group_id, created_at);

alter table public.waitlist_entries enable row level security;

drop policy if exists "anyone may join a waitlist" on public.waitlist_entries;
create policy "anyone may join a waitlist" on public.waitlist_entries
  for insert to anon, authenticated
  with check (status = 'waiting');

drop policy if exists "admins manage the waitlist" on public.waitlist_entries;
create policy "admins manage the waitlist" on public.waitlist_entries
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

drop trigger if exists waitlist_touch on public.waitlist_entries;
create trigger waitlist_touch before update on public.waitlist_entries
  for each row execute function public.set_updated_at();

-- Seats left in a group. SECURITY DEFINER so the public booking form can ask
-- without being able to read the register itself.
create or replace function public.group_availability(_group_id uuid)
returns table (capacity integer, taken bigint, seats_left integer)
language sql stable security definer set search_path = public as $$
  select g.capacity,
         (select count(*) from public.children c where c.group_id = g.id) as taken,
         case when g.capacity is null then null
              else greatest(g.capacity - (select count(*) from public.children c where c.group_id = g.id), 0)::int
         end as seats_left
  from public.groups g
  where g.id = _group_id;
$$;

revoke execute on function public.group_availability(uuid) from public;
grant execute on function public.group_availability(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
--  Lesson summaries on homework
-- ---------------------------------------------------------------------------
alter table public.homework_items
  add column if not exists lesson_summary text;

comment on column public.homework_items.lesson_summary is
  'Optional "what we covered today" note, shown to parents in the portal.';
