-- Drop existing objects if they exist
DROP FUNCTION IF EXISTS clean_old_error_logs CASCADE;

-- Update error_logs table if it exists
DO $$ 
BEGIN
  -- Add columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'error_logs' AND column_name = 'resolved_at') THEN
    ALTER TABLE error_logs ADD COLUMN resolved_at TIMESTAMP WITH TIME ZONE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'error_logs' AND column_name = 'resolution_notes') THEN
    ALTER TABLE error_logs ADD COLUMN resolution_notes TEXT;
  END IF;

  -- Ensure correct data types and constraints
  ALTER TABLE error_logs 
    ALTER COLUMN level TYPE VARCHAR(20),
    ALTER COLUMN level SET NOT NULL,
    ADD CONSTRAINT error_logs_level_check 
      CHECK (level IN ('debug', 'info', 'warning', 'error', 'critical'));

  -- Ensure indexes exist
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'error_logs_level_idx') THEN
    CREATE INDEX error_logs_level_idx ON error_logs(level);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'error_logs_created_at_idx') THEN
    CREATE INDEX error_logs_created_at_idx ON error_logs(created_at);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'error_logs_user_id_idx') THEN
    CREATE INDEX error_logs_user_id_idx ON error_logs(user_id);
  END IF;

  -- Ensure RLS is enabled
  ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

EXCEPTION
  WHEN others THEN
    NULL;
END $$;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated users to view error logs" ON error_logs;
DROP POLICY IF EXISTS "Allow authenticated users to insert error logs" ON error_logs;
DROP POLICY IF EXISTS "Allow authenticated users to update error logs" ON error_logs;

-- Recreate policies
CREATE POLICY "Allow authenticated users to view error logs"
ON error_logs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert error logs"
ON error_logs FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update error logs"
ON error_logs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Create or replace cleanup function
CREATE OR REPLACE FUNCTION clean_old_error_logs()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM error_logs
  WHERE created_at < NOW() - INTERVAL '90 days'
  AND level NOT IN ('error', 'critical');
  
  DELETE FROM error_logs
  WHERE created_at < NOW() - INTERVAL '365 days';
END;
$$;

-- Schedule cleanup job (if pg_cron extension is available)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'clean-old-error-logs',
      '0 0 * * 0', -- Every Sunday at midnight
      'SELECT clean_old_error_logs()'
    );
  END IF;
END $$;