-- Refreshing policies on error_logs to potentially avoid issues with tools misinterpreting policy states.

-- Drop existing policies on error_logs if they exist
DROP POLICY IF EXISTS "Allow authenticated users to view error logs" ON error_logs;
DROP POLICY IF EXISTS "Allow authenticated users to insert error logs" ON error_logs;
DROP POLICY IF EXISTS "Allow authenticated users to update error logs" ON error_logs;

-- Recreate policies on error_logs
CREATE POLICY "Allow authenticated users to view error logs"
ON error_logs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert error logs"
ON error_logs FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update error logs"
ON error_logs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- It's also good practice to ensure RLS is enabled on the table.
-- This might be redundant if already set, but ensures the state.
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE error_logs IS 'Refreshed RLS policies to ensure clean state.';
