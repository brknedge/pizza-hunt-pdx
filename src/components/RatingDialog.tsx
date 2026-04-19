import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "./StarRating";
import { Bookmark, ExternalLink, Heart, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWishlist } from "@/hooks/useWishlist";
import { useFriends } from "@/hooks/useFriends";
import type { Location, RatingCategory, Visit } from "@/types/pizza";

const CATEGORIES: { key: RatingCategory; label: string; desc: string }[] = [
  { key: "creativity", label: "Creativity", desc: "How original is the concept?" },
  { key: "taste", label: "Taste", desc: "How does it actually taste?" },
  { key: "service", label: "Service", desc: "How was the staff?" },
  { key: "atmosphere", label: "Atmosphere", desc: "Vibe of the space?" },
  { key: "overall", label: "Overall", desc: "Your holistic score" },
];

interface Props {
  location: Location | null;
  existing?: Visit;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSave: (visit: Visit) => void;
  onDelete?: () => void;
}

export const RatingDialog = ({ location, existing, open, onOpenChange, onSave, onDelete }: Props) => {
  const { friends } = useFriends();
  const friendIds = useMemo(() => friends.map((f) => f.id), [friends]);
  const { isWished, toggleWish, friendWishlistByLocation } = useWishlist(friendIds);
  const friendWishNames = useMemo(() => {
    if (!location) return [];
    const ids = friendWishlistByLocation[location.id] ?? [];
    const nameById: Record<string, string> = {};
    for (const f of friends) nameById[f.id] = f.nickname || f.username;
    return ids.map((id) => nameById[id]).filter(Boolean);
  }, [location, friendWishlistByLocation, friends]);
  const [ratings, setRatings] = useState<Record<RatingCategory, number>>({
    creativity: 0, taste: 0, service: 0, atmosphere: 0, overall: 0,
  });
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [favorite, setFavorite] = useState(false);

  useEffect(() => {
    if (open && location) {
      if (existing) {
        // Migrate older visits that may have `flavor` instead of `taste`
        const r = existing.ratings as Partial<Record<string, number>>;
        setRatings({
          creativity: r.creativity ?? 0,
          taste: r.taste ?? r.flavor ?? 0,
          service: r.service ?? 0,
          atmosphere: r.atmosphere ?? 0,
          overall: r.overall ?? 0,
        });
        setNotes(existing.notes);
        setDate(existing.visitedAt.slice(0, 10));
        setFavorite(!!existing.favorite);
      } else {
        setRatings({ creativity: 0, taste: 0, service: 0, atmosphere: 0, overall: 0 });
        setNotes("");
        setDate(new Date().toISOString().slice(0, 10));
        setFavorite(false);
      }
    }
  }, [open, location, existing]);

  if (!location) return null;

  const handleSave = () => {
    if (ratings.overall === 0) {
      // overall is required per PRD
      return;
    }
    onSave({
      visitedAt: new Date(date).toISOString(),
      ratings,
      notes: notes.slice(0, 280),
      favorite,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90dvh] overflow-hidden bg-card border-2 border-ink shadow-zine-lg p-0 rounded-xl flex flex-col">
        <div className="relative aspect-[16/9] overflow-hidden bg-muted shrink-0">
          <img src={location.imageUrl} alt={location.pizzaName} className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => void toggleWish(location.id)}
            aria-label={isWished(location.id) ? "Remove from wishlist" : "Add to wishlist"}
            aria-pressed={isWished(location.id)}
            className={cn(
              "absolute top-3 right-12 z-10 h-9 w-9 grid place-items-center rounded-full border-2 border-ink shadow-zine-sm transition-transform hover:-translate-y-0.5",
              isWished(location.id) ? "bg-mozz text-ink" : "bg-card text-ink",
            )}
          >
            <Bookmark className="h-4 w-4" strokeWidth={2.5} fill={isWished(location.id) ? "currentColor" : "none"} />
          </button>
          {friendWishNames.length > 0 && (
            <div
              title={`On wishlist: ${friendWishNames.join(", ")}`}
              className="absolute bottom-3 right-3 z-10 bg-mozz border-2 border-ink rounded-md px-2 py-1 font-display text-xs tracking-wide shadow-zine-sm flex items-center gap-1 max-w-[14rem]"
            >
              <Bookmark className="h-3.5 w-3.5 shrink-0" fill="currentColor" />
              <span className="line-clamp-1">
                {friendWishNames.slice(0, 2).join(", ")}
                {friendWishNames.length > 2 ? ` +${friendWishNames.length - 2}` : ""}
              </span>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-5 pt-10 pb-4">
            <p className="text-white font-semibold text-sm leading-tight">
              {location.name} · {location.neighborhood}
            </p>
            <DialogTitle className="font-display text-2xl sm:text-3xl text-white tracking-wide leading-tight mt-0.5">
              {location.pizzaName}
            </DialogTitle>
          </div>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto flex-1 min-h-0">
          <DialogHeader className="sr-only">
            <DialogTitle>{location.pizzaName}</DialogTitle>
          </DialogHeader>

          <div className="flex items-center justify-between text-sm">
            <a
              href={location.everoutUrl}
              target="_blank"
              rel="noreferrer"
              className="text-marinara font-semibold inline-flex items-center gap-1 hover:underline"
            >
              View on EverOut <ExternalLink className="h-3 w-3" />
            </a>
            <span className="bg-mozz border border-ink px-2 py-0.5 rounded font-display tracking-wide">
              $4 SLICE / $25 PIE
            </span>
          </div>

          {(location.ingredients || location.blurb) && (
            <div className="border-2 border-ink rounded-lg bg-mozz/40 p-3 space-y-2">
              {location.ingredients && (
                <div>
                  <div className="font-display text-sm tracking-widest text-marinara">
                    WHAT'S ON IT
                  </div>
                  <p className="text-sm leading-snug mt-0.5">{location.ingredients}</p>
                </div>
              )}
              {location.blurb && (
                <div>
                  <div className="font-display text-sm tracking-widest text-marinara">
                    WHAT THEY SAY
                  </div>
                  <p className="text-sm leading-snug mt-0.5 italic">"{location.blurb}"</p>
                </div>
              )}
            </div>
          )}

          <div className="space-y-3">
            {CATEGORIES.map((c) => (
              <div key={c.key} className="flex items-center justify-between gap-3 border-b border-dashed border-muted pb-3 last:border-0">
                <div>
                  <div className="font-display text-lg tracking-wide">
                    {c.label}
                    {c.key === "overall" && <span className="text-marinara ml-1">*</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">{c.desc}</div>
                </div>
                <StarRating
                  value={ratings[c.key]}
                  onChange={(v) => setRatings((r) => ({ ...r, [c.key]: v }))}
                  size="md"
                  label={c.label}
                />
              </div>
            ))}
          </div>

          <div>
            <label className="font-display text-lg tracking-wide block mb-1">Notes</label>
            <Textarea
              value={notes}
              maxLength={280}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Crust was incredible, loved the honey drizzle…"
              className="border-2 border-ink shadow-zine-sm rounded-lg min-h-[80px] bg-background"
            />
            <div className="text-xs text-muted-foreground text-right mt-1">{notes.length}/280</div>
          </div>

          <div>
            <label className="font-display text-lg tracking-wide block mb-1">Date visited</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-11 px-3 rounded-lg border-2 border-ink shadow-zine-sm bg-background text-base"
            />
          </div>

          <button
            type="button"
            onClick={() => setFavorite((f) => !f)}
            aria-pressed={favorite}
            className={cn(
              "w-full h-12 rounded-lg border-2 border-ink shadow-zine-sm flex items-center justify-center gap-2 font-display tracking-widest transition-colors",
              favorite ? "bg-marinara text-primary-foreground" : "bg-card hover:bg-mozz",
            )}
          >
            <Heart className="h-5 w-5" strokeWidth={2.5} fill={favorite ? "currentColor" : "none"} />
            {favorite ? "FAVORITED" : "ADD TO FAVORITES"}
          </button>

          <div className="flex gap-2 pt-2">
            {existing && onDelete && (
              <Button
                type="button"
                variant="outline"
                onClick={onDelete}
                className="border-2 border-ink shadow-zine-sm h-12 px-3"
                aria-label="Remove visit"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={ratings.overall === 0}
              className="flex-1 h-12 font-display text-lg tracking-widest bg-marinara text-primary-foreground border-2 border-ink shadow-zine hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-zine-lg transition-transform rounded-lg"
            >
              {existing ? "UPDATE RATING" : "SAVE RATING"}
            </Button>
          </div>
          {ratings.overall === 0 && (
            <p className="text-xs text-muted-foreground text-center">Overall rating is required</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
