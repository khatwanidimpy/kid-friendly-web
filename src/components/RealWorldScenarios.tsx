import { useCallback, useEffect, useState } from "react";

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


type Difficulty = "Mid" | "Senior" | "Staff";

type Scenario = {
  id: string;
  category: "Docker" | "Kubernetes" | "Linux";
  difficulty: Difficulty;
  title: string;
  scene: string;
  question: string;
  hint: string;
  answer: string;
  commands?: string[];
  takeaway: string;
};

const scenarios: Scenario[] = [
  // ───── Docker ─────
  {
    id: "d1",
    category: "Docker",
    difficulty: "Senior",
    title: "The container that won't die",
    scene:
      "Production: a container keeps restarting every ~30 seconds. `docker logs` shows the app started fine, then the container exits with code 137. CPU and memory look normal in your monitoring dashboard.",
    question:
      "What is most likely killing the container, and how do you confirm it?",
    hint: "Exit code 137 = 128 + 9 (SIGKILL). Who sends SIGKILL silently?",
    answer:
      "The kernel OOM-killer is killing the process because the container hit its memory limit. Your dashboard averages over 1 min, so short memory spikes don't show up. Check `docker inspect` for OOMKilled: true, and look at the host's `dmesg` for 'Out of memory' lines naming the cgroup.",
    commands: [
      "docker inspect <container> | grep -i oomkilled",
      "dmesg -T | grep -i 'killed process'",
      "docker stats --no-stream <container>",
    ],
    takeaway:
      "Exit 137 + auto-restart almost always = OOMKill. Raise the memory limit or fix the leak — never just bump restarts.",
  },
  {
    id: "d2",
    category: "Docker",
    difficulty: "Senior",
    title: "Image works on my laptop, breaks in CI",
    scene:
      "Your Dockerfile builds and runs perfectly on your M2 Mac. In the CI pipeline (Linux x86_64), the same image fails at runtime with `exec format error`.",
    question: "What's wrong, and what's the fix that scales to a team?",
    hint: "What CPU architecture is your Mac vs the CI runner?",
    answer:
      "You built an arm64 image locally and pushed it. The x86_64 CI runner can't execute arm64 binaries. Fix it by building multi-arch images with Buildx and pushing a manifest list so each platform pulls the right layer.",
    commands: [
      "docker buildx create --use --name multi",
      "docker buildx build --platform linux/amd64,linux/arm64 -t myorg/app:1.2 --push .",
    ],
    takeaway:
      "Never assume single-arch in 2025. Bake multi-arch builds into CI so 'works on my laptop' stops being a sentence.",
  },
  {
    id: "d3",
    category: "Docker",
    difficulty: "Staff",
    title: "Disk filling up on every node",
    scene:
      "Every few days, your Docker hosts hit 100% disk and crash. You have log rotation enabled. `du -sh /var/lib/docker/*` shows `overlay2` taking 80GB.",
    question: "Where is the space actually going, and how do you stop it?",
    hint: "Stopped containers, dangling images, build cache, anonymous volumes…",
    answer:
      "It's almost always a mix of: dangling images from CI builds, anonymous volumes from `docker run` without --rm, and BuildKit cache. Run a targeted prune (not a blind one — that nukes named volumes you might need). Then add a daily cron and set log driver max-size in daemon.json.",
    commands: [
      "docker system df -v",
      "docker image prune -a --filter 'until=168h'",
      "docker builder prune --filter 'until=72h'",
      "docker volume ls -qf dangling=true | xargs -r docker volume rm",
    ],
    takeaway:
      "Hosts don't fill 'suddenly' — they fill predictably. Schedule prunes and cap log size in /etc/docker/daemon.json.",
  },

  // ───── Kubernetes ─────
  {
    id: "k1",
    category: "Kubernetes",
    difficulty: "Senior",
    title: "Pod stuck in CrashLoopBackOff",
    scene:
      "A new deployment goes out. One pod is in CrashLoopBackOff. `kubectl logs` shows nothing — the container exits before logging. `kubectl describe pod` shows 'Back-off restarting failed container'.",
    question:
      "How do you debug a container that dies before producing any logs?",
    hint: "Logs from THIS run are empty — what about the previous run?",
    answer:
      "Use `kubectl logs --previous` to see the last failed run's stdout. If still empty, the process is crashing pre-stdout (missing binary, bad command, failed liveness probe). Use `kubectl debug` to attach an ephemeral container with shell tools to the same pod's namespaces and inspect filesystem, env, and DNS.",
    commands: [
      "kubectl logs <pod> --previous",
      "kubectl describe pod <pod> | grep -A5 -i 'last state'",
      "kubectl debug -it <pod> --image=busybox --target=<container>",
    ],
    takeaway:
      "`--previous` and `kubectl debug` are the two commands that separate juniors from seniors when pods crash silently.",
  },
  {
    id: "k2",
    category: "Kubernetes",
    difficulty: "Staff",
    title: "Cluster autoscaler won't scale up",
    scene:
      "Pods are stuck in Pending. You see 'Insufficient cpu' in events. Cluster Autoscaler logs say `pod didn't trigger scale-up: 1 node(s) didn't match Pod's node affinity`.",
    question: "Why won't a new node fix this, and what do you check first?",
    hint: "Autoscaler simulates: 'If I added a node from this group, would the pod fit?'",
    answer:
      "Your pod has a nodeAffinity / nodeSelector / taint-toleration combo that no available node group can satisfy. The autoscaler refuses to add a node it knows won't host the pod. Check the pod's affinity, then check that at least one node group's labels and taints match. Also verify the group's max size hasn't been reached.",
    commands: [
      "kubectl get pod <pod> -o yaml | grep -A20 affinity",
      "kubectl get nodes --show-labels",
      "kubectl -n kube-system logs deploy/cluster-autoscaler | grep -i 'didn.t trigger'",
    ],
    takeaway:
      "Autoscaler is honest: if it says 'didn't trigger', the math doesn't work. Fix the pod spec or add a matching node group.",
  },
  {
    id: "k3",
    category: "Kubernetes",
    difficulty: "Senior",
    title: "Service works, then doesn't, then works",
    scene:
      "Users intermittently get 502 errors from a Service backed by 4 pods. Health checks pass. `kubectl get endpoints` shows all 4 IPs. Latency dashboards look fine.",
    question:
      "Why does a healthy-looking Service still drop ~25% of requests?",
    hint: "What happens in the moment between a pod terminating and being removed from the Endpoints list?",
    answer:
      "One pod is being killed (rolling deploy, eviction, or crash) and is still in the Endpoints list for a few hundred ms while it's no longer accepting connections. kube-proxy hasn't reprogrammed iptables yet. Fix: add a `preStop` hook that sleeps 5–10s, set `terminationGracePeriodSeconds`, and ensure your app handles SIGTERM by draining connections.",
    commands: [
      "kubectl get endpoints <svc> -w",
      "kubectl get events --sort-by=.lastTimestamp | grep -i kill",
      "kubectl describe pod <pod> | grep -A3 -i lifecycle",
    ],
    takeaway:
      "Graceful shutdown isn't optional in K8s. preStop sleep + SIGTERM handling = no more random 502s during deploys.",
  },

  // ───── Linux ─────
  {
    id: "l1",
    category: "Linux",
    difficulty: "Senior",
    title: "Disk says full, but `du` disagrees",
    scene:
      "`df -h` shows /var at 100% full. You run `du -sh /var/*` and the totals add up to barely 30% of the disk. Deleting files in /var/log frees nothing.",
    question: "Where are the missing gigabytes hiding?",
    hint: "A deleted file isn't really deleted while a process still has it open.",
    answer:
      "A process (often a logger or app writing to a rotated log) still has a file descriptor open on a 'deleted' file. The inode and its blocks stay allocated until the FD closes. Find the process with `lsof | grep deleted` and either restart it or truncate the FD via /proc.",
    commands: [
      "lsof +L1",
      "lsof | grep deleted | sort -k7 -nr | head",
      ": > /proc/<pid>/fd/<n>   # truncate without restart",
    ],
    takeaway:
      "df measures the filesystem; du measures filenames. Deleted-but-open files are the classic gap between them.",
  },
  {
    id: "l2",
    category: "Linux",
    difficulty: "Staff",
    title: "Load average is 40, but CPU is idle",
    scene:
      "uptime shows load average of 40 on an 8-core box. `top` shows %CPU mostly idle. The server feels sluggish — every command takes seconds.",
    question: "What does load average actually count, and what's the culprit?",
    hint: "Load average includes processes in state R AND state D.",
    answer:
      "Linux load includes uninterruptible sleep (D state) — typically processes blocked on I/O or NFS. CPU is idle because everyone is waiting on disk/network. Find D-state processes, check iostat for high `%util` or `await`, and look for a slow disk, dying NVMe, or hung NFS mount.",
    commands: [
      "ps -eo pid,state,comm | awk '$2 ~ /D/'",
      "iostat -xz 1 5",
      "dmesg -T | grep -i -E 'i/o error|nfs|timeout'",
    ],
    takeaway:
      "High load + idle CPU = I/O bottleneck. Investigate disks and network mounts before blaming the app.",
  },
  {
    id: "l3",
    category: "Linux",
    difficulty: "Senior",
    title: "SSH hangs, but ping works",
    scene:
      "You can ping the server, TCP handshakes complete, but `ssh user@host` hangs at 'debug1: Connecting…' for 30 seconds before logging in.",
    question:
      "What's the classic cause of slow SSH on an otherwise healthy network?",
    hint: "What does sshd try to do with your IP before it lets you in?",
    answer:
      "sshd is doing a reverse DNS lookup on your client IP and the server's resolver is timing out. Set `UseDNS no` in /etc/ssh/sshd_config (or fix DNS). A second offender is GSSAPIAuthentication — disable it on the client with `-o GSSAPIAuthentication=no` to confirm.",
    commands: [
      "ssh -vvv user@host  # find which step hangs",
      "sudo sed -i 's/^#UseDNS.*/UseDNS no/' /etc/ssh/sshd_config",
      "sudo systemctl reload sshd",
    ],
    takeaway:
      "When SSH is slow but TCP is fine, it's almost always DNS or GSSAPI. `ssh -vvv` tells you exactly which line hangs.",
  },
];

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
