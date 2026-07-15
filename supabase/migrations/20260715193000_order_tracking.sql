alter table public.store_orders
drop constraint if exists store_orders_fulfillment_status_valid;

alter table public.store_orders
add constraint store_orders_fulfillment_status_valid check (
  fulfillment_status in (
    'pending',
    'reviewing',
    'ready_to_order',
    'ordered',
    'partially_fulfilled',
    'fulfilled',
    'cancelled'
  )
);

create table if not exists public.store_order_shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.store_orders(id) on delete set null,
  tracking_number text not null,
  turn14_tracking_id text,
  turn14_package_detail_id text,
  turn14_order_id text,
  website_order_number text,
  purchase_order_number text,
  invoice_id text,
  shipping_id integer,
  carrier_name text,
  service text,
  location text,
  ship_date date,
  items jsonb not null default '[]'::jsonb,
  raw_turn14_package_detail jsonb not null,
  tracking_email_status text not null default 'pending',
  tracking_email_result jsonb,
  tracking_email_sent_at timestamptz,
  first_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint store_order_shipments_tracking_number_unique unique (tracking_number),
  constraint store_order_shipments_tracking_number_not_blank check (length(btrim(tracking_number)) > 0),
  constraint store_order_shipments_items_array check (jsonb_typeof(items) = 'array'),
  constraint store_order_shipments_raw_object check (jsonb_typeof(raw_turn14_package_detail) = 'object'),
  constraint store_order_shipments_tracking_email_status_valid check (
    tracking_email_status in ('pending', 'sent', 'skipped', 'failed')
  ),
  constraint store_order_shipments_tracking_email_result_object check (
    tracking_email_result is null or jsonb_typeof(tracking_email_result) = 'object'
  )
);

drop trigger if exists store_order_shipments_set_updated_at on public.store_order_shipments;
create trigger store_order_shipments_set_updated_at
before update on public.store_order_shipments
for each row execute function public.set_updated_at();

create index if not exists store_order_shipments_order_id_idx
on public.store_order_shipments (order_id)
where order_id is not null;

create index if not exists store_order_shipments_purchase_order_number_idx
on public.store_order_shipments (purchase_order_number)
where purchase_order_number is not null;

create index if not exists store_order_shipments_turn14_order_id_idx
on public.store_order_shipments (turn14_order_id)
where turn14_order_id is not null;

create index if not exists store_order_shipments_tracking_email_status_idx
on public.store_order_shipments (tracking_email_status);

grant select, insert, update, delete on table public.store_order_shipments to service_role;
