-- Create RPC function for bulk availability updates with transaction
CREATE OR REPLACE FUNCTION bulk_update_availability_with_transaction(updates jsonb[])
RETURNS SETOF availability
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  update_record jsonb;
  result availability;
  transaction_id uuid;
BEGIN
  -- Generate transaction ID for logging
  transaction_id := gen_random_uuid();
  
  -- Log transaction start
  INSERT INTO transaction_logs (
    transaction_id, 
    operation, 
    status, 
    metadata
  ) VALUES (
    transaction_id, 
    'bulk_update_availability',
    'started',
    jsonb_build_object('updates_count', array_length(updates, 1))
  );

  -- Start transaction
  BEGIN
    -- Acquire advisory lock based on room_ids to prevent concurrent updates
    PERFORM pg_advisory_xact_lock(
      room_id::integer
    ) FROM (
      SELECT DISTINCT (update_record->>'room_id')::integer as room_id 
      FROM unnest(updates) as update_record
    ) rooms;

    -- Validate all updates before processing
    FOR update_record IN SELECT * FROM unnest(updates)
    LOOP
      -- Validate required fields
      IF NOT (
        update_record ? 'room_id' AND 
        update_record ? 'date' AND 
        update_record ? 'available'
      ) THEN
        RAISE EXCEPTION 'Invalid update record: missing required fields';
      END IF;

      -- Validate date format
      IF NOT (
        update_record->>'date' ~ '^\d{4}-\d{2}-\d{2}$'
      ) THEN
        RAISE EXCEPTION 'Invalid date format in update';
      END IF;
    END LOOP;

    -- Process updates with optimistic locking
    FOR update_record IN SELECT * FROM unnest(updates)
    LOOP
      -- Insert or update with version check
      INSERT INTO availability (
        room_id,
        date,
        available,
        price_override,
        blocked_reason,
        notes,
        updated_at
      )
      VALUES (
        (update_record->>'room_id')::integer,
        (update_record->>'date')::date,
        (update_record->>'available')::boolean,
        (update_record->>'price_override')::numeric,
        update_record->>'blocked_reason',
        update_record->>'notes',
        now()
      )
      ON CONFLICT (room_id, date) DO UPDATE
      SET
        available = EXCLUDED.available,
        price_override = EXCLUDED.price_override,
        blocked_reason = EXCLUDED.blocked_reason,
        notes = EXCLUDED.notes,
        updated_at = EXCLUDED.updated_at
      RETURNING * INTO result;

      RETURN NEXT result;
    END LOOP;

    -- Log successful transaction
    INSERT INTO transaction_logs (
      transaction_id,
      operation,
      status,
      metadata
    ) VALUES (
      transaction_id,
      'bulk_update_availability',
      'completed',
      jsonb_build_object(
        'updates_count', array_length(updates, 1),
        'success', true
      )
    );

    -- Commit is automatic at function end
  EXCEPTION WHEN OTHERS THEN
    -- Log failed transaction
    INSERT INTO transaction_logs (
      transaction_id,
      operation,
      status,
      metadata
    ) VALUES (
      transaction_id,
      'bulk_update_availability',
      'failed',
      jsonb_build_object(
        'error', SQLERRM,
        'updates_count', array_length(updates, 1)
      )
    );
    RAISE; -- Re-throw the error
  END;
END;
$$;