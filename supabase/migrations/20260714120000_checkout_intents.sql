begin;

create table if not exists public.checkout_intents (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'address_collected',
  cart_items jsonb not null,
  contact_name text not null,
  contact_email text not null,
  contact_phone text not null,
  shipping_address jsonb not null,
  billing_address jsonb not null,
  billing_same_as_shipping boolean not null default true,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint checkout_intents_status_valid check (
    status in ('address_collected', 'stripe_session_created', 'paid', 'cancelled', 'expired', 'failed')
  ),
  constraint checkout_intents_cart_items_array check (jsonb_typeof(cart_items) = 'array'),
  constraint checkout_intents_contact_name_not_blank check (length(btrim(contact_name)) > 0),
  constraint checkout_intents_contact_email_not_blank check (length(btrim(contact_email)) > 0),
  constraint checkout_intents_contact_phone_not_blank check (length(btrim(contact_phone)) > 0),
  constraint checkout_intents_shipping_address_object check (jsonb_typeof(shipping_address) = 'object'),
  constraint checkout_intents_billing_address_object check (jsonb_typeof(billing_address) = 'object'),
  constraint checkout_intents_metadata_object check (jsonb_typeof(metadata) = 'object'),
  constraint checkout_intents_stripe_session_unique unique (stripe_checkout_session_id)
);

drop trigger if exists checkout_intents_set_updated_at on public.checkout_intents;
create trigger checkout_intents_set_updated_at
before update on public.checkout_intents
for each row execute function public.set_updated_at();

create index if not exists checkout_intents_created_at_idx
on public.checkout_intents (created_at desc);

create index if not exists checkout_intents_status_idx
on public.checkout_intents (status);

create index if not exists checkout_intents_contact_email_idx
on public.checkout_intents (contact_email);

create index if not exists checkout_intents_payment_intent_idx
on public.checkout_intents (stripe_payment_intent_id)
where stripe_payment_intent_id is not null;

grant select, insert, update, delete on table public.checkout_intents to service_role;

commit;
