-- Drop existing policies using the correct column name
DO $$
BEGIN
    EXECUTE (
        SELECT string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON error_logs;', E'\n')
        FROM pg_policies 
        WHERE tablename = 'error_logs'
    );
END $$;

-- Ensure RLS is enabled
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Recreate policies with correct names and permissions
CREATE POLICY "Allow authenticated users to view error logs"
ON error_logs FOR SELECT TO authenticated 
USING (true);

CREATE POLICY "Allow authenticated users to insert error logs"
ON error_logs FOR INSERT TO authenticated 
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update error logs"
ON error_logs FOR UPDATE TO authenticated 
USING (true)
WITH CHECK (true);