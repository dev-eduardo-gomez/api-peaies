-- =====================================================================
-- Toll API - Database Schema
-- PostgreSQL 16 + PostGIS
-- =====================================================================
-- Este archivo contiene las migraciones Flyway iniciales del proyecto.
-- Separar en archivos individuales al colocar en src/main/resources/db/migration/:
--   V1__init.sql
--   V2__seed_catalogs.sql
-- =====================================================================


-- =====================================================================
-- V1__init.sql
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- =====================================================================
-- MÓDULO: IAM (users, auth, roles)
-- =====================================================================

CREATE TABLE users (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email                   VARCHAR(255) UNIQUE NOT NULL,
    password_hash           VARCHAR(255) NOT NULL,
    full_name               VARCHAR(255) NOT NULL,
    enabled                 BOOLEAN NOT NULL DEFAULT true,
    locked                  BOOLEAN NOT NULL DEFAULT false,
    failed_login_attempts   SMALLINT NOT NULL DEFAULT 0,
    last_login_at           TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_email ON users(email);

CREATE TABLE roles (
    id      SMALLSERIAL PRIMARY KEY,
    name    VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(255)
);

CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id SMALLINT NOT NULL REFERENCES roles(id),
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE refresh_tokens (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash      VARCHAR(255) NOT NULL UNIQUE,
    expires_at      TIMESTAMPTZ NOT NULL,
    revoked         BOOLEAN NOT NULL DEFAULT false,
    revoked_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    user_agent      VARCHAR(500),
    ip_address      VARCHAR(45)
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);


-- =====================================================================
-- MÓDULO: CATALOGS (catálogos compatibles con TollGuru)
-- =====================================================================

CREATE TABLE vehicle_types (
    id              SMALLSERIAL PRIMARY KEY,
    code            VARCHAR(50) UNIQUE NOT NULL,   -- '2AxlesAuto', '5AxlesTruck', ...
    description     VARCHAR(255) NOT NULL,
    axles           SMALLINT NOT NULL,
    category        VARCHAR(30) NOT NULL,          -- AUTO, TRUCK, BUS, MOTORCYCLE, RV, EV
    max_weight_kg   NUMERIC(10,2),
    max_height_m    NUMERIC(5,2),
    CHECK (axles BETWEEN 2 AND 9)
);

CREATE TABLE fuel_types (
    id              SMALLSERIAL PRIMARY KEY,
    code            VARCHAR(30) UNIQUE NOT NULL,   -- MAGNA, PREMIUM, DIESEL, ELECTRIC, LPG
    name            VARCHAR(50) NOT NULL,
    unit            VARCHAR(20) NOT NULL,          -- liter, kWh
    avg_price_mxn   NUMERIC(10,2)
);

CREATE TABLE cargo_types (
    id                      SMALLSERIAL PRIMARY KEY,
    code                    VARCHAR(30) UNIQUE NOT NULL,
    name                    VARCHAR(50) NOT NULL,
    requires_special_permit BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE toll_tag_systems (
    id          SMALLSERIAL PRIMARY KEY,
    code        VARCHAR(30) UNIQUE NOT NULL,       -- IAVE, TAG_PASE, TELEVIA, VIAPASS, SIGO, ...
    name        VARCHAR(100) NOT NULL,
    country     CHAR(3) NOT NULL,
    operator    VARCHAR(100),
    website     VARCHAR(255)
);

CREATE TABLE toll_operators (
    id          SMALLSERIAL PRIMARY KEY,
    code        VARCHAR(50) UNIQUE NOT NULL,       -- CAPUFE, FONADIN, OHL, IDEAL, ...
    name        VARCHAR(255) NOT NULL,
    country     CHAR(3) NOT NULL,
    website     VARCHAR(255)
);


-- =====================================================================
-- MÓDULO: VEHICLES (vehículos del usuario)
-- =====================================================================

CREATE TABLE vehicles (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    alias                       VARCHAR(100) NOT NULL,
    plate                       VARCHAR(20),

    -- Catálogos
    vehicle_type_id             SMALLINT NOT NULL REFERENCES vehicle_types(id),
    fuel_type_id                SMALLINT NOT NULL REFERENCES fuel_types(id),
    cargo_type_id               SMALLINT REFERENCES cargo_types(id),

    -- Motor
    engine_displacement_cc      INTEGER,
    engine_cylinders            SMALLINT,
    horsepower                  SMALLINT,
    year                        SMALLINT,
    brand                       VARCHAR(100),
    model                       VARCHAR(100),

    -- Dimensiones (TollGuru: weight, height, length, axles)
    weight_kg                   NUMERIC(10,2) NOT NULL,
    height_m                    NUMERIC(5,2),
    length_m                    NUMERIC(5,2),
    width_m                     NUMERIC(5,2),
    axles                       SMALLINT NOT NULL,

    -- Carga
    cargo_weight_kg             NUMERIC(10,2),
    max_cargo_capacity_kg       NUMERIC(10,2),

    -- Eficiencia (si NULL usa default del vehicle_type)
    fuel_efficiency_city_kmpl   NUMERIC(5,2),
    fuel_efficiency_hwy_kmpl    NUMERIC(5,2),
    fuel_tank_capacity_l        NUMERIC(7,2),

    -- Emisiones (Europa-compatible para futuro)
    emission_class              VARCHAR(20),

    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CHECK (weight_kg > 0),
    CHECK (axles BETWEEN 2 AND 9)
);

CREATE INDEX idx_vehicles_user ON vehicles(user_id);
CREATE INDEX idx_vehicles_type ON vehicles(vehicle_type_id);
CREATE UNIQUE INDEX idx_vehicles_user_plate
    ON vehicles(user_id, plate) WHERE plate IS NOT NULL;

-- Tags asociados al vehículo (un vehículo puede tener IAVE y PASE)
CREATE TABLE vehicle_tags (
    vehicle_id      UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    tag_system_id   SMALLINT NOT NULL REFERENCES toll_tag_systems(id),
    tag_number      VARCHAR(50),
    balance_mxn     NUMERIC(10,2),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (vehicle_id, tag_system_id)
);


-- =====================================================================
-- MÓDULO: BOOTHS (catálogo de casetas)
-- =====================================================================

-- Casetas individuales (sistema abierto: BARRIER)
CREATE TABLE toll_booths (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id             BIGINT UNIQUE,                          -- TollGuru toll id
    name                    VARCHAR(255) NOT NULL,
    road                    VARCHAR(255),
    state                   VARCHAR(100),
    country                 CHAR(3) NOT NULL,
    location                GEOGRAPHY(POINT, 4326) NOT NULL,
    system_type             VARCHAR(20) NOT NULL,                   -- BARRIER, TICKET_SYSTEM_1, ...
    operator_id             SMALLINT REFERENCES toll_operators(id),
    discount_car_type       VARCHAR(50),
    discount_car_details    TEXT,
    height_restriction_m    NUMERIC(5,2),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_booths_location ON toll_booths USING GIST(location);
CREATE INDEX idx_booths_external ON toll_booths(external_id);
CREATE INDEX idx_booths_state ON toll_booths(state);
CREATE INDEX idx_booths_country ON toll_booths(country);

-- Tags aceptados por cada caseta (relación N:N)
CREATE TABLE toll_booth_accepted_tags (
    toll_booth_id   UUID NOT NULL REFERENCES toll_booths(id) ON DELETE CASCADE,
    tag_system_id   SMALLINT NOT NULL REFERENCES toll_tag_systems(id),
    is_primary      BOOLEAN NOT NULL DEFAULT true,                  -- primary vs secondary en TollGuru
    PRIMARY KEY (toll_booth_id, tag_system_id)
);

-- Tarifas con vigencia temporal (el precio cambia con el tiempo)
CREATE TABLE toll_booth_rates (
    id                  BIGSERIAL PRIMARY KEY,
    toll_booth_id       UUID NOT NULL REFERENCES toll_booths(id) ON DELETE CASCADE,
    vehicle_type_id     SMALLINT NOT NULL REFERENCES vehicle_types(id),
    cash_cost           NUMERIC(10,2),
    tag_pri_cost        NUMERIC(10,2),                              -- TollGuru: tagPriCost
    tag_sec_cost        NUMERIC(10,2),                              -- TollGuru: tagSecCost
    license_plate_cost  NUMERIC(10,2),
    prepaid_card_cost   NUMERIC(10,2),
    currency            CHAR(3) NOT NULL DEFAULT 'MXN',
    valid_from          DATE NOT NULL,
    valid_to            DATE,
    source              VARCHAR(20) NOT NULL DEFAULT 'TOLLGURU',    -- TOLLGURU, MANUAL, OFFICIAL
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (toll_booth_id, vehicle_type_id, valid_from),
    CHECK (valid_to IS NULL OR valid_to >= valid_from)
);

CREATE INDEX idx_rates_booth ON toll_booth_rates(toll_booth_id);
CREATE INDEX idx_rates_validity ON toll_booth_rates(valid_from, valid_to);

-- Sistemas cerrados: cobran por tramo entre dos puntos
CREATE TABLE toll_sections (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                VARCHAR(255) NOT NULL,
    road                VARCHAR(255),
    state               VARCHAR(100),
    country             CHAR(3) NOT NULL,
    system_type         VARCHAR(20) NOT NULL,                       -- TICKET_SYSTEM_1, TICKET_SYSTEM_2, TICKET_SYSTEM_3
    start_external_id   BIGINT,
    start_name          VARCHAR(255) NOT NULL,
    start_location      GEOGRAPHY(POINT, 4326) NOT NULL,
    end_external_id     BIGINT,
    end_name            VARCHAR(255) NOT NULL,
    end_location        GEOGRAPHY(POINT, 4326) NOT NULL,
    operator_id         SMALLINT REFERENCES toll_operators(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sections_start ON toll_sections USING GIST(start_location);
CREATE INDEX idx_sections_end ON toll_sections USING GIST(end_location);

CREATE TABLE toll_section_accepted_tags (
    toll_section_id UUID NOT NULL REFERENCES toll_sections(id) ON DELETE CASCADE,
    tag_system_id   SMALLINT NOT NULL REFERENCES toll_tag_systems(id),
    is_primary      BOOLEAN NOT NULL DEFAULT true,
    PRIMARY KEY (toll_section_id, tag_system_id)
);

CREATE TABLE toll_section_rates (
    id                  BIGSERIAL PRIMARY KEY,
    toll_section_id     UUID NOT NULL REFERENCES toll_sections(id) ON DELETE CASCADE,
    vehicle_type_id     SMALLINT NOT NULL REFERENCES vehicle_types(id),
    cash_cost           NUMERIC(10,2),
    tag_pri_cost        NUMERIC(10,2),
    tag_sec_cost        NUMERIC(10,2),
    currency            CHAR(3) NOT NULL DEFAULT 'MXN',
    valid_from          DATE NOT NULL,
    valid_to            DATE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (toll_section_id, vehicle_type_id, valid_from)
);

CREATE INDEX idx_section_rates_section ON toll_section_rates(toll_section_id);


-- =====================================================================
-- MÓDULO: ROUTING (cálculos de peajes — cache e historial)
-- =====================================================================

CREATE TABLE toll_calculations (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                 UUID REFERENCES users(id),
    vehicle_id              UUID REFERENCES vehicles(id),
    request_hash            VARCHAR(64) NOT NULL,                   -- SHA-256 de los params normalizados
    origin_address          VARCHAR(500),
    origin_location         GEOGRAPHY(POINT, 4326) NOT NULL,
    destination_address     VARCHAR(500),
    destination_location    GEOGRAPHY(POINT, 4326) NOT NULL,
    waypoints_json          JSONB,                                  -- array de coordenadas intermedias
    departure_time          TIMESTAMPTZ,
    provider                VARCHAR(20) NOT NULL,                   -- MOCK, TOLLGURU
    currency                CHAR(3) NOT NULL,
    countries               VARCHAR(100),                           -- CSV: "MEX" o "MEX,USA"
    raw_response            JSONB,                                  -- respuesta cruda del proveedor (auditoría)
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_calc_hash ON toll_calculations(request_hash);
CREATE INDEX idx_calc_user ON toll_calculations(user_id);
CREATE INDEX idx_calc_vehicle ON toll_calculations(vehicle_id);
CREATE INDEX idx_calc_created ON toll_calculations(created_at DESC);
CREATE INDEX idx_calc_origin ON toll_calculations USING GIST(origin_location);
CREATE INDEX idx_calc_destination ON toll_calculations USING GIST(destination_location);

-- Cada cálculo puede tener múltiples rutas candidatas
CREATE TABLE toll_calculation_routes (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    calculation_id      UUID NOT NULL REFERENCES toll_calculations(id) ON DELETE CASCADE,
    route_index         SMALLINT NOT NULL,                          -- 0, 1, 2, ...
    name                VARCHAR(255),                               -- "180", "Ruta Hidalgo Norte"
    labels              VARCHAR(200),                               -- CSV: "PRACTICAL,CHEAPEST,FASTEST,SHORTEST"
    has_tolls           BOOLEAN NOT NULL,
    has_express_tolls   BOOLEAN NOT NULL DEFAULT false,
    distance_meters     BIGINT NOT NULL,
    duration_seconds    BIGINT NOT NULL,
    toll_count          SMALLINT NOT NULL,                          -- cantidad de casetas en esta ruta
    fuel_cost           NUMERIC(12,2),
    tag_cost            NUMERIC(12,2),
    cash_cost           NUMERIC(12,2),
    prepaid_card_cost   NUMERIC(12,2),
    license_plate_cost  NUMERIC(12,2),
    minimum_toll_cost   NUMERIC(12,2),
    grand_total         NUMERIC(12,2),
    diff_cheapest       NUMERIC(12,2),                              -- vs ruta más barata
    diff_fastest        BIGINT,                                     -- segundos vs ruta más rápida
    diff_shortest       BIGINT,                                     -- metros vs ruta más corta
    polyline            TEXT,                                       -- polyline codificado
    google_maps_url     TEXT,
    UNIQUE (calculation_id, route_index),
    CHECK (distance_meters > 0),
    CHECK (duration_seconds > 0),
    CHECK (toll_count >= 0)
);

CREATE INDEX idx_routes_calc ON toll_calculation_routes(calculation_id);

-- Casetas individuales aplicadas a cada ruta calculada
CREATE TABLE toll_calculation_route_booths (
    id                  BIGSERIAL PRIMARY KEY,
    route_id            UUID NOT NULL REFERENCES toll_calculation_routes(id) ON DELETE CASCADE,
    sequence_order      SMALLINT NOT NULL,
    toll_booth_id       UUID REFERENCES toll_booths(id),            -- puede ser NULL si la caseta no está aún en catálogo
    toll_section_id     UUID REFERENCES toll_sections(id),          -- para sistemas cerrados
    event_type          VARCHAR(20) NOT NULL,                       -- BARRIER, TICKET_SYSTEM_1, TICKET_SYSTEM_2, ...
    booth_external_id   BIGINT,
    booth_name          VARCHAR(255) NOT NULL,
    booth_road          VARCHAR(255),
    booth_state         VARCHAR(100),
    -- Para BARRIER
    booth_location      GEOGRAPHY(POINT, 4326),
    -- Para sistemas cerrados
    start_location      GEOGRAPHY(POINT, 4326),
    end_location        GEOGRAPHY(POINT, 4326),
    start_name          VARCHAR(255),
    end_name            VARCHAR(255),
    -- Costos
    cash_cost           NUMERIC(10,2),
    tag_pri_cost        NUMERIC(10,2),
    tag_sec_cost        NUMERIC(10,2),
    prepaid_card_cost   NUMERIC(10,2),
    license_plate_cost  NUMERIC(10,2),
    cost_applied        NUMERIC(10,2) NOT NULL,                     -- el costo realmente usado en el cálculo
    payment_method_used VARCHAR(20),                                -- CASH, TAG_PRIMARY, ...
    -- Tags aceptados (CSV para simplificar, e.g. "IAVE,TAG_PASE,TELEVIA")
    primary_tags_csv    VARCHAR(500),
    secondary_tags_csv  VARCHAR(500),
    -- Progreso
    arrival_distance_m  BIGINT,                                     -- distancia desde origen
    arrival_time        TIMESTAMPTZ,                                -- ETA estimado
    UNIQUE (route_id, sequence_order)
);

CREATE INDEX idx_route_booths_route ON toll_calculation_route_booths(route_id);
CREATE INDEX idx_route_booths_booth ON toll_calculation_route_booths(toll_booth_id);

-- Direcciones turn-by-turn (opcional, sólo si el cliente las pide)
CREATE TABLE toll_calculation_route_directions (
    id                  BIGSERIAL PRIMARY KEY,
    route_id            UUID NOT NULL REFERENCES toll_calculation_routes(id) ON DELETE CASCADE,
    sequence_order      SMALLINT NOT NULL,
    lat                 NUMERIC(10,7) NOT NULL,
    lng                 NUMERIC(10,7) NOT NULL,
    instruction         TEXT NOT NULL,
    distance_meters     INTEGER NOT NULL,
    duration_seconds    INTEGER NOT NULL,
    UNIQUE (route_id, sequence_order)
);

CREATE INDEX idx_directions_route ON toll_calculation_route_directions(route_id);


-- =====================================================================
-- MÓDULO: POIS (puntos de interés a lo largo de rutas)
-- =====================================================================

CREATE TABLE pois (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(255) NOT NULL,
    poi_type    VARCHAR(30) NOT NULL,                               -- GAS_STATION, REST_AREA, RESTAURANT, HOTEL, EV_CHARGING
    brand       VARCHAR(100),                                       -- Pemex, BP, OXXO Gas, Mobil, ...
    location    GEOGRAPHY(POINT, 4326) NOT NULL,
    address     VARCHAR(500),
    metadata    JSONB,                                              -- horarios, servicios, precios, contacto
    source      VARCHAR(20) NOT NULL DEFAULT 'MANUAL',              -- MANUAL, OSM, GOOGLE
    verified    BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pois_location ON pois USING GIST(location);
CREATE INDEX idx_pois_type ON pois(poi_type);
CREATE INDEX idx_pois_brand ON pois(brand);
CREATE INDEX idx_pois_metadata ON pois USING GIN(metadata);


-- =====================================================================
-- MÓDULO: AUDITS (auditoría del sistema)
-- =====================================================================

CREATE TABLE audit_events (
    id              BIGSERIAL PRIMARY KEY,
    user_id         UUID REFERENCES users(id),
    event_type      VARCHAR(50) NOT NULL,                           -- LOGIN, LOGIN_FAILED, CALCULATE_TOLL, RATE_CHANGE_DETECTED, ...
    entity_type     VARCHAR(50),                                    -- USER, VEHICLE, TOLL_CALCULATION, ...
    entity_id       VARCHAR(100),
    ip_address      VARCHAR(45),
    user_agent      VARCHAR(500),
    metadata        JSONB,
    occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_user ON audit_events(user_id);
CREATE INDEX idx_audit_type ON audit_events(event_type);
CREATE INDEX idx_audit_occurred ON audit_events(occurred_at DESC);
CREATE INDEX idx_audit_entity ON audit_events(entity_type, entity_id);


-- =====================================================================
-- TRIGGERS: actualización automática de updated_at
-- =====================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_users_updated_at        BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER tr_vehicles_updated_at     BEFORE UPDATE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER tr_toll_booths_updated_at  BEFORE UPDATE ON toll_booths
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER tr_pois_updated_at         BEFORE UPDATE ON pois
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();



-- =====================================================================
-- V2__seed_catalogs.sql
-- =====================================================================

-- Roles del sistema
INSERT INTO roles (name, description) VALUES
    ('ROLE_USER',          'Usuario estándar que puede calcular peajes y gestionar sus vehículos'),
    ('ROLE_ADMIN',         'Administrador del sistema con acceso completo'),
    ('ROLE_FLEET_MANAGER', 'Gestor de flota con límites elevados de rate limiting');

-- Tipos de vehículo (compatible con TollGuru)
INSERT INTO vehicle_types (code, description, axles, category, max_weight_kg, max_height_m) VALUES
    ('2AxlesAuto',       'Car, SUV or Pickup truck',     2, 'AUTO',       3500,  2.50),
    ('3AxlesAuto',       'Auto with trailer',            3, 'AUTO',       5000,  2.80),
    ('2AxlesMotorcycle', 'Motorcycle',                   2, 'MOTORCYCLE', 500,   1.80),
    ('3AxlesMotorcycle', 'Motorcycle with sidecar',      3, 'MOTORCYCLE', 700,   1.80),
    ('2AxlesTruck',      '2-axle truck',                 2, 'TRUCK',      7500,  3.50),
    ('3AxlesTruck',      '3-axle truck',                 3, 'TRUCK',      15000, 4.00),
    ('4AxlesTruck',      '4-axle truck',                 4, 'TRUCK',      25000, 4.20),
    ('5AxlesTruck',      '5-axle truck',                 5, 'TRUCK',      35000, 4.20),
    ('6AxlesTruck',      '6-axle truck',                 6, 'TRUCK',      45000, 4.20),
    ('7AxlesTruck',      '7-axle truck',                 7, 'TRUCK',      55000, 4.50),
    ('8AxlesTruck',      '8-axle truck',                 8, 'TRUCK',      60000, 4.50),
    ('9AxlesTruck',      '9-axle truck',                 9, 'TRUCK',      66000, 4.50),
    ('2AxlesBus',        '2-axle bus',                   2, 'BUS',        12000, 4.00),
    ('3AxlesBus',        '3-axle bus',                   3, 'BUS',        18000, 4.20),
    ('2AxlesRv',         'Motorhome / RV (2 axles)',     2, 'RV',         4500,  3.50),
    ('3AxlesRv',         'Motorhome / RV (3 axles)',     3, 'RV',         8000,  3.80),
    ('2AxlesEV',         'Electric vehicle',             2, 'EV',         3500,  2.50);

-- Tipos de combustible
INSERT INTO fuel_types (code, name, unit, avg_price_mxn) VALUES
    ('MAGNA',    'Gasolina Magna',   'liter', 23.50),
    ('PREMIUM',  'Gasolina Premium', 'liter', 25.80),
    ('DIESEL',   'Diésel',           'liter', 26.40),
    ('ELECTRIC', 'Eléctrico',        'kWh',    4.50),
    ('LPG',      'Gas LP',           'liter', 12.30);

-- Tipos de carga
INSERT INTO cargo_types (code, name, requires_special_permit) VALUES
    ('NONE',         'Sin carga',             false),
    ('DRY',          'Carga seca',            false),
    ('REFRIGERATED', 'Carga refrigerada',     false),
    ('LIQUID',       'Líquidos',              false),
    ('HAZMAT',       'Materiales peligrosos', true),
    ('LIVESTOCK',    'Ganado',                false),
    ('OVERSIZED',    'Carga sobredimensionada', true);

-- Sistemas de tags/telepeaje en México
INSERT INTO toll_tag_systems (code, name, country, operator, website) VALUES
    ('IAVE',                'IAVE',                'MEX', 'CAPUFE',          'https://iave.capufe.gob.mx'),
    ('TAG_PASE',            'Tag PASE',            'MEX', 'PASE',            'https://www.pase.com.mx'),
    ('TELEVIA',             'TeleVia',             'MEX', 'TeleVia',         'https://www.televia.com.mx'),
    ('VIAPASS',             'VIAPass',             'MEX', 'ViaPass',         'https://www.viapass.com.mx'),
    ('SIGO',                'Sigo',                'MEX', 'Sigo',            NULL),
    ('TELEPEAJE_CHIHUAHUA', 'Telepeaje Chihuahua', 'MEX', 'Gob. Chihuahua',  NULL),
    ('TAG_QUICKPASS',       'TAG QuickPass',       'MEX', 'QuickPass',       NULL);

-- Operadores de autopistas
INSERT INTO toll_operators (code, name, country, website) VALUES
    ('CAPUFE',  'Caminos y Puentes Federales',                    'MEX', 'https://www.gob.mx/capufe'),
    ('FONADIN', 'Fondo Nacional de Infraestructura',              'MEX', NULL),
    ('OHL',     'OHL México',                                      'MEX', NULL),
    ('IDEAL',   'Impulsora del Desarrollo y el Empleo',           'MEX', NULL),
    ('PINFRA',  'Promotora y Operadora de Infraestructura',       'MEX', NULL),
    ('ICA',     'Ingenieros Civiles Asociados',                    'MEX', NULL);


-- =====================================================================
-- V3__seed_toll_booths_mexico.sql (OPCIONAL)
-- Datos reales de las 15 casetas de la ruta Carmen → Monterrey
-- Útil para desarrollo y testing del MockTollProviderAdapter
-- =====================================================================

INSERT INTO toll_booths (external_id, name, road, state, country, location, system_type, operator_id)
SELECT * FROM (VALUES
    (526010000::BIGINT, 'Cd. Del Carmen - V. Hermosa - Ctra Pte Zacatal', 'Puente El Zacatal',                'Campeche', 'MEX',
        ST_SetSRID(ST_MakePoint(-91.860885, 18.612621), 4326)::geography, 'BARRIER', (SELECT id FROM toll_operators WHERE code='CAPUFE')),
    (523704000::BIGINT, 'Ent.Frontera - Ent.Loma De Caballo Csta',       'Libramiento de Villahermosa (180D)','Tabasco',  'MEX',
        ST_SetSRID(ST_MakePoint(-92.930464, 18.075852), 4326)::geography, 'BARRIER', (SELECT id FROM toll_operators WHERE code='CAPUFE')),
    (523701200::BIGINT, 'Cardenas - Agua Dulce - Ctra S. Magallanes',    'Ent. Agua Dulce - Cárdenas (180D)', 'Tabasco',  'MEX',
        ST_SetSRID(ST_MakePoint(-93.812908, 18.030819), 4326)::geography, 'BARRIER', (SELECT id FROM toll_operators WHERE code='CAPUFE')),
    (526011100::BIGINT, 'Teapa - Cosoleacaque - Ctra Pte A Dovali J',    'Minatitlán-Mundo Nuevo (180D)',     'Veracruz', 'MEX',
        ST_SetSRID(ST_MakePoint(-94.397016, 18.013838), 4326)::geography, 'BARRIER', (SELECT id FROM toll_operators WHERE code='CAPUFE')),
    (523400800::BIGINT, 'Isla - Cosoleacaque - Ctra Acayucan',           'La Tinaja - Cosoleacaque (145D)',   'Veracruz', 'MEX',
        ST_SetSRID(ST_MakePoint(-94.937263, 17.909860), 4326)::geography, 'BARRIER', (SELECT id FROM toll_operators WHERE code='CAPUFE')),
    (523400200::BIGINT, 'La Tinaja Isla-Csta - 118 - Cosamaloapan',      'La Tinaja - Cosoleacaque (145D)',   'Veracruz', 'MEX',
        ST_SetSRID(ST_MakePoint(-95.822110, 18.335283), 4326)::geography, 'BARRIER', (SELECT id FROM toll_operators WHERE code='CAPUFE')),
    (523509000::BIGINT, 'Veracruz - La Tinaja - Ctra Paso Del Toro 117', 'Córdoba - Veracruz (150D)',         'Veracruz', 'MEX',
        ST_SetSRID(ST_MakePoint(-96.198660, 19.081873), 4326)::geography, 'BARRIER', (SELECT id FROM toll_operators WHERE code='CAPUFE')),
    (523700200::BIGINT, 'Caseta San Julian',                             'Cardel - Veracruz (180D)',          'Veracruz', 'MEX',
        ST_SetSRID(ST_MakePoint(-96.257600, 19.239278), 4326)::geography, 'BARRIER', (SELECT id FROM toll_operators WHERE code='CAPUFE')),
    (523700000::BIGINT, 'La Antigua Carril',                             'Cardel - Veracruz (180D)',          'Veracruz', 'MEX',
        ST_SetSRID(ST_MakePoint(-96.311009, 19.320277), 4326)::geography, 'BARRIER', (SELECT id FROM toll_operators WHERE code='CAPUFE')),
    (523700400::BIGINT, 'Laguna Verde - Nautla',                         'Alamo - Veracruz (180D)',           'Veracruz', 'MEX',
        ST_SetSRID(ST_MakePoint(-96.684795, 20.043669), 4326)::geography, 'BARRIER', (SELECT id FROM toll_operators WHERE code='CAPUFE')),
    (522801000::BIGINT, 'San Rafael - Tihuatlán Cast',                   'Gutiérrez Zamora - Tihuatlán (130D)','Veracruz','MEX',
        ST_SetSRID(ST_MakePoint(-97.246681, 20.459356), 4326)::geography, 'BARRIER', (SELECT id FROM toll_operators WHERE code='CAPUFE')),
    (522800000::BIGINT, 'Tuxpan',                                        'Tihuatlán - Tuxpam (130D)',         'Veracruz', 'MEX',
        ST_SetSRID(ST_MakePoint(-97.482742, 20.752912), 4326)::geography, 'BARRIER', (SELECT id FROM toll_operators WHERE code='CAPUFE')),
    (524601000::BIGINT, 'Los Gil - Buenos Aires',                        'Autopista Tuxpan Tampico',          'Veracruz', 'MEX',
        ST_SetSRID(ST_MakePoint(-97.467393, 20.886027), 4326)::geography, 'BARRIER', (SELECT id FROM toll_operators WHERE code='CAPUFE')),
    (524600600::BIGINT, 'Ozuluama - Buenos Aires',                       'Autopista Tuxpan Tampico',          'Veracruz', 'MEX',
        ST_SetSRID(ST_MakePoint(-97.626560, 21.325583), 4326)::geography, 'BARRIER', (SELECT id FROM toll_operators WHERE code='CAPUFE')),
    (526039100::BIGINT, 'Tuxpan - Tampico - Ctra Pte Tampico',           'Puente Tampico',                    'Veracruz', 'MEX',
        ST_SetSRID(ST_MakePoint(-97.824577, 22.218360), 4326)::geography, 'BARRIER', (SELECT id FROM toll_operators WHERE code='CAPUFE'))
) AS v(external_id, name, road, state, country, location, system_type, operator_id);

-- Tarifas actuales (2AxlesAuto) — datos reales del JSON de TollGuru
INSERT INTO toll_booth_rates (toll_booth_id, vehicle_type_id, cash_cost, tag_pri_cost, prepaid_card_cost, currency, valid_from, source)
SELECT
    b.id,
    (SELECT id FROM vehicle_types WHERE code='2AxlesAuto'),
    r.cost, r.cost, r.cost,
    'MXN', '2025-11-01', 'TOLLGURU'
FROM toll_booths b
JOIN (VALUES
    (526010000::BIGINT, 109),
    (523704000::BIGINT,  74),
    (523701200::BIGINT, 101),
    (526011100::BIGINT,  22),
    (523400800::BIGINT, 258),
    (523400200::BIGINT, 277),
    (523509000::BIGINT, 130),
    (523700200::BIGINT,  27),
    (523700000::BIGINT,  82),
    (523700400::BIGINT, 122),
    (522801000::BIGINT, 248),
    (522800000::BIGINT,  55),
    (524601000::BIGINT,  44),
    (524600600::BIGINT, 359),
    (526039100::BIGINT,  38)
) AS r(external_id, cost) ON b.external_id = r.external_id;

-- Tags primarios aceptados (IAVE y PASE son universales en esta ruta)
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

-- TeleVia aplica a algunas casetas adicionales de la Ruta 180
INSERT INTO toll_booth_accepted_tags (toll_booth_id, tag_system_id, is_primary)
SELECT b.id, t.id, true
FROM toll_booths b
CROSS JOIN toll_tag_systems t
WHERE t.code = 'TELEVIA'
  AND b.external_id IN (
    523701200, 523400800, 523400200, 523509000, 523700400, 522801000, 522800000
  );
