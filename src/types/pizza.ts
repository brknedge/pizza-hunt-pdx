export interface Location {
  id: string;
  name: string;
  neighborhood: string;
  pizzaName: string;
  imageUrl: string;
  everoutUrl: string;
}

export type RatingCategory = "creativity" | "flavor" | "service" | "atmosphere" | "overall";

export interface Visit {
  visitedAt: string;
  ratings: Record<RatingCategory, number>;
  notes: string;
}

export interface User {
  userId: string;
  nickname: string;
  createdAt: string;
  visits: Record<string, Visit>;
}
