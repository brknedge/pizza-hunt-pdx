import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BarChart3, Map as MapIcon, Pizza, Search, Settings as SettingsIcon, Users } from "lucide-react";
import locationsData from "@/data/locations.json";
import type { Location, Visit } from "@/types/pizza";
import { useVisits } from "@/hooks/useVisits";
import { useFriends } from "@/hooks/useFriends";
import { useWishlist } from "@/hooks/useWishlist";
import { NicknameGate } from "@/components/NicknameGate";
import { LocationCard } from "@/components/LocationCard";
import { RatingDialog } from "@/components/RatingDialog";
import { SettingsDialog } from "@/components/SettingsDialog";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const LOCATIONS = locationsData as Location[];

type Filter =
  | "all"
  | "visited"
  | "unvisited"
  | "favorites"
  | "wishlist"
  | "vegetarian"
  | "vegan"
  | "gluten-free"
  | string;

const hasGF = (gf: Location["glutenFree"]) =>
  gf === "yes" || gf === "available-same-price" || gf === "available-with-surcharge";

const matchesTagQuery = (l: Location, q: string): boolean => {
  if (l.dietary.includes("vegan") && /\bvegan\b/.test(q)) return true;
  if ((l.dietary.includes("vegetarian") || l.dietary.includes("vegan")) &&
      /\b(veg|vegetarian|veggie)\b/.test(q)) return true;
  if (hasGF(l.glutenFree) && /\b(gf|gluten[\s-]?free|gluten)\b/.test(q)) return true;
  if (l.dietary.includes("meat") && /\b(meat|carnivore)\b/.test(q)) return true;
  return false;
};

const Index = () => {
  const {
    visits, nickname, isCloud, loading,
    upsertVisit, removeVisit, toggleFavorite, setNickname, clearLocal,
  } = useVisits();
  const { friends, friendVisitsByLocation } = useFriends();
  const friendIds = useMemo(() => friends.map((f) => f.id), [friends]);
  const { wishlist, friendWishlistByLocation, isWished, toggleWish } = useWishlist(friendIds);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Open the rating dialog when navigated with ?rate=<id> (e.g. from the Map)
  useEffect(() => {
    const rateId = searchParams.get("rate");
    if (rateId && LOCATIONS.some((l) => l.id === rateId)) {
      setActiveId(rateId);
      const next = new URLSearchParams(searchParams);
      next.delete("rate");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const neighborhoods = useMemo(
    () => Array.from(new Set(LOCATIONS.map((l) => l.neighborhood).filter(Boolean))).sort(),
    [],
  );

  const filtered = useMemo(() => {
    const v = visits ?? {};
    const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return LOCATIONS.filter((l) => {
      if (tokens.length) {
        const haystack = [
          l.name, l.pizzaName, l.neighborhood, l.ingredients ?? "", l.blurb ?? "",
        ].join(" ").toLowerCase();
        const everyHit = tokens.every(
          (t) => haystack.includes(t) || matchesTagQuery(l, t),
        );
        if (!everyHit) return false;
      }
      if (filter === "visited") return !!v[l.id];
      if (filter === "unvisited") return !v[l.id];
      if (filter === "favorites") return !!v[l.id]?.favorite;
      if (filter === "wishlist") return wishlist.has(l.id);
      if (filter === "vegetarian")
        return l.dietary.includes("vegetarian") || l.dietary.includes("vegan");
      if (filter === "vegan") return l.dietary.includes("vegan");
      if (filter === "gluten-free") return hasGF(l.glutenFree);
      if (filter !== "all") return l.neighborhood === filter;
      return true;
    });
  }, [query, filter, visits, wishlist]);

  const visitedCount = visits ? Object.keys(visits).length : 0;
  const total = LOCATIONS.length;
  const pct = Math.round((visitedCount / total) * 100);

  if (loading) return null;
  // Offline mode w/ no nickname yet → ask for one
  if (!isCloud && !nickname) {
    return <NicknameGate onReady={(n) => setNickname(n)} />;
  }

  const active = LOCATIONS.find((l) => l.id === activeId) || null;
  const activeVisit = active && visits ? visits[active.id] : undefined;

  const handleSave = async (visit: Visit) => {
    if (!active) return;
    await upsertVisit(active.id, visit);
    setActiveId(null);
  };

  const handleDelete = async () => {
    if (!active) return;
    await removeVisit(active.id);
    setActiveId(null);
  };

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b-2 border-ink">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/" aria-label="Home" className="shrink-0">
            <Pizza className="h-7 w-7 text-marinara" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl sm:text-3xl leading-none tracking-wide truncate">
              PDX PIZZA WEEK <span className="text-marinara">'26</span>
            </h1>
            <p className="text-xs text-muted-foreground truncate">
              Hey <span className="font-semibold text-foreground">{nickname || "friend"}</span>
              {isCloud ? " ☁️" : ""} · {visitedCount}/{total} slices
            </p>
          </div>
          <div className="hidden sm:block bg-mozz border-2 border-ink px-3 py-1 rounded-md font-display tracking-widest text-sm">
            APR 20–26
          </div>
          <Link
            to="/map"
            aria-label="Map"
            className="h-10 w-10 grid place-items-center rounded-lg border-2 border-ink bg-card hover:bg-mozz transition-colors shadow-zine-sm shrink-0"
          >
            <MapIcon className="h-4 w-4" />
          </Link>
          <Link
            to="/friends"
            aria-label="Friends"
            className="h-10 w-10 grid place-items-center rounded-lg border-2 border-ink bg-card hover:bg-mozz transition-colors shadow-zine-sm shrink-0"
          >
            <Users className="h-4 w-4" />
          </Link>
          <Link
            to="/stats"
            aria-label="My stats"
            className="h-10 w-10 grid place-items-center rounded-lg border-2 border-ink bg-card hover:bg-mozz transition-colors shadow-zine-sm shrink-0"
          >
            <BarChart3 className="h-4 w-4" />
          </Link>
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
            className="h-10 w-10 grid place-items-center rounded-lg border-2 border-ink bg-card hover:bg-mozz transition-colors shadow-zine-sm shrink-0"
          >
            <SettingsIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="max-w-6xl mx-auto px-4 pb-3">
          <div className="h-3 w-full bg-card border-2 border-ink rounded-full overflow-hidden shadow-zine-sm">
            <div
              className="h-full bg-marinara transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-5">
        <div className="flex flex-col sm:flex-row gap-2 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search restaurant, pizza, neighborhood…"
              className="pl-9 h-11 border-2 border-ink shadow-zine-sm rounded-lg bg-card"
            />
          </div>
          <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <SelectTrigger className="w-full sm:w-56 h-11 border-2 border-ink shadow-zine-sm rounded-lg bg-card font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-2 border-ink max-h-80">
              <SelectItem value="all">All locations</SelectItem>
              <SelectItem value="visited">Visited only</SelectItem>
              <SelectItem value="unvisited">Unvisited only</SelectItem>
              <SelectItem value="favorites">❤️ Favorites</SelectItem>
              <SelectItem value="vegetarian">🥬 Vegetarian</SelectItem>
              <SelectItem value="vegan">🌱 Vegan</SelectItem>
              <SelectItem value="gluten-free">🌾 Gluten-free option</SelectItem>
              {neighborhoods.map((n) => (
                <SelectItem key={n} value={n}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-ink rounded-xl">
            <p className="font-display text-2xl tracking-wide">NO SLICES MATCH</p>
            <p className="text-muted-foreground text-sm mt-1">Try a different search or filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {filtered.map((l, i) => (
              <LocationCard
                key={l.id}
                location={l}
                visit={visits?.[l.id]}
                friendVisits={friendVisitsByLocation[l.id]}
                onClick={() => setActiveId(l.id)}
                onToggleFavorite={() => void toggleFavorite(l.id)}
                index={i}
              />
            ))}
          </div>
        )}

        <footer className="mt-12 pt-6 border-t-2 border-dashed border-ink/30 text-center text-xs text-muted-foreground">
          Data scraped from <a href="https://everout.com/portland/events/the-portland-mercurys-pizza-week-2026/e222744/" target="_blank" rel="noreferrer" className="underline">EverOut</a> · {isCloud ? "Synced to your account" : "Saved on this device only"} · Made with 🍕 in Portland
        </footer>
      </main>

      <RatingDialog
        location={active}
        existing={activeVisit}
        open={!!active}
        onOpenChange={(o) => !o && setActiveId(null)}
        onSave={handleSave}
        onDelete={activeVisit ? handleDelete : undefined}
      />

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        nickname={nickname}
        onRename={setNickname}
        onClear={() => { clearLocal(); setSettingsOpen(false); }}
      />
    </div>
  );
};

export default Index;
