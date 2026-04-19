-- Visits: require mutual friendship
DROP POLICY IF EXISTS "Visits viewable by self or friends" ON public.visits;

CREATE POLICY "Visits viewable by self or mutual friends"
ON public.visits
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR (
    EXISTS (
      SELECT 1 FROM public.friendships f1
      WHERE f1.user_id = auth.uid() AND f1.friend_id = visits.user_id
    )
    AND EXISTS (
      SELECT 1 FROM public.friendships f2
      WHERE f2.user_id = visits.user_id AND f2.friend_id = auth.uid()
    )
  )
);

-- Wishlists: require mutual friendship
DROP POLICY IF EXISTS "Wishlists viewable by self or friends" ON public.wishlists;

CREATE POLICY "Wishlists viewable by self or mutual friends"
ON public.wishlists
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR (
    EXISTS (
      SELECT 1 FROM public.friendships f1
      WHERE f1.user_id = auth.uid() AND f1.friend_id = wishlists.user_id
    )
    AND EXISTS (
      SELECT 1 FROM public.friendships f2
      WHERE f2.user_id = wishlists.user_id AND f2.friend_id = auth.uid()
    )
  )
);