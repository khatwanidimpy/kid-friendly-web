import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — DevKit" },
      { name: "description", content: "Sign in or create your DevKit account to save progress." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate({ to: "/" });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        toast.success("Account created — you're signed in.");
        navigate({ to: "/" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate({ to: "/" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-background text-foreground font-body flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md bg-card border-2 border-[color:var(--case-border)] rounded-2xl p-8 brick-shadow">
        <Link to="/" className="text-sm font-bold uppercase tracking-widest text-foreground/60 hover:text-brick-red">
          ← Back
        </Link>
        <h1 className="font-display font-bold text-3xl mt-4 mb-6">
          {mode === "signin" ? "Sign in" : "Create account"}
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full border-2 border-[color:var(--case-border)] rounded-lg px-3 py-2 bg-background"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full border-2 border-[color:var(--case-border)] rounded-lg px-3 py-2 bg-background"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-brick-red text-white border-2 border-[color:var(--case-border)] px-4 py-3 rounded-lg font-display font-bold brick-shadow-sm disabled:opacity-60"
          >
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Sign up"}
          </button>
        </form>
        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-6 text-sm font-bold uppercase tracking-widest text-brick-blue hover:underline"
        >
          {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
