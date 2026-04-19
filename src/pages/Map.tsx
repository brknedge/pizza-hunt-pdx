import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BarChart3, Bookmark, Check, Heart, Pizza, Users } from "lucide-react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import locationsData from "@/data/locations.json";
import type { Location } from "@/types/pizza";
import { useVisits } from "@/hooks/useVisits";
import { useFriends } from "@/hooks/useFriends";
import { useWishlist } from "@/hooks/useWishlist";

const LOCATIONS = locationsData as Location[];

const makeIcon = (visited: boolean, favorite: boolean, wished: boolean) => {
  const bg = favorite
    ? "hsl(var(--marinara))"
    : visited
    ? "hsl(var(--ink))"
    : wished
    ? "hsl(var(--mozz))"
    : "hsl(var(--card))";
  const fg = visited || favorite ? "#fff" : "hsl(var(--ink))";
  const inner = favorite ? "♥" : visited ? "✓" : wished ? "🔖" : "🍕";
  return L.divIcon({
    className: "",
    html: `<div style="
      width:32px;height:32px;border-radius:50%;
      background:${bg};color:${fg};
      border:2px solid hsl(var(--ink));
      box-shadow:2px 2px 0 hsl(var(--ink));
      display:grid;place-items:center;
      font-weight:700;font-size:14px;line-height:1;">${inner}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

const PORTLAND_CENTER: [number, number] = [45.5231, -122.6765];

const MapPage = () => {
  const { visits, loading } = useVisits();
  const { friends, friendVisitsByLocation } = useFriends();
  const friendIds = useMemo(() => friends.map((f) => f.id), [friends]);
  const { wishlist, friendWishlistByLocation, isWished, toggleWish } = useWishlist(friendIds);
  const friendNickname = (id: string) =>
    friends.find((f) => f.id === id)?.nickname ?? "Friend";

  const pinned = useMemo(
    () => LOCATIONS.filter((l) => typeof l.lat === "number" && typeof l.lng === "number"),
    [],
  );

  const visitedCount = visits ? Object.keys(visits).length : 0;
  const wishCount = wishlist.size;
  const skipped = LOCATIONS.length - pinned.length;

  if (loading) return null;

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b-2 border-ink">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            to="/"
            aria-label="Back"
            className="h-10 w-10 grid place-items-center rounded-lg border-2 border-ink bg-card hover:bg-mozz transition-colors shadow-zine-sm shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <Link to="/" aria-label="Home" className="shrink-0">
            <Pizza className="h-7 w-7 text-marinara" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl sm:text-3xl leading-none tracking-wide truncate">
              THE MAP
            </h1>
            <p className="text-xs text-muted-foreground truncate">
              {pinned.length} pinned · {visitedCount} visited · {wishCount} wishlist
              {skipped > 0 ? ` · ${skipped} missing coords` : ""}
            </p>
          </div>
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
        </div>
      </header>

      <main className="flex-1 relative">
        <MapContainer
          center={PORTLAND_CENTER}
          zoom={12}
          scrollWheelZoom
          className="h-full w-full"
          style={{ minHeight: "calc(100dvh - 64px)" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {pinned.map((l) => {
            const visit = visits?.[l.id];
            const visited = !!visit;
            const favorite = !!visit?.favorite;
            const wished = isWished(l.id);
            const friendWishes = friendWishlistByLocation[l.id] ?? [];
            return (
              <Marker
                key={l.id}
                position={[l.lat as number, l.lng as number]}
                icon={makeIcon(visited, favorite, wished)}
              >
                <Popup>
                  <div className="font-sans">
                    <div className="font-display text-base leading-tight tracking-wide">
                      {l.name}
                    </div>
                    <div className="text-marinara font-semibold text-sm">{l.pizzaName}</div>
                    <div className="text-xs text-muted-foreground">{l.neighborhood}</div>
                    {visited && (
                      <div className="mt-1 flex items-center gap-2 text-xs">
                        <span className="inline-flex items-center gap-1 text-foreground">
                          <Check className="h-3 w-3" /> Visited
                        </span>
                        {favorite && (
                          <span className="inline-flex items-center gap-1 text-marinara">
                            <Heart className="h-3 w-3 fill-current" /> Top pick
                          </span>
                        )}
                        {visit && (
                          <span>· {visit.ratings.overall.toFixed(1)}★</span>
                        )}
                      </div>
                    )}
                    {!visited && (
                      <div className="mt-1">
                        <button
                          type="button"
                          onClick={() => void toggleWish(l.id)}
                          className="inline-flex items-center gap-1 text-xs font-semibold underline"
                        >
                          <Bookmark className="h-3 w-3" fill={wished ? "currentColor" : "none"} />
                          {wished ? "Saved · remove" : "Want to try"}
                        </button>
                      </div>
                    )}
                    {(friendVisitsByLocation[l.id]?.length ?? 0) > 0 && (
                      <div className="mt-1 pt-1 border-t border-dashed border-muted">
                        <div className="text-xs font-semibold flex items-center gap-1">
                          <Users className="h-3 w-3" /> Friends rated
                        </div>
                        <ul className="text-xs space-y-0.5 mt-0.5">
                          {friendVisitsByLocation[l.id].slice(0, 3).map((fv) => (
                            <li key={fv.friendId}>
                              {friendNickname(fv.friendId)} · {fv.ratings.overall}★
                              {fv.favorite ? " ♥" : ""}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {friendWishes.length > 0 && (
                      <div className="mt-1 pt-1 border-t border-dashed border-muted">
                        <div className="text-xs font-semibold flex items-center gap-1">
                          <Bookmark className="h-3 w-3" /> Friends want to try
                        </div>
                        <ul className="text-xs space-y-0.5 mt-0.5">
                          {friendWishes.slice(0, 3).map((fid) => (
                            <li key={fid}>{friendNickname(fid)}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <Link
                      to={`/?rate=${encodeURIComponent(l.id)}`}
                      className="text-xs underline mt-1 inline-block font-semibold"
                    >
                      {visited ? "Edit rating →" : "Rate this slice →"}
                    </Link>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        <div className="absolute bottom-3 left-3 z-[1000] bg-card border-2 border-ink rounded-lg shadow-zine-sm px-3 py-2 text-xs space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-block h-4 w-4 rounded-full bg-card border-2 border-ink" />
            Unvisited
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-4 w-4 rounded-full bg-ink border-2 border-ink" />
            Visited
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-4 w-4 rounded-full bg-marinara border-2 border-ink" />
            Top pick
          </div>
        </div>
      </main>
    </div>
  );
};

export default MapPage;
