begin;

create table if not exists public.store_orders (
  id uuid primary key default gen_random_uuid(),
  stripe_checkout_session_id text not null,
  stripe_payment_intent_id text,
  stripe_customer_id text,
  status text not null default 'paid',
  payment_status text not null,
  fulfillment_status text not null default 'pending',
  amount_subtotal integer,
  amount_total integer not null,
  currency text not null default 'usd',
  customer_email text,
  customer_name text,
  customer_phone text,
  billing_address jsonb,
  shipping_address jsonb,
  metadata jsonb not null default '{}'::jsonb,
  raw_stripe_session jsonb not null,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint store_orders_stripe_checkout_session_id_unique unique (stripe_checkout_session_id),
  constraint store_orders_stripe_checkout_session_id_not_blank check (length(btrim(stripe_checkout_session_id)) > 0),
  constraint store_orders_status_valid check (status in ('pending', 'paid', 'cancelled', 'refunded', 'failed')),
  constraint store_orders_payment_status_not_blank check (length(btrim(payment_status)) > 0),
  constraint store_orders_fulfillment_status_valid check (
    fulfillment_status in ('pending', 'reviewing', 'ready_to_order', 'ordered', 'partially_fulfilled', 'fulfilled', 'cancelled')
  ),
  constraint store_orders_amount_subtotal_non_negative check (amount_subtotal is null or amount_subtotal >= 0),
  constraint store_orders_amount_total_non_negative check (amount_total >= 0),
  constraint store_orders_currency_not_blank check (length(btrim(currency)) > 0),
  constraint store_orders_billing_address_object check (billing_address is null or jsonb_typeof(billing_address) = 'object'),
  constraint store_orders_shipping_address_object check (shipping_address is null or jsonb_typeof(shipping_address) = 'object'),
  constraint store_orders_metadata_object check (jsonb_typeof(metadata) = 'object'),
  constraint store_orders_raw_stripe_session_object check (jsonb_typeof(raw_stripe_session) = 'object')
);

create table if not exists public.store_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.store_orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  turn14_id text,
  part_number text,
  product_name text not null,
  quantity integer not null,
  unit_amount integer not null,
  amount_total integer not null,
  currency text not null default 'usd',
  stripe_line_item_id text,
  stripe_product_id text,
  raw_stripe_line_item jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint store_order_items_quantity_positive check (quantity > 0),
  constraint store_order_items_unit_amount_non_negative check (unit_amount >= 0),
  constraint store_order_items_amount_total_non_negative check (amount_total >= 0),
  constraint store_order_items_product_name_not_blank check (length(btrim(product_name)) > 0),
  constraint store_order_items_currency_not_blank check (length(btrim(currency)) > 0),
  constraint store_order_items_raw_stripe_line_item_object check (jsonb_typeof(raw_stripe_line_item) = 'object')
);

create table if not exists public.stripe_webhook_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null,
  event_type text not null,
  api_version text,
  livemode boolean not null default false,
  payload jsonb not null,
  processed_at timestamptz,
  processing_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint stripe_webhook_events_stripe_event_id_unique unique (stripe_event_id),
  constraint stripe_webhook_events_stripe_event_id_not_blank check (length(btrim(stripe_event_id)) > 0),
  constraint stripe_webhook_events_event_type_not_blank check (length(btrim(event_type)) > 0),
  constraint stripe_webhook_events_payload_object check (jsonb_typeof(payload) = 'object')
);

drop trigger if exists store_orders_set_updated_at on public.store_orders;
create trigger store_orders_set_updated_at
before update on public.store_orders
for each row execute function public.set_updated_at();

drop trigger if exists store_order_items_set_updated_at on public.store_order_items;
create trigger store_order_items_set_updated_at
before update on public.store_order_items
for each row execute function public.set_updated_at();

drop trigger if exists stripe_webhook_events_set_updated_at on public.stripe_webhook_events;
create trigger stripe_webhook_events_set_updated_at
before update on public.stripe_webhook_events
for each row execute function public.set_updated_at();

create index if not exists store_orders_created_at_idx
on public.store_orders (created_at desc);
create index if not exists store_orders_payment_intent_idx
on public.store_orders (stripe_payment_intent_id)
where stripe_payment_intent_id is not null;
create index if not exists store_orders_fulfillment_status_idx
on public.store_orders (fulfillment_status);
create index if not exists store_orders_customer_email_idx
on public.store_orders (customer_email)
where customer_email is not null;

create index if not exists store_order_items_order_id_idx
on public.store_order_items (order_id);
create index if not exists store_order_items_product_id_idx
on public.store_order_items (product_id)
where product_id is not null;
create index if not exists store_order_items_turn14_id_idx
on public.store_order_items (turn14_id)
where turn14_id is not null;
create index if not exists store_order_items_part_number_idx
on public.store_order_items (part_number)
where part_number is not null;

create index if not exists stripe_webhook_events_event_type_created_at_idx
on public.stripe_webhook_events (event_type, created_at desc);
create index if not exists stripe_webhook_events_processed_at_idx
on public.stripe_webhook_events (processed_at)
where processed_at is not null;

grant select, insert, update, delete on table public.store_orders to service_role;
grant select, insert, update, delete on table public.store_order_items to service_role;
grant select, insert, update, delete on table public.stripe_webhook_events to service_role;

commit;
