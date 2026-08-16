-- ============================================================================
--  Foundation: extensions, shared helpers, and the is_staff() shim.
--  Coexists with the live tutoring schema (user_roles, has_role, children …).
-- ============================================================================
create extension if not exists citext;
create extension if not exists pgcrypto;

-- Shared updated_at trigger fn used by every table below.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Compatibility shim: the commerce RLS policies are written against is_staff(),
-- defined here in terms of the canonical user_roles + has_role() model so both
-- schemas share one role system.
--
-- Ms Betty is a sole trader, so "staff" == "admin" today. If she ever takes on
-- an assistant, add a 'staff' value to app_role in its own migration (Postgres
-- cannot use a new enum value in the transaction that adds it) and extend the
-- OR below — no policy anywhere else needs to change.
create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.has_role(auth.uid(), 'admin'), false);
$$;
revoke execute on function public.is_staff() from public;
grant execute on function public.is_staff() to anon, authenticated;
