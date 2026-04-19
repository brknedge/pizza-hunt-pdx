import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";

interface Props {
  onReady: (nickname: string) => void;
}

export const NicknameGate = ({ onReady }: Props) => {
  const [name, setName] = useState("");
  const [err, setErr] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setErr("Need a name to track your slices!");
      return;
    }
    onReady(trimmed.slice(0, 20));
  };

  return (
    <main className="min-h-[100dvh] flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-card border-2 border-ink shadow-zine-lg rounded-xl p-6 sm:p-8 animate-pop-in">
        <div className="text-center mb-6">
          <div className="inline-block bg-mozz border-2 border-ink px-3 py-1 rounded-md font-display text-xl tracking-widest mb-3">
            APR 20–26 · 2026
          </div>
          <h1 className="font-display text-5xl sm:text-6xl text-marinara leading-none">
            PDX PIZZA WEEK
          </h1>
          <p className="mt-2 text-muted-foreground">Track your slices. Rate every pie. 🍕</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="font-display text-2xl tracking-wider">What's your name?</span>
            <Input
              autoFocus
              value={name}
              maxLength={20}
              onChange={(e) => { setName(e.target.value); setErr(""); }}
              placeholder="PizzaPete"
              className="mt-2 h-12 border-2 border-ink shadow-zine-sm text-lg rounded-lg focus-visible:ring-marinara"
            />
            {err && <p className="text-destructive text-sm mt-1">{err}</p>}
          </label>
          <Button
            type="submit"
            className="w-full h-12 text-lg font-display tracking-widest bg-marinara text-primary-foreground border-2 border-ink shadow-zine hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-zine-lg transition-transform rounded-lg"
          >
            LET'S EAT 🍕
          </Button>
        </form>
        <p className="mt-4 text-xs text-center text-muted-foreground">
          Saved on this device. Want it across devices?{" "}
          <Link to="/auth" className="underline font-semibold">Sign up</Link>.
        </p>
      </div>
    </main>
  );
};
