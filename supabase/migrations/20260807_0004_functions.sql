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
