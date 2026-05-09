export const AUTH_QUERIES = {
  FIND_USER_BY_EMAIL: `
    SELECT
      u.*,
      COALESCE(
        json_agg(r.name) FILTER (WHERE r.name IS NOT NULL),
        '[]'::json
      ) AS roles
    FROM users u
    LEFT JOIN user_roles ur ON ur.user_id = u.id
    LEFT JOIN roles r ON r.id = ur.role_id
    WHERE u.email = $1
    GROUP BY u.id
  `,

  FIND_USER_BY_ID: `
    SELECT
      u.*,
      COALESCE(
        json_agg(r.name) FILTER (WHERE r.name IS NOT NULL),
        '[]'::json
      ) AS roles
    FROM users u
    LEFT JOIN user_roles ur ON ur.user_id = u.id
    LEFT JOIN roles r ON r.id = ur.role_id
    WHERE u.id = $1
    GROUP BY u.id
  `,

  EXISTS_BY_EMAIL: `
    SELECT EXISTS(SELECT 1 FROM users WHERE email = $1) AS exists
  `,

  INSERT_USER: `
    INSERT INTO users (
      id, email, password_hash, full_name,
      enabled, locked, failed_login_attempts,
      created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
  `,

  UPDATE_USER: `
    UPDATE users SET
      locked = $2,
      failed_login_attempts = $3,
      last_login_at = $4,
      updated_at = NOW()
    WHERE id = $1
  `,

  ASSIGN_ROLE: `
    INSERT INTO user_roles (user_id, role_id)
    SELECT $1, id FROM roles WHERE name = $2
    ON CONFLICT DO NOTHING
  `,

  FIND_REFRESH_BY_HASH: `
    SELECT id, user_id, token_hash, expires_at,
           revoked, revoked_at, created_at
    FROM refresh_tokens
    WHERE token_hash = $1
  `,

  INSERT_REFRESH: `
    INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, revoked, created_at)
    VALUES ($1, $2, $3, $4, false, NOW())
  `,

  REVOKE_REFRESH: `
    UPDATE refresh_tokens
    SET revoked = true, revoked_at = NOW()
    WHERE id = $1
  `,

  REVOKE_ALL_USER_TOKENS: `
    UPDATE refresh_tokens
    SET revoked = true, revoked_at = NOW()
    WHERE user_id = $1 AND revoked = false
  `,
} as const;
