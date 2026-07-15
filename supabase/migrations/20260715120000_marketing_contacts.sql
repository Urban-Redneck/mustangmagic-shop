create table if not exists public.marketing_contacts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text,
  phone text,
  source text not null default 'checkout',
  consent_status text not null default 'subscribed',
  consented_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  last_order_id uuid references public.store_orders(id) on delete set null,
  stripe_customer_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint marketing_contacts_email_unique unique (email),
  constraint marketing_contacts_email_not_blank check (length(btrim(email)) > 0),
  constraint marketing_contacts_source_not_blank check (length(btrim(source)) > 0),
  constraint marketing_contacts_consent_status_valid check (
    consent_status in ('subscribed', 'unsubscribed')
  ),
  constraint marketing_contacts_metadata_object check (jsonb_typeof(metadata) = 'object')
);

drop trigger if exists marketing_contacts_set_updated_at on public.marketing_contacts;
create trigger marketing_contacts_set_updated_at
before update on public.marketing_contacts
for each row execute function public.set_updated_at();

create index if not exists marketing_contacts_consent_status_idx
on public.marketing_contacts (consent_status);

create index if not exists marketing_contacts_last_order_id_idx
on public.marketing_contacts (last_order_id)
where last_order_id is not null;

grant select, insert, update, delete on table public.marketing_contacts to service_role;
