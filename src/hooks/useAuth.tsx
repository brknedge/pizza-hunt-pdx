import { useEffect, useState } from "react";
import type { Session, User as SbUser } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface Profile {
  id: string;
  username: string;
  nickname: string;
}

/**
 * Username-only auth: we synthesize a fake email so we can lean on Supabase
 * Auth's password hashing + sessions without ever asking the user for one.
 */
export const usernameToEmail = (username: string) =>
  `${username.trim().toLowerCase()}@pdxpizza.local`;

export const useAuth = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<SbUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // IMPORTANT: subscribe BEFORE getSession to avoid missed events
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (!s?.user) setProfile(null);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // Load profile whenever the user changes — defer to avoid deadlocking the
  // auth state callback.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, nickname")
        .eq("id", user.id)
        .maybeSingle();
      if (!cancelled) setProfile(data ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return { session, user, profile, loading, setProfile };
};
