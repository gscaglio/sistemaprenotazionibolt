-- Drop existing policies using the correct column name
DO $$
BEGIN
    EXECUTE (
        SELECT string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON error_logs;', E'\n')
        FROM pg_policies 
        WHERE tablename = 'error_logs'
    );
END $$;

-- Drop and recreate the error_logs table
DROP TABLE IF EXISTS error_logs;

CREATE TABLE error_logs (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    level character varying(20) CHECK (level IN ('debug', 'info', 'warning', 'error', 'critical')),
    message text NOT NULL,
    error_stack text,
    context jsonb,
    browser_info jsonb,
    user_id uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT timezone('utc'::text, now()),
    resolved_at timestamptz,
    resolution_notes text
);

-- Create indexes
CREATE INDEX error_logs_level_idx ON error_logs(level);
CREATE INDEX error_logs_created_at_idx ON error_logs(created_at);
CREATE INDEX error_logs_user_id_idx ON error_logs(user_id);

-- Enable RLS
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
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