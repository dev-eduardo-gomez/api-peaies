const BOOTH_BASE_SELECT = `
  SELECT
    b.id,
    b.external_id,
    b.name,
    b.road,
    b.state,
    b.country,
    b.system_type,
    b.height_restriction_m,
    b.discount_car_type,
    b.discount_car_details,
    ST_Y(b.location::geometry) AS lat,
    ST_X(b.location::geometry) AS lng,

    op.code AS operator_code,
    op.name AS operator_name,

    COALESCE(
      json_agg(DISTINCT jsonb_build_object(
        'vehicleTypeCode', vt.code,
        'cash',            r.cash_cost,
        'tagPrimary',      r.tag_pri_cost,
        'tagSecondary',    r.tag_sec_cost,
        'licensePlateCost',r.license_plate_cost,
        'prepaidCardCost', r.prepaid_card_cost,
        'currency',        r.currency,
        'validFrom',       r.valid_from,
        'source',          r.source
      )) FILTER (WHERE r.id IS NOT NULL),
      '[]'
    ) AS rates,

    COALESCE(
      json_agg(DISTINCT jsonb_build_object(
        'code',      tts.code,
        'isPrimary', tbat.is_primary
      )) FILTER (WHERE tts.code IS NOT NULL),
      '[]'
    ) AS tags,

    b.created_at,
    b.updated_at

  FROM toll_booths b
  LEFT JOIN toll_operators op ON op.id = b.operator_id

  -- Tarifa vigente de mayor prioridad por tipo de vehículo
  LEFT JOIN LATERAL (
    SELECT DISTINCT ON (vehicle_type_id)
      tbr.id,
      tbr.vehicle_type_id,
      tbr.cash_cost,
      tbr.tag_pri_cost,
      tbr.tag_sec_cost,
      tbr.license_plate_cost,
      tbr.prepaid_card_cost,
      tbr.currency,
      tbr.valid_from,
      tbr.source
    FROM toll_booth_rates tbr
    WHERE tbr.toll_booth_id = b.id
      AND tbr.valid_from <= CURRENT_DATE
      AND (tbr.valid_to IS NULL OR tbr.valid_to >= CURRENT_DATE)
    ORDER BY
      tbr.vehicle_type_id,
      CASE tbr.source
        WHEN 'OFFICIAL'  THEN 1
        WHEN 'MANUAL'    THEN 2
        WHEN 'TOLLGURU'  THEN 3
        ELSE 4
      END,
      tbr.valid_from DESC
  ) r ON true

  LEFT JOIN vehicle_types vt ON vt.id = r.vehicle_type_id
  LEFT JOIN toll_booth_accepted_tags tbat ON tbat.toll_booth_id = b.id
  LEFT JOIN toll_tag_systems tts ON tts.id = tbat.tag_system_id
`;

const BOOTH_GROUP_BY = `
  GROUP BY b.id, op.code, op.name
`;

export const BOOTH_QUERIES = {
  // Detalle completo de una caseta por ID
  FIND_BY_ID: `
    ${BOOTH_BASE_SELECT}
    WHERE b.id = $1
    ${BOOTH_GROUP_BY}
  `,

  // Listado paginado ligero (sin rates ni tags — version summary)
  FIND_ALL: `
    SELECT
      b.id,
      b.name,
      b.road,
      b.state,
      b.country,
      b.system_type,
      b.height_restriction_m,
      ST_Y(b.location::geometry) AS lat,
      ST_X(b.location::geometry) AS lng,
      op.code AS operator_code,
      op.name AS operator_name
    FROM toll_booths b
    LEFT JOIN toll_operators op ON op.id = b.operator_id
    ORDER BY b.state, b.name
    LIMIT $1 OFFSET $2
  `,

  COUNT_ALL: `
    SELECT COUNT(*)::int AS total FROM toll_booths
  `,

  // Casetas en un radio dado (ST_DWithin) ordenadas por distancia (ST_Distance)
  // $1 = lat, $2 = lng, $3 = radiusKm
  FIND_NEARBY: `
    ${BOOTH_BASE_SELECT}
    WHERE ST_DWithin(
      b.location,
      ST_MakePoint($2, $1)::geography,
      $3 * 1000
    )
    ${BOOTH_GROUP_BY}
    ORDER BY ST_Distance(b.location, ST_MakePoint($2, $1)::geography)
  `,

  // Igual que FIND_NEARBY pero incluye la distancia en km en cada fila
  FIND_NEARBY_WITH_DISTANCE: `
    SELECT
      b.id,
      b.name,
      b.road,
      b.state,
      b.system_type,
      b.height_restriction_m,
      ST_Y(b.location::geometry) AS lat,
      ST_X(b.location::geometry) AS lng,
      ROUND(
        (ST_Distance(b.location, ST_MakePoint($2, $1)::geography) / 1000)::numeric,
        2
      ) AS distance_km,
      op.code AS operator_code,
      op.name AS operator_name,

      COALESCE(
        json_agg(DISTINCT jsonb_build_object(
          'vehicleTypeCode', vt.code,
          'cash',            r.cash_cost,
          'tagPrimary',      r.tag_pri_cost,
          'tagSecondary',    r.tag_sec_cost,
          'currency',        r.currency,
          'validFrom',       r.valid_from,
          'source',          r.source
        )) FILTER (WHERE r.id IS NOT NULL),
        '[]'
      ) AS rates,

      COALESCE(
        json_agg(DISTINCT jsonb_build_object(
          'code',      tts.code,
          'isPrimary', tbat.is_primary
        )) FILTER (WHERE tts.code IS NOT NULL),
        '[]'
      ) AS tags

    FROM toll_booths b
    LEFT JOIN toll_operators op ON op.id = b.operator_id
    LEFT JOIN LATERAL (
      SELECT DISTINCT ON (vehicle_type_id)
        tbr.id,
        tbr.vehicle_type_id,
        tbr.cash_cost,
        tbr.tag_pri_cost,
        tbr.tag_sec_cost,
        tbr.currency,
        tbr.valid_from,
        tbr.source
      FROM toll_booth_rates tbr
      WHERE tbr.toll_booth_id = b.id
        AND tbr.valid_from <= CURRENT_DATE
        AND (tbr.valid_to IS NULL OR tbr.valid_to >= CURRENT_DATE)
      ORDER BY
        tbr.vehicle_type_id,
        CASE tbr.source
          WHEN 'OFFICIAL'  THEN 1
          WHEN 'MANUAL'    THEN 2
          WHEN 'TOLLGURU'  THEN 3
          ELSE 4
        END,
        tbr.valid_from DESC
    ) r ON true
    LEFT JOIN vehicle_types vt ON vt.id = r.vehicle_type_id
    LEFT JOIN toll_booth_accepted_tags tbat ON tbat.toll_booth_id = b.id
    LEFT JOIN toll_tag_systems tts ON tts.id = tbat.tag_system_id

    WHERE ST_DWithin(
      b.location,
      ST_MakePoint($2, $1)::geography,
      $3 * 1000
    )
    GROUP BY b.id, op.code, op.name
    ORDER BY distance_km
  `,

  // Tarifa de mayor prioridad para una caseta + tipo de vehículo específicos
  // Orden: OFFICIAL > MANUAL > TOLLGURU, y dentro de cada fuente la más reciente
  // $1 = toll_booth_id (UUID), $2 = vehicle_type_code (ej. '2AxlesAuto')
  FIND_BEST_RATE: `
    SELECT
      tbr.id,
      tbr.cash_cost,
      tbr.tag_pri_cost,
      tbr.tag_sec_cost,
      tbr.license_plate_cost,
      tbr.prepaid_card_cost,
      tbr.currency,
      tbr.valid_from,
      tbr.source
    FROM toll_booth_rates tbr
    JOIN vehicle_types vt ON vt.id = tbr.vehicle_type_id
    WHERE tbr.toll_booth_id = $1
      AND vt.code = $2
      AND tbr.valid_from <= CURRENT_DATE
      AND (tbr.valid_to IS NULL OR tbr.valid_to >= CURRENT_DATE)
    ORDER BY
      CASE tbr.source
        WHEN 'OFFICIAL'  THEN 1
        WHEN 'MANUAL'    THEN 2
        WHEN 'TOLLGURU'  THEN 3
        ELSE 4
      END,
      tbr.valid_from DESC
    LIMIT 1
  `,
};
