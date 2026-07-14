-- Mustang Magic product knowledge schema
-- Scope: shop-owned notes, videos, related product curation, and build packages.
-- This data is separate from Turn14 import/source data.

create table public.product_shop_notes (
  product_id uuid primary key references public.products(id) on delete cascade,
  recommended boolean not null default false,
  shop_notes text,
  horsepower_gain integer,
  torque_gain integer,
  difficulty integer,
  labor_hours numeric(5, 2),
  tune_required boolean not null default false,
  featured boolean not null default false,
  last_updated timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint product_shop_notes_shop_notes_not_blank check (
    shop_notes is null or length(btrim(shop_notes)) > 0
  ),
  constraint product_shop_notes_horsepower_gain_non_negative check (
    horsepower_gain is null or horsepower_gain >= 0
  ),
  constraint product_shop_notes_torque_gain_non_negative check (
    torque_gain is null or torque_gain >= 0
  ),
  constraint product_shop_notes_difficulty_range check (
    difficulty is null or difficulty between 1 and 5
  ),
  constraint product_shop_notes_labor_hours_non_negative check (
    labor_hours is null or labor_hours >= 0
  )
);

create table public.product_videos (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  title text not null,
  url text not null,
  provider text not null default 'youtube',
  provider_video_id text,
  thumbnail_url text,
  description text,
  is_public boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint product_videos_title_not_blank check (length(btrim(title)) > 0),
  constraint product_videos_url_not_blank check (length(btrim(url)) > 0),
  constraint product_videos_provider_valid check (
    provider in ('youtube', 'vimeo', 'instagram', 'facebook', 'tiktok', 'other')
  )
);

create table public.product_install_tips (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  tip text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint product_install_tips_tip_not_blank check (length(btrim(tip)) > 0),
  constraint product_install_tips_product_tip_unique unique (product_id, tip)
);

create table public.product_related_products (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  related_product_id uuid not null references public.products(id) on delete cascade,
  relationship_type text not null default 'related',
  note text,
  is_public boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint product_related_products_not_self check (product_id <> related_product_id),
  constraint product_related_products_unique unique (
    product_id,
    related_product_id,
    relationship_type
  ),
  constraint product_related_products_relationship_type_valid check (
    relationship_type in (
      'related',
      'required',
      'recommended',
      'upgrade',
      'replacement',
      'works_with'
    )
  )
);

create table public.build_packages (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  description text,
  generation_id uuid references public.mustang_generations(id) on delete restrict,
  category_id uuid references public.categories(id) on delete restrict,
  package_type text not null default 'street',
  is_public boolean not null default false,
  featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint build_packages_slug_unique unique (slug),
  constraint build_packages_slug_not_blank check (length(btrim(slug)) > 0),
  constraint build_packages_name_not_blank check (length(btrim(name)) > 0),
  constraint build_packages_package_type_valid check (
    package_type in (
      'street',
      'street_strip',
      'drag',
      'road_course',
      'restoration',
      'maintenance',
      'power_adder',
      'custom'
    )
  )
);

create table public.build_package_items (
  id uuid primary key default gen_random_uuid(),
  build_package_id uuid not null references public.build_packages(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null default 1,
  is_required boolean not null default true,
  group_name text,
  note text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint build_package_items_quantity_positive check (quantity > 0),
  constraint build_package_items_unique unique (build_package_id, product_id)
);

create or replace function public.set_product_shop_notes_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  new.last_updated = now();
  return new;
end;
$$;

create trigger product_shop_notes_set_updated_at
before update on public.product_shop_notes
for each row execute function public.set_product_shop_notes_updated_at();

create trigger product_videos_set_updated_at
before update on public.product_videos
for each row execute function public.set_updated_at();

create trigger product_install_tips_set_updated_at
before update on public.product_install_tips
for each row execute function public.set_updated_at();

create trigger product_related_products_set_updated_at
before update on public.product_related_products
for each row execute function public.set_updated_at();

create trigger build_packages_set_updated_at
before update on public.build_packages
for each row execute function public.set_updated_at();

create trigger build_package_items_set_updated_at
before update on public.build_package_items
for each row execute function public.set_updated_at();

create index product_shop_notes_product_id_idx
on public.product_shop_notes (product_id);
create index product_shop_notes_recommended_idx
on public.product_shop_notes (recommended)
where recommended = true;
create index product_shop_notes_featured_last_updated_idx
on public.product_shop_notes (featured, last_updated desc);

create index product_videos_product_id_idx
on public.product_videos (product_id);
create index product_videos_public_sort_idx
on public.product_videos (is_public, sort_order);
create index product_videos_provider_video_id_idx
on public.product_videos (provider, provider_video_id)
where provider_video_id is not null;

create index product_install_tips_product_sort_idx
on public.product_install_tips (product_id, sort_order);

create index product_related_products_product_id_idx
on public.product_related_products (product_id);
create index product_related_products_related_product_id_idx
on public.product_related_products (related_product_id);
create index product_related_products_public_sort_idx
on public.product_related_products (is_public, sort_order);
create index product_related_products_relationship_type_idx
on public.product_related_products (relationship_type);

create index build_packages_slug_idx
on public.build_packages (slug);
create index build_packages_generation_id_idx
on public.build_packages (generation_id);
create index build_packages_category_id_idx
on public.build_packages (category_id);
create index build_packages_public_featured_sort_idx
on public.build_packages (is_public, featured, sort_order);
create index build_packages_package_type_idx
on public.build_packages (package_type);

create index build_package_items_build_package_id_idx
on public.build_package_items (build_package_id);
create index build_package_items_product_id_idx
on public.build_package_items (product_id);
create index build_package_items_sort_idx
on public.build_package_items (build_package_id, sort_order);

grant select, insert, update, delete on table public.product_shop_notes to service_role;
grant select, insert, update, delete on table public.product_videos to service_role;
grant select, insert, update, delete on table public.product_install_tips to service_role;
grant select, insert, update, delete on table public.product_related_products to service_role;
grant select, insert, update, delete on table public.build_packages to service_role;
grant select, insert, update, delete on table public.build_package_items to service_role;
