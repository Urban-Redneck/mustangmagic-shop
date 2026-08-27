begin;

-- Keep the existing Stripe-era tables usable while adding the provider-neutral
-- records needed for Helcim and Turn14 fulfillment.
alter table public.store_orders
  alter column stripe_checkout_session_id drop not null,
  alter column raw_stripe_session drop not null;

drop constraint if exists store_orders_stripe_checkout_session_id_not_blank;
alter table public.store_orders
  add constraint store_orders_stripe_checkout_session_id_not_blank
  check (
    stripe_checkout_session_id is null
    or length(btrim(stripe_checkout_session_id)) > 0
  );

alter table public.store_orders
  add column if not exists payment_provider text not null default 'stripe',
  add column if not exists helcim_transaction_id text,
  add column if not exists helcim_customer_code text,
  add column if not exists helcim_invoice_number text,
  add column if not exists helcim_payment_status text,
  add column if not exists helcim_card_brand text,
  add column if not exists helcim_card_last_four text,
  add column if not exists helcim_authorized_at timestamptz,
  add column if not exists helcim_captured_at timestamptz,
  add column if not exists turn14_quote_payload jsonb,
  add column if not exists turn14_selected_shipping jsonb,
  add column if not exists shipping_amount integer not null default 0,
  add column if not exists fee_amount integer not null default 0,
  add column if not exists tax_amount integer not null default 0,
  add column if not exists quote_expires_at timestamptz;

alter table public.store_orders
  drop constraint if exists store_orders_payment_provider_valid,
  drop constraint if exists store_orders_helcim_card_last_four_valid,
  drop constraint if exists store_orders_turn14_quote_payload_object,
  drop constraint if exists store_orders_turn14_selected_shipping_array,
  drop constraint if exists store_orders_shipping_amount_non_negative,
  drop constraint if exists store_orders_fee_amount_non_negative,
  drop constraint if exists store_orders_tax_amount_non_negative;

alter table public.store_orders
  add constraint store_orders_payment_provider_valid
  check (payment_provider in ('stripe', 'helcim', 'manual')),
  add constraint store_orders_helcim_card_last_four_valid
  check (helcim_card_last_four is null or helcim_card_last_four ~ '^[0-9]{4}$'),
  add constraint store_orders_turn14_quote_payload_object
  check (turn14_quote_payload is null or jsonb_typeof(turn14_quote_payload) = 'object'),
  add constraint store_orders_turn14_selected_shipping_array
  check (turn14_selected_shipping is null or jsonb_typeof(turn14_selected_shipping) = 'array'),
  add constraint store_orders_shipping_amount_non_negative
  check (shipping_amount >= 0),
  add constraint store_orders_fee_amount_non_negative
  check (fee_amount >= 0),
  add constraint store_orders_tax_amount_non_negative
  check (tax_amount >= 0);

create unique index if not exists store_orders_helcim_transaction_id_unique_idx
on public.store_orders (helcim_transaction_id)
where helcim_transaction_id is not null;

create index if not exists store_orders_payment_provider_status_idx
on public.store_orders (payment_provider, payment_status);

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  order_id uuid references public.store_orders(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  processing_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint payment_events_provider_valid check (provider in ('helcim', 'stripe', 'manual')),
  constraint payment_events_provider_event_id_unique unique (provider, provider_event_id),
  constraint payment_events_provider_event_id_not_blank check (length(btrim(provider_event_id)) > 0),
  constraint payment_events_event_type_not_blank check (length(btrim(event_type)) > 0),
  constraint payment_events_payload_object check (jsonb_typeof(payload) = 'object')
);

create table if not exists public.fulfillment_attempts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.store_orders(id) on delete cascade,
  provider text not null default 'turn14',
  idempotency_key text not null,
  status text not null default 'pending',
  request_summary jsonb not null default '{}'::jsonb,
  response jsonb,
  error_message text,
  submitted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint fulfillment_attempts_provider_valid check (provider = 'turn14'),
  constraint fulfillment_attempts_idempotency_key_unique unique (idempotency_key),
  constraint fulfillment_attempts_idempotency_key_not_blank check (length(btrim(idempotency_key)) > 0),
  constraint fulfillment_attempts_status_valid check (
    status in ('pending', 'submitted', 'succeeded', 'failed', 'cancelled')
  ),
  constraint fulfillment_attempts_request_summary_object check (jsonb_typeof(request_summary) = 'object'),
  constraint fulfillment_attempts_response_object check (response is null or jsonb_typeof(response) = 'object')
);

drop trigger if exists payment_events_set_updated_at on public.payment_events;
create trigger payment_events_set_updated_at
before update on public.payment_events
for each row execute function public.set_updated_at();

drop trigger if exists fulfillment_attempts_set_updated_at on public.fulfillment_attempts;
create trigger fulfillment_attempts_set_updated_at
before update on public.fulfillment_attempts
for each row execute function public.set_updated_at();

create index if not exists payment_events_order_id_idx
on public.payment_events (order_id)
where order_id is not null;
create index if not exists payment_events_created_at_idx
on public.payment_events (created_at desc);
create index if not exists fulfillment_attempts_order_id_idx
on public.fulfillment_attempts (order_id);
create index if not exists fulfillment_attempts_status_idx
on public.fulfillment_attempts (status);

grant select, insert, update, delete on table public.payment_events to service_role;
grant select, insert, update, delete on table public.fulfillment_attempts to service_role;

commit;
