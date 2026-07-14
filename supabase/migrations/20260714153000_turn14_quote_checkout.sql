begin;

alter table public.checkout_intents
add column if not exists turn14_quote_id text,
add column if not exists turn14_order_id text,
add column if not exists turn14_quote_payload jsonb,
add column if not exists turn14_selected_shipping jsonb,
add column if not exists turn14_order_payload jsonb,
add column if not exists turn14_order_error text,
add column if not exists turn14_order_submitted_at timestamptz,
add column if not exists shipping_amount integer not null default 0,
add column if not exists fee_amount integer not null default 0,
add column if not exists acknowledge_prop_65 boolean not null default false,
add column if not exists acknowledge_epa boolean not null default false,
add column if not exists acknowledge_carb boolean not null default false;

alter table public.checkout_intents
drop constraint if exists checkout_intents_status_valid;

alter table public.checkout_intents
add constraint checkout_intents_status_valid check (
  status in (
    'address_collected',
    'turn14_quoted',
    'stripe_session_created',
    'paid',
    'turn14_order_submitted',
    'turn14_order_failed',
    'cancelled',
    'expired',
    'failed'
  )
);

alter table public.checkout_intents
drop constraint if exists checkout_intents_turn14_quote_payload_object,
drop constraint if exists checkout_intents_turn14_selected_shipping_array,
drop constraint if exists checkout_intents_turn14_order_payload_object,
drop constraint if exists checkout_intents_shipping_amount_non_negative,
drop constraint if exists checkout_intents_fee_amount_non_negative;

alter table public.checkout_intents
add constraint checkout_intents_turn14_quote_payload_object
check (turn14_quote_payload is null or jsonb_typeof(turn14_quote_payload) = 'object'),
add constraint checkout_intents_turn14_selected_shipping_array
check (turn14_selected_shipping is null or jsonb_typeof(turn14_selected_shipping) = 'array'),
add constraint checkout_intents_turn14_order_payload_object
check (turn14_order_payload is null or jsonb_typeof(turn14_order_payload) = 'object'),
add constraint checkout_intents_shipping_amount_non_negative
check (shipping_amount >= 0),
add constraint checkout_intents_fee_amount_non_negative
check (fee_amount >= 0);

create index if not exists checkout_intents_turn14_quote_id_idx
on public.checkout_intents (turn14_quote_id)
where turn14_quote_id is not null;

create index if not exists checkout_intents_turn14_order_id_idx
on public.checkout_intents (turn14_order_id)
where turn14_order_id is not null;

alter table public.store_orders
add column if not exists turn14_quote_id text,
add column if not exists turn14_order_id text;

create index if not exists store_orders_turn14_quote_id_idx
on public.store_orders (turn14_quote_id)
where turn14_quote_id is not null;

create index if not exists store_orders_turn14_order_id_idx
on public.store_orders (turn14_order_id)
where turn14_order_id is not null;

commit;
