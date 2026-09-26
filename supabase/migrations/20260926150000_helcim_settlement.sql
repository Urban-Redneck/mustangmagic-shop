begin;

alter table public.checkout_intents
  add column if not exists helcim_card_token text,
  add column if not exists helcim_date_created text,
  add column if not exists helcim_v2_transaction_id text,
  add column if not exists helcim_capture_status text,
  add column if not exists helcim_captured_at timestamptz,
  add column if not exists helcim_settlement_payload jsonb;

alter table public.checkout_intents
  drop constraint if exists checkout_intents_helcim_capture_status_valid;

alter table public.checkout_intents
  add constraint checkout_intents_helcim_capture_status_valid check (
    helcim_capture_status is null
    or helcim_capture_status in ('pending', 'captured', 'reversed', 'failed')
  );

create unique index if not exists checkout_intents_helcim_v2_transaction_id_unique_idx
on public.checkout_intents (helcim_v2_transaction_id)
where helcim_v2_transaction_id is not null;

commit;
