-- Function to clean up old rate limit records
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    rows_deleted INTEGER;
BEGIN
    DELETE FROM public.rate_limits
    WHERE created_at < NOW() - INTERVAL '24 hours';

    GET DIAGNOSTICS rows_deleted = ROW_COUNT;
    RAISE NOTICE 'cleanup_old_rate_limits: Deleted % old record(s) from rate_limits table.', rows_deleted;
END;
$$;

-- How to schedule this function using pg_cron:
--
-- 1. Ensure pg_cron is enabled in your Supabase project.
--    You can check this under Database > Extensions in the Supabase Dashboard.
--
-- 2. Connect to your database using psql or the Supabase SQL Editor and run:
--
--    SELECT cron.schedule(
--        'daily-rate-limit-cleanup', -- Name of the cron job
--        '0 3 * * *',                -- Cron schedule (e.g., daily at 3:00 AM UTC)
--        'SELECT public.cleanup_old_rate_limits();' -- Command to execute
--    );
--
--    Adjust the schedule ('0 3 * * *') as needed.
--    This example runs at 3:00 AM UTC every day.
--
-- To unschedule the job:
-- SELECT cron.unschedule('daily-rate-limit-cleanup');
--
-- To view scheduled jobs:
-- SELECT * FROM cron.job;
