-- Drop existing policies safely without using pg_policies
DO $$ 
BEGIN
  -- Drop policies one by one to avoid dependency on pg_policies view
  DROP POLICY IF EXISTS "Allow authenticated users to view error logs" ON error_logs;
  DROP POLICY IF EXISTS "Allow authenticated users to insert error logs" ON error_logs;
  DROP POLICY IF EXISTS "Allow authenticated users to update error logs" ON error_logs;
END $$;

-- Recreate policies with updated definitions
CREATE POLICY "Allow authenticated users to view error logs"
    ON error_logs FOR SELECT TO authenticated 
    USING (true);

CREATE POLICY "Allow authenticated users to insert error logs"
    ON error_logs FOR INSERT TO authenticated 
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update error logs"
    ON error_logs FOR UPDATE TO authenticated 
    USING (true) WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;