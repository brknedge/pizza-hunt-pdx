import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Pizza } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { usernameToEmail } from "@/hooks/useAuth";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

const AuthPage = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [username, setUsername] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  // If already signed in, bounce home
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/", { replace: true });
    });
  }, [navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!USERNAME_RE.test(username)) {
      toast({ title: "Pick a username", description: "3–20 letters, numbers, or underscores." });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Password too short", description: "Use at least 6 characters." });
      return;
    }
    setBusy(true);
    try {
      // Pre-flight: is this username taken? (gives a better error than the
      // generic "user already registered" one auth returns.)
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .ilike("username", username)
        .maybeSingle();
      if (existing) {
        toast({ title: "Username taken", description: "Try another one." });
        setBusy(false);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: usernameToEmail(username),
        password,
        options: { emailRedirectTo: `${window.location.origin}/` },
      });
      if (error) throw error;
      if (!data.user) throw new Error("Sign up failed");

      const { error: pErr } = await supabase.from("profiles").insert({
        id: data.user.id,
        username: username.trim(),
        nickname: (nickname.trim() || username.trim()).slice(0, 20),
      });
      if (pErr) throw pErr;

      toast({ title: "Welcome!", description: `Signed in as @${username}` });
      navigate("/", { replace: true });
    } catch (err) {
      // Surface the *actual* reason so users know how to fix it. The most
      // common silent failure is the leaked-password (HIBP) check rejecting
      // a common password like "password1" or "pizza123".
      const raw = err instanceof Error ? err.message : "";
      const lower = raw.toLowerCase();
      let title = "Sign up failed";
      let description = raw || "Try again.";
      if (lower.includes("pwned") || lower.includes("compromised") || lower.includes("leaked") || lower.includes("breach")) {
        title = "Password is too common";
        description = "That password has shown up in a known data breach. Please pick a different, less common password.";
      } else if (lower.includes("weak") || lower.includes("password should") || lower.includes("password is")) {
        title = "Password too weak";
        description = "Try a longer password with a mix of letters, numbers, and symbols.";
      } else if (lower.includes("already") && lower.includes("registered")) {
        title = "Username taken";
        description = "An account with that username already exists. Try signing in instead.";
      } else if (lower.includes("rate") || lower.includes("too many")) {
        title = "Slow down";
        description = "Too many attempts — wait a minute and try again.";
      }
      toast({ title, description, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: usernameToEmail(username),
        password,
      });
      if (error) {
        toast({
          title: "Couldn't sign in",
          description: "Check your username and password.",
          variant: "destructive",
        });
        return;
      }
      navigate("/", { replace: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b-2 border-ink">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            to="/"
            aria-label="Back"
            className="h-10 w-10 grid place-items-center rounded-lg border-2 border-ink bg-card hover:bg-mozz transition-colors shadow-zine-sm"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <Pizza className="h-7 w-7 text-marinara" />
          <h1 className="font-display text-2xl sm:text-3xl tracking-wide">SIGN IN</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-8">
        <div className="bg-card border-2 border-ink rounded-xl shadow-zine-lg p-5">
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList className="grid grid-cols-2 w-full border-2 border-ink mb-4">
              <TabsTrigger value="signin" className="font-display tracking-wide">SIGN IN</TabsTrigger>
              <TabsTrigger value="signup" className="font-display tracking-wide">SIGN UP</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-3">
                <div>
                  <label className="font-display text-sm tracking-wide block mb-1">Username</label>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    className="border-2 border-ink shadow-zine-sm h-11 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="font-display text-sm tracking-wide block mb-1">Password</label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="border-2 border-ink shadow-zine-sm h-11 rounded-lg"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={busy}
                  className="w-full bg-marinara text-primary-foreground border-2 border-ink shadow-zine-sm font-display tracking-wider rounded-lg h-11"
                >
                  {busy ? "..." : "SIGN IN"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-3">
                <div>
                  <label className="font-display text-sm tracking-wide block mb-1">Username</label>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    placeholder="3–20 letters, numbers, _"
                    className="border-2 border-ink shadow-zine-sm h-11 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="font-display text-sm tracking-wide block mb-1">
                    Display name <span className="text-muted-foreground font-normal">(optional)</span>
                  </label>
                  <Input
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="What friends will see"
                    maxLength={20}
                    className="border-2 border-ink shadow-zine-sm h-11 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-display text-sm tracking-wide block mb-1">Password</label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder="6+ chars — avoid common passwords"
                    className="border-2 border-ink shadow-zine-sm h-11 rounded-lg"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={busy}
                  className="w-full bg-marinara text-primary-foreground border-2 border-ink shadow-zine-sm font-display tracking-wider rounded-lg h-11"
                >
                  {busy ? "..." : "CREATE ACCOUNT"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="text-xs text-muted-foreground text-center mt-4">
            Accounts are needed for the upcoming Friends feature. Your local
            ratings stay on this device until you choose to sync.
          </p>
        </div>
      </main>
    </div>
  );
};

export default AuthPage;
