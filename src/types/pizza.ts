export type DietaryTag = "meat" | "vegetarian" | "vegan";
export type GlutenFree =
  | "yes"
  | "no"
  | "available-same-price"
  | "available-with-surcharge"
  | null;
export type ServingStyle = "by-the-slice" | "whole-pie";

export interface Location {
  id: string;
  name: string;
  neighborhood: string;
  pizzaName: string;
  imageUrl: string;
  everoutUrl: string;
  dietary: DietaryTag[];
  glutenFree: GlutenFree;
  servingStyle: ServingStyle[];
  ingredients?: string | null;
  blurb?: string | null;
  lat?: number;
  lng?: number;
  hours?: Record<string, string> | null;
}

export type RatingCategory = "creativity" | "taste" | "service" | "atmosphere" | "overall";

export interface Visit {
  visitedAt: string;
  ratings: Record<RatingCategory, number>;
  notes: string;
  favorite?: boolean;
}

export interface User {
  userId: string;
  nickname: string;
  createdAt: string;
  visits: Record<string, Visit>;
}
