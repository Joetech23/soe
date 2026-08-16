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
