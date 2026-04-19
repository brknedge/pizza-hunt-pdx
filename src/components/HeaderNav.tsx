import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { BarChart3, Map as MapIcon, Settings as SettingsIcon, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { SettingsDialog } from "@/components/SettingsDialog";
import { useVisits } from "@/hooks/useVisits";

const baseBtn =
  "h-10 w-10 grid place-items-center rounded-lg border-2 border-ink shadow-zine-sm shrink-0 transition-colors";
const inactive = "bg-card hover:bg-mozz";
const active = "bg-marinara text-primary-foreground";

/**
 * Shared top-right nav cluster: Map, Friends, Stats, Settings.
 * Highlights the icon matching the current route. Self-contained — wires
 * the Settings dialog to the same nickname/clear handlers used on Index.
 */
export const HeaderNav = () => {
  const { pathname } = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { nickname, setNickname, clearLocal } = useVisits();

  const isMap = pathname.startsWith("/map");
  const isFriends = pathname.startsWith("/friends");
  const isStats = pathname.startsWith("/stats");

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
        aria-label="Friends"
        aria-current={isFriends ? "page" : undefined}
        className={cn(baseBtn, isFriends ? active : inactive)}
      >
        <Users className="h-4 w-4" />
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
