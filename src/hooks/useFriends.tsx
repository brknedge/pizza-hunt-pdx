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

export interface PendingRequest {
  /** friendships row id, used to accept/reject */
  rowId: string;
  /** the other user (the requester) */
  userId: string;
  username: string;
  nickname: string;
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

interface FriendshipRow { id: string; user_id: string; friend_id: string; status: "pending" | "accepted" }
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
  const [pendingIncoming, setPendingIncoming] = useState<PendingRequest[]>([]);
  const [pendingOutgoingCount, setPendingOutgoingCount] = useState(0);
  /** Map<locationId, FriendVisit[]> for quick lookup on cards/map */
  const [friendVisitsByLocation, setFriendVisitsByLocation] = useState<
    Record<string, FriendVisit[]>
  >({});
  /** Map<friendId, FriendVisit[]> for the per-friend drill-in */
  const [visitsByFriend, setVisitsByFriend] = useState<
    Record<string, FriendVisit[]>
  >({});
  const [loading, setLoading] = useState(true);
  /** Most recent friend visit timestamp (ISO) across all friends. */
  const [latestFriendVisitAt, setLatestFriendVisitAt] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setFriends([]);
      setPendingIncoming([]);
      setPendingOutgoingCount(0);
      setFriendVisitsByLocation({});
      setVisitsByFriend({});
      setLatestFriendVisitAt(null);
      setLoading(false);
      return;
    }
    setLoading(true);

    // 1. All friendship edges that touch me (RLS already restricts to these)
    const { data: edges, error: eErr } = await supabase
      .from("friendships")
      .select("id, user_id, friend_id, status");
    if (eErr) {
      toast({ title: "Couldn't load friends", description: eErr.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    const allEdges = (edges as FriendshipRow[] | null) ?? [];

    // Outgoing edges I created
    const myOutgoing = allEdges.filter((e) => e.user_id === user.id);
    // Incoming edges where someone added me
    const incoming = allEdges.filter((e) => e.friend_id === user.id);

    // Mutual + accepted = real friends
    const incomingAcceptedFromUser = new Set(
      incoming.filter((e) => e.status === "accepted").map((e) => e.user_id),
    );
    const acceptedFriendIds = myOutgoing
      .filter((e) => e.status === "accepted" && incomingAcceptedFromUser.has(e.friend_id))
      .map((e) => e.friend_id);

    // Pending incoming requests = someone added me, I haven't accepted yet (no row from me to them, OR my row to them is pending)
    const myOutgoingByFriend = new Map(myOutgoing.map((e) => [e.friend_id, e]));
    const pendingIn = incoming.filter((e) => {
      const mine = myOutgoingByFriend.get(e.user_id);
      return !mine || mine.status === "pending";
    });

    // Outgoing pending = I added them, they haven't reciprocated yet
    const incomingFromUser = new Map(incoming.map((e) => [e.user_id, e]));
    const pendingOutCount = myOutgoing.filter((e) => {
      const theirs = incomingFromUser.get(e.friend_id);
      return !theirs || theirs.status === "pending" || e.status === "pending";
    }).length - acceptedFriendIds.length > 0
      ? myOutgoing.length - acceptedFriendIds.length
      : 0;

    // Profiles for friends + pending incoming
    const profileIds = Array.from(
      new Set([...acceptedFriendIds, ...pendingIn.map((e) => e.user_id)]),
    );

    if (profileIds.length === 0) {
      setFriends([]);
      setPendingIncoming([]);
      setPendingOutgoingCount(pendingOutCount);
      setFriendVisitsByLocation({});
      setVisitsByFriend({});
      setLatestFriendVisitAt(null);
      setLoading(false);
      return;
    }

    const [profilesRes, visitsRes] = await Promise.all([
      supabase.from("profiles").select("id, username, nickname").in("id", profileIds),
      acceptedFriendIds.length > 0
        ? supabase
            .from("visits")
            .select("user_id, location_id, ratings, notes, favorite, visited_at")
            .in("user_id", acceptedFriendIds)
        : Promise.resolve({ data: [] as VisitRow[] }),
    ]);

    const profiles = (profilesRes.data as ProfileRow[] | null) ?? [];
    const profileById = new Map(profiles.map((p) => [p.id, p]));
    const rawVisits = (visitsRes.data as VisitRow[] | null) ?? [];

    const byFriend: Record<string, FriendVisit[]> = {};
    const byLocation: Record<string, FriendVisit[]> = {};
    let latest: string | null = null;
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
      if (!latest || v.visited_at > latest) latest = v.visited_at;
    }

    const friendList: FriendProfile[] = acceptedFriendIds
      .map((id) => {
        const p = profileById.get(id);
        if (!p) return null;
        const list = byFriend[id] ?? [];
        const sum = list.reduce((s, v) => s + v.ratings.overall, 0);
        return {
          id: p.id,
          username: p.username,
          nickname: p.nickname,
          visitCount: list.length,
          avgOverall: list.length ? sum / list.length : null,
        };
      })
      .filter((f): f is FriendProfile => !!f);
    friendList.sort((a, b) => a.username.localeCompare(b.username));

    const pendingList: PendingRequest[] = pendingIn
      .map((e) => {
        const p = profileById.get(e.user_id);
        if (!p) return null;
        return { rowId: e.id, userId: p.id, username: p.username, nickname: p.nickname };
      })
      .filter((r): r is PendingRequest => !!r);

    setFriends(friendList);
    setPendingIncoming(pendingList);
    setPendingOutgoingCount(pendingOutCount);
    setVisitsByFriend(byFriend);
    setFriendVisitsByLocation(byLocation);
    setLatestFriendVisitAt(latest);
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

      // Check if they've already sent me a request — if so, this auto-accepts the mutual link.
      const { data: incoming } = await supabase
        .from("friendships")
        .select("id, status")
        .eq("user_id", prof.id)
        .eq("friend_id", user.id)
        .maybeSingle();

      const myStatus: "pending" | "accepted" = incoming ? "accepted" : "pending";

      const { error } = await supabase
        .from("friendships")
        .insert({ user_id: user.id, friend_id: prof.id, status: myStatus });
      if (error) {
        if (error.code === "23505") return { ok: false, message: `Request to @${prof.username} already sent.` };
        return { ok: false, message: error.message };
      }

      // If they already had a pending row pointing at me, accept it now.
      if (incoming && incoming.status === "pending") {
        await supabase
          .from("friendships")
          .update({ status: "accepted" })
          .eq("id", incoming.id);
      }

      await refresh();
      return {
        ok: true,
        message: incoming
          ? `You and @${prof.username} are now friends!`
          : `Friend request sent to @${prof.username}.`,
      };
    },
    [user, refresh],
  );

  const acceptRequest = useCallback(
    async (request: PendingRequest) => {
      if (!user) return;
      // Accept the incoming row (RLS lets the recipient update)
      const { error: upErr } = await supabase
        .from("friendships")
        .update({ status: "accepted" })
        .eq("id", request.rowId);
      if (upErr) {
        toast({ title: "Couldn't accept", description: upErr.message, variant: "destructive" });
        return;
      }
      // Insert the reciprocal accepted edge if I don't already have one
      const { data: mine } = await supabase
        .from("friendships")
        .select("id, status")
        .eq("user_id", user.id)
        .eq("friend_id", request.userId)
        .maybeSingle();
      if (!mine) {
        await supabase
          .from("friendships")
          .insert({ user_id: user.id, friend_id: request.userId, status: "accepted" });
      } else if (mine.status !== "accepted") {
        await supabase.from("friendships").update({ status: "accepted" }).eq("id", mine.id);
      }
      await refresh();
    },
    [user, refresh],
  );

  const rejectRequest = useCallback(
    async (request: PendingRequest) => {
      if (!user) return;
      const { error } = await supabase.from("friendships").delete().eq("id", request.rowId);
      if (error) {
        toast({ title: "Couldn't reject", description: error.message, variant: "destructive" });
        return;
      }
      await refresh();
    },
    [user, refresh],
  );

  const removeFriend = useCallback(
    async (friendId: string) => {
      if (!user) return;
      // Remove my outgoing edge (RLS lets owner delete). The other side stays
      // until they remove me, but mutual-accepted check breaks immediately.
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
    pendingIncoming,
    pendingOutgoingCount,
    friendVisitsByLocation,
    visitsByFriend,
    loading,
    latestFriendVisitAt,
    addFriendByUsername,
    acceptRequest,
    rejectRequest,
    removeFriend,
    refresh,
  };
};
