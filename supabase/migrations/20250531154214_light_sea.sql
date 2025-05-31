-- Login rate limiting functions
CREATE OR REPLACE FUNCTION log_login_attempt(ip_address_param TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  existing_record RECORD;
BEGIN
  SELECT * INTO existing_record
  FROM rate_limits
  WHERE identifier = ip_address_param
    AND action = 'login'
    AND window_start > (now() - interval '15 minutes');

  IF FOUND THEN
    IF existing_record.window_start < (now() - interval '15 minutes') THEN
      -- Reset window if expired
      UPDATE rate_limits
      SET attempts = 1, window_start = now()
      WHERE id = existing_record.id;
    ELSE
      -- Increment attempts
      UPDATE rate_limits
      SET attempts = attempts + 1
      WHERE id = existing_record.id;
    END IF;
  ELSE
    -- Create new record
    INSERT INTO rate_limits (identifier, action, attempts, window_start)
    VALUES (ip_address_param, 'login', 1, now());
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION check_login_attempts(ip_address_param TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  attempt_count INTEGER;
BEGIN
  SELECT attempts INTO attempt_count
  FROM rate_limits
  WHERE identifier = ip_address_param
    AND action = 'login'
    AND window_start > (now() - interval '15 minutes')
  ORDER BY window_start DESC
  LIMIT 1;

  IF attempt_count >= 5 THEN
    RAISE EXCEPTION 'Too many login attempts. Please try again later.'
      USING HINT = 'Wait for 15 minutes before trying again.',
            ERRCODE = 'rate_limit_exceeded';
  END IF;
END;
$$;

-- Bulk update rate limiting functions
CREATE OR REPLACE FUNCTION log_bulk_update_request(p_user_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  existing_record RECORD;
BEGIN
  SELECT * INTO existing_record
  FROM rate_limits
  WHERE identifier = p_user_id
    AND action = 'bulk_update'
    AND window_start > (now() - interval '1 minute');

  IF FOUND THEN
    IF existing_record.window_start < (now() - interval '1 minute') THEN
      -- Reset window if expired
      UPDATE rate_limits
      SET attempts = 1, window_start = now()
      WHERE id = existing_record.id;
    ELSE
      -- Increment attempts
      UPDATE rate_limits
      SET attempts = attempts + 1
      WHERE id = existing_record.id;
    END IF;
  ELSE
    -- Create new record
    INSERT INTO rate_limits (identifier, action, attempts, window_start)
    VALUES (p_user_id, 'bulk_update', 1, now());
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION check_bulk_update_limit(p_user_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  attempt_count INTEGER;
BEGIN
  SELECT attempts INTO attempt_count
  FROM rate_limits
  WHERE identifier = p_user_id
    AND action = 'bulk_update'
    AND window_start > (now() - interval '1 minute')
  ORDER BY window_start DESC
  LIMIT 1;

  IF attempt_count >= 10 THEN
    RAISE EXCEPTION 'Too many bulk update requests. Please try again later.'
      USING HINT = 'Wait for 1 minute before trying again.',
            ERRCODE = 'rate_limit_exceeded';
  END IF;
END;
$$;