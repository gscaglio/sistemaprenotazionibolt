-- Create performance_logs table
CREATE TABLE performance_logs (
  id SERIAL PRIMARY KEY,
  operation TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Add index for operation and created_at
CREATE INDEX performance_logs_operation_idx ON performance_logs(operation);
CREATE INDEX performance_logs_created_at_idx ON performance_logs(created_at);

-- Enable RLS
ALTER TABLE performance_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow authenticated users to view performance logs"
ON performance_logs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert performance logs"
ON performance_logs FOR INSERT TO authenticated WITH CHECK (true);