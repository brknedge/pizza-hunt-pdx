import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

const LOCAL_KEY = "ppw2026_wishlist";
const MIGRATED_FLAG = "ppw2026_wishlist_migrated";

const readLocal = (): string[] => {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
};
const writeLocal = (ids: string[]) =>
  localStorage.setItem(LOCAL_KEY, JSON.stringify(ids));

export interface WishlistState {
  /** Set of locationIds the current user wants to try */
  wishlist: Set<string>;
  /** Map<locationId, friendId[]> — friends who wishlisted each location */
  friendWishlistByLocation: Record<string, string[]>;
  loading: boolean;
  isWished: (locationId: string) => boolean;
  toggleWish: (locationId: string) => Promise<void>;
}

export const useWishlist = (friendIds: string[] = []): WishlistState => {
  const { user, loading: authLoading } = useAuth();
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [friendWishlistByLocation, setFriendWishlistByLocation] = useState<
    Record<string, string[]>
  >({});
  const [loading, setLoading] = useState(true);

  // Boot: load own wishlist (cloud or local), and migrate local → cloud once
  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    const boot = async () => {
      setLoading(true);

      if (!user) {
        if (!cancelled) {
          setWishlist(new Set(readLocal()));
          setLoading(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from("wishlists")
        .select("location_id")
        .eq("user_id", user.id);

      if (cancelled) return;
      if (error) {
        toast({ title: "Couldn't load wishlist", description: error.message, variant: "destructive" });
        setWishlist(new Set());
        setLoading(false);
        return;
      }

      const cloud = new Set((data ?? []).map((r) => r.location_id));

      // Migrate local → cloud once per account
      const flagKey = `${MIGRATED_FLAG}_${user.id}`;
      if (localStorage.getItem(flagKey) !== "1") {
        const local = readLocal();
        const toAdd = local.filter((id) => !cloud.has(id));
        if (toAdd.length > 0) {
          const rows = toAdd.map((location_id) => ({ user_id: user.id, location_id }));
          const { error: mErr } = await supabase.from("wishlists").insert(rows);
          if (!mErr) {
            toAdd.forEach((id) => cloud.add(id));
            localStorage.removeItem(LOCAL_KEY);
          }
        }
        localStorage.setItem(flagKey, "1");
      }

      setWishlist(cloud);
      setLoading(false);
    };

    void boot();
    return () => { cancelled = true; };
  }, [authLoading, user]);

  // Load friends' wishlists for badges on cards/map
  useEffect(() => {
    if (!user || friendIds.length === 0) {
      setFriendWishlistByLocation({});
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from("wishlists")
        .select("user_id, location_id")
        .in("user_id", friendIds);
      if (cancelled || error) return;
      const map: Record<string, string[]> = {};
      for (const row of data ?? []) {
        (map[row.location_id] ??= []).push(row.user_id);
      }
      setFriendWishlistByLocation(map);
    })();
    return () => { cancelled = true; };
  }, [user, friendIds.join(",")]);

  const isWished = useCallback((id: string) => wishlist.has(id), [wishlist]);

  const toggleWish = useCallback(
    async (locationId: string) => {
      const has = wishlist.has(locationId);
      // Optimistic
      setWishlist((prev) => {
        const next = new Set(prev);
        if (has) next.delete(locationId);
        else next.add(locationId);
        return next;
      });

      if (user) {
        if (has) {
          const { error } = await supabase
            .from("wishlists")
            .delete()
            .eq("user_id", user.id)
            .eq("location_id", locationId);
          if (error) toast({ title: "Couldn't update wishlist", description: error.message, variant: "destructive" });
        } else {
          const { error } = await supabase
            .from("wishlists")
            .insert({ user_id: user.id, location_id: locationId });
          if (error && error.code !== "23505") {
            toast({ title: "Couldn't update wishlist", description: error.message, variant: "destructive" });
          }
        }
      } else {
        const local = readLocal();
        const next = has ? local.filter((id) => id !== locationId) : [...local, locationId];
        writeLocal(next);
      }
    },
    [wishlist, user],
  );

  return {
    wishlist,
    friendWishlistByLocation,
    loading: authLoading || loading,
    isWished,
    toggleWish,
  };
};
