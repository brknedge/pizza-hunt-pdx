
-- Create or replace handle_new_user trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username text;
  v_nickname text;
BEGIN
  v_username := COALESCE(
    NULLIF(NEW.raw_user_meta_data ->> 'username', ''),
    split_part(NEW.email, '@', 1)
  );
  v_nickname := COALESCE(
    NULLIF(NEW.raw_user_meta_data ->> 'nickname', ''),
    v_username
  );

  BEGIN
    INSERT INTO public.profiles (id, username, nickname)
    VALUES (NEW.id, v_username, left(v_nickname, 20));
  EXCEPTION WHEN unique_violation THEN
    RAISE LOG 'profiles already exists for user %', NEW.id;
  WHEN OTHERS THEN
    RAISE LOG 'handle_new_user error for %: % %', NEW.id, SQLERRM, SQLSTATE;
  END;

  RETURN NEW;
END;
$$;

-- Attach trigger (drop first in case of re-run)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
