-- Insert seeded brands
INSERT INTO brands (name, slug) VALUES
  ('Whipple', 'whipple'),
  ('ESS Supercharger Systems', 'ess'),
  ('Tomei Performance', 'tomei'),
  ('Kooks Headers', 'kooks'),
  ('Aeromotive', 'aeromotive'),
  ('BMR Suspension', 'bmr'),
  ('Eibach', 'eibach'),
  ('Stainless Works', 'stainless-works'),
  ('MTM Performance', 'mtm-performance'),
  ('Roush Performance', 'roush')
ON CONFLICT (slug) DO NOTHING;

-- Insert seeded products with placeholder images
INSERT INTO products (sku, name, short_description, long_description, category_id, subcategory_id, brand_id, price, map_price, list_price, purchase_cost, active, images, freight_class) VALUES
('WHL-2-8597', 'Whipple 3.5L Supercharger Kit - S197 V8 (05-14)', 'Drop-in bolt-on supercharger with verified 150hp gain on dyno.', 'Complete Whipple twin-screw supercharger kit for 4.6L/5.4L V8 S197 Mustangs. Includes blower, intercooler, wiring harness, and tune. Dyno-verified 150+ wheel horsepower gain on 93 octane.',
 (SELECT id FROM categories WHERE slug='superchargers'),
 (SELECT id FROM categories WHERE slug='sc-kits'),
 (SELECT id FROM brands WHERE slug='whipple'),
 3495, 3495, 3899, 2450, true,
 '[{"url":"https://placehold.co/600x400/2d1b1b/e5e7eb?text=Whipple+SC+Kit","alt":"Whipple Supercharger Kit","primary":true}]', 15),

('ESS-TS1-1900', 'ESS Tune-Spec Gen III Supercharger - S550 (15-23)', 'Whipple-based Eaton TVS 2300 blower for S550 GT.', 'ESS Tune-Spec Gen III supercharger with Eaton TVS 2300 vented rotor. Designed for S550 5.0L Coyote GT models. Includes intercooler, fuel system upgrade, and custom tune.',
 (SELECT id FROM categories WHERE slug='superchargers'),
 (SELECT id FROM categories WHERE slug='sc-kits'),
 (SELECT id FROM brands WHERE slug='ess'),
 3895, 3895, 4295, 2700, true,
 '[{"url":"https://placehold.co/600x400/1b2d1b/e5e7eb?text=ESS+Gen+III","alt":"ESS Tune-Spec Gen III","primary":true}]', 18),

('KO-KKT-FB', 'Kooks Long Tube Headers - Foxbody (79-93)', 'HST 2" long tube headers with 1.75" tubes. Made in USA.', 'Kooks High Output Series long tube headers for Foxbody Mustangs. 2" primary diameter, 1.75" tube sizing, flanged primaries. HST (High Output Series) design for maximum flow. Made in the USA.',
 (SELECT id FROM categories WHERE slug='headers-exhaust'),
 (SELECT id FROM categories WHERE slug='headers'),
 (SELECT id FROM brands WHERE slug='kooks'),
 895, 895, 1045, 625, true,
 '[{"url":"https://placehold.co/600x400/3d2b1b/e5e7eb?text=Kooks+Headers","alt":"Kooks Long Tube Headers","primary":true}]', 25),

('TM-T45-ST', 'Tomei Type-R T45 Turbo System - Mustang GT (15-23)', 'Complete turbo kit with HKS wastegate, charge pipes, manifold.', 'Tomei Type-R complete T45 turbo system for S550 Mustang GT. Includes exhaust manifolds, downpipes, charge pipes, intercooler, and all hardware. Designed to work with aftermarket tunes for 600+ hp potential.',
 (SELECT id FROM categories WHERE slug='turbo-kits'),
 (SELECT id FROM categories WHERE slug='t45-kits'),
 (SELECT id FROM brands WHERE slug='tomei'),
 4295, 4295, 4795, 3000, true,
 '[{"url":"https://placehold.co/600x400/1b1b3d/e5e7eb?text=Tomei+T45","alt":"Tomei T45 Turbo System","primary":true}]', 60),

('SS-EHT-SV', 'Stainless Works Cat-Back Exhaust - SVT/BOSS (01-04)', 'Full stainless steel cat-back system with quad tips.', 'Stainless Works full cat-back exhaust system for SVT Cobra and Mach 1. Triple-welded construction, quad exit tips. Direct bolt-on replacement with aggressive sound note.',
 (SELECT id FROM categories WHERE slug='headers-exhaust'),
 (SELECT id FROM categories WHERE slug='cat-back'),
 (SELECT id FROM brands WHERE slug='stainless-works'),
 1249, 1249, 1399, 875, true,
 '[{"url":"https://placehold.co/600x400/2d2d1b/e5e7eb?text=SS+Exhaust","alt":"Stainless Works Exhaust","primary":true}]', 35),

('AER-FP525', 'Aeromotive 340 LPH Fuel Pump - E85 Compatible', 'High-flow fuel pump for turbo/supercharged Mustangs. E85 ready.', 'Aeromotive 20-105 in-tank fuel pump upgraded to 340 LPH at 58 psi. E85 compatible for flex fuel applications. Ideal support component for forced induction builds requiring reliable high-pressure fuel delivery.',
 (SELECT id FROM categories WHERE slug='fuel-systems'),
 (SELECT id FROM categories WHERE slug='fuel-pumps'),
 (SELECT id FROM brands WHERE slug='aeromotive'),
 329, 329, 379, 230, true,
 '[{"url":"https://placehold.co/600x400/1b2d2d/e5e7eb?text=Aeromotive+Pump","alt":"Aeromotive Fuel Pump","primary":true}]', 2),

('BH-CR2378', 'BMR Control Arm Kit - S197 Front (05-14)', 'Heavy-duty adjustable control arms for S197 Mustang.', 'BMR Suspension full front control arm kit for S197 Mustang GT/CS. Replaces upper and lower control arms with heavy-duty bushings. Adjustable camber and caster settings. Includes all hardware.',
 (SELECT id FROM categories WHERE slug='suspension-gears'),
 (SELECT id FROM categories WHERE slug='control-arms'),
 (SELECT id FROM brands WHERE slug='bmr'),
 389, 389, 449, 270, true,
 '[{"url":"https://placehold.co/600x400/2d1b2d/e5e7eb?text=BMR+Control+Arms","alt":"BMR Control Arm Kit","primary":true}]', 18),

('EB-PRO-KIT-SV', 'Eibach Pro-Kit Coilover Set - S550 (15-23)', 'Adjustable coilover suspension for track and street.', 'Eibach Pro-Kit adjustable coilover suspension for S550 Mustang GT. Drop-in replacement with monotube design, adjustable ride height, and progressive springs. Perfect balance of street comfort and track performance.',
 (SELECT id FROM categories WHERE slug='suspension-gears'),
 (SELECT id FROM categories WHERE slug='springs-coilovers'),
 (SELECT id FROM brands WHERE slug='eibach'),
 1895, 1895, 2195, 1300, true,
 '[{"url":"https://placehold.co/600x400/2d2d2d/e5e7eb?text=Eibach+Coilovers","alt":"Eibach Pro-Kit Coilovers","primary":true}]', 45),

('BRM-BB6-SV', 'Brembo Big Brake Kit - 6-Piston Front (GT/CS)', '6-piston Brembo caliper kit with drilled rotors.', 'Brembo 6-piston monoblock front big brake kit for S197 GT and Cobra. Includes drilled and slotted performance rotors, stainless steel lines, and all mounting hardware. Significant stopping power upgrade.',
 (SELECT id FROM categories WHERE slug='brake-upgrades'),
 (SELECT id FROM categories WHERE slug='bbk-kits'),
 (SELECT id FROM brands WHERE slug='brembo'),
 4595, 4595, 5295, 3200, true,
 '[{"url":"https://placehold.co/600x400/1b1b1b/e5e7eb?text=Brembo+BBK","alt":"Brembo Big Brake Kit","primary":true}]', 80),

('MTM-KIT-373', 'MTM Performance Gear Ratio Conversion Kit - 3.73', 'Complete ring & pinion kit for SN95 and S197 rear ends.', 'MTM Performance complete gear conversion kit with 3.73 ratio. Includes new ring and pinion, bearings, seals, lubricant, and installation instructions. Fits 8.8" and 9.75" rear ends on SN95/S197 Mustangs.',
 (SELECT id FROM categories WHERE slug='suspension-gears'),
 (SELECT id FROM categories WHERE slug='gear-kits'),
 (SELECT id FROM brands WHERE slug='mtm-performance'),
 695, 695, 799, 485, true,
 '[{"url":"https://placehold.co/600x400/3d3d1b/e5e7eb?text=Gear+Conversion","alt":"MTM Gear Conversion Kit","primary":true}]', 20),

('WHL-INTAKE-S5', 'Whipple Cold Air Intake - S550 (15-23)', 'Drop-in cold air intake for maximum airflow.', 'Whipple performance cold air intake system for S550 Mustang GT. Features a large-diameter conical filter, heat shield, and smooth ram-air tube design. Increases airflow over stock for measurable power gains.',
 (SELECT id FROM categories WHERE slug='intakes'),
 (SELECT id FROM categories WHERE slug='cold-air-intakes'),
 (SELECT id FROM brands WHERE slug='whipple'),
 459, 459, 529, 320, true,
 '[{"url":"https://placehold.co/600x400/1b3d2b/e5e7eb?text=Whipple+Intake","alt":"Whipple Cold Air Intake","primary":true}]', 8),

('ROUSH-TB-5L', 'Roush Performance Throttle Body - S550 GT (15-23)', '62mm oversized throttle body for improved throttle response.', 'Roush 62mm throttle body upgrade for S550 Mustang GT. Replaces stock 71mm bore with optimized 62mm design for faster throttle response and reduced lag. Includes all gaskets and hardware.',
 (SELECT id FROM categories WHERE slug='intakes'),
 (SELECT id FROM categories WHERE slug='throttle-bodies'),
 (SELECT id FROM brands WHERE slug='roush'),
 389, 389, 449, 270, true,
 '[{"url":"https://placehold.co/600x400/1b1b3d/e5e7eb?text=Roush+TB","alt":"Roush Throttle Body","primary":true}]', 3),

('ROUSH-SC-SE', 'Roush R2000 Supercharger Kit - S550 GT (15-23)', 'Complete bolt-on supercharger with verified 427 whp gains.', 'Roush R2000 complete supercharger kit for S550 Mustang GT. Includes Eaton TVS 2300 blower, intercooler, fuel system components, and custom RFX tune. Dyno-verified 427 wheel horsepower on pump gas.',
 (SELECT id FROM categories WHERE slug='superchargers'),
 (SELECT id FROM categories WHERE slug='sc-kits'),
 (SELECT id FROM brands WHERE slug='roush'),
 5495, 5495, 6195, 3800, true,
 '[{"url":"https://placehold.co/600x400/2d1b1b/e5e7eb?text=Roush+R2000","alt":"Roush R2000 Supercharger","primary":true}]', 30),

('KO-XPIPE-FF', 'Kooks X-Pipe - Foxbody (86-93)', 'HST stainless steel X-pipe for maximum exhaust flow.', 'Kooks High Output Series X-pipe for Foxbody Mustangs. Stainless steel construction with optimized primary tube routing for improved scavenging and sound. Direct bolt-on replacement for stock H-pipe/X-pipe.',
 (SELECT id FROM categories WHERE slug='headers-exhaust'),
 (SELECT id FROM categories WHERE slug='headers'),
 (SELECT id FROM brands WHERE slug='kooks'),
 529, 529, 629, 370, true,
 '[{"url":"https://placehold.co/600x400/3d2b1b/e5e7eb?text=Kooks+X-Pipe","alt":"Kooks X-Pipe","primary":true}]', 12),

('SVE-TOP-FF', 'SVE Convertible Top - Foxbody (79-93)', 'Factory-spec replacement convertible top with black vinyl.', 'SVE reproduction convertible top for Foxbody Mustangs. Black vinyl material, chrome bows, and all hardware included. Matches factory specifications for proper fit and appearance.',
 (SELECT id FROM categories WHERE slug='interior-exterior'),
 (SELECT id FROM categories WHERE slug='convertible-tops'),
 (SELECT id FROM brands WHERE slug='ford-performance'),
 599, 599, 699, 420, true,
 '[{"url":"https://placehold.co/600x400/1b2d3d/e5e7eb?text=SVE+Top","alt":"SVE Convertible Top","primary":true}]', 50);

-- Insert YMM fitments for all seeded products
INSERT INTO product_fitments (product_id, vehicle_id, notes) VALUES
-- Whipple SC Kit S197
((SELECT id FROM products WHERE sku='WHL-2-8597'), (SELECT id FROM vehicle_generations WHERE year=2005 AND generation='S197'), 'Fits all V8 S197 models'),
((SELECT id FROM products WHERE sku='WHL-2-8597'), (SELECT id FROM vehicle_generations WHERE year=2014 AND generation='S197'), 'Covers 2005-2014 range'),

-- ESS SC Kit S550
((SELECT id FROM products WHERE sku='ESS-TS1-1900'), (SELECT id FROM vehicle_generations WHERE year=2015 AND generation='S550' AND model='Mustang GT'), 'Fits 5.0L GT only, not EcoBoost'),
((SELECT id FROM products WHERE sku='ESS-TS1-1900'), (SELECT id FROM vehicle_generations WHERE year=2023 AND generation='S550' AND model='Mustang GT'), 'Covers 2015-2023 S550 GT range'),

-- Kooks Headers Foxbody
((SELECT id FROM products WHERE sku='KO-KKT-FB'), (SELECT id FROM vehicle_generations WHERE year=1979 AND generation='Foxbody'), 'Fits all Foxbody V8 engines'),
((SELECT id FROM products WHERE sku='KO-KKT-FB'), (SELECT id FROM vehicle_generations WHERE year=1993 AND generation='Foxbody'), 'Covers 1979-1993 Foxbody range'),

-- Tomei Turbo Kit S550
((SELECT id FROM products WHERE sku='TM-T45-ST'), (SELECT id FROM vehicle_generations WHERE year=2015 AND generation='S550' AND model='Mustang GT'), 'Fits 5.0L GT with manual transmission only'),
((SELECT id FROM products WHERE sku='TM-T45-ST'), (SELECT id FROM vehicle_generations WHERE year=2023 AND generation='S550' AND model='Mustang GT'), 'Covers 2015-2023 S550 GT range'),

-- SS Exhaust SVT/Boss
((SELECT id FROM products WHERE sku='SS-EHT-SV'), (SELECT id FROM vehicle_generations WHERE year=2001 AND generation='SN95' AND model='SVT Cobra'), 'Fits SVT Cobra and Mach 1 only'),
((SELECT id FROM products WHERE sku='SS-EHT-SV'), (SELECT id FROM vehicle_generations WHERE year=2004 AND generation='SN95' AND model='Mach 1'), 'Covers 2001-2004 SVT/Mach 1 range'),

-- Aeromotive Fuel Pump
((SELECT id FROM products WHERE sku='AER-FP525'), (SELECT id FROM vehicle_generations WHERE year=1979 AND generation='Foxbody'), 'Universal fitment - works on all generations with fuel system prep'),
((SELECT id FROM products WHERE sku='AER-FP525'), (SELECT id FROM vehicle_generations WHERE year=2023 AND generation='S550' AND model='Mustang GT'), 'Compatible with all S550 models'),

-- BMR Control Arms
((SELECT id FROM products WHERE sku='BH-CR2378'), (SELECT id FROM vehicle_generations WHERE year=2005 AND generation='S197'), 'Fits all S197 GT/CS models'),
((SELECT id FROM products WHERE sku='BH-CR2378'), (SELECT id FROM vehicle_generations WHERE year=2014 AND generation='S197'), 'Covers 2005-2014 range'),

-- Eibach Coilovers
((SELECT id FROM products WHERE sku='EB-PRO-KIT-SV'), (SELECT id FROM vehicle_generations WHERE year=2015 AND generation='S550' AND model='Mustang GT'), 'Fits all S550 variants, height adjustable'),
((SELECT id FROM products WHERE sku='EB-PRO-KIT-SV'), (SELECT id FROM vehicle_generations WHERE year=2023 AND generation='S550' AND model='Shelby GT500'), 'Covers 2015-2023 S550 range'),

-- Brembo BBK
((SELECT id FROM products WHERE sku='BRM-BB6-SV'), (SELECT id FROM vehicle_generations WHERE year=2011 AND generation='S197' AND model='GT Coupe'), 'Direct bolt-on for GT models with standard brake mounting'),
((SELECT id FROM products WHERE sku='BRM-BB6-SV'), (SELECT id FROM vehicle_generations WHERE year=2014 AND generation='S197' AND model='SVT Cobra'), 'Covers 2011-2014 GT/SVT range'),

-- MTM Gear Kit
((SELECT id FROM products WHERE sku='MTM-KIT-373'), (SELECT id FROM vehicle_generations WHERE year=1994 AND generation='SN95' AND model='Coupe'), 'Fits SN95 8.8" rear end'),
((SELECT id FROM products WHERE sku='MTM-KIT-373'), (SELECT id FROM vehicle_generations WHERE year=2014 AND generation='S197' AND model='Coupe'), 'Covers SN95 through S197, 8.8" and 9.75" rear ends'),

-- Whipple Intake
((SELECT id FROM products WHERE sku='WHL-INTAKE-S5'), (SELECT id FROM vehicle_generations WHERE year=2015 AND generation='S550' AND model='Mustang GT'), 'Direct bolt-on for 5.0L GT models only'),
((SELECT id FROM products WHERE sku='WHL-INTAKE-S5'), (SELECT id FROM vehicle_generations WHERE year=2023 AND generation='S550' AND model='Mustang GT'), 'Covers 2015-2023 S550 GT range'),

-- Roush Throttle Body
((SELECT id FROM products WHERE sku='ROUSH-TB-5L'), (SELECT id FROM vehicle_generations WHERE year=2015 AND generation='S550' AND model='Mustang GT'), 'Fits 5.0L GT models, replaces stock TB'),
((SELECT id FROM products WHERE sku='ROUSH-TB-5L'), (SELECT id FROM vehicle_generations WHERE year=2023 AND generation='S550' AND model='Mustang GT'), 'Covers 2015-2023 S550 GT range'),

-- Roush SC Kit
((SELECT id FROM products WHERE sku='ROUSH-SC-SE'), (SELECT id FROM vehicle_generations WHERE year=2015 AND generation='S550' AND model='Mustang GT'), 'Complete kit for 5.0L GT only'),
((SELECT id FROM products WHERE sku='ROUSH-SC-SE'), (SELECT id FROM vehicle_generations WHERE year=2023 AND generation='S550' AND model='Mustang GT'), 'Covers 2015-2023 S550 GT range'),

-- Kooks X-Pipe
((SELECT id FROM products WHERE sku='KO-XPIPE-FF'), (SELECT id FROM vehicle_generations WHERE year=1986 AND generation='Foxbody'), 'Fits Foxbody with long tube headers, not stock manifolds'),
((SELECT id FROM products WHERE sku='KO-XPIPE-FF'), (SELECT id FROM vehicle_generations WHERE year=1993 AND generation='Foxbody'), 'Covers 1986-1993 Foxbody range'),

-- SVE Convertible Top
((SELECT id FROM products WHERE sku='SVE-TOP-FF'), (SELECT id FROM vehicle_generations WHERE year=1979 AND generation='Foxbody' AND body_style='Convertible'), 'Direct replacement for all Foxbody convertible models'),
((SELECT id FROM products WHERE sku='SVE-TOP-FF'), (SELECT id FROM vehicle_generations WHERE year=1993 AND generation='Foxbody' AND body_style='Convertible'), 'Covers 1979-1993 Foxbody convertibles');

