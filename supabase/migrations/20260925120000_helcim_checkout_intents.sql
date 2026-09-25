begin;

alter table public.checkout_intents
  add column if not exists payment_provider text not null default 'helcim',
  add column if not exists helcim_transaction_id text,
  add column if not exists helcim_payment_status text,
  add column if not exists helcim_card_brand text,
  add column if not exists helcim_card_last_four text,
  add column if not exists helcim_authorized_at timestamptz,
  add column if not exists amount_subtotal integer not null default 0,
  add column if not exists amount_total integer not null default 0,
  add column if not exists currency text not null default 'USD';

alter table public.checkout_intents
  drop constraint if exists checkout_intents_status_valid,
  drop constraint if exists checkout_intents_payment_provider_valid,
  drop constraint if exists checkout_intents_helcim_card_last_four_valid;

alter table public.checkout_intents
  add constraint checkout_intents_status_valid check (
    status in (
      'address_collected',
      'turn14_quoted',
      'helcim_session_created',
      'helcim_authorized',
      'stripe_session_created',
      'paid',
      'refunded',
      'turn14_order_submitted',
      'turn14_order_failed',
      'cancelled',
      'expired',
      'failed'
    )
  ),
  add constraint checkout_intents_payment_provider_valid
  check (payment_provider in ('helcim', 'stripe', 'manual')),
  add constraint checkout_intents_helcim_card_last_four_valid
  check (helcim_card_last_four is null or helcim_card_last_four ~ '^[0-9]{4}$'),
  add constraint checkout_intents_amount_subtotal_non_negative
  check (amount_subtotal >= 0),
  add constraint checkout_intents_amount_total_non_negative
  check (amount_total >= 0),
  add constraint checkout_intents_currency_valid
  check (currency in ('USD', 'CAD'));

create unique index if not exists checkout_intents_helcim_transaction_id_unique_idx
on public.checkout_intents (helcim_transaction_id)
where helcim_transaction_id is not null;

create index if not exists checkout_intents_payment_provider_status_idx
on public.checkout_intents (payment_provider, status);

commit;
