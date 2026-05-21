-- =====================================================================
-- 005_seed-toll-booth-rates-all-vehicle-types.sql
-- Derives approximate rates for all vehicle types from the real
-- 2AxlesMotorcycle TOLLGURU data (004_seed-toll-booth-rates.sql).
-- Multipliers follow CAPUFE's published tariff class structure.
-- Source = 'MANUAL' — approximate values, not real TollGuru data.
-- Idempotent — safe to run multiple times.
-- =====================================================================

WITH motorcycle_rates AS (
  SELECT
    r.toll_booth_id,
    r.cash_cost,
    r.tag_pri_cost,
    r.prepaid_card_cost,
    r.currency
  FROM toll_booth_rates r
  JOIN vehicle_types vt ON vt.id = r.vehicle_type_id
  WHERE vt.code    = '2AxlesMotorcycle'
    AND r.source   = 'TOLLGURU'
    AND r.valid_from = '2026-05-20'
),
multipliers (vehicle_code, factor) AS (
  VALUES
    ('2AxlesAuto',       2.00),
    ('3AxlesAuto',       2.50),
    ('2AxlesPickup',     2.00),
    ('3AxlesPickup',     2.50),
    ('2AxlesBus',        2.00),
    ('3AxlesBus',        3.00),
    ('4AxlesBus',        4.00),
    ('2AxlesTruck',      3.00),
    ('3AxlesTruck',      4.00),
    ('4AxlesTruck',      5.50),
    ('5AxlesTruck',      7.00),
    ('6AxlesTruck',      8.50),
    ('7AxlesTruck',     10.00),
    ('2AxlesRV',         2.50),
    ('3AxlesRV',         3.00),
    ('ElectricAuto',     2.00)
)
INSERT INTO toll_booth_rates (
  toll_booth_id,
  vehicle_type_id,
  cash_cost,
  tag_pri_cost,
  prepaid_card_cost,
  currency,
  valid_from,
  source
)
SELECT
  mr.toll_booth_id,
  vt.id,
  ROUND(mr.cash_cost        * m.factor::numeric, 2),
  ROUND(mr.tag_pri_cost     * m.factor::numeric, 2),
  ROUND(mr.prepaid_card_cost * m.factor::numeric, 2),
  mr.currency,
  '2026-05-20',
  'MANUAL'
FROM motorcycle_rates mr
CROSS JOIN multipliers m
JOIN vehicle_types vt ON vt.code = m.vehicle_code
ON CONFLICT (toll_booth_id, vehicle_type_id, valid_from) DO NOTHING;
