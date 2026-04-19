import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import type { RatingCategory, Visit } from "@/types/pizza";

const LOCAL_KEY = "ppw2026_user";
const MIGRATED_FLAG = "ppw2026_migrated";

interface LocalUser {
  userId: string;
  nickname: string;
  createdAt: string;
  visits: Record<string, Visit>;
}

const readLocal = (): LocalUser | null => {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as LocalUser) : null;
  } catch {
    return null;
  }
};

const writeLocal = (u: LocalUser) =>
  localStorage.setItem(LOCAL_KEY, JSON.stringify(u));

const ensureLocal = (nickname = "Guest"): LocalUser => {
  const existing = readLocal();
  if (existing) return existing;
  const fresh: LocalUser = {
    userId:
      (crypto as Crypto & { randomUUID?: () => string }).randomUUID?.() ??
      `id-${Date.now()}`,
    nickname,
    createdAt: new Date().toISOString(),
    visits: {},
  };
  writeLocal(fresh);
  return fresh;
};

// Normalize ratings so any older "flavor" key becomes "taste"
const normalizeRatings = (
  r: Partial<Record<string, number>>,
): Record<RatingCategory, number> => ({
  creativity: r.creativity ?? 0,
  taste: r.taste ?? r.flavor ?? 0,
  service: r.service ?? 0,
  atmosphere: r.atmosphere ?? 0,
  overall: r.overall ?? 0,
});

interface VisitRow {
  location_id: string;
  ratings: Record<string, number>;
  notes: string;
  favorite: boolean;
  visited_at: string;
}

const rowsToMap = (rows: VisitRow[]): Record<string, Visit> => {
  const out: Record<string, Visit> = {};
  for (const r of rows) {
    out[r.location_id] = {
      visitedAt: r.visited_at,
      ratings: normalizeRatings(r.ratings ?? {}),
      notes: r.notes ?? "",
      favorite: !!r.favorite,
    };
  }
  return out;
};

export interface VisitsState {
  /** null while still booting, then always defined */
  visits: Record<string, Visit> | null;
  nickname: string;
  isCloud: boolean;
  /** true while loading or syncing */
  loading: boolean;
  upsertVisit: (locationId: string, visit: Visit) => Promise<void>;
  removeVisit: (locationId: string) => Promise<void>;
  toggleFavorite: (locationId: string) => Promise<void>;
  setNickname: (n: string) => Promise<void>;
  clearLocal: () => void;
}

export const useVisits = (): VisitsState => {
  const { user, profile, loading: authLoading } = useAuth();
  const [visits, setVisits] = useState<Record<string, Visit> | null>(null);
  const [nickname, setNicknameState] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const migrationDoneRef = useRef<string | null>(null);

  const isCloud = !!user;

  // Boot / re-boot whenever auth state settles
  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    const boot = async () => {
      setLoading(true);

      if (!user) {
        // Offline mode — fall back to localStorage
        const local = readLocal();
        if (!cancelled) {
          setVisits(local?.visits ?? null);
          setNicknameState(local?.nickname ?? "");
          setLoading(false);
        }
        return;
      }

      // Cloud mode — fetch this user's visits
      const { data, error } = await supabase
        .from("visits")
        .select("location_id, ratings, notes, favorite, visited_at")
        .eq("user_id", user.id);

      if (cancelled) return;
      if (error) {
        toast({
          title: "Couldn't load your ratings",
          description: error.message,
          variant: "destructive",
        });
        setVisits({});
      } else {
        const cloud = rowsToMap((data ?? []) as VisitRow[]);

        // First-time-per-account migration: push any local visits up if the
        // cloud account is empty. Guarded so we never run twice for the same
        // user in this browser.
        const flagKey = `${MIGRATED_FLAG}_${user.id}`;
        const alreadyMigrated =
          migrationDoneRef.current === user.id ||
          localStorage.getItem(flagKey) === "1";
        const local = readLocal();
        const localCount = local ? Object.keys(local.visits).length : 0;

        if (
          !alreadyMigrated &&
          localCount > 0 &&
          Object.keys(cloud).length === 0
        ) {
          const rows = Object.entries(local!.visits).map(([locId, v]) => ({
            user_id: user.id,
            location_id: locId,
            ratings: v.ratings,
            notes: v.notes ?? "",
            favorite: !!v.favorite,
            visited_at: v.visitedAt,
          }));
          const { error: mErr } = await supabase.from("visits").insert(rows);
          if (mErr) {
            toast({
              title: "Couldn't migrate your local ratings",
              description: mErr.message,
              variant: "destructive",
            });
          } else {
            // Move local visits into the cloud snapshot so the UI shows them
            for (const [locId, v] of Object.entries(local!.visits)) cloud[locId] = v;
            // Clear local so we don't double-apply on next sign-in
            localStorage.removeItem(LOCAL_KEY);
            localStorage.setItem(flagKey, "1");
            migrationDoneRef.current = user.id;
            toast({
              title: "Synced your slices ☁️",
              description: `Moved ${rows.length} rating${rows.length === 1 ? "" : "s"} to your account.`,
            });
          }
        } else {
          migrationDoneRef.current = user.id;
          localStorage.setItem(flagKey, "1");
        }

        setVisits(cloud);
      }

      setNicknameState(profile?.nickname ?? user.email?.split("@")[0] ?? "Friend");
      setLoading(false);
    };

    void boot();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, profile]);

  const upsertVisit = useCallback(
    async (locationId: string, visit: Visit) => {
      if (user) {
        // Optimistic
        setVisits((prev) => ({ ...(prev ?? {}), [locationId]: visit }));
        const { error } = await supabase.from("visits").upsert(
          {
            user_id: user.id,
            location_id: locationId,
            ratings: visit.ratings,
            notes: visit.notes ?? "",
            favorite: !!visit.favorite,
            visited_at: visit.visitedAt,
          },
          { onConflict: "user_id,location_id" },
        );
        if (error) {
          toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
        }
      } else {
        const local = ensureLocal(nickname || "Guest");
        local.visits[locationId] = visit;
        writeLocal(local);
        setVisits({ ...local.visits });
      }
    },
    [user, nickname],
  );

  const removeVisit = useCallback(
    async (locationId: string) => {
      if (user) {
        setVisits((prev) => {
          if (!prev) return prev;
          const next = { ...prev };
          delete next[locationId];
          return next;
        });
        const { error } = await supabase
          .from("visits")
          .delete()
          .eq("user_id", user.id)
          .eq("location_id", locationId);
        if (error) {
          toast({ title: "Couldn't remove", description: error.message, variant: "destructive" });
        }
      } else {
        const local = readLocal();
        if (!local) return;
        delete local.visits[locationId];
        writeLocal(local);
        setVisits({ ...local.visits });
      }
    },
    [user],
  );

  const toggleFavorite = useCallback(
    async (locationId: string) => {
      const current = visits?.[locationId];
      if (!current) return;
      const next: Visit = { ...current, favorite: !current.favorite };
      await upsertVisit(locationId, next);
    },
    [visits, upsertVisit],
  );

  const setNickname = useCallback(
    async (n: string) => {
      const trimmed = n.trim().slice(0, 20);
      if (!trimmed) return;
      setNicknameState(trimmed);
      if (user) {
        const { error } = await supabase
          .from("profiles")
          .update({ nickname: trimmed })
          .eq("id", user.id);
        if (error) {
          toast({ title: "Couldn't rename", description: error.message, variant: "destructive" });
        }
      } else {
        const local = ensureLocal(trimmed);
        local.nickname = trimmed;
        writeLocal(local);
      }
    },
    [user],
  );

  const clearLocal = useCallback(() => {
    localStorage.removeItem(LOCAL_KEY);
    if (!user) {
      setVisits(null);
      setNicknameState("");
    }
  }, [user]);

  return {
    visits,
    nickname,
    isCloud,
    loading: authLoading || loading,
    upsertVisit,
    removeVisit,
    toggleFavorite,
    setNickname,
    clearLocal,
  };
};
