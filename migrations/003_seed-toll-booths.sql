-- =====================================================================
-- 003_seed-toll-booths.sql
-- 15 real toll booths on the Ciudad del Carmen → Monterrey route
-- (matches MockTollProviderAdapter data)
-- Idempotent — safe to run multiple times.
-- =====================================================================

-- Note: ST_MakePoint takes (longitude, latitude) — longitude first.

INSERT INTO toll_booths (
    external_id,
    name,
    road,
    state,
    country,
    location,
    system_type,
    operator_id
)
VALUES
    -- 1. Campeche Norte (near Ciudad del Carmen)
    (
        526010000,
        'Caseta Campeche Norte',
        'Carretera 180D',
        'Campeche',
        'MEX',
        ST_SetSRID(ST_MakePoint(-91.8609, 18.6126), 4326)::geography,
        'BARRIER',
        (SELECT id FROM toll_operators WHERE code = 'CAPUFE')
    ),
    -- 2. Villahermosa
    (
        523704000,
        'Caseta Villahermosa',
        'Carretera 180D',
        'Tabasco',
        'MEX',
        ST_SetSRID(ST_MakePoint(-92.9475, 17.9892), 4326)::geography,
        'BARRIER',
        (SELECT id FROM toll_operators WHERE code = 'CAPUFE')
    ),
    -- 3. Cardel
    (
        523700800,
        'Caseta Cardel',
        'Carretera 180D',
        'Veracruz',
        'MEX',
        ST_SetSRID(ST_MakePoint(-96.3627, 19.3647), 4326)::geography,
        'BARRIER',
        (SELECT id FROM toll_operators WHERE code = 'CAPUFE')
    ),
    -- 4. Tampico Norte
    (
        524601200,
        'Caseta Tampico Norte',
        'Carretera 180D',
        'Tamaulipas',
        'MEX',
        ST_SetSRID(ST_MakePoint(-97.8559, 22.3007), 4326)::geography,
        'BARRIER',
        (SELECT id FROM toll_operators WHERE code = 'CAPUFE')
    ),
    -- 5. San Fernando
    (
        524700000,
        'Caseta San Fernando',
        'Carretera 180D',
        'Tamaulipas',
        'MEX',
        ST_SetSRID(ST_MakePoint(-98.1540, 24.8458), 4326)::geography,
        'BARRIER',
        (SELECT id FROM toll_operators WHERE code = 'CAPUFE')
    ),
    -- 6. Monterrey Sur
    (
        525100000,
        'Caseta Monterrey Sur',
        'Carretera 57D',
        'Nuevo León',
        'MEX',
        ST_SetSRID(ST_MakePoint(-100.0063, 25.5456), 4326)::geography,
        'BARRIER',
        (SELECT id FROM toll_operators WHERE code = 'CAPUFE')
    ),
    -- 7. Coatzacoalcos
    (
        526011100,
        'Caseta Coatzacoalcos',
        'Carretera 180D',
        'Veracruz',
        'MEX',
        ST_SetSRID(ST_MakePoint(-94.4528, 18.1403), 4326)::geography,
        'BARRIER',
        (SELECT id FROM toll_operators WHERE code = 'CAPUFE')
    ),
    -- 8. Acayucan
    (
        523400800,
        'Caseta Acayucan',
        'Carretera 180D',
        'Veracruz',
        'MEX',
        ST_SetSRID(ST_MakePoint(-94.9143, 17.9489), 4326)::geography,
        'BARRIER',
        (SELECT id FROM toll_operators WHERE code = 'CAPUFE')
    ),
    -- 9. Veracruz
    (
        523509000,
        'Caseta Veracruz',
        'Carretera 180D',
        'Veracruz',
        'MEX',
        ST_SetSRID(ST_MakePoint(-96.1342, 19.1738), 4326)::geography,
        'BARRIER',
        (SELECT id FROM toll_operators WHERE code = 'CAPUFE')
    ),
    -- 10. Monterrey Oriente
    (
        525100100,
        'Caseta Monterrey Oriente',
        'Carretera 40D',
        'Nuevo León',
        'MEX',
        ST_SetSRID(ST_MakePoint(-100.0214, 25.6868), 4326)::geography,
        'BARRIER',
        (SELECT id FROM toll_operators WHERE code = 'CAPUFE')
    ),
    -- 11. Laguna Verde
    (
        523700400,
        'Caseta Laguna Verde',
        'Carretera 180D',
        'Veracruz',
        'MEX',
        ST_SetSRID(ST_MakePoint(-96.4008, 19.7240), 4326)::geography,
        'BARRIER',
        (SELECT id FROM toll_operators WHERE code = 'CAPUFE')
    ),
    -- 12. Tuxpan
    (
        522800000,
        'Caseta Tuxpan',
        'Carretera 180D',
        'Veracruz',
        'MEX',
        ST_SetSRID(ST_MakePoint(-97.4063, 20.9595), 4326)::geography,
        'BARRIER',
        (SELECT id FROM toll_operators WHERE code = 'CAPUFE')
    ),
    -- 13. Naranjos
    (
        522800500,
        'Caseta Naranjos',
        'Carretera 180D',
        'Veracruz',
        'MEX',
        ST_SetSRID(ST_MakePoint(-97.6842, 21.3529), 4326)::geography,
        'BARRIER',
        (SELECT id FROM toll_operators WHERE code = 'CAPUFE')
    ),
    -- 14. Tampico Sur
    (
        526039100,
        'Caseta Tampico Sur',
        'Carretera 180D',
        'Tamaulipas',
        'MEX',
        ST_SetSRID(ST_MakePoint(-97.8612, 22.2416), 4326)::geography,
        'BARRIER',
        (SELECT id FROM toll_operators WHERE code = 'CAPUFE')
    ),
    -- 15. Victoria
    (
        524800000,
        'Caseta Victoria',
        'Carretera 80D',
        'Tamaulipas',
        'MEX',
        ST_SetSRID(ST_MakePoint(-99.1406, 23.7369), 4326)::geography,
        'BARRIER',
        (SELECT id FROM toll_operators WHERE code = 'CAPUFE')
    )
ON CONFLICT (external_id) DO NOTHING;
