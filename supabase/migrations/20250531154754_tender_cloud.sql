-- Create admin user if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE email = 'info.roominbloom@gmail.com'
  ) THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      uuid_generate_v4(),
      'authenticated',
      'authenticated',
      'info.roominbloom@gmail.com',
      crypt('PLACEHOLDER_PASSWORD', gen_salt('bf')), -- Change via dashboard
      now(),
      now(),
      now(),
      encode(gen_random_bytes(32), 'hex'),
      encode(gen_random_bytes(32), 'hex'),
      encode(gen_random_bytes(32), 'hex'),
      ''
    );
  END IF;
END
$$;