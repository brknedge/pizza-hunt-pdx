import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { BarChart3, Map as MapIcon, Settings as SettingsIcon, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { SettingsDialog } from "@/components/SettingsDialog";
import { useVisits } from "@/hooks/useVisits";
import { useFriends } from "@/hooks/useFriends";
import { useAuth } from "@/hooks/useAuth";

const baseBtn =
  "h-10 w-10 grid place-items-center rounded-lg border-2 border-ink shadow-zine-sm shrink-0 transition-colors relative";
const inactive = "bg-card hover:bg-mozz";
const active = "bg-marinara text-primary-foreground";

const SEEN_KEY = "pdxpw:friendsSeenAt";

/**
 * Shared top-right nav cluster: Map, Friends, Stats, Settings.
 * Highlights the icon matching the current route. Self-contained — wires
 * the Settings dialog to the same nickname/clear handlers used on Index.
 */
export const HeaderNav = () => {
  const { pathname } = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { nickname, setNickname, clearLocal } = useVisits();
  const { user } = useAuth();
  const { latestFriendVisitAt, pendingIncoming } = useFriends();
  const [seenAt, setSeenAt] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem(SEEN_KEY) : null,
  );

  const isMap = pathname.startsWith("/map");
  const isFriends = pathname.startsWith("/friends");
  const isStats = pathname.startsWith("/stats");

  // When the user lands on /friends, mark everything as seen.
  useEffect(() => {
    if (!isFriends) return;
    const now = new Date().toISOString();
    localStorage.setItem(SEEN_KEY, now);
    setSeenAt(now);
  }, [isFriends, latestFriendVisitAt, pendingIncoming.length]);

  const hasNewVisit = !!(
    user &&
    latestFriendVisitAt &&
    (!seenAt || latestFriendVisitAt > seenAt)
  );
  const newRequestCount = user ? pendingIncoming.length : 0;
  const showBadge = !isFriends && (hasNewVisit || newRequestCount > 0);

  return (
    <>
      <Link
        to="/map"
        aria-label="Map"
        aria-current={isMap ? "page" : undefined}
        className={cn(baseBtn, isMap ? active : inactive)}
      >
        <MapIcon className="h-4 w-4" />
      </Link>
      <Link
        to="/friends"
        aria-label={showBadge ? "Friends (new activity)" : "Friends"}
        aria-current={isFriends ? "page" : undefined}
        className={cn(baseBtn, isFriends ? active : inactive)}
      >
        <Users className="h-4 w-4" />
        {showBadge && (
          <span
            aria-hidden
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full bg-marinara text-primary-foreground text-[10px] font-display tracking-wide border-2 border-ink shadow-zine-sm"
          >
            {newRequestCount > 0 ? newRequestCount : "•"}
          </span>
        )}
      </Link>
      <Link
        to="/stats"
        aria-label="My stats"
        aria-current={isStats ? "page" : undefined}
        className={cn(baseBtn, isStats ? active : inactive)}
      >
        <BarChart3 className="h-4 w-4" />
      </Link>
      <button
        onClick={() => setSettingsOpen(true)}
        aria-label="Settings"
        className={cn(baseBtn, inactive)}
      >
        <SettingsIcon className="h-4 w-4" />
      </button>

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        nickname={nickname}
        onRename={setNickname}
        onClear={() => {
          clearLocal();
          setSettingsOpen(false);
        }}
      />
    </>
  );
};
