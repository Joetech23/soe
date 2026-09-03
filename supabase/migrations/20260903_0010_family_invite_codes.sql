-- ---------------------------------------------------------------------------
--  0010 — One code per family, not per child
--
--  children.parent_user_id has always been many-to-one, so a parent with three
--  children was never a data problem. The workflow was: a code named exactly
--  one child and burned itself on first use, so a parent with siblings needed
--  three codes, typed on three separate visits — and the portal only ever
--  offered the redeem box to parents who had *no* children linked, so after the
--  first one there was no way in.
--
--  This migration makes a code cover a set of children, and makes redeeming it
--  idempotent for the family it belongs to.
-- ---------------------------------------------------------------------------

-- A code covers many children.
create table if not exists public.invite_code_children (
  code_id    uuid not null references public.invite_codes(id) on delete cascade,
  child_id   uuid not null references public.children(id)     on delete cascade,
  created_at timestamptz not null default now(),
  primary key (code_id, child_id)
);
grant select, insert, update, delete on public.invite_code_children to authenticated;
grant all on public.invite_code_children to service_role;
alter table public.invite_code_children enable row level security;

drop policy if exists "admin manages invite code children" on public.invite_code_children;
create policy "admin manages invite code children" on public.invite_code_children
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Every code that exists today covers its one child. Carry them across so no
-- code in a parent's inbox stops working.
insert into public.invite_code_children (code_id, child_id)
  select id, child_id from public.invite_codes where child_id is not null
  on conflict do nothing;

-- A family code has no single anchor child, so the old column stops being
-- required. It is kept, and still honoured on read, so codes minted by the
-- previous version keep resolving.
alter table public.invite_codes alter column child_id drop not null;

-- ---------------------------------------------------------------------------
--  Which children a code covers — the join table, plus the legacy anchor.
--  Internal: only ever called from inside the definer functions below.
-- ---------------------------------------------------------------------------
create or replace function public.invite_code_child_ids(_code_id uuid)
returns setof uuid
language sql stable security definer set search_path = public as $$
  select child_id from public.invite_code_children where code_id = _code_id
  union
  select child_id from public.invite_codes
   where id = _code_id and child_id is not null
$$;

revoke execute on function public.invite_code_child_ids(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
--  Redeem
--
--  Returns every child on the code that now belongs to the caller, so the UI
--  can name them ("Leo and Amara are linked") instead of guessing.
--
--  Three deliberate behaviours:
--   * The same parent re-entering their own code succeeds and changes nothing.
--     They tapped the WhatsApp link twice, or came back because Ms Betty added
--     a sibling to the code. Neither is an error worth an accusing message.
--   * A child already linked to a *different* account is skipped, never
--     reassigned. A code must not be able to take someone else's child.
--   * Return type changed from a single uuid, hence the drop.
-- ---------------------------------------------------------------------------
drop function if exists public.redeem_invite_code(text);

create function public.redeem_invite_code(_code text)
returns table (child_id uuid, child_name text)
language plpgsql security definer set search_path = public as $$
declare
  _code_id uuid;
  _used_by uuid;
  _uid     uuid := auth.uid();
  _mine    int;
begin
  if _uid is null then raise exception 'not authenticated'; end if;

  -- Parents type these off a message, so be forgiving about case and stray
  -- spaces. The stored codes are uppercase by construction.
  select id, used_by into _code_id, _used_by
    from public.invite_codes
   where upper(code) = upper(btrim(_code));

  if _code_id is null then
    raise exception 'That code was not recognised. Check it and try again.';
  end if;

  if _used_by is not null and _used_by <> _uid then
    raise exception 'That code has already been used by another account.';
  end if;

  update public.children ch
     set parent_user_id = _uid
   where ch.parent_user_id is null
     and ch.id in (select public.invite_code_child_ids(_code_id));

  select count(*) into _mine
    from public.children ch
   where ch.parent_user_id = _uid
     and ch.id in (select public.invite_code_child_ids(_code_id));

  if _mine = 0 then
    raise exception 'Those children are already linked to a different account.';
  end if;

  update public.invite_codes
     set used_by = _uid, used_at = coalesce(used_at, now())
   where id = _code_id;

  insert into public.user_roles (user_id, role)
    values (_uid, 'parent') on conflict do nothing;

  return query
    select ch.id, ch.name
      from public.children ch
     where ch.parent_user_id = _uid
       and ch.id in (select public.invite_code_child_ids(_code_id))
     order by ch.name;
end $$;

revoke execute on function public.redeem_invite_code(text) from public, anon;
grant  execute on function public.redeem_invite_code(text) to authenticated;
