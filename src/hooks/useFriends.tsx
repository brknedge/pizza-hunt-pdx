import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import type { RatingCategory, Visit } from "@/types/pizza";

export interface FriendProfile {
  id: string;
  username: string;
  nickname: string;
  visitCount: number;
  avgOverall: number | null;
}

export interface FriendVisit extends Visit {
  locationId: string;
  friendId: string;
}

const normalizeRatings = (
  r: Partial<Record<string, number>>,
): Record<RatingCategory, number> => ({
  creativity: r.creativity ?? 0,
  taste: r.taste ?? r.flavor ?? 0,
  service: r.service ?? 0,
  atmosphere: r.atmosphere ?? 0,
  overall: r.overall ?? 0,
});

interface FriendshipRow { friend_id: string }
interface ProfileRow { id: string; username: string; nickname: string }
interface VisitRow {
  user_id: string;
  location_id: string;
  ratings: Record<string, number>;
  notes: string;
  favorite: boolean;
  visited_at: string;
}

export const useFriends = () => {
  const { user } = useAuth();
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  /** Map<locationId, FriendVisit[]> for quick lookup on cards/map */
  const [friendVisitsByLocation, setFriendVisitsByLocation] = useState<
    Record<string, FriendVisit[]>
  >({});
  /** Map<friendId, FriendVisit[]> for the per-friend drill-in */
  const [visitsByFriend, setVisitsByFriend] = useState<
    Record<string, FriendVisit[]>
  >({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setFriends([]);
      setFriendVisitsByLocation({});
      setVisitsByFriend({});
      setLoading(false);
      return;
    }
    setLoading(true);

    // 1. Edges I created
    const { data: edges, error: eErr } = await supabase
      .from("friendships")
      .select("friend_id")
      .eq("user_id", user.id);
    if (eErr) {
      toast({ title: "Couldn't load friends", description: eErr.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    const ids = (edges as FriendshipRow[] | null)?.map((e) => e.friend_id) ?? [];
    if (ids.length === 0) {
      setFriends([]);
      setFriendVisitsByLocation({});
      setVisitsByFriend({});
      setLoading(false);
      return;
    }

    // 2. Profiles + their visits in parallel
    const [profilesRes, visitsRes] = await Promise.all([
      supabase.from("profiles").select("id, username, nickname").in("id", ids),
      supabase
        .from("visits")
        .select("user_id, location_id, ratings, notes, favorite, visited_at")
        .in("user_id", ids),
    ]);

    const profiles = (profilesRes.data as ProfileRow[] | null) ?? [];
    const rawVisits = (visitsRes.data as VisitRow[] | null) ?? [];

    const byFriend: Record<string, FriendVisit[]> = {};
    const byLocation: Record<string, FriendVisit[]> = {};
    for (const v of rawVisits) {
      const fv: FriendVisit = {
        friendId: v.user_id,
        locationId: v.location_id,
        visitedAt: v.visited_at,
        ratings: normalizeRatings(v.ratings ?? {}),
        notes: v.notes ?? "",
        favorite: !!v.favorite,
      };
      (byFriend[v.user_id] ??= []).push(fv);
      (byLocation[v.location_id] ??= []).push(fv);
    }

    const friendList: FriendProfile[] = profiles.map((p) => {
      const list = byFriend[p.id] ?? [];
      const sum = list.reduce((s, v) => s + v.ratings.overall, 0);
      return {
        id: p.id,
        username: p.username,
        nickname: p.nickname,
        visitCount: list.length,
        avgOverall: list.length ? sum / list.length : null,
      };
    });
    friendList.sort((a, b) => a.username.localeCompare(b.username));

    setFriends(friendList);
    setVisitsByFriend(byFriend);
    setFriendVisitsByLocation(byLocation);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addFriendByUsername = useCallback(
    async (rawUsername: string): Promise<{ ok: boolean; message: string }> => {
      if (!user) return { ok: false, message: "Sign in to add friends." };
      const username = rawUsername.trim().replace(/^@/, "");
      if (!username) return { ok: false, message: "Enter a username." };

      const { data: prof } = await supabase
        .from("profiles")
        .select("id, username, nickname")
        .ilike("username", username)
        .maybeSingle();
      if (!prof) return { ok: false, message: `No user named @${username}.` };
      if (prof.id === user.id) return { ok: false, message: "That's you!" };

      const { error } = await supabase
        .from("friendships")
        .insert({ user_id: user.id, friend_id: prof.id });
      if (error) {
        if (error.code === "23505") return { ok: false, message: `@${prof.username} is already a friend.` };
        return { ok: false, message: error.message };
      }
      await refresh();
      return { ok: true, message: `Added @${prof.username}` };
    },
    [user, refresh],
  );

  const removeFriend = useCallback(
    async (friendId: string) => {
      if (!user) return;
      const { error } = await supabase
        .from("friendships")
        .delete()
        .eq("user_id", user.id)
        .eq("friend_id", friendId);
      if (error) {
        toast({ title: "Couldn't remove", description: error.message, variant: "destructive" });
        return;
      }
      await refresh();
    },
    [user, refresh],
  );

  return {
    friends,
    friendVisitsByLocation,
    visitsByFriend,
    loading,
    addFriendByUsername,
    removeFriend,
    refresh,
  };
};
