import { useCallback, useEffect, useState } from "react";
import { scenarios, type Scenario, type Difficulty } from "@/data/scenarios";

const STORAGE_KEY = "devkit:scenarios:solved:v1";

function loadSolved(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr) : new Set();
  } catch {
    return new Set();
  }
}

function saveSolved(set: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    /* ignore quota errors */
  }
}

function useSolved() {
  const [solved, setSolved] = useState<Set<string>>(() => new Set());

  // Hydrate after mount to avoid SSR mismatch.
  useEffect(() => {
    setSolved(loadSolved());
  }, []);

  const toggle = useCallback((id: string) => {
    setSolved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveSolved(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setSolved(() => {
      const empty = new Set<string>();
      saveSolved(empty);
      return empty;
    });
  }, []);

  return { solved, toggle, reset };
}



const categories = ["All", "Docker", "Kubernetes", "Linux"] as const;
type Category = (typeof categories)[number];

const catColor: Record<Scenario["category"], string> = {
  Docker: "bg-brick-blue text-white",
  Kubernetes: "bg-brick-green text-white",
  Linux: "bg-brick-yellow text-[color:var(--case-border)]",
};

const diffColor: Record<Difficulty, string> = {
  Mid: "bg-secondary text-foreground",
  Senior: "bg-brick-red text-white",
  Staff: "bg-[color:var(--case-border)] text-plastic-white",
};

function ScenarioCard({
  s,
  isSolved,
  onToggleSolved,
}: {
  s: Scenario;
  isSolved: boolean;
  onToggleSolved: () => void;
}) {
  const [phase, setPhase] = useState<"question" | "hint" | "answer">("question");

  return (
    <article
      className={`bg-card border-2 border-[color:var(--case-border)] rounded-2xl brick-shadow-sm p-6 md:p-7 flex flex-col transition-all ${
        isSolved ? "ring-4 ring-brick-green ring-offset-2 ring-offset-brick-blue" : ""
      }`}
    >
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span
          className={`${catColor[s.category]} border-2 border-[color:var(--case-border)] rounded-md px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-widest`}
        >
          {s.category}
        </span>
        <span
          className={`${diffColor[s.difficulty]} border-2 border-[color:var(--case-border)] rounded-md px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-widest`}
        >
          {s.difficulty}
        </span>
        {isSolved && (
          <span className="bg-brick-green text-white border-2 border-[color:var(--case-border)] rounded-md px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-widest">
            ✓ Solved
          </span>
        )}
      </div>

      <h3 className="font-display font-bold text-xl md:text-2xl mb-3">
        {s.title}
      </h3>

      <div className="bg-secondary/50 border-l-4 border-[color:var(--case-border)] rounded-md p-4 mb-4">
        <p className="text-xs font-bold uppercase tracking-widest text-foreground/55 mb-1">
          Scene
        </p>
        <p className="text-foreground/85 leading-relaxed text-sm md:text-base">
          {s.scene}
        </p>
      </div>

      <div className="mb-4">
        <p className="text-xs font-bold uppercase tracking-widest text-brick-red mb-1">
          Your turn
        </p>
        <p className="font-display font-bold text-lg leading-snug">
          {s.question}
        </p>
      </div>

      {phase !== "question" && (
        <div className="bg-brick-yellow/40 border-2 border-[color:var(--case-border)] rounded-xl p-4 mb-4">
          <p className="text-xs font-bold uppercase tracking-widest mb-1">
            💡 Hint
          </p>
          <p className="text-foreground/85 italic">{s.hint}</p>
        </div>
      )}

      {phase === "answer" && (
        <div className="bg-brick-green/15 border-2 border-brick-green rounded-xl p-5 mb-4 space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brick-green mb-1">
              ✓ Answer
            </p>
            <p className="text-foreground/90 leading-relaxed">{s.answer}</p>
          </div>

          {s.commands && s.commands.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-foreground/65 mb-2">
                Commands
              </p>
              <pre className="bg-[color:var(--case-border)] text-plastic-white font-mono text-xs md:text-sm leading-relaxed p-4 rounded-lg overflow-x-auto whitespace-pre">
                {s.commands.join("\n")}
              </pre>
            </div>
          )}

          <div className="bg-card border-2 border-[color:var(--case-border)] rounded-lg p-3">
            <p className="text-xs font-bold uppercase tracking-widest text-brick-red mb-1">
              Takeaway
            </p>
            <p className="text-sm text-foreground/85">{s.takeaway}</p>
          </div>
        </div>
      )}

      <div className="mt-auto flex flex-wrap gap-3 pt-2">
        {phase === "question" && (
          <>
            <button
              type="button"
              onClick={() => setPhase("hint")}
              className="bg-brick-yellow text-[color:var(--case-border)] border-2 border-[color:var(--case-border)] px-4 py-2 rounded-lg font-display font-bold text-sm brick-shadow-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
            >
              Show Hint
            </button>
            <button
              type="button"
              onClick={() => setPhase("answer")}
              className="bg-brick-red text-white border-2 border-[color:var(--case-border)] px-4 py-2 rounded-lg font-display font-bold text-sm brick-shadow-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
            >
              Reveal Answer
            </button>
          </>
        )}
        {phase === "hint" && (
          <>
            <button
              type="button"
              onClick={() => setPhase("question")}
              className="bg-card text-foreground border-2 border-[color:var(--case-border)] px-4 py-2 rounded-lg font-display font-bold text-sm brick-shadow-sm transition-all"
            >
              Hide Hint
            </button>
            <button
              type="button"
              onClick={() => setPhase("answer")}
              className="bg-brick-red text-white border-2 border-[color:var(--case-border)] px-4 py-2 rounded-lg font-display font-bold text-sm brick-shadow-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
            >
              Reveal Answer
            </button>
          </>
        )}
        {phase === "answer" && (
          <button
            type="button"
            onClick={() => setPhase("question")}
            className="bg-card text-foreground border-2 border-[color:var(--case-border)] px-4 py-2 rounded-lg font-display font-bold text-sm brick-shadow-sm transition-all"
          >
            ↺ Try Again
          </button>
        )}
        <button
          type="button"
          onClick={onToggleSolved}
          aria-pressed={isSolved}
          className={`ml-auto border-2 border-[color:var(--case-border)] px-4 py-2 rounded-lg font-display font-bold text-sm brick-shadow-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all ${
            isSolved
              ? "bg-brick-green text-white"
              : "bg-card text-foreground hover:bg-brick-green/15"
          }`}
        >
          {isSolved ? "✓ Solved" : "Mark as Solved"}
        </button>
      </div>
    </article>
  );
}

export default function RealWorldScenarios() {
  const [filter, setFilter] = useState<Category>("All");
  const { solved, toggle, reset } = useSolved();

  const visible =
    filter === "All" ? scenarios : scenarios.filter((s) => s.category === filter);

  const total = scenarios.length;
  const solvedCount = scenarios.filter((s) => solved.has(s.id)).length;
  const pct = total === 0 ? 0 : Math.round((solvedCount / total) * 100);

  return (
    <section
      id="scenarios"
      className="py-24 px-6 bg-brick-blue text-plastic-white"
    >
      <div className="max-w-5xl mx-auto text-center mb-10">
        <div className="inline-block bg-brick-yellow text-[color:var(--case-border)] px-4 py-1 border-2 border-[color:var(--case-border)] rounded-full font-bold text-sm uppercase mb-6 brick-shadow-sm">
          Real-World Scenarios
        </div>
        <h2 className="font-display font-bold text-4xl md:text-5xl mb-4 text-plastic-white">
          What senior DevOps engineers actually fix at 3 a.m.
        </h2>
        <p className="text-lg text-plastic-white/80 max-w-2xl mx-auto">
          Real problems from real on-call shifts. Read the scene, think about
          your move, then check the answer with the exact commands a senior
          would run.
        </p>
      </div>

      {/* Progress tracker */}
      <div className="max-w-3xl mx-auto bg-plastic-white text-foreground border-2 border-[color:var(--case-border)] rounded-2xl p-5 mb-8 brick-shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-foreground/60">
              Your Progress
            </p>
            <p className="font-display font-bold text-xl">
              {solvedCount} / {total} solved
              <span className="text-foreground/55 font-medium text-base"> · {pct}%</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {solvedCount === total && total > 0 && (
              <span className="bg-brick-green text-white border-2 border-[color:var(--case-border)] rounded-md px-3 py-1 text-xs font-bold uppercase tracking-widest">
                🏆 All Solved!
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                if (solvedCount === 0) return;
                if (confirm("Reset all scenario progress?")) reset();
              }}
              disabled={solvedCount === 0}
              className="bg-card border-2 border-[color:var(--case-border)] px-3 py-1.5 rounded-md font-bold text-xs uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed hover:bg-secondary transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
        <div className="h-3 w-full bg-secondary border-2 border-[color:var(--case-border)] rounded-full overflow-hidden">
          <div
            className="h-full bg-brick-green transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-foreground/55 mt-2">
          Progress is saved on this device — close the tab and resume anytime.
        </p>
      </div>

      <div className="max-w-5xl mx-auto flex flex-wrap justify-center gap-2 mb-10">
        {categories.map((c) => {
          const active = filter === c;
          const catSolved =
            c === "All"
              ? solvedCount
              : scenarios.filter((s) => s.category === c && solved.has(s.id)).length;
          const catTotal =
            c === "All" ? total : scenarios.filter((s) => s.category === c).length;
          return (
            <button
              key={c}
              type="button"
              onClick={() => setFilter(c)}
              className={`px-4 py-2 border-2 border-[color:var(--case-border)] rounded-lg font-display font-bold text-sm uppercase tracking-wider transition-all ${
                active
                  ? "bg-brick-red text-white brick-shadow-sm"
                  : "bg-plastic-white text-[color:var(--case-border)] hover:bg-brick-yellow"
              }`}
            >
              {c}
              <span className={`ml-2 text-[10px] ${active ? "opacity-80" : "opacity-60"}`}>
                {catSolved}/{catTotal}
              </span>
            </button>
          );
        })}
      </div>

      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-6">
        {visible.map((s) => (
          <ScenarioCard
            key={s.id}
            s={s}
            isSolved={solved.has(s.id)}
            onToggleSolved={() => toggle(s.id)}
          />
        ))}
      </div>
    </section>
  );
}
