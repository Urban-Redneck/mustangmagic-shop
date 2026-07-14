-- Seed Mustang Magic product knowledge for AER18698.
-- Safe to rerun. Related product linkage is inserted only after AER11540 exists.

insert into public.product_shop_notes (
  product_id,
  recommended,
  shop_notes,
  horsepower_gain,
  torque_gain,
  difficulty,
  labor_hours,
  tune_required,
  featured
)
select
  products.id,
  true,
  'Quality tank that fits like original.',
  null,
  null,
  2,
  2,
  false,
  false
from public.products
where products.part_number = 'aer18698'
on conflict (product_id) do update set
  recommended = excluded.recommended,
  shop_notes = excluded.shop_notes,
  horsepower_gain = excluded.horsepower_gain,
  torque_gain = excluded.torque_gain,
  difficulty = excluded.difficulty,
  labor_hours = excluded.labor_hours,
  tune_required = excluded.tune_required,
  featured = excluded.featured;

insert into public.product_related_products (
  product_id,
  related_product_id,
  relationship_type,
  note,
  is_public,
  sort_order
)
select
  product.id,
  related.id,
  'recommended',
  'Related product: AER11540',
  true,
  10
from public.products as product
cross join public.products as related
where product.part_number = 'aer18698'
  and related.part_number = 'aer11540'
on conflict (product_id, related_product_id, relationship_type) do update set
  note = excluded.note,
  is_public = excluded.is_public,
  sort_order = excluded.sort_order;
