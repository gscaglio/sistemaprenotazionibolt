CREATE TABLE rate_limits (
  id BIGSERIAL PRIMARY KEY,
  identifier TEXT NOT NULL, -- IP o user_id
  action TEXT NOT NULL, -- 'login', 'bulk_update', etc
  attempts INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(), -- Changed to TIMESTAMPTZ for timezone support
  created_at TIMESTAMPTZ DEFAULT NOW()   -- Changed to TIMESTAMPTZ for timezone support
);

-- Add an index on identifier and action for faster lookups
CREATE INDEX idx_rate_limits_identifier_action ON rate_limits (identifier, action);

-- Add an index on created_at for the cleanup job
CREATE INDEX idx_rate_limits_created_at ON rate_limits (created_at);
