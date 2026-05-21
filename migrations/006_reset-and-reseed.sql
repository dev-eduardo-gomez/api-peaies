-- =====================================================================
-- 006_reset-and-reseed.sql
-- Full reset: truncate all seed data, then reseed with authoritative data.
-- Sources:
--   2AxlesAuto       → real TollGuru API data (v1__init.sql V3)
--   2AxlesMotorcycle → real TollGuru API data (migration 004, Laguna Verde corrected: 160→62)
--   All other types  → derived from 2AxlesAuto via CAPUFE published multipliers (source=MANUAL)
-- valid_from = '2026-01-01' ensures rates are always active.
-- =====================================================================

-- -----------------------------------------------------------------------
-- STEP 1: Truncate all tables (leaf → root, FK-safe)
-- -----------------------------------------------------------------------
TRUNCATE TABLE
  audit_events,
  pois,
  toll_calculation_route_directions,
  toll_calculation_route_booths,
  toll_calculation_routes,
  toll_calculations,
  vehicle_tags,
  vehicles,
  refresh_tokens,
  user_roles,
  users,
  toll_booth_accepted_tags,
  toll_section_rates,
  toll_section_accepted_tags,
  toll_sections,
  toll_booth_rates,
  toll_booths,
  vehicle_types,
  fuel_types,
  cargo_types,
  toll_tag_systems,
  toll_operators,
  roles
CASCADE;

-- Reset all SMALLSERIAL sequences
ALTER SEQUENCE roles_id_seq              RESTART WITH 1;
ALTER SEQUENCE vehicle_types_id_seq      RESTART WITH 1;
ALTER SEQUENCE fuel_types_id_seq         RESTART WITH 1;
ALTER SEQUENCE cargo_types_id_seq        RESTART WITH 1;
ALTER SEQUENCE toll_tag_systems_id_seq   RESTART WITH 1;
ALTER SEQUENCE toll_operators_id_seq     RESTART WITH 1;
ALTER SEQUENCE toll_booth_rates_id_seq   RESTART WITH 1;


-- -----------------------------------------------------------------------
-- STEP 2: Roles
-- -----------------------------------------------------------------------
INSERT INTO roles (name, description) VALUES
  ('ROLE_USER',          'Standard user — can calculate tolls and manage their vehicles'),
  ('ROLE_ADMIN',         'System administrator with full access'),
  ('ROLE_FLEET_MANAGER', 'Fleet manager with elevated rate limits');


-- -----------------------------------------------------------------------
-- STEP 3: Vehicle types (TollGuru-compatible codes, consolidated)
-- -----------------------------------------------------------------------
INSERT INTO vehicle_types (code, description, axles, category, max_weight_kg, max_height_m) VALUES
  ('2AxlesAuto',       'Car, SUV or pickup (2 axles)',          2, 'AUTO',       3500.00,  2.50),
  ('3AxlesAuto',       'Car or SUV with trailer (3 axles)',     3, 'AUTO',       5000.00,  2.80),
  ('2AxlesMotorcycle', 'Motorcycle (2 axles)',                  2, 'MOTORCYCLE',  500.00,  1.80),
  ('2AxlesPickup',     'Pickup truck (2 axles)',                2, 'AUTO',       3500.00,  2.50),
  ('3AxlesPickup',     'Pickup with trailer (3 axles)',         3, 'AUTO',       5500.00,  2.80),
  ('2AxlesBus',        'Bus (2 axles)',                         2, 'BUS',       12000.00,  4.00),
  ('3AxlesBus',        'Bus (3 axles)',                         3, 'BUS',       18000.00,  4.20),
  ('4AxlesBus',        'Bus (4 axles)',                         4, 'BUS',       24000.00,  4.20),
  ('2AxlesTruck',      'Truck (2 axles)',                       2, 'TRUCK',      7500.00,  3.50),
  ('3AxlesTruck',      'Truck (3 axles)',                       3, 'TRUCK',     15000.00,  4.00),
  ('4AxlesTruck',      'Truck (4 axles)',                       4, 'TRUCK',     25000.00,  4.20),
  ('5AxlesTruck',      'Truck (5 axles)',                       5, 'TRUCK',     35000.00,  4.20),
  ('6AxlesTruck',      'Truck (6 axles)',                       6, 'TRUCK',     45000.00,  4.20),
  ('7AxlesTruck',      'Truck (7 axles)',                       7, 'TRUCK',     55000.00,  4.50),
  ('2AxlesRV',         'Motorhome / RV (2 axles)',              2, 'RV',         4500.00,  3.50),
  ('3AxlesRV',         'Motorhome / RV (3 axles)',              3, 'RV',         8000.00,  3.80),
  ('ElectricAuto',     'Electric vehicle (2 axles)',            2, 'EV',         3500.00,  2.50);


-- -----------------------------------------------------------------------
-- STEP 4: Fuel types (prices reflect Mexico average 2026)
-- -----------------------------------------------------------------------
INSERT INTO fuel_types (code, name, unit, avg_price_mxn) VALUES
  ('MAGNA',    'Gasolina Magna',   'liter', 23.50),
  ('PREMIUM',  'Gasolina Premium', 'liter', 25.80),
  ('DIESEL',   'Diésel',           'liter', 26.40),
  ('ELECTRIC', 'Eléctrico',        'kWh',    4.50),
  ('LPG',      'Gas LP',           'liter', 12.30);


-- -----------------------------------------------------------------------
-- STEP 5: Cargo types
-- -----------------------------------------------------------------------
INSERT INTO cargo_types (code, name, requires_special_permit) VALUES
  ('NONE',         'No cargo',             false),
  ('DRY',          'Dry cargo',            false),
  ('REFRIGERATED', 'Refrigerated cargo',   false),
  ('LIQUID',       'Liquids',              false),
  ('HAZMAT',       'Hazardous materials',  true),
  ('LIVESTOCK',    'Livestock',            false),
  ('OVERSIZED',    'Oversized cargo',      true);


-- -----------------------------------------------------------------------
-- STEP 6: Toll tag systems (real Mexican telepeaje networks)
-- -----------------------------------------------------------------------
INSERT INTO toll_tag_systems (code, name, country, operator, website) VALUES
  ('IAVE',                'IAVE',                'MEX', 'CAPUFE',          'https://iave.capufe.gob.mx'),
  ('TAG_PASE',            'Tag PASE',            'MEX', 'PASE',            'https://www.pase.com.mx'),
  ('TELEVIA',             'TeleVia',             'MEX', 'TeleVia',         'https://www.televia.com.mx'),
  ('VIAPASS',             'VIAPass',             'MEX', 'ViaPass',         'https://www.viapass.com.mx'),
  ('SIGO',                'Sigo',                'MEX', 'Sigo',            NULL),
  ('TELEPEAJE_CHIHUAHUA', 'Telepeaje Chihuahua', 'MEX', 'Gob. Chihuahua',  NULL),
  ('TAG_QUICKPASS',       'TAG QuickPass',       'MEX', 'QuickPass',       NULL);


-- -----------------------------------------------------------------------
-- STEP 7: Toll operators
-- -----------------------------------------------------------------------
INSERT INTO toll_operators (code, name, country, website) VALUES
  ('CAPUFE',  'Caminos y Puentes Federales de Ingresos y Servicios Conexos', 'MEX', 'https://www.gob.mx/capufe'),
  ('FONADIN', 'Fondo Nacional de Infraestructura',                            'MEX', NULL),
  ('OHL',     'OHL México',                                                   'MEX', NULL),
  ('IDEAL',   'Impulsora del Desarrollo y el Empleo en América Latina',       'MEX', NULL),
  ('PINFRA',  'Promotora y Operadora de Infraestructura',                     'MEX', NULL),
  ('ICA',     'Ingenieros Civiles Asociados',                                 'MEX', NULL);


-- -----------------------------------------------------------------------
-- STEP 8: Toll booths — 15 real booths, Ciudad del Carmen → Monterrey
-- Real TollGuru data: external_id, name, road, coordinates
-- ST_MakePoint(longitude, latitude)
-- -----------------------------------------------------------------------
INSERT INTO toll_booths (external_id, name, road, state, country, location, system_type, operator_id)
VALUES
  (526010000, 'Cd. Del Carmen - V. Hermosa - Ctra Pte Zacatal', 'Puente El Zacatal',                 'Campeche', 'MEX',
    ST_SetSRID(ST_MakePoint(-91.860885, 18.612621), 4326)::geography, 'BARRIER', (SELECT id FROM toll_operators WHERE code='CAPUFE')),
  (523704000, 'Ent.Frontera - Ent.Loma De Caballo Csta',        'Libramiento de Villahermosa (180D)', 'Tabasco',  'MEX',
    ST_SetSRID(ST_MakePoint(-92.930464, 18.075852), 4326)::geography, 'BARRIER', (SELECT id FROM toll_operators WHERE code='CAPUFE')),
  (523701200, 'Cardenas - Agua Dulce - Ctra S. Magallanes',     'Ent. Agua Dulce - Cárdenas (180D)', 'Tabasco',  'MEX',
    ST_SetSRID(ST_MakePoint(-93.812908, 18.030819), 4326)::geography, 'BARRIER', (SELECT id FROM toll_operators WHERE code='CAPUFE')),
  (526011100, 'Teapa - Cosoleacaque - Ctra Pte A Dovali J',     'Minatitlán - Mundo Nuevo (180D)',   'Veracruz', 'MEX',
    ST_SetSRID(ST_MakePoint(-94.397016, 18.013838), 4326)::geography, 'BARRIER', (SELECT id FROM toll_operators WHERE code='CAPUFE')),
  (523400800, 'Isla - Cosoleacaque - Ctra Acayucan',            'La Tinaja - Cosoleacaque (145D)',   'Veracruz', 'MEX',
    ST_SetSRID(ST_MakePoint(-94.937263, 17.909860), 4326)::geography, 'BARRIER', (SELECT id FROM toll_operators WHERE code='CAPUFE')),
  (523400200, 'La Tinaja Isla-Csta - 118 - Cosamaloapan',       'La Tinaja - Cosoleacaque (145D)',   'Veracruz', 'MEX',
    ST_SetSRID(ST_MakePoint(-95.822110, 18.335283), 4326)::geography, 'BARRIER', (SELECT id FROM toll_operators WHERE code='CAPUFE')),
  (523509000, 'Veracruz - La Tinaja - Ctra Paso Del Toro 117',  'Córdoba - Veracruz (150D)',         'Veracruz', 'MEX',
    ST_SetSRID(ST_MakePoint(-96.198660, 19.081873), 4326)::geography, 'BARRIER', (SELECT id FROM toll_operators WHERE code='CAPUFE')),
  (523700200, 'Caseta San Julian',                              'Cardel - Veracruz (180D)',          'Veracruz', 'MEX',
    ST_SetSRID(ST_MakePoint(-96.257600, 19.239278), 4326)::geography, 'BARRIER', (SELECT id FROM toll_operators WHERE code='CAPUFE')),
  (523700000, 'La Antigua Carril',                              'Cardel - Veracruz (180D)',          'Veracruz', 'MEX',
    ST_SetSRID(ST_MakePoint(-96.311009, 19.320277), 4326)::geography, 'BARRIER', (SELECT id FROM toll_operators WHERE code='CAPUFE')),
  (523700400, 'Laguna Verde - Nautla',                          'Alamo - Veracruz (180D)',           'Veracruz', 'MEX',
    ST_SetSRID(ST_MakePoint(-96.684795, 20.043669), 4326)::geography, 'BARRIER', (SELECT id FROM toll_operators WHERE code='CAPUFE')),
  (522801000, 'San Rafael - Tihuatlán Cast',                    'Gutiérrez Zamora - Tihuatlán (130D)','Veracruz','MEX',
    ST_SetSRID(ST_MakePoint(-97.246681, 20.459356), 4326)::geography, 'BARRIER', (SELECT id FROM toll_operators WHERE code='CAPUFE')),
  (522800000, 'Tuxpan',                                         'Tihuatlán - Tuxpam (130D)',         'Veracruz', 'MEX',
    ST_SetSRID(ST_MakePoint(-97.482742, 20.752912), 4326)::geography, 'BARRIER', (SELECT id FROM toll_operators WHERE code='CAPUFE')),
  (524601000, 'Los Gil - Buenos Aires',                         'Autopista Tuxpan Tampico',          'Veracruz', 'MEX',
    ST_SetSRID(ST_MakePoint(-97.467393, 20.886027), 4326)::geography, 'BARRIER', (SELECT id FROM toll_operators WHERE code='CAPUFE')),
  (524600600, 'Ozuluama - Buenos Aires',                        'Autopista Tuxpan Tampico',          'Veracruz', 'MEX',
    ST_SetSRID(ST_MakePoint(-97.626560, 21.325583), 4326)::geography, 'BARRIER', (SELECT id FROM toll_operators WHERE code='CAPUFE')),
  (526039100, 'Tuxpan - Tampico - Ctra Pte Tampico',           'Puente Tampico',                    'Tamaulipas','MEX',
    ST_SetSRID(ST_MakePoint(-97.824577, 22.218360), 4326)::geography, 'BARRIER', (SELECT id FROM toll_operators WHERE code='CAPUFE'));


-- -----------------------------------------------------------------------
-- STEP 9: Accepted tags (IAVE + TAG_PASE universal; TELEVIA on select booths)
-- -----------------------------------------------------------------------
INSERT INTO toll_booth_accepted_tags (toll_booth_id, tag_system_id, is_primary)
SELECT b.id, t.id, true
FROM toll_booths b
CROSS JOIN toll_tag_systems t
WHERE t.code IN ('IAVE', 'TAG_PASE')
  AND b.external_id IN (
    526010000, 523704000, 523701200, 526011100, 523400800, 523400200,
    523509000, 523700200, 523700000, 523700400, 522801000, 522800000,
    524601000, 524600600, 526039100
  );

INSERT INTO toll_booth_accepted_tags (toll_booth_id, tag_system_id, is_primary)
SELECT b.id, t.id, true
FROM toll_booths b
CROSS JOIN toll_tag_systems t
WHERE t.code = 'TELEVIA'
  AND b.external_id IN (523701200, 523400800, 523400200, 523509000, 523700400, 522801000, 522800000);


-- -----------------------------------------------------------------------
-- STEP 10: Rates — authoritative TollGuru data for 2AxlesAuto
-- Source: TollGuru API, captured 2025-11-01. valid_from set to 2026-01-01.
-- (cash_cost = tag_pri_cost = prepaid_card_cost — CAPUFE does not discount for tag)
-- -----------------------------------------------------------------------
INSERT INTO toll_booth_rates (toll_booth_id, vehicle_type_id, cash_cost, tag_pri_cost, prepaid_card_cost, currency, valid_from, source)
SELECT
  b.id,
  (SELECT id FROM vehicle_types WHERE code = '2AxlesAuto'),
  r.cost, r.cost, r.cost,
  'MXN', '2026-01-01', 'TOLLGURU'
FROM toll_booths b
JOIN (VALUES
  (526010000::BIGINT, 109.00),
  (523704000::BIGINT,  74.00),
  (523701200::BIGINT, 101.00),
  (526011100::BIGINT,  22.00),
  (523400800::BIGINT, 258.00),
  (523400200::BIGINT, 277.00),
  (523509000::BIGINT, 130.00),
  (523700200::BIGINT,  27.00),
  (523700000::BIGINT,  82.00),
  (523700400::BIGINT, 122.00),
  (522801000::BIGINT, 248.00),
  (522800000::BIGINT,  55.00),
  (524601000::BIGINT,  44.00),
  (524600600::BIGINT, 359.00),
  (526039100::BIGINT,  38.00)
) AS r(external_id, cost) ON b.external_id = r.external_id;


-- -----------------------------------------------------------------------
-- STEP 11: Rates — authoritative TollGuru data for 2AxlesMotorcycle
-- Source: TollGuru API, captured 2026-05-20.
-- Note: Laguna Verde corrected from erroneous 160 → 62 (~0.52x of auto 122)
-- -----------------------------------------------------------------------
INSERT INTO toll_booth_rates (toll_booth_id, vehicle_type_id, cash_cost, tag_pri_cost, prepaid_card_cost, currency, valid_from, source)
SELECT
  b.id,
  (SELECT id FROM vehicle_types WHERE code = '2AxlesMotorcycle'),
  r.cost, r.cost, r.cost,
  'MXN', '2026-01-01', 'TOLLGURU'
FROM toll_booths b
JOIN (VALUES
  (526010000::BIGINT,  57.00),
  (523704000::BIGINT,  38.00),
  (523701200::BIGINT,  53.00),
  (526011100::BIGINT,  11.00),
  (523400800::BIGINT, 135.00),
  (523400200::BIGINT, 145.00),
  (523509000::BIGINT,  68.00),
  (523700200::BIGINT,  14.00),
  (523700000::BIGINT,  43.00),
  (523700400::BIGINT,  62.00),  -- corrected: TollGuru reported 160 (erroneous), real ~0.52×auto
  (522801000::BIGINT, 130.00),
  (522800000::BIGINT,  29.00),
  (524601000::BIGINT,  23.00),
  (524600600::BIGINT, 187.00),
  (526039100::BIGINT,  18.00)
) AS r(external_id, cost) ON b.external_id = r.external_id;


-- -----------------------------------------------------------------------
-- STEP 12: Rates — all remaining vehicle types
-- Derived from 2AxlesAuto using CAPUFE published tariff class multipliers.
-- Source = 'MANUAL' — approximations, not direct TollGuru data.
-- -----------------------------------------------------------------------
WITH auto_rates AS (
  SELECT r.toll_booth_id, r.cash_cost, r.tag_pri_cost, r.prepaid_card_cost, r.currency
  FROM toll_booth_rates r
  JOIN vehicle_types vt ON vt.id = r.vehicle_type_id
  WHERE vt.code = '2AxlesAuto' AND r.valid_from = '2026-01-01'
),
multipliers (vehicle_code, factor) AS (
  VALUES
    ('3AxlesAuto',   1.30),
    ('2AxlesPickup', 1.00),
    ('3AxlesPickup', 1.30),
    ('2AxlesBus',    2.00),
    ('3AxlesBus',    2.50),
    ('4AxlesBus',    3.00),
    ('2AxlesTruck',  1.50),
    ('3AxlesTruck',  2.00),
    ('4AxlesTruck',  3.00),
    ('5AxlesTruck',  4.50),
    ('6AxlesTruck',  6.00),
    ('7AxlesTruck',  7.50),
    ('2AxlesRV',     1.50),
    ('3AxlesRV',     2.00),
    ('ElectricAuto', 1.00)
)
INSERT INTO toll_booth_rates (
  toll_booth_id, vehicle_type_id,
  cash_cost, tag_pri_cost, prepaid_card_cost,
  currency, valid_from, source
)
SELECT
  ar.toll_booth_id,
  vt.id,
  ROUND(ar.cash_cost        * m.factor::numeric, 2),
  ROUND(ar.tag_pri_cost     * m.factor::numeric, 2),
  ROUND(ar.prepaid_card_cost * m.factor::numeric, 2),
  ar.currency,
  '2026-01-01',
  'MANUAL'
FROM auto_rates ar
CROSS JOIN multipliers m
JOIN vehicle_types vt ON vt.code = m.vehicle_code;
