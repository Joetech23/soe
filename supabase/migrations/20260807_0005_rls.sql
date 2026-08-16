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
