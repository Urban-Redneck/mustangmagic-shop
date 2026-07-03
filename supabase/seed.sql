-- MustangMagic.store Supabase V1 seed data
-- Safe to rerun. Seeds the generation and curated category browse structure.

begin;

insert into public.mustang_generations (
  slug,
  name,
  start_year,
  end_year,
  description,
  sort_order
)
values
  (
    'fox-body',
    'Fox Body',
    1979,
    1993,
    '1979-1993 Mustang parts and performance upgrades.',
    10
  ),
  (
    'sn95',
    'SN95',
    1994,
    2004,
    '1994-2004 Mustang parts and performance upgrades.',
    20
  ),
  (
    's197',
    'S197',
    2005,
    2014,
    '2005-2014 Mustang parts and performance upgrades.',
    30
  ),
  (
    's550',
    'S550',
    2015,
    2023,
    '2015-2023 Mustang parts and performance upgrades.',
    40
  ),
  (
    's650',
    'S650',
    2024,
    null,
    '2024-present Mustang parts and performance upgrades.',
    50
  )
on conflict (slug) do update set
  name = excluded.name,
  start_year = excluded.start_year,
  end_year = excluded.end_year,
  description = excluded.description,
  sort_order = excluded.sort_order;

insert into public.categories (
  name,
  slug,
  description,
  sort_order,
  is_active
)
values
  (
    'Engine',
    'engine',
    'Engine components, upgrades, and supporting hardware.',
    10,
    true
  ),
  (
    'Exhaust',
    'exhaust',
    'Headers, mid-pipes, cat-back systems, axle-backs, and exhaust accessories.',
    20,
    true
  ),
  (
    'Fuel System',
    'fuel-system',
    'Fuel pumps, injectors, rails, lines, regulators, and related upgrades.',
    30,
    true
  ),
  (
    'Forced Induction',
    'forced-induction',
    'Supercharger, turbocharger, intercooler, and boost-supporting parts.',
    40,
    true
  ),
  (
    'Suspension',
    'suspension',
    'Springs, shocks, struts, control arms, bushings, and handling upgrades.',
    50,
    true
  ),
  (
    'Brakes',
    'brakes',
    'Brake pads, rotors, calipers, lines, and stopping upgrades.',
    60,
    true
  ),
  (
    'Drivetrain',
    'drivetrain',
    'Clutches, transmissions, driveshafts, axles, gears, and driveline parts.',
    70,
    true
  ),
  (
    'Wheels & Tires',
    'wheels-tires',
    'Wheels, tire fitment, lug hardware, and related wheel accessories.',
    80,
    true
  ),
  (
    'Exterior',
    'exterior',
    'Body, aero, lighting-adjacent exterior upgrades, and appearance parts.',
    90,
    true
  ),
  (
    'Interior',
    'interior',
    'Interior upgrades, controls, seating, trim, and cabin accessories.',
    100,
    true
  ),
  (
    'Electronics',
    'electronics',
    'Gauges, sensors, modules, ignition electronics, and electrical upgrades.',
    110,
    true
  )
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

commit;
