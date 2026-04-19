import type { Location, Visit } from "@/types/pizza";
import type { FriendVisit } from "@/hooks/useFriends";
import { Bookmark, Check, Heart, MapPin, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  location: Location;
  visit?: Visit;
  friendVisits?: FriendVisit[];
  wished?: boolean;
  friendWishCount?: number;
  friendWishNames?: string[];
  onClick: () => void;
  onToggleFavorite?: () => void;
  onToggleWish?: () => void;
  index: number;
}

export const LocationCard = ({
  location, visit, friendVisits, wished, friendWishCount = 0, friendWishNames = [],
  onClick, onToggleFavorite, onToggleWish, index,
}: Props) => {
  const visited = !!visit;
  const overall = visit?.ratings.overall ?? 0;
  const isFavorite = !!visit?.favorite;

  const friendCount = friendVisits?.length ?? 0;
  const friendAvg = friendCount
    ? (friendVisits!.reduce((s, v) => s + v.ratings.overall, 0) / friendCount).toFixed(1)
    : null;

  return (
    <button
      onClick={onClick}
      style={{ animationDelay: `${Math.min(index * 30, 600)}ms` }}
      className={cn(
        "group text-left bg-card border-2 border-ink rounded-xl overflow-hidden",
        "shadow-zine hover:shadow-zine-lg hover:-translate-x-0.5 hover:-translate-y-0.5",
        "transition-all duration-200 animate-pop-in flex flex-col",
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={location.imageUrl}
          alt={`${location.pizzaName} from ${location.name}`}
          loading="lazy"
          className={cn(
            "w-full h-full object-cover transition-all duration-500",
            visited && "grayscale-card group-hover:grayscale-0",
          )}
        />
        {(visited || onToggleWish) && (
          <div className="absolute top-2 right-2 flex items-center gap-1.5">
            {!visited && onToggleWish && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onToggleWish(); }}
                aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
                aria-pressed={!!wished}
                className={cn(
                  "h-8 w-8 grid place-items-center rounded-full border-2 border-ink shadow-zine-sm transition-transform hover:-translate-y-0.5",
                  wished ? "bg-mozz text-ink" : "bg-card text-ink",
                )}
              >
                <Bookmark className="h-4 w-4" strokeWidth={2.5} fill={wished ? "currentColor" : "none"} />
              </button>
            )}
            {visited && onToggleFavorite && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
                aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                aria-pressed={isFavorite}
                className={cn(
                  "h-8 w-8 grid place-items-center rounded-full border-2 border-ink shadow-zine-sm transition-transform hover:-translate-y-0.5",
                  isFavorite ? "bg-marinara text-primary-foreground" : "bg-card text-ink",
                )}
              >
                <Heart className="h-4 w-4" strokeWidth={2.5} fill={isFavorite ? "currentColor" : "none"} />
              </button>
            )}
            {visited && (
              <div className="bg-mozz border-2 border-ink rounded-full px-2 py-1 flex items-center gap-1 shadow-zine-sm">
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
                <span className="font-display text-sm tracking-wide">VISITED</span>
              </div>
            )}
          </div>
        )}
        <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
          {location.dietary.includes("vegan") && (
            <span title="Vegan" className="bg-card border-2 border-ink rounded-md px-1.5 py-0.5 font-display text-xs tracking-wide shadow-zine-sm">
              🌱 VEGAN
            </span>
          )}
          {location.dietary.includes("vegetarian") && !location.dietary.includes("vegan") && (
            <span title="Vegetarian" className="bg-card border-2 border-ink rounded-md px-1.5 py-0.5 font-display text-xs tracking-wide shadow-zine-sm">
              🥬 VEG
            </span>
          )}
          {(location.glutenFree === "yes" ||
            location.glutenFree === "available-same-price" ||
            location.glutenFree === "available-with-surcharge") && (
            <span
              title={
                location.glutenFree === "yes"
                  ? "Gluten-free"
                  : location.glutenFree === "available-same-price"
                  ? "GF available (same price)"
                  : "GF available (surcharge)"
              }
              className="bg-card border-2 border-ink rounded-md px-1.5 py-0.5 font-display text-xs tracking-wide shadow-zine-sm"
            >
              🌾 GF
            </span>
          )}
        </div>
        {visited && overall > 0 && (
          <div className="absolute bottom-2 left-2 bg-marinara text-primary-foreground border-2 border-ink rounded-md px-2 py-0.5 font-display text-base tracking-wide shadow-zine-sm">
            ★ {overall}/5
          </div>
        )}
        {(friendCount > 0 || friendWishCount > 0) && (
          <div className="absolute bottom-2 right-2 flex flex-col items-end gap-1">
            {friendCount > 0 && (
              <div
                title={`${friendCount} friend${friendCount === 1 ? "" : "s"} rated this`}
                className="bg-card border-2 border-ink rounded-md px-2 py-0.5 font-display text-xs tracking-wide shadow-zine-sm flex items-center gap-1"
              >
                <Users className="h-3 w-3" />
                {friendCount} · ★{friendAvg}
              </div>
            )}
            {friendWishCount > 0 && (
              <div
                title={`${friendWishCount} friend${friendWishCount === 1 ? "" : "s"} want to try this`}
                className="bg-card border-2 border-ink rounded-md px-2 py-0.5 font-display text-xs tracking-wide shadow-zine-sm flex items-center gap-1"
              >
                <Bookmark className="h-3 w-3" />
                {friendWishCount}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="p-3 flex-1 flex flex-col">
        <h3 className="font-display text-xl leading-tight tracking-wide line-clamp-2 text-ink">
          {location.pizzaName}
        </h3>
        <p className="text-sm font-semibold mt-1 text-marinara line-clamp-1">{location.name}</p>
        <p className="text-xs text-muted-foreground mt-auto pt-2 flex items-center gap-1">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="line-clamp-1">{location.neighborhood || "Portland"}</span>
        </p>
      </div>
    </button>
  );
};
