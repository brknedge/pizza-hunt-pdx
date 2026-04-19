CREATE TABLE public.visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id TEXT NOT NULL,
  ratings JSONB NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  favorite BOOLEAN NOT NULL DEFAULT false,
  visited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, location_id)
);

CREATE INDEX visits_user_id_idx ON public.visits (user_id);
CREATE INDEX visits_location_id_idx ON public.visits (location_id);

ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;

-- Anyone signed in can read all visits (needed for the Friends feature)
CREATE POLICY "Visits viewable by authenticated users"
  ON public.visits FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own visits"
  ON public.visits FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own visits"
  ON public.visits FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own visits"
  ON public.visits FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_visits_updated_at
  BEFORE UPDATE ON public.visits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();