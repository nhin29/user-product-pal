
-- Step 1: Change the default for daily_time_tracking.date to use NY timezone
ALTER TABLE public.daily_time_tracking 
ALTER COLUMN date SET DEFAULT (now() AT TIME ZONE 'America/New_York')::date;

-- Step 2: For wrong-date records that CONFLICT with an existing correct-date record,
-- merge total_seconds and delete the wrong one
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT wrong.id AS wrong_id, wrong.total_seconds AS wrong_seconds, existing.id AS existing_id
    FROM public.daily_time_tracking wrong
    JOIN public.daily_time_tracking existing 
      ON existing.user_id = wrong.user_id 
      AND existing.date = (wrong.created_at AT TIME ZONE 'America/New_York')::date
      AND existing.id != wrong.id
    WHERE wrong.date != (wrong.created_at AT TIME ZONE 'America/New_York')::date
  LOOP
    UPDATE public.daily_time_tracking SET total_seconds = total_seconds + r.wrong_seconds WHERE id = r.existing_id;
    DELETE FROM public.daily_time_tracking WHERE id = r.wrong_id;
  END LOOP;
END $$;

-- Step 3: Fix remaining records that have no conflicts
UPDATE public.daily_time_tracking
SET date = (created_at AT TIME ZONE 'America/New_York')::date
WHERE date != (created_at AT TIME ZONE 'America/New_York')::date;
