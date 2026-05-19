-- =====================================================================
-- 002_seed-catalogs.sql
-- Seed data for catalog tables (idempotent — safe to run multiple times)
-- =====================================================================

-- -----------------------------------------------------------------------
-- roles
-- -----------------------------------------------------------------------
INSERT INTO roles (name, description) VALUES
    ('ROLE_USER',  'Usuario estándar'),
    ('ROLE_ADMIN', 'Administrador del sistema')
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------
-- vehicle_types  (17 TollGuru-compatible types used in Mexico)
-- -----------------------------------------------------------------------
INSERT INTO vehicle_types (code, description, axles, category, max_weight_kg, max_height_m) VALUES
    ('2AxlesAuto',        'Automóvil, SUV o camioneta de 2 ejes',        2, 'AUTO',       3500.00,  2.50),
    ('3AxlesAuto',        'Automóvil con remolque (3 ejes)',              3, 'AUTO',       5000.00,  2.80),
    ('2AxlesMotorcycle',  'Motocicleta (2 ejes)',                         2, 'MOTORCYCLE',  500.00,  1.80),
    ('2AxlesBus',         'Autobús de 2 ejes',                           2, 'BUS',        12000.00,  4.00),
    ('3AxlesBus',         'Autobús de 3 ejes',                           3, 'BUS',        18000.00,  4.20),
    ('4AxlesBus',         'Autobús de 4 ejes',                           4, 'BUS',        24000.00,  4.20),
    ('2AxlesTruck',       'Camión de 2 ejes',                            2, 'TRUCK',       7500.00,  3.50),
    ('3AxlesTruck',       'Camión de 3 ejes',                            3, 'TRUCK',      15000.00,  4.00),
    ('4AxlesTruck',       'Camión de 4 ejes',                            4, 'TRUCK',      25000.00,  4.20),
    ('5AxlesTruck',       'Camión de 5 ejes',                            5, 'TRUCK',      35000.00,  4.20),
    ('6AxlesTruck',       'Camión de 6 ejes',                            6, 'TRUCK',      45000.00,  4.20),
    ('7AxlesTruck',       'Camión de 7 ejes',                            7, 'TRUCK',      55000.00,  4.50),
    ('2AxlesPickup',      'Camioneta pickup de 2 ejes',                  2, 'AUTO',        3500.00,  2.50),
    ('3AxlesPickup',      'Camioneta pickup con remolque (3 ejes)',       3, 'AUTO',        5500.00,  2.80),
    ('2AxlesRV',          'Casa rodante / motorhome (2 ejes)',            2, 'RV',          4500.00,  3.50),
    ('3AxlesRV',          'Casa rodante / motorhome (3 ejes)',            3, 'RV',          8000.00,  3.80),
    ('ElectricAuto',      'Vehículo eléctrico (2 ejes)',                 2, 'EV',          3500.00,  2.50)
ON CONFLICT (code) DO NOTHING;

-- -----------------------------------------------------------------------
-- fuel_types
-- -----------------------------------------------------------------------
INSERT INTO fuel_types (code, name, unit, avg_price_mxn) VALUES
    ('MAGNA',    'Gasolina Magna',   'liter', 22.50),
    ('PREMIUM',  'Gasolina Premium', 'liter', 24.00),
    ('DIESEL',   'Diésel',           'liter', 23.00),
    ('ELECTRIC', 'Electricidad',     'kWh',    3.50),
    ('LPG',      'Gas LP',           'liter', 12.00)
ON CONFLICT (code) DO NOTHING;

-- -----------------------------------------------------------------------
-- cargo_types
-- -----------------------------------------------------------------------
INSERT INTO cargo_types (code, name, requires_special_permit) VALUES
    ('NONE',         'Sin carga',                  false),
    ('DRY',          'Carga seca',                 false),
    ('REFRIGERATED', 'Carga refrigerada',          false),
    ('HAZMAT',       'Materiales peligrosos',       true),
    ('LIQUID',       'Líquidos',                   false),
    ('LIVESTOCK',    'Ganado',                     false),
    ('OVERSIZED',    'Carga sobredimensionada',     true)
ON CONFLICT (code) DO NOTHING;

-- -----------------------------------------------------------------------
-- toll_tag_systems  (7 real Mexican tag systems)
-- -----------------------------------------------------------------------
INSERT INTO toll_tag_systems (code, name, country, operator, website) VALUES
    ('IAVE',                  'IAVE',                  'MEX', 'CAPUFE',                     'https://iave.capufe.gob.mx'),
    ('TAG_PASE',              'Tag Pase',              'MEX', 'Pase',                       'https://www.pase.com.mx'),
    ('TELEVIA',               'Televia',               'MEX', 'OHL/Abertis',                'https://www.televia.com.mx'),
    ('VIAPASS',               'ViaPass',               'MEX', 'Viaducto Bicentenario',      'https://www.viapass.com.mx'),
    ('SIGO',                  'SIGO',                  'MEX', 'Grupo TMM',                  NULL),
    ('TELEPEAJE_CHIHUAHUA',   'Telepeaje Chihuahua',   'MEX', 'Gobierno de Chihuahua',      NULL),
    ('TAG_QUICKPASS',         'QuickPass',             'USA', 'various',                    NULL)
ON CONFLICT (code) DO NOTHING;

-- -----------------------------------------------------------------------
-- toll_operators  (6 real Mexican operators)
-- -----------------------------------------------------------------------
INSERT INTO toll_operators (code, name, country, website) VALUES
    ('CAPUFE',                  'Caminos y Puentes Federales de Ingresos y Servicios Conexos', 'MEX', 'https://www.gob.mx/capufe'),
    ('CONMEX',                  'Concesionaria Mexiquense',                                   'MEX', NULL),
    ('OHL_MEXICO',              'OHL México',                                                  'MEX', NULL),
    ('VIADUCTO_BICENTENARIO',   'Viaducto Bicentenario',                                      'MEX', NULL),
    ('GRUPO_TMM',               'Grupo TMM',                                                   'MEX', NULL),
    ('RED_DE_CARRETERAS_OCC',   'Red de Carreteras de Occidente',                             'MEX', NULL)
ON CONFLICT (code) DO NOTHING;
