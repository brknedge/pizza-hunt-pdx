-- Restrict visits SELECT to owner or friend
DROP POLICY IF EXISTS "Visits viewable by authenticated users" ON public.visits;

CREATE POLICY "Visits viewable by self or friends"
ON public.visits
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE f.user_id = auth.uid() AND f.friend_id = visits.user_id
  )
);

-- Restrict wishlists SELECT to owner or friend
DROP POLICY IF EXISTS "Wishlists viewable by authenticated users" ON public.wishlists;

CREATE POLICY "Wishlists viewable by self or friends"
ON public.wishlists
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE f.user_id = auth.uid() AND f.friend_id = wishlists.user_id
  )
);