-- ============================================================================
--  0009  Invoices
--
--  An enquiry is only half a sale. Ms Betty reads it, decides which class the
--  child joins, and then has to ask for money — which until now happened in a
--  separate email thread with a bank sort code typed out by hand.
--
--  This gives that step a record: an invoice raised from the enquiry, priced
--  from the class the parent actually picked, sent with a private pay link,
--  and settled either through Stripe/PayPal or by bank transfer that Ms Betty
--  ticks off herself.
-- ============================================================================

create table if not exists public.invoices (
  id                   uuid primary key default gen_random_uuid(),
  reference            text unique not null,

  -- Where it came from. Nullable, ON DELETE SET NULL: an invoice is a
  -- financial record and must outlive the enquiry it was raised from.
  enquiry_id           uuid references public.booking_requests(id) on delete set null,

  -- Snapshotted, not joined. If the parent later changes their email the
  -- invoice must still say who it was sent to at the time.
  customer_name        text not null,
  customer_email       citext not null,
  customer_phone       text,
  child_name           text,

  currency             text not null default 'gbp',
  subtotal_pence       integer not null default 0 check (subtotal_pence >= 0),
  discount_pence       integer not null default 0 check (discount_pence >= 0),
  total_pence          integer not null default 0 check (total_pence >= 0),

  status               text not null default 'draft'
                         check (status in ('draft','sent','paid','void')),

  -- Not the payment_provider enum: 'custom' (bank transfer, cash, whatever she
  -- arranges) is a first-class choice here, and 'none' would read as "unpaid".
  payment_method       text not null default 'custom'
                         check (payment_method in ('custom','stripe','paypal')),
  -- Free text, defaulted from Settings: bank name, sort code, account number.
  payment_instructions text,
  -- The provider's id for the completed payment, or her own note for a
  -- transfer she matched off a bank statement.
  payment_reference    text,
  -- Provider session/order id, so a return trip can be verified server-side.
  provider_session_id  text,

  due_on               date,
  notes                text,          -- shown to the parent on the invoice
  admin_notes          text,          -- never shown to the parent

  -- sha256 of the raw link token. The raw value only ever exists in the
  -- parent's email, exactly as with download links.
  token_hash           text unique,

  sent_at              timestamptz,
  paid_at              timestamptz,
  viewed_at            timestamptz,
  voided_at            timestamptz,
  marked_paid_by       uuid references auth.users(id) on delete set null,
  created_by           uuid references auth.users(id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists invoices_status_idx  on public.invoices (status, created_at desc);
create index if not exists invoices_enquiry_idx on public.invoices (enquiry_id);
create index if not exists invoices_email_idx   on public.invoices (customer_email);

comment on table public.invoices is
  'Money asked for against an enquiry. Totals are recomputed server-side from
   invoice_items on every save — the columns are a cache, never an input.';

create table if not exists public.invoice_items (
  id           uuid primary key default gen_random_uuid(),
  invoice_id   uuid not null references public.invoices(id) on delete cascade,
  description  text not null,
  quantity     integer not null default 1 check (quantity > 0),
  unit_pence   integer not null default 0 check (unit_pence >= 0),
  amount_pence integer generated always as (quantity * unit_pence) stored,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists invoice_items_invoice_idx
  on public.invoice_items (invoice_id, sort_order);

-- A plain audit trail. "Was this actually sent, and when?" is the first thing
-- anyone asks about an unpaid invoice.
create table if not exists public.invoice_events (
  id         uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  kind       text not null,     -- created | sent | viewed | paid | voided | note
  detail     text,
  actor_id   uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists invoice_events_invoice_idx
  on public.invoice_events (invoice_id, created_at desc);

drop trigger if exists invoices_touch on public.invoices;
create trigger invoices_touch before update on public.invoices
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
--  RLS
--
--  Admins only. The public pay page is served by the server using the
--  service-role key after matching sha256(token), so no anon policy exists and
--  none is wanted: without one, a leaked anon key still reads no invoices.
-- ---------------------------------------------------------------------------
alter table public.invoices       enable row level security;
alter table public.invoice_items  enable row level security;
alter table public.invoice_events enable row level security;

drop policy if exists "admins manage invoices" on public.invoices;
create policy "admins manage invoices" on public.invoices
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "admins manage invoice items" on public.invoice_items;
create policy "admins manage invoice items" on public.invoice_items
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "admins read invoice events" on public.invoice_events;
create policy "admins read invoice events" on public.invoice_events
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

revoke all on public.invoices       from anon;
revoke all on public.invoice_items  from anon;
revoke all on public.invoice_events from anon;

grant all on public.invoices       to service_role;
grant all on public.invoice_items  to service_role;
grant all on public.invoice_events to service_role;

-- ---------------------------------------------------------------------------
--  Marking an invoice paid, once
--
--  Same hazard as orders: a provider redirect and a webhook can both arrive.
--  The conditional UPDATE means only one caller is told `newly_paid`, and only
--  that caller sends the receipt.
-- ---------------------------------------------------------------------------
create or replace function public.mark_invoice_paid(
  _invoice_id uuid,
  _method     text default null,
  _reference  text default null,
  _actor      uuid default null
)
returns table (newly_paid boolean, invoice_reference text)
language plpgsql security definer set search_path = public as $fn$
declare
  _updated public.invoices%rowtype;
  _existing public.invoices%rowtype;
begin
  update public.invoices i
     set status            = 'paid',
         paid_at           = now(),
         payment_method    = coalesce(_method, i.payment_method),
         payment_reference = coalesce(_reference, i.payment_reference),
         marked_paid_by    = coalesce(_actor, i.marked_paid_by)
   where i.id = _invoice_id
     and i.status <> 'paid'
  returning i.* into _updated;

  if found then
    insert into public.invoice_events (invoice_id, kind, detail, actor_id)
    values (_invoice_id, 'paid', coalesce(_reference, 'marked paid'), _actor);
    return query select true, _updated.reference;
  else
    select * into _existing from public.invoices where id = _invoice_id;
    return query select false, _existing.reference;
  end if;
end;
$fn$;

revoke execute on function public.mark_invoice_paid(uuid, text, text, uuid) from public, anon;
grant execute on function public.mark_invoice_paid(uuid, text, text, uuid) to service_role;
