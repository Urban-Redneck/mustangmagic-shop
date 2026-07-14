begin;

alter table public.checkout_intents
drop constraint if exists checkout_intents_status_valid;

alter table public.checkout_intents
add constraint checkout_intents_status_valid check (
  status in (
    'address_collected',
    'turn14_quoted',
    'stripe_session_created',
    'paid',
    'refunded',
    'turn14_order_submitted',
    'turn14_order_failed',
    'cancelled',
    'expired',
    'failed'
  )
);

commit;
