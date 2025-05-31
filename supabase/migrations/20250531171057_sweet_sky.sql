-- Drop existing policies individually
DROP POLICY IF EXISTS "Allow authenticated users to view error logs" ON error_logs;
DROP POLICY IF EXISTS "Allow authenticated users to insert error logs" ON error_logs;
DROP POLICY IF EXISTS "Allow authenticated users to update error logs" ON error_logs;

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