-- Function to log login attempts
CREATE OR REPLACE FUNCTION log_login_attempt(ip_address_param TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO public.rate_limits (identifier, action, attempts, window_start)
    VALUES (ip_address_param, 'login', 1, NOW())
    ON CONFLICT (identifier, action) DO UPDATE
    SET
        attempts = CASE
            -- If the last attempt was outside the 15-minute window, reset attempts to 1
            WHEN rate_limits.window_start < NOW() - INTERVAL '15 minutes' THEN 1
            ELSE rate_limits.attempts + 1
        END,
        window_start = CASE
            -- If the last attempt was outside the 15-minute window, reset window_start to NOW()
            WHEN rate_limits.window_start < NOW() - INTERVAL '15 minutes' THEN NOW()
            ELSE rate_limits.window_start
        END
    WHERE rate_limits.identifier = ip_address_param AND rate_limits.action = 'login'; -- Ensure conflict target matches WHERE
END;
$$;

-- Function to check login attempts
CREATE OR REPLACE FUNCTION check_login_attempts(ip_address_param TEXT)
RETURNS VOID
LANGUAGE plpgsql
-- SECURITY DEFINER -- Consider if RLS bypass is needed; for now, assuming direct table access is fine.
AS $$
DECLARE
    attempt_count INTEGER;
BEGIN
    SELECT attempts INTO attempt_count
    FROM public.rate_limits
    WHERE identifier = ip_address_param
      AND action = 'login'
      AND window_start >= NOW() - INTERVAL '15 minutes';

    IF FOUND AND attempt_count >= 5 THEN
        RAISE EXCEPTION 'Rate limit exceeded for login attempts' USING ERRCODE = '22012', HINT = 'Please try again later.';
    END IF;
END;
$$;

-- Function to log bulk update requests
CREATE OR REPLACE FUNCTION log_bulk_update_request(p_user_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO public.rate_limits (identifier, action, attempts, window_start)
    VALUES (p_user_id, 'bulk_update', 1, NOW())
    ON CONFLICT (identifier, action) DO UPDATE
    SET
        attempts = CASE
            -- If the last attempt was outside the 1-minute window, reset attempts to 1
            WHEN rate_limits.window_start < NOW() - INTERVAL '1 minute' THEN 1
            ELSE rate_limits.attempts + 1
        END,
        window_start = CASE
            -- If the last attempt was outside the 1-minute window, reset window_start to NOW()
            WHEN rate_limits.window_start < NOW() - INTERVAL '1 minute' THEN NOW()
            ELSE rate_limits.window_start
        END
    WHERE rate_limits.identifier = p_user_id AND rate_limits.action = 'bulk_update'; -- Ensure conflict target matches WHERE
END;
$$;

-- Function to check bulk update limits
CREATE OR REPLACE FUNCTION check_bulk_update_limit(p_user_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
-- SECURITY DEFINER -- Consider if RLS bypass is needed
AS $$
DECLARE
    attempt_count INTEGER;
BEGIN
    SELECT attempts INTO attempt_count
    FROM public.rate_limits
    WHERE identifier = p_user_id
      AND action = 'bulk_update'
      AND window_start >= NOW() - INTERVAL '1 minute';

    IF FOUND AND attempt_count >= 10 THEN
        RAISE EXCEPTION 'Rate limit exceeded for bulk update requests' USING ERRCODE = '22012', HINT = 'Please try again later.';
    END IF;
END;
$$;
