import type { User, Visit } from "@/types/pizza";

const KEY = "ppw2026_user";

function uuid() {
  return (crypto as Crypto & { randomUUID?: () => string }).randomUUID
    ? crypto.randomUUID()
    : "id-" + Math.random().toString(36).slice(2) + Date.now();
}

export function getUser(): User | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function saveUser(u: User) {
  localStorage.setItem(KEY, JSON.stringify(u));
}

export function createUser(nickname: string): User {
  const u: User = {
    userId: uuid(),
    nickname: nickname.trim(),
    createdAt: new Date().toISOString(),
    visits: {},
  };
  saveUser(u);
  return u;
}

export function upsertVisit(locationId: string, visit: Visit): User {
  const u = getUser();
  if (!u) throw new Error("No user");
  u.visits[locationId] = visit;
  saveUser(u);
  return u;
}

export function removeVisit(locationId: string): User {
  const u = getUser();
  if (!u) throw new Error("No user");
  delete u.visits[locationId];
  saveUser(u);
  return u;
}

export function clearAll() {
  localStorage.removeItem(KEY);
}
