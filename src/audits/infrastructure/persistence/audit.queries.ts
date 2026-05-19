export const AUDIT_QUERIES = {
  INSERT_EVENT: `
    INSERT INTO audit_events
      (user_id, event_type, entity_type, entity_id, ip_address, user_agent, metadata)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `,

  FIND_BY_USER: `
    SELECT
      id,
      user_id,
      event_type,
      entity_type,
      entity_id,
      ip_address,
      user_agent,
      metadata,
      occurred_at
    FROM audit_events
    WHERE user_id = $1
    ORDER BY occurred_at DESC
    LIMIT $2 OFFSET $3
  `,

  COUNT_BY_USER: `
    SELECT COUNT(*)::int AS total
    FROM audit_events
    WHERE user_id = $1
  `,
};
