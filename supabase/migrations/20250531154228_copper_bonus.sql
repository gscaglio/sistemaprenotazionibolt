-- Create cleanup function for rate limits
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM rate_limits
  WHERE created_at < (now() - interval '24 hours');
END;
$$;

-- Schedule cleanup job if pg_cron is available
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'daily-rate-limit-cleanup',
      '0 3 * * *', -- Run at 3 AM UTC daily
      'SELECT cleanup_old_rate_limits()'
    );
  END IF;
END $$;