import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Pizza, Trophy, Users } from "lucide-react";
import locationsData from "@/data/locations.json";
import type { Location, RatingCategory, Visit } from "@/types/pizza";
import { useVisits } from "@/hooks/useVisits";
import { LocationCard } from "@/components/LocationCard";
import { RatingDialog } from "@/components/RatingDialog";

const LOCATIONS = locationsData as Location[];

const CATEGORY_LABELS: Record<RatingCategory, string> = {
  creativity: "Creativity",
  taste: "Taste",
  service: "Service",
  atmosphere: "Atmosphere",
  overall: "Overall",
};

const Stats = () => {
  const { visits, nickname, loading, upsertVisit, removeVisit } = useVisits();
  const [activeId, setActiveId] = useState<string | null>(null);

  const visited = useMemo(() => {
    if (!visits) return [] as { location: Location; visit: Visit }[];
    return LOCATIONS
      .filter((l) => visits[l.id])
      .map((l) => ({ location: l, visit: visits[l.id] }))
      .sort((a, b) => b.visit.ratings.overall - a.visit.ratings.overall);
  }, [visits]);

  const total = LOCATIONS.length;
  const count = visited.length;
  const pct = Math.round((count / total) * 100);

  const avgPerCategory = useMemo(() => {
    const out: Record<RatingCategory, number> = {
      creativity: 0, taste: 0, service: 0, atmosphere: 0, overall: 0,
    };
    if (count === 0) return out;
    (Object.keys(out) as RatingCategory[]).forEach((k) => {
      const sum = visited.reduce((s, v) => s + (v.visit.ratings[k] ?? 0), 0);
      out[k] = sum / count;
    });
    return out;
  }, [visited, count]);

  const top = visited[0];
  const neighborhoodsHit = useMemo(
    () => new Set(visited.map((v) => v.location.neighborhood).filter(Boolean)).size,
    [visited],
  );

  if (loading) return null;

  const active = LOCATIONS.find((l) => l.id === activeId) || null;
  const activeVisit = active && visits ? visits[active.id] : undefined;

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b-2 border-ink">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            to="/"
            aria-label="Back to all locations"
            className="h-10 w-10 grid place-items-center rounded-lg border-2 border-ink bg-card hover:bg-mozz transition-colors shadow-zine-sm shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <Link to="/" aria-label="Home" className="shrink-0">
            <Pizza className="h-7 w-7 text-marinara" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl sm:text-3xl leading-none tracking-wide truncate">
              MY PIZZA <span className="text-marinara">STATS</span>
            </h1>
            <p className="text-xs text-muted-foreground truncate">
              {nickname || "Friend"} · {count}/{total} slices
            </p>
          </div>
          <Link
            to="/friends"
            aria-label="Friends"
            className="h-10 w-10 grid place-items-center rounded-lg border-2 border-ink bg-card hover:bg-mozz transition-colors shadow-zine-sm shrink-0"
          >
            <Users className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-5 space-y-6">
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Visited" value={`${count}`} sub={`of ${total}`} />
          <StatCard label="Progress" value={`${pct}%`} sub="complete" />
          <StatCard
            label="Avg overall"
            value={count ? avgPerCategory.overall.toFixed(1) : "—"}
            sub="out of 5"
          />
          <StatCard label="Neighborhoods" value={`${neighborhoodsHit}`} sub="explored" />
        </section>

        {count === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-ink rounded-xl bg-card">
            <Pizza className="h-10 w-10 text-marinara mx-auto mb-3" />
            <p className="font-display text-2xl tracking-wide">NO SLICES YET</p>
            <p className="text-muted-foreground text-sm mt-1 mb-4">
              Rate your first pizza to start your stats.
            </p>
            <Link
              to="/"
              className="inline-block bg-marinara text-primary-foreground border-2 border-ink shadow-zine-sm font-display tracking-widest rounded-lg px-4 py-2"
            >
              BROWSE ALL 70 SPOTS
            </Link>
          </div>
        ) : (
          <>
            <section className="grid md:grid-cols-2 gap-4">
              {top && (
                <div className="bg-card border-2 border-ink shadow-zine rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Trophy className="h-5 w-5 text-marinara" />
                    <h2 className="font-display text-2xl tracking-wide">YOUR #1 SLICE</h2>
                  </div>
                  <div className="flex gap-3">
                    <img
                      src={top.location.imageUrl}
                      alt={top.location.pizzaName}
                      className="h-20 w-20 rounded-lg border-2 border-ink object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-display text-xl leading-tight tracking-wide line-clamp-2">
                        {top.location.pizzaName}
                      </p>
                      <p className="text-sm font-semibold text-marinara line-clamp-1">
                        {top.location.name}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {top.location.neighborhood}
                      </p>
                      <p className="font-display text-lg mt-1">★ {top.visit.ratings.overall}/5</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-card border-2 border-ink shadow-zine rounded-xl p-4">
                <h2 className="font-display text-2xl tracking-wide mb-3">AVERAGES</h2>
                <ul className="space-y-2">
                  {(Object.keys(CATEGORY_LABELS) as RatingCategory[]).map((k) => (
                    <li key={k} className="flex items-center gap-3">
                      <span className="font-semibold text-sm w-24 shrink-0">{CATEGORY_LABELS[k]}</span>
                      <div className="flex-1 h-2.5 bg-muted border-2 border-ink rounded-full overflow-hidden">
                        <div
                          className="h-full bg-marinara"
                          style={{ width: `${(avgPerCategory[k] / 5) * 100}%` }}
                        />
                      </div>
                      <span className="font-display text-base tabular-nums w-10 text-right">
                        {avgPerCategory[k].toFixed(1)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section>
              <h2 className="font-display text-3xl tracking-wide mb-3">
                VISITED <span className="text-marinara">({count})</span>
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {visited.map(({ location, visit }, i) => (
                  <LocationCard
                    key={location.id}
                    location={location}
                    visit={visit}
                    onClick={() => setActiveId(location.id)}
                    index={i}
                  />
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      <RatingDialog
        location={active}
        existing={activeVisit}
        open={!!active}
        onOpenChange={(o) => !o && setActiveId(null)}
        onSave={async (visit) => {
          if (!active) return;
          await upsertVisit(active.id, visit);
          setActiveId(null);
        }}
        onDelete={activeVisit ? async () => {
          if (!active) return;
          await removeVisit(active.id);
          setActiveId(null);
        } : undefined}
      />
    </div>
  );
};

const StatCard = ({ label, value, sub }: { label: string; value: string; sub: string }) => (
  <div className="bg-card border-2 border-ink shadow-zine-sm rounded-xl p-3 text-center">
    <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">{label}</p>
    <p className="font-display text-4xl text-marinara leading-none mt-1">{value}</p>
    <p className="text-xs text-muted-foreground mt-1">{sub}</p>
  </div>
);

export default Stats;
