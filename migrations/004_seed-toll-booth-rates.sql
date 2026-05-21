-- =====================================================================
-- 004_seed-toll-booth-rates.sql
-- Real TollGuru data for the Ciudad del Carmen → Monterrey route
-- Vehicle type: 2AxlesMotorcycle | Currency: MXN | Source: TOLLGURU
-- Captured: 2026-05-20
-- Idempotent — safe to run multiple times.
-- =====================================================================

-- ---------------------------------------------------------------------
-- STEP 1: Insert the 7 toll booths from TollGuru that don't exist yet
-- (the other 8 were already seeded in 003_seed-toll-booths.sql)
-- ---------------------------------------------------------------------
INSERT INTO toll_booths (external_id, name, road, state, country, location, system_type, operator_id)
VALUES
    (
        523701200,
        'Cardenas - Agua Dulce - Ctra S. Magallanes',
        'Ent. Agua Dulce - Cárdenas (180D)',
        'Tabasco',
        'MEX',
        ST_SetSRID(ST_MakePoint(-93.812908, 18.030819), 4326)::geography,
        'BARRIER',
        (SELECT id FROM toll_operators WHERE code = 'CAPUFE')
    ),
    (
        523400200,
        'La Tinaja Isla-Csta - 118 - Cosamaloapan',
        'La Tinaja - Cosoleacaque (145D)',
        'Veracruz',
        'MEX',
        ST_SetSRID(ST_MakePoint(-95.82211, 18.335283), 4326)::geography,
        'BARRIER',
        (SELECT id FROM toll_operators WHERE code = 'CAPUFE')
    ),
    (
        523700200,
        'Caseta San Julian',
        'Cardel - Veracruz (180D)',
        'Veracruz',
        'MEX',
        ST_SetSRID(ST_MakePoint(-96.2576, 19.239278), 4326)::geography,
        'BARRIER',
        (SELECT id FROM toll_operators WHERE code = 'CAPUFE')
    ),
    (
        523700000,
        'La Antigua Carril',
        'Cardel - Veracruz (180D)',
        'Veracruz',
        'MEX',
        ST_SetSRID(ST_MakePoint(-96.311009, 19.320277), 4326)::geography,
        'BARRIER',
        (SELECT id FROM toll_operators WHERE code = 'CAPUFE')
    ),
    (
        522801000,
        'San Rafael - Tihuatlán Cast',
        'Gutiérrez Zamora - Tihuatlán (130D)',
        'Veracruz',
        'MEX',
        ST_SetSRID(ST_MakePoint(-97.246681, 20.459356), 4326)::geography,
        'BARRIER',
        (SELECT id FROM toll_operators WHERE code = 'CAPUFE')
    ),
    (
        524601000,
        'Los Gil - Buenos Aires',
        'Autopista Tuxpan Tampico',
        'Veracruz',
        'MEX',
        ST_SetSRID(ST_MakePoint(-97.4673931, 20.8860272), 4326)::geography,
        'BARRIER',
        (SELECT id FROM toll_operators WHERE code = 'CAPUFE')
    ),
    (
        524600600,
        'Ozuluama - Buenos Aires',
        'Autopista Tuxpan Tampico',
        'Veracruz',
        'MEX',
        ST_SetSRID(ST_MakePoint(-97.6265597, 21.3255828), 4326)::geography,
        'BARRIER',
        (SELECT id FROM toll_operators WHERE code = 'CAPUFE')
    )
ON CONFLICT (external_id) DO NOTHING;

-- ---------------------------------------------------------------------
-- STEP 2: Insert rates for all 15 booths — vehicle type 2AxlesMotorcycle
-- Uses external_id to resolve toll_booth_id (no hardcoded UUIDs)
-- ---------------------------------------------------------------------
INSERT INTO toll_booth_rates (
    toll_booth_id,
    vehicle_type_id,
    cash_cost,
    tag_pri_cost,
    tag_sec_cost,
    license_plate_cost,
    prepaid_card_cost,
    currency,
    valid_from,
    source
)
SELECT
    b.id,
    (SELECT id FROM vehicle_types WHERE code = '2AxlesMotorcycle'),
    r.cash_cost,
    r.tag_pri_cost,
    NULL,   -- tagSecCost not reported for this vehicle type
    NULL,   -- licensePlateCost not applicable
    r.prepaid_card_cost,
    'MXN',
    '2026-05-20',
    'TOLLGURU'
FROM (VALUES
    (526010000,  57.00,  57.00,  57.00),   -- Puente El Zacatal
    (523704000,  38.00,  38.00,  38.00),   -- Libramiento de Villahermosa
    (523701200,  53.00,  53.00,  53.00),   -- Cárdenas - Agua Dulce
    (526011100,  11.00,  11.00,  11.00),   -- Cosoleacaque - Pte A Dovali J
    (523400800, 135.00, 135.00, 135.00),   -- La Tinaja - Acayucan
    (523400200, 145.00, 145.00, 145.00),   -- La Tinaja - Cosamaloapan
    (523509000,  68.00,  68.00,  68.00),   -- Paso Del Toro
    (523700200,  14.00,  14.00,  14.00),   -- Caseta San Julian
    (523700000,  43.00,  43.00,  43.00),   -- La Antigua Carril
    (523700400, 160.00, 160.00, 160.00),   -- Laguna Verde - Nautla
    (522801000, 130.00, 130.00, 130.00),   -- San Rafael - Tihuatlán
    (522800000,  29.00,  29.00,  29.00),   -- Tuxpan
    (524601000,  23.00,  23.00,  23.00),   -- Los Gil - Buenos Aires
    (524600600, 187.00, 187.00, 187.00),   -- Ozuluama - Buenos Aires
    (526039100,  18.00,  18.00,  18.00)    -- Puente Tampico
) AS r(external_id, cash_cost, tag_pri_cost, prepaid_card_cost)
JOIN toll_booths b ON b.external_id = r.external_id
ON CONFLICT (toll_booth_id, vehicle_type_id, valid_from) DO NOTHING;
