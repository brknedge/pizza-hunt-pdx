
-- 1. Add status column to friendships
CREATE TYPE public.friendship_status AS ENUM ('pending', 'accepted');

ALTER TABLE public.friendships
  ADD COLUMN status public.friendship_status NOT NULL DEFAULT 'pending';

-- Grandfather existing rows so current friends keep working
UPDATE public.friendships SET status = 'accepted';

-- 2. Let recipients see pending requests sent TO them, and update (accept) them
CREATE POLICY "Recipients can accept friend requests"
ON public.friendships
FOR UPDATE
TO authenticated
USING (auth.uid() = friend_id)
WITH CHECK (auth.uid() = friend_id);

-- Recipients can also reject (delete) requests sent to them
CREATE POLICY "Recipients can reject friend requests"
ON public.friendships
FOR DELETE
TO authenticated
USING (auth.uid() = friend_id);

-- 3. Tighten visits SELECT to require BOTH directions accepted
DROP POLICY IF EXISTS "Visits viewable by self or mutual friends" ON public.visits;

CREATE POLICY "Visits viewable by self or mutual accepted friends"
ON public.visits
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR (
    EXISTS (
      SELECT 1 FROM public.friendships f1
      WHERE f1.user_id = auth.uid()
        AND f1.friend_id = visits.user_id
        AND f1.status = 'accepted'
    )
    AND EXISTS (
      SELECT 1 FROM public.friendships f2
      WHERE f2.user_id = visits.user_id
        AND f2.friend_id = auth.uid()
        AND f2.status = 'accepted'
    )
  )
);

-- 4. Tighten wishlists SELECT the same way
DROP POLICY IF EXISTS "Wishlists viewable by self or mutual friends" ON public.wishlists;

CREATE POLICY "Wishlists viewable by self or mutual accepted friends"
ON public.wishlists
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR (
    EXISTS (
      SELECT 1 FROM public.friendships f1
      WHERE f1.user_id = auth.uid()
        AND f1.friend_id = wishlists.user_id
        AND f1.status = 'accepted'
    )
    AND EXISTS (
      SELECT 1 FROM public.friendships f2
      WHERE f2.user_id = wishlists.user_id
        AND f2.friend_id = auth.uid()
        AND f2.status = 'accepted'
    )
  )
);
