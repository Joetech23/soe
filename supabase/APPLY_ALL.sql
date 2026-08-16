-- ===========================================================================
--  Spirit of Excellence Tuition — full schema + seed
--  Generated 2026-08-15T09:55:10Z for project udqnubygdbwztyxucvec
--
--  Paste into: Supabase Dashboard -> SQL Editor -> New query -> Run
--  Safe to run ONCE on an empty project.
-- ===========================================================================

-- ============ 20260807_0000_tutoring_base.sql ============
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


-- ============ 20260807_0002_foundation.sql ============
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


-- ============ 20260807_0003_commerce.sql ============
-- ============================================================================
--  Digital-goods commerce schema for Spirit of Excellence Tuition.
--  Coexists with the tutoring schema; shares auth.users, user_roles, has_role().
-- ============================================================================

-- Enums (payment_* deliberately generic so paid bookings/subscriptions reuse
-- them later without a rewrite).
create type public.payment_provider    as enum ('none','stripe','paypal');
create type public.payment_status      as enum ('unpaid','processing','paid','partially_refunded','refunded','failed');
create type public.order_status        as enum ('pending_payment','paid','cancelled','refunded','expired');
create type public.product_type        as enum ('pdf','video','bundle','external');
create type public.entitlement_source  as enum ('purchase','free','manual','bundle','import');
create type public.subscriber_status   as enum ('pending','confirmed','unsubscribed','bounced');
create type public.enquiry_status      as enum ('new','contacted','converted','waitlist','closed');

-- ---------------------------------------------------------------------------
--  Catalogue
-- ---------------------------------------------------------------------------
create table public.product_categories (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null,
  name       text not null,
  summary    text,
  active     boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.products (
  id                     uuid primary key default gen_random_uuid(),
  slug                   text unique not null,
  name                   text not null,
  category_id            uuid references public.product_categories(id),
  product_type           product_type not null default 'pdf',
  summary                text,
  description            text,
  price_pence            integer not null default 0 check (price_pence >= 0),
  compare_at_price_pence integer,
  currency               text not null default 'gbp',
  is_free                boolean generated always as (price_pence = 0) stored,
  cover_image_url        text,
  preview_url            text,
  page_count             integer,
  duration_minutes       integer,
  year_groups            text[] not null default '{}',
  delivery_note          text,
  tax_class              text not null default 'digital_standard',
  featured               boolean not null default false,
  active                 boolean not null default true,
  sort_order             integer not null default 0,
  published_at           timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index on public.products (category_id);
create index on public.products (active, sort_order);
create index on public.products (featured) where featured = true;
create trigger trg_products_updated before update on public.products
  for each row execute function public.set_updated_at();

-- File locations live in a SEPARATE table with NO public policy — `products`
-- is publicly readable, so a storage path column there would leak the private
-- file to every visitor.
create table public.product_assets (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references public.products(id) on delete cascade,
  kind           text not null default 'main',
  label          text,
  storage_bucket text not null default 'product-files',
  storage_path   text,
  mime_type      text,
  size_bytes     bigint,
  video_provider text,
  video_id       text,
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now(),
  check (storage_path is not null or video_id is not null),
  check (kind in ('main','bonus','video'))
);
create index on public.product_assets (product_id, sort_order);

-- Scaffolded empty; makes bundles a data change later, not a rewrite.
create table public.product_bundle_items (
  bundle_id        uuid not null references public.products(id) on delete cascade,
  child_product_id uuid not null references public.products(id) on delete cascade,
  sort_order       integer not null default 0,
  primary key (bundle_id, child_product_id),
  check (bundle_id <> child_product_id)
);

-- ---------------------------------------------------------------------------
--  Customers — one row per email, optionally linked to an auth user. This link
--  turns a guest purchase into a claimable library after they sign up.
-- ---------------------------------------------------------------------------
create table public.customers (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid unique references auth.users(id) on delete set null,
  email             citext unique not null,
  full_name         text,
  phone             text,
  marketing_consent boolean not null default false,
  first_seen_at     timestamptz not null default now(),
  last_seen_at      timestamptz not null default now(),
  created_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
--  Orders
-- ---------------------------------------------------------------------------
create table public.orders (
  id                    uuid primary key default gen_random_uuid(),
  order_number          text unique not null,
  customer_id           uuid references public.customers(id),
  user_id               uuid references auth.users(id) on delete set null,
  status                order_status  not null default 'pending_payment',
  customer_name         text not null,
  customer_email        citext not null,
  subtotal_pence        integer not null default 0,
  discount_pence        integer not null default 0,
  total_pence           integer not null default 0,
  currency              text not null default 'gbp',
  billing_country       text not null default 'GB',
  ip_country            text,
  digital_consent_at    timestamptz,
  terms_version         text,
  payment_provider      payment_provider not null default 'none',
  payment_status        payment_status   not null default 'unpaid',
  stripe_session_id     text,
  stripe_payment_intent text,
  paypal_order_id       text,
  paypal_capture_id     text,
  amount_refunded_pence integer not null default 0,
  paid_at               timestamptz,
  receipt_sent_at       timestamptz,
  cancelled_at          timestamptz,
  source                text not null default 'web',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index on public.orders (status);
create index on public.orders (customer_id);
create index on public.orders (user_id);
create index on public.orders (customer_email);
create index on public.orders (created_at desc);
create index on public.orders (stripe_session_id);
create index on public.orders (paypal_order_id);
create trigger trg_orders_updated before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_items (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references public.orders(id) on delete cascade,
  product_id       uuid references public.products(id),
  product_name     text not null,
  product_slug     text not null,
  unit_price_pence integer not null,
  quantity         integer not null default 1 check (quantity = 1),
  line_total_pence integer not null,
  created_at       timestamptz not null default now(),
  unique (order_id, product_id)
);
create index on public.order_items (order_id);

create table public.order_events (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders(id) on delete cascade,
  type       text not null,
  message    text,
  actor      text not null default 'system',
  metadata   jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index on public.order_events (order_id, created_at);

-- Provider webhook dedupe. Stripe and PayPal are both at-least-once.
create table public.webhook_events (
  provider    text not null,
  event_id    text not null,
  type        text,
  received_at timestamptz not null default now(),
  primary key (provider, event_id)
);

-- ---------------------------------------------------------------------------
--  ENTITLEMENTS — "this email permanently owns this product". Keyed by email so
--  guests work; backfilled with user_id on signup. The partial unique index
--  makes grants idempotent, so a replayed webhook can never duplicate.
-- ---------------------------------------------------------------------------
create table public.entitlements (
  id                 uuid primary key default gen_random_uuid(),
  product_id         uuid not null references public.products(id) on delete cascade,
  order_id           uuid references public.orders(id) on delete set null,
  customer_id        uuid references public.customers(id) on delete set null,
  user_id            uuid references auth.users(id) on delete set null,
  email              citext not null,
  source             entitlement_source not null default 'purchase',
  granted_at         timestamptz not null default now(),
  expires_at         timestamptz,
  max_downloads      integer,
  download_count     integer not null default 0,
  last_downloaded_at timestamptz,
  revoked_at         timestamptz,
  revoked_reason     text,
  created_at         timestamptz not null default now()
);
create unique index entitlements_live_uniq
  on public.entitlements (product_id, email) where revoked_at is null;
create index on public.entitlements (user_id);
create index on public.entitlements (email);
create index on public.entitlements (order_id);

create table public.download_events (
  id             uuid primary key default gen_random_uuid(),
  entitlement_id uuid references public.entitlements(id) on delete set null,
  product_id     uuid references public.products(id) on delete set null,
  asset_id       uuid references public.product_assets(id) on delete set null,
  email          citext,
  delivery       text not null default 'account',
  ip             inet,
  user_agent     text,
  created_at     timestamptz not null default now()
);
create index on public.download_events (entitlement_id, created_at desc);
create index on public.download_events (created_at desc);

-- Guest access. The RAW token exists only in the customer's email; we store
-- sha256(raw), so a DB leak hands out nothing.
create table public.download_tokens (
  id           uuid primary key default gen_random_uuid(),
  token_hash   text unique not null,
  order_id     uuid references public.orders(id) on delete cascade,
  email        citext not null,
  expires_at   timestamptz not null default (now() + interval '30 days'),
  use_count    integer not null default 0,
  last_used_at timestamptz,
  revoked_at   timestamptz,
  created_at   timestamptz not null default now()
);
create index on public.download_tokens (order_id);
create index on public.download_tokens (email);

-- ---------------------------------------------------------------------------
--  Newsletter (double opt-in) and enquiries (the currently-fake forms)
-- ---------------------------------------------------------------------------
create table public.newsletter_subscribers (
  id                 uuid primary key default gen_random_uuid(),
  email              citext unique not null,
  full_name          text,
  child_year_group   text,
  status             subscriber_status not null default 'pending',
  source             text not null default 'newsletter_page',
  confirm_token_hash text,
  confirmed_at       timestamptz,
  unsubscribed_at    timestamptz,
  consent_ip         inet,
  consent_text       text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create trigger trg_subs_updated before update on public.newsletter_subscribers
  for each row execute function public.set_updated_at();

create table public.booking_requests (
  id              uuid primary key default gen_random_uuid(),
  reference       text unique not null,
  intent          text not null default 'book',
  parent_name     text not null,
  email           citext not null,
  phone           text,
  child_name      text not null,
  year_group      text,
  subject         text,
  notes           text,
  terms_agreed_at timestamptz not null default now(),
  terms_version   text,
  status          enquiry_status not null default 'new',
  admin_notes     text,
  child_id        uuid references public.children(id) on delete set null,
  notified_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on public.booking_requests (status, created_at desc);
create trigger trg_reqs_updated before update on public.booking_requests
  for each row execute function public.set_updated_at();


-- ============ 20260807_0004_functions.sql ============
-- ============================================================================
--  Commerce functions. All prices resolved server-side; all money-touching
--  functions are SECURITY DEFINER and revoked from anon/authenticated.
-- ============================================================================

-- SOE-XXXXX order reference generator.
create or replace function public.gen_order_reference()
returns text language plpgsql as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  code text; i int;
begin
  loop
    code := 'SOE-';
    for i in 1..5 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.orders where order_number = code);
  end loop;
  return code;
end $$;

-- ---------------------------------------------------------------------------
--  create_order(): prices ALWAYS resolved from the DB; the client sends only
--  product ids. Silently drops products the buyer already owns (digital goods
--  are buy-once) and raises ALREADY_OWNED if that empties the cart.
-- ---------------------------------------------------------------------------
create or replace function public.create_order(
  p_items             jsonb,
  p_customer_name     text,
  p_customer_email    text,
  p_marketing_consent boolean default false,
  p_user_id           uuid    default null,
  p_billing_country   text    default 'GB',
  p_ip_country        text    default null,
  p_terms_version     text    default 'v1',
  p_source            text    default 'web'
) returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  v_item     jsonb;
  v_product  public.products;
  v_line_id  uuid;
  v_subtotal integer := 0;
  v_count    integer := 0;
  v_customer uuid;
  v_order    public.orders;
  v_email    citext := lower(trim(p_customer_email));
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_CART';
  end if;
  if jsonb_array_length(p_items) > 20 then raise exception 'TOO_MANY_ITEMS'; end if;
  if v_email is null or position('@' in v_email) = 0 then raise exception 'INVALID_EMAIL'; end if;

  insert into public.customers (email, full_name, marketing_consent, user_id)
  values (v_email, p_customer_name, p_marketing_consent, p_user_id)
  on conflict (email) do update
     set full_name         = coalesce(excluded.full_name, customers.full_name),
         marketing_consent = customers.marketing_consent or excluded.marketing_consent,
         user_id           = coalesce(customers.user_id, excluded.user_id),
         last_seen_at      = now()
  returning id into v_customer;

  insert into public.orders (
    order_number, customer_id, user_id, customer_name, customer_email,
    billing_country, ip_country, terms_version, digital_consent_at, source
  ) values (
    public.gen_order_reference(), v_customer, p_user_id, p_customer_name, v_email,
    upper(coalesce(p_billing_country,'GB')), p_ip_country, p_terms_version, now(), p_source
  ) returning * into v_order;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_product
      from public.products
     where id = (v_item->>'product_id')::uuid and active = true;
    if v_product.id is null then raise exception 'PRODUCT_UNAVAILABLE'; end if;

    -- Already owns it? Drop the line rather than charging twice.
    if exists (
      select 1 from public.entitlements e
       where e.product_id = v_product.id and e.email = v_email and e.revoked_at is null
    ) then continue; end if;

    insert into public.order_items (
      order_id, product_id, product_name, product_slug,
      unit_price_pence, quantity, line_total_pence
    ) values (
      v_order.id, v_product.id, v_product.name, v_product.slug,
      v_product.price_pence, 1, v_product.price_pence
    )
    on conflict (order_id, product_id) do nothing
    returning id into v_line_id;

    if v_line_id is null then continue; end if;   -- duplicate id in the cart
    v_subtotal := v_subtotal + v_product.price_pence;
    v_count    := v_count + 1;
    v_line_id  := null;
  end loop;

  if v_count = 0 then raise exception 'ALREADY_OWNED'; end if;

  update public.orders
     set subtotal_pence = v_subtotal, total_pence = v_subtotal
   where id = v_order.id
  returning * into v_order;

  insert into public.order_events (order_id, type, message)
  values (v_order.id, 'created', format('Order created with %s item(s)', v_count));

  return v_order;
end $$;

-- ---------------------------------------------------------------------------
--  grant_entitlements_for_order(): idempotent, expands bundles.
-- ---------------------------------------------------------------------------
create or replace function public.grant_entitlements_for_order(p_order_id uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare v_order public.orders; v_granted integer := 0;
begin
  select * into v_order from public.orders where id = p_order_id;
  if v_order.id is null then return 0; end if;

  with wanted as (
    select oi.product_id from public.order_items oi where oi.order_id = p_order_id
    union
    select bi.child_product_id
      from public.order_items oi
      join public.product_bundle_items bi on bi.bundle_id = oi.product_id
     where oi.order_id = p_order_id
  ), ins as (
    insert into public.entitlements
      (product_id, order_id, customer_id, user_id, email, source)
    select w.product_id, p_order_id, v_order.customer_id, v_order.user_id, v_order.customer_email,
           case when v_order.total_pence = 0
                then 'free'::entitlement_source
                else 'purchase'::entitlement_source end
      from wanted w
      where w.product_id is not null
    on conflict (product_id, email) where revoked_at is null do nothing
    returning 1
  )
  select count(*) into v_granted from ins;

  if v_granted > 0 then
    insert into public.order_events (order_id, type, message)
    values (p_order_id, 'entitlements_granted', format('%s entitlement(s) granted', v_granted));
  end if;
  return v_granted;
end $$;

-- ---------------------------------------------------------------------------
--  mark_order_paid(): ATOMIC — the fix for the webhook/redirect double-fire.
--  A conditional UPDATE takes the row lock; the loser re-evaluates the WHERE
--  after the winner commits and matches 0 rows. Only the caller that receives
--  newly_paid = true may send a receipt.
-- ---------------------------------------------------------------------------
create or replace function public.mark_order_paid(
  p_order_number          text,
  p_provider              payment_provider,
  p_stripe_payment_intent text default null,
  p_paypal_order_id       text default null,
  p_paypal_capture_id     text default null,
  p_paid_amount_pence     integer default null
) returns table (order_id uuid, newly_paid boolean)
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_total integer;
begin
  update public.orders o
     set status                = 'paid',
         payment_status        = 'paid',
         payment_provider      = p_provider,
         paid_at               = now(),
         stripe_payment_intent = coalesce(p_stripe_payment_intent, o.stripe_payment_intent),
         paypal_order_id       = coalesce(p_paypal_order_id,       o.paypal_order_id),
         paypal_capture_id     = coalesce(p_paypal_capture_id,     o.paypal_capture_id)
   where o.order_number = p_order_number
     and o.payment_status <> 'paid'
  returning o.id, o.total_pence into v_id, v_total;

  if v_id is null then
    select id into v_id from public.orders where order_number = p_order_number;
    return query select v_id, false;
    return;
  end if;

  if p_paid_amount_pence is not null and p_paid_amount_pence <> v_total then
    insert into public.order_events (order_id, type, message, metadata)
    values (v_id, 'amount_mismatch', 'Captured amount differs from order total',
            jsonb_build_object('captured_pence', p_paid_amount_pence, 'expected_pence', v_total));
  end if;

  insert into public.order_events (order_id, type, message)
  values (v_id, 'paid', 'Payment received via ' || p_provider);

  perform public.grant_entitlements_for_order(v_id);

  return query select v_id, true;
end $$;

-- ---------------------------------------------------------------------------
--  claim_entitlements: guest bought yesterday, made an account today. Fired by
--  a trigger on auth.users so it "just works". Wrapped so it can never abort a
--  signup (there is already a grant_admin_if_owner trigger on auth.users).
-- ---------------------------------------------------------------------------
create or replace function public.claim_entitlements_for_user(p_user_id uuid, p_email citext)
returns integer language plpgsql security definer set search_path = public as $$
declare v_customer uuid; v_n integer;
begin
  insert into public.customers (email, user_id)
  values (p_email, p_user_id)
  on conflict (email) do update
     set user_id = coalesce(customers.user_id, excluded.user_id), last_seen_at = now()
  returning id into v_customer;

  update public.entitlements
     set user_id = p_user_id, customer_id = coalesce(customer_id, v_customer)
   where email = p_email and user_id is distinct from p_user_id;
  get diagnostics v_n = row_count;

  update public.orders
     set user_id = p_user_id, customer_id = coalesce(customer_id, v_customer)
   where customer_email = p_email and user_id is null;

  return v_n;
end $$;

create or replace function public.on_auth_user_created_claim()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  begin
    perform public.claim_entitlements_for_user(new.id, new.email::citext);
  exception when others then
    -- never let entitlement-claiming abort a signup
    null;
  end;
  return new;
end $$;
drop trigger if exists trg_claim_entitlements on auth.users;
create trigger trg_claim_entitlements after insert on auth.users
  for each row execute function public.on_auth_user_created_claim();

-- ---------------------------------------------------------------------------
--  record_download(): validity + abuse check + audit in one round trip.
-- ---------------------------------------------------------------------------
create or replace function public.record_download(
  p_entitlement_id uuid,
  p_asset_id       uuid,
  p_delivery       text,
  p_ip             inet default null,
  p_user_agent     text default null
) returns text
language plpgsql security definer set search_path = public as $$
declare v_ent public.entitlements; v_recent integer;
begin
  select * into v_ent from public.entitlements where id = p_entitlement_id for update;
  if v_ent.id is null                                          then return 'NOT_FOUND'; end if;
  if v_ent.revoked_at is not null                              then return 'REVOKED';   end if;
  if v_ent.expires_at is not null and v_ent.expires_at < now() then return 'EXPIRED';   end if;
  if v_ent.max_downloads is not null
     and v_ent.download_count >= v_ent.max_downloads           then return 'LIMIT';     end if;

  select count(*) into v_recent from public.download_events
   where entitlement_id = p_entitlement_id and created_at > now() - interval '1 hour';
  if v_recent >= 10 then return 'RATE_LIMIT'; end if;

  update public.entitlements
     set download_count = download_count + 1, last_downloaded_at = now()
   where id = p_entitlement_id;

  insert into public.download_events
    (entitlement_id, product_id, asset_id, email, delivery, ip, user_agent)
  values (p_entitlement_id, v_ent.product_id, p_asset_id, v_ent.email, p_delivery, p_ip, p_user_agent);

  return 'OK';
end $$;

-- Nightly hygiene — abandoned flows never captured money.
create or replace function public.expire_stale_orders()
returns integer language plpgsql security definer set search_path = public as $$
declare v_n integer;
begin
  with x as (
    update public.orders set status = 'expired'
     where status = 'pending_payment' and created_at < now() - interval '24 hours'
    returning id
  ) select count(*) into v_n from x;
  return v_n;
end $$;

revoke execute on function
  public.create_order(jsonb,text,text,boolean,uuid,text,text,text,text),
  public.mark_order_paid(text,payment_provider,text,text,text,integer),
  public.grant_entitlements_for_order(uuid),
  public.claim_entitlements_for_user(uuid,citext),
  public.record_download(uuid,uuid,text,inet,text),
  public.expire_stale_orders()
from public, anon, authenticated;


-- ============ 20260807_0005_rls.sql ============
-- ============================================================================
--  Row Level Security. Public reads only the active catalogue (never file
--  locations). All order/entitlement writes go through the SECURITY DEFINER
--  functions via the service-role key in server routes.
-- ============================================================================
alter table public.product_categories     enable row level security;
alter table public.products               enable row level security;
alter table public.product_assets         enable row level security;
alter table public.product_bundle_items   enable row level security;
alter table public.customers              enable row level security;
alter table public.orders                 enable row level security;
alter table public.order_items            enable row level security;
alter table public.order_events           enable row level security;
alter table public.entitlements           enable row level security;
alter table public.download_events        enable row level security;
alter table public.download_tokens        enable row level security;
alter table public.webhook_events         enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.booking_requests       enable row level security;

-- Public catalogue (never includes file locations)
create policy "public reads active categories" on public.product_categories
  for select using (active = true);
create policy "public reads active products" on public.products
  for select using (active = true);
create policy "public reads bundle map" on public.product_bundle_items
  for select using (true);

-- Staff manage everything
create policy "staff manage categories" on public.product_categories
  for all using (public.is_staff()) with check (public.is_staff());
create policy "staff manage products" on public.products
  for all using (public.is_staff()) with check (public.is_staff());
create policy "staff manage assets" on public.product_assets
  for all using (public.is_staff()) with check (public.is_staff());
create policy "staff manage bundles" on public.product_bundle_items
  for all using (public.is_staff()) with check (public.is_staff());
-- NOTE: deliberately NO public select on product_assets.

-- Customers see their own record
create policy "customers read self" on public.customers
  for select to authenticated using (user_id = auth.uid());
create policy "staff manage customers" on public.customers
  for all using (public.is_staff()) with check (public.is_staff());

-- Orders — customers read their own (by user_id or JWT email, cast to citext).
create policy "customers read own orders" on public.orders
  for select to authenticated
  using (user_id = auth.uid() or customer_email = (auth.jwt() ->> 'email')::citext);
create policy "staff read orders"  on public.orders for select using (public.is_staff());
create policy "staff write orders" on public.orders for update
  using (public.is_staff()) with check (public.is_staff());

create policy "customers read own order items" on public.order_items
  for select to authenticated using (exists (
    select 1 from public.orders o
     where o.id = order_items.order_id
       and (o.user_id = auth.uid() or o.customer_email = (auth.jwt() ->> 'email')::citext)));
create policy "staff read order items" on public.order_items for select using (public.is_staff());

create policy "staff read order events"  on public.order_events for select using (public.is_staff());
create policy "staff write order events" on public.order_events for insert with check (public.is_staff());

-- Entitlements — matched by user_id (backfilled at signup) OR JWT email.
create policy "customers read own entitlements" on public.entitlements
  for select to authenticated
  using (user_id = auth.uid() or email = (auth.jwt() ->> 'email')::citext);
create policy "staff manage entitlements" on public.entitlements
  for all using (public.is_staff()) with check (public.is_staff());

create policy "staff read downloads" on public.download_events for select using (public.is_staff());
create policy "staff read tokens"    on public.download_tokens for select using (public.is_staff());
create policy "staff read webhooks"  on public.webhook_events  for select using (public.is_staff());
create policy "staff manage subscribers" on public.newsletter_subscribers
  for all using (public.is_staff()) with check (public.is_staff());
create policy "staff manage enquiries" on public.booking_requests
  for all using (public.is_staff()) with check (public.is_staff());
-- No anon INSERT anywhere: all public writes go through server routes using the
-- service-role key (create_order, free-download, newsletter, bookings).


-- ============ 20260807_0006_storage.sql ============
-- ============================================================================
--  Storage buckets. product-files is PRIVATE with no read policy at all — every
--  download goes through a server route that mints a 60-second signed URL with
--  the service-role key. product-previews is public for covers + sample pages.
--  The existing `homework` bucket is untouched.
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit)
values ('product-files', 'product-files', false, 2147483648)  -- 2GB, PRIVATE
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit)
values ('product-previews', 'product-previews', true, 10485760) -- 10MB, public
on conflict (id) do nothing;

-- product-files: staff only. No anon/authenticated read policy by design.
create policy "staff manage product files" on storage.objects for all to authenticated
  using      (bucket_id = 'product-files' and public.is_staff())
  with check (bucket_id = 'product-files' and public.is_staff());

create policy "public read previews" on storage.objects for select
  using (bucket_id = 'product-previews');
create policy "staff manage previews" on storage.objects for all to authenticated
  using      (bucket_id = 'product-previews' and public.is_staff())
  with check (bucket_id = 'product-previews' and public.is_staff());


-- ============ seed.sql ============
-- ============================================================================
--  Seed: categories + the 8 resources at their LIVE Payhip prices.
--  Idempotent (upsert on slug). Product FILES are not seeded here — upload them
--  to the private product-files bucket and insert product_assets rows during
--  cutover. Run after migrations 0001–0006.
-- ============================================================================

insert into public.product_categories (slug, name, summary, sort_order) values
  ('phonics', 'Phonics', 'Sounds, blending and early reading', 1),
  ('reading', 'Reading', 'Fluency, comprehension and a love of books', 2),
  ('ks2',     'KS2',     'Key Stage 2 skills and reasoning', 3),
  ('parents', 'Parents', 'Guides that help you support at home', 4)
on conflict (slug) do update
  set name = excluded.name, summary = excluded.summary, sort_order = excluded.sort_order;

insert into public.products
  (slug, name, summary, price_pence, product_type, category_id, sort_order, published_at)
values
  ('ks2-inference-cards', 'Free KS2 inference cards',
   'Ready-to-print inference cards to sharpen reading comprehension in Key Stage 2.',
   0, 'pdf', (select id from public.product_categories where slug='ks2'), 1, now()),

  ('recommended-books', 'Recommended books',
   'Ms Betty''s curated reading list of books children love, sorted for every primary age.',
   0, 'pdf', (select id from public.product_categories where slug='reading'), 2, now()),

  ('parents-evening-guide', 'Parents evening guide',
   'Get the most from parents evening, questions to ask and how to act on what you hear.',
   0, 'pdf', (select id from public.product_categories where slug='parents'), 3, now()),

  ('expressive-reading-guide', 'Expressive reading guide for parents',
   'How to read aloud with expression at home to build fluency, confidence and a love of stories.',
   100, 'pdf', (select id from public.product_categories where slug='reading'), 4, now()),

  ('rhyming-bingo', 'Rhyming bingo',
   'A playful rhyming bingo game to build phonological awareness with early readers.',
   100, 'pdf', (select id from public.product_categories where slug='phonics'), 5, now()),

  ('school-readiness-guide', 'School readiness guide',
   'A step-by-step guide to helping your child start school confident, capable and excited.',
   100, 'pdf', (select id from public.product_categories where slug='parents'), 6, now()),

  ('phonics-handbook', 'Phonics handbook',
   'A friendly handbook for parents that demystifies phonics and shows you how to support at home.',
   250, 'pdf', (select id from public.product_categories where slug='phonics'), 7, now()),

  ('phonics-webinar', 'Phonics webinar for parents',
   'A recorded webinar walking you through phonics so you can support reading at home with confidence.',
   500, 'video', (select id from public.product_categories where slug='phonics'), 8, now())
on conflict (slug) do update
  set name = excluded.name,
      summary = excluded.summary,
      price_pence = excluded.price_pence,
      product_type = excluded.product_type,
      category_id = excluded.category_id,
      sort_order = excluded.sort_order;
