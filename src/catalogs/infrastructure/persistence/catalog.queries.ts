export const CATALOG_QUERIES = {
  FIND_CARGO_TYPES_ORDER_BY_CODE: `
    SELECT * FROM cargo_types ORDER BY code
    `,

  FIND_FUEL_TYPES_ORDER_BY_CODE: `
    SELECT * FROM fuel_types ORDER BY code
    `,

  FIND_TOLL_OPERATORS_ORDER_BY_CODE: `
    SELECT * FROM toll_operators ORDER BY code
    `,

  FIND_TOLL_TAG_SYSTEMS_ORDER_BY_CODE: `
    SELECT * FROM toll_tag_systems ORDER BY code
    `,

  FIND_VEHICLE_TYPES_ORDER_BY_CODE: `
    SELECT * FROM vehicle_types ORDER BY code
    `,
};
