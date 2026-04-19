import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
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

// ---- Module-level shared store so every useWishlist() instance stays in sync.
let wishStore: Set<string> = new Set();
const wishListeners = new Set<() => void>();
const setWishStore = (next: Set<string>) => {
  wishStore = next;
  wishListeners.forEach((l) => l());
};
const subscribeWish = (l: () => void) => {
  wishListeners.add(l);
  return () => wishListeners.delete(l);
};
const getWishSnapshot = () => wishStore;

// Boot is per-user; track to avoid duplicate fetches across mounts.
let bootedForUserId: string | null | undefined = undefined;

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
  const wishlist = useSyncExternalStore(subscribeWish, getWishSnapshot, getWishSnapshot);
  const [friendWishlistByLocation, setFriendWishlistByLocation] = useState<
    Record<string, string[]>
  >({});
  const [loading, setLoading] = useState(true);

  // Boot: load own wishlist (cloud or local), and migrate local → cloud once.
  // Only runs once per user across all hook instances.
  useEffect(() => {
    if (authLoading) return;
    const currentKey = user?.id ?? "__anon__";
    if (bootedForUserId === currentKey) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    const boot = async () => {
      setLoading(true);

      if (!user) {
        if (!cancelled) {
          setWishStore(new Set(readLocal()));
          bootedForUserId = currentKey;
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
        setWishStore(new Set());
        bootedForUserId = currentKey;
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

      setWishStore(cloud);
      bootedForUserId = currentKey;
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
      const has = wishStore.has(locationId);
      // Optimistic — update shared store so all subscribers re-render.
      const next = new Set(wishStore);
      if (has) next.delete(locationId);
      else next.add(locationId);
      setWishStore(next);

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
        const stored = has ? local.filter((id) => id !== locationId) : [...local, locationId];
        writeLocal(stored);
      }
    },
    [user],
  );

  return {
    wishlist,
    friendWishlistByLocation,
    loading: authLoading || loading,
    isWished,
    toggleWish,
  };
};
