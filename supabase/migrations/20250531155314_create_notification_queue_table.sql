CREATE TABLE notification_queue (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('whatsapp', 'email')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  attempts INTEGER DEFAULT 0,
  last_attempt TIMESTAMPTZ,
  next_retry TIMESTAMPTZ,
  error_message TEXT,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

COMMENT ON COLUMN notification_queue.booking_id IS 'Reference to the booking associated with this notification. Can be NULL if the notification is not booking-specific.';
COMMENT ON COLUMN notification_queue.type IS 'Type of notification: whatsapp or email.';
COMMENT ON COLUMN notification_queue.status IS 'Current status of the notification in the queue.';
COMMENT ON COLUMN notification_queue.attempts IS 'Number of times this notification has been attempted.';
COMMENT ON COLUMN notification_queue.last_attempt IS 'Timestamp of the last attempt to send this notification.';
COMMENT ON COLUMN notification_queue.next_retry IS 'Timestamp for when the next retry should occur for failed notifications.';
COMMENT ON COLUMN notification_queue.error_message IS 'Error message if the last attempt failed.';
COMMENT ON COLUMN notification_queue.payload IS 'JSON object containing the data needed to send the notification (e.g., recipient, message content).';
COMMENT ON COLUMN notification_queue.created_at IS 'Timestamp when the notification was added to the queue.';
COMMENT ON COLUMN notification_queue.sent_at IS 'Timestamp when the notification was successfully sent.';

-- Optional: Add an index for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_notification_queue_status_next_retry ON notification_queue (status, next_retry);
CREATE INDEX IF NOT EXISTS idx_notification_queue_booking_id ON notification_queue (booking_id);
CREATE INDEX IF NOT EXISTS idx_notification_queue_type ON notification_queue (type);
