begin;

alter table public.products
add column if not exists manual_price numeric(12, 2),
add column if not exists manual_price_reason text,
add column if not exists manual_price_updated_at timestamptz;

alter table public.products
drop constraint if exists products_manual_price_non_negative;

alter table public.products
add constraint products_manual_price_non_negative
check (manual_price is null or manual_price >= 0);

create index if not exists products_manual_price_idx
on public.products (manual_price)
where manual_price is not null;

commit;
