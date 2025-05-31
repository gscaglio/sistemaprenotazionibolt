-- Drop existing policies if they exist
DO $$ 
BEGIN
    EXECUTE (
        SELECT string_agg('DROP POLICY IF EXISTS "' || polname || '" ON error_logs;', E'\n')
        FROM pg_policies 
        WHERE tablename = 'error_logs'
    );
EXCEPTION 
    WHEN undefined_table THEN NULL;
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