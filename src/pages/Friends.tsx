import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Pizza, Search, UserPlus, Users, X } from "lucide-react";
import locationsData from "@/data/locations.json";
import type { Location } from "@/types/pizza";
import { useAuth } from "@/hooks/useAuth";
import { useFriends, type FriendProfile } from "@/hooks/useFriends";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

const LOCATIONS = locationsData as Location[];
const LOC_BY_ID = new Map(LOCATIONS.map((l) => [l.id, l] as const));

const FriendsPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const {
    friends, visitsByFriend, loading,
    addFriendByUsername, removeFriend,
  } = useFriends();
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [activeFriendId, setActiveFriendId] = useState<string | null>(null);

  const activeFriend = useMemo(
    () => friends.find((f) => f.id === activeFriendId) ?? null,
    [friends, activeFriendId],
  );
  const activeVisits = useMemo(() => {
    if (!activeFriendId) return [];
    return (visitsByFriend[activeFriendId] ?? [])
      .slice()
      .sort((a, b) => b.ratings.overall - a.ratings.overall);
  }, [visitsByFriend, activeFriendId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setBusy(true);
    const res = await addFriendByUsername(query);
    setBusy(false);
    toast({
      title: res.ok ? "Friend added 🍕" : "Couldn't add",
      description: res.message,
      variant: res.ok ? "default" : "destructive",
    });
    if (res.ok) setQuery("");
  };

  // Not signed in → invite to sign in
  if (!authLoading && !user) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col">
        <Header />
        <main className="flex-1 grid place-items-center px-4">
          <div className="max-w-sm text-center bg-card border-2 border-ink rounded-xl shadow-zine-lg p-6">
            <Users className="h-10 w-10 mx-auto text-marinara mb-2" />
            <h2 className="font-display text-2xl tracking-wide">FRIENDS NEEDS AN ACCOUNT</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Sign in or create an account to add friends and see their ratings.
            </p>
            <Button
              onClick={() => navigate("/auth")}
              className="mt-4 w-full bg-marinara text-primary-foreground border-2 border-ink shadow-zine-sm font-display tracking-wider rounded-lg h-11"
            >
              SIGN IN / SIGN UP
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background">
      <Header />

      <main className="max-w-3xl mx-auto px-4 py-5 space-y-5">
        {/* Add by username */}
        <form onSubmit={handleAdd} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Add by username (e.g. PizzaPete)"
              className="pl-9 h-11 border-2 border-ink shadow-zine-sm rounded-lg bg-card"
            />
          </div>
          <Button
            type="submit"
            disabled={busy || !query.trim()}
            className="h-11 bg-marinara text-primary-foreground border-2 border-ink shadow-zine-sm font-display tracking-wider rounded-lg px-4"
          >
            <UserPlus className="h-4 w-4 mr-1" /> ADD
          </Button>
        </form>

        {/* Friends list */}
        {loading ? (
          <div className="text-center py-10 text-sm text-muted-foreground">Loading…</div>
        ) : friends.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-ink rounded-xl bg-card">
            <Users className="h-10 w-10 text-marinara mx-auto mb-2" />
            <p className="font-display text-2xl tracking-wide">NO FRIENDS YET</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add someone by their username to see their slices.
            </p>
          </div>
        ) : (
          <ul className="grid sm:grid-cols-2 gap-3">
            {friends.map((f) => (
              <FriendRow
                key={f.id}
                friend={f}
                onOpen={() => setActiveFriendId(f.id)}
                onRemove={() => void removeFriend(f.id)}
              />
            ))}
          </ul>
        )}
      </main>

      {/* Per-friend drill-in */}
      {activeFriend && (
        <div
          className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm grid place-items-end sm:place-items-center p-0 sm:p-4"
          onClick={() => setActiveFriendId(null)}
        >
          <div
            className="bg-card border-2 border-ink rounded-t-xl sm:rounded-xl shadow-zine-lg w-full max-w-2xl max-h-[90dvh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 p-4 border-b-2 border-ink">
              <div className="min-w-0">
                <p className="font-display text-2xl tracking-wide truncate">
                  {activeFriend.nickname}
                </p>
                <p className="text-xs text-muted-foreground">
                  @{activeFriend.username} · {activeFriend.visitCount} slice{activeFriend.visitCount === 1 ? "" : "s"}
                  {activeFriend.avgOverall != null && ` · ${activeFriend.avgOverall.toFixed(1)}★ avg`}
                </p>
              </div>
              <button
                onClick={() => setActiveFriendId(null)}
                aria-label="Close"
                className="h-9 w-9 grid place-items-center rounded-lg border-2 border-ink bg-card hover:bg-mozz shadow-zine-sm shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {activeVisits.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">
                  Hasn't rated any slices yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {activeVisits.map((v) => {
                    const loc = LOC_BY_ID.get(v.locationId);
                    if (!loc) return null;
                    return (
                      <li
                        key={v.locationId}
                        className="flex gap-3 border-2 border-ink rounded-lg p-2 bg-mozz/30"
                      >
                        <img
                          src={loc.imageUrl}
                          alt={loc.pizzaName}
                          className="h-16 w-16 rounded-md border-2 border-ink object-cover shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-display text-base leading-tight tracking-wide line-clamp-1">
                            {loc.pizzaName}
                          </p>
                          <p className="text-xs text-marinara font-semibold line-clamp-1">
                            {loc.name} · {loc.neighborhood}
                          </p>
                          {v.notes && (
                            <p className="text-xs text-muted-foreground italic line-clamp-2 mt-0.5">
                              "{v.notes}"
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-display text-xl text-marinara leading-none">
                            ★{v.ratings.overall}
                          </div>
                          {v.favorite && <div className="text-xs text-marinara mt-1">♥ fav</div>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Header = () => (
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
          FRIENDS
        </h1>
        <p className="text-xs text-muted-foreground truncate">
          Track your crew's slice game
        </p>
      </div>
    </div>
  </header>
);

const FriendRow = ({
  friend, onOpen, onRemove,
}: {
  friend: FriendProfile;
  onOpen: () => void;
  onRemove: () => void;
}) => (
  <li className="bg-card border-2 border-ink rounded-xl shadow-zine-sm p-3 flex items-center gap-3">
    <button onClick={onOpen} className="flex-1 text-left min-w-0">
      <p className="font-display text-lg tracking-wide truncate">{friend.nickname}</p>
      <p className="text-xs text-muted-foreground truncate">
        @{friend.username} · {friend.visitCount} slice{friend.visitCount === 1 ? "" : "s"}
        {friend.avgOverall != null && ` · ${friend.avgOverall.toFixed(1)}★`}
      </p>
    </button>
    <button
      onClick={onRemove}
      aria-label={`Remove ${friend.username}`}
      className="h-9 w-9 grid place-items-center rounded-lg border-2 border-ink bg-card hover:bg-destructive hover:text-destructive-foreground shadow-zine-sm shrink-0"
    >
      <X className="h-4 w-4" />
    </button>
  </li>
);

export default FriendsPage;
