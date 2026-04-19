import type { Location, Visit } from "@/types/pizza";
import { Check, Heart, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  location: Location;
  visit?: Visit;
  onClick: () => void;
  onToggleFavorite?: () => void;
  index: number;
}

export const LocationCard = ({ location, visit, onClick, onToggleFavorite, index }: Props) => {
  const visited = !!visit;
  const overall = visit?.ratings.overall ?? 0;
  const isFavorite = !!visit?.favorite;

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
        {visited && (
          <div className="absolute top-2 right-2 bg-mozz border-2 border-ink rounded-full px-2 py-1 flex items-center gap-1 shadow-zine-sm">
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
            <span className="font-display text-sm tracking-wide">VISITED</span>
          </div>
        )}
        <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
          {location.dietary.includes("vegan") && (
            <span
              title="Vegan"
              className="bg-card border-2 border-ink rounded-md px-1.5 py-0.5 font-display text-xs tracking-wide shadow-zine-sm"
            >
              🌱 VEGAN
            </span>
          )}
          {location.dietary.includes("vegetarian") && !location.dietary.includes("vegan") && (
            <span
              title="Vegetarian"
              className="bg-card border-2 border-ink rounded-md px-1.5 py-0.5 font-display text-xs tracking-wide shadow-zine-sm"
            >
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
