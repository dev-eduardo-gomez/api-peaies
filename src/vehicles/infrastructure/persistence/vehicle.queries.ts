const VEHICLE_SELECT = `
  SELECT
    v.id,
    v.user_id,
    v.alias,
    v.plate,

    vt.code          AS vt_code,
    vt.description   AS vt_description,
    vt.axles         AS vt_axles,
    vt.category      AS vt_category,

    ft.code          AS ft_code,
    ft.name          AS ft_name,
    ft.unit          AS ft_unit,

    ct.code          AS ct_code,
    ct.name          AS ct_name,

    v.engine_displacement_cc,
    v.engine_cylinders,
    v.horsepower,
    v.year,
    v.brand,
    v.model,

    v.weight_kg,
    v.height_m,
    v.length_m,
    v.width_m,
    v.axles,

    v.cargo_weight_kg,
    v.max_cargo_capacity_kg,

    v.fuel_efficiency_city_kmpl,
    v.fuel_efficiency_hwy_kmpl,
    v.fuel_tank_capacity_l,

    v.emission_class,

    COALESCE(
      json_agg(tts.code) FILTER (WHERE tts.code IS NOT NULL),
      '[]'
    ) AS tags,

    v.created_at,
    v.updated_at

  FROM vehicles v
  JOIN  vehicle_types    vt  ON vt.id  = v.vehicle_type_id
  JOIN  fuel_types       ft  ON ft.id  = v.fuel_type_id
  LEFT JOIN cargo_types  ct  ON ct.id  = v.cargo_type_id
  LEFT JOIN vehicle_tags vtg ON vtg.vehicle_id = v.id
  LEFT JOIN toll_tag_systems tts ON tts.id = vtg.tag_system_id
`;

export const VEHICLE_QUERIES = {
  FIND_BY_ID: `
    ${VEHICLE_SELECT}
    WHERE v.id = $1
    GROUP BY v.id, vt.code, vt.description, vt.axles, vt.category,
             ft.code, ft.name, ft.unit, ct.code, ct.name
  `,

  FIND_BY_ALL_USER_ID: `
    ${VEHICLE_SELECT}
    WHERE v.user_id = $1
    GROUP BY v.id, vt.code, vt.description, vt.axles, vt.category,
             ft.code, ft.name, ft.unit, ct.code, ct.name
    ORDER BY v.created_at DESC
  `,

  EXISTS_VEHICLE_BY_ID_AND_PLATE: `
    SELECT EXISTS(
      SELECT 1 FROM vehicles WHERE user_id = $1 AND plate = $2
    ) AS exists
  `,

  INSERT_VEHICLE: `
    INSERT INTO vehicles (
      user_id,
      alias,
      plate,
      vehicle_type_id,
      fuel_type_id,
      cargo_type_id,
      engine_displacement_cc,
      engine_cylinders,
      horsepower,
      year,
      brand,
      model,
      weight_kg,
      height_m,
      length_m,
      width_m,
      axles,
      cargo_weight_kg,
      max_cargo_capacity_kg,
      fuel_efficiency_city_kmpl,
      fuel_efficiency_hwy_kmpl,
      fuel_tank_capacity_l,
      emission_class
    ) VALUES (
      $1,
      $2,
      $3,
      (SELECT id FROM vehicle_types WHERE code = $4),
      (SELECT id FROM fuel_types    WHERE code = $5),
      (SELECT id FROM cargo_types   WHERE code = $6),
      $7, $8, $9, $10, $11, $12,
      $13, $14, $15, $16, $17,
      $18, $19,
      $20, $21, $22,
      $23
    )
    RETURNING id
  `,

  UPDATE_VEHICLE: `
    UPDATE vehicles SET
      alias                     = COALESCE($3,  alias),
      plate                     = COALESCE($4,  plate),
      vehicle_type_id           = COALESCE((SELECT id FROM vehicle_types WHERE code = $5), vehicle_type_id),
      fuel_type_id              = COALESCE((SELECT id FROM fuel_types    WHERE code = $6), fuel_type_id),
      cargo_type_id             = COALESCE((SELECT id FROM cargo_types   WHERE code = $7), cargo_type_id),
      engine_displacement_cc    = COALESCE($8,  engine_displacement_cc),
      engine_cylinders          = COALESCE($9,  engine_cylinders),
      horsepower                = COALESCE($10, horsepower),
      year                      = COALESCE($11, year),
      brand                     = COALESCE($12, brand),
      model                     = COALESCE($13, model),
      weight_kg                 = COALESCE($14, weight_kg),
      height_m                  = COALESCE($15, height_m),
      length_m                  = COALESCE($16, length_m),
      width_m                   = COALESCE($17, width_m),
      axles                     = COALESCE($18, axles),
      cargo_weight_kg           = COALESCE($19, cargo_weight_kg),
      max_cargo_capacity_kg     = COALESCE($20, max_cargo_capacity_kg),
      fuel_efficiency_city_kmpl = COALESCE($21, fuel_efficiency_city_kmpl),
      fuel_efficiency_hwy_kmpl  = COALESCE($22, fuel_efficiency_hwy_kmpl),
      fuel_tank_capacity_l      = COALESCE($23, fuel_tank_capacity_l),
      emission_class            = COALESCE($24, emission_class)
    WHERE id = $1
      AND user_id = $2
  `,

  DELETE_VEHICLE: `
    DELETE FROM vehicles WHERE id = $1
  `,
};
