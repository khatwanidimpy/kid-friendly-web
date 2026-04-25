import { useState } from "react";

type Step = {
  title: string;
  explain?: string;
  command?: string;
  checklist?: string[];
};

type Lab = {
  id: string;
  level: "Easy" | "Medium";
  minutes: number;
  title: string;
  goal: string;
  badge: string;
  color: string;
  steps: Step[];
};

const labs: Lab[] = [
  {
    id: "lab-1",
    level: "Easy",
    minutes: 10,
    title: "Lab 1 · Make a Webpage Live on the Internet",
    goal: "Take a tiny HTML file from your computer and put it online so a friend can open it.",
    badge: "🚀",
    color: "bg-brick-red",
    steps: [
      {
        title: "Make a folder",
        explain:
          "We need a home for our project. Open your Terminal (Mac) or PowerShell (Windows) and paste this:",
        command: "mkdir my-first-site && cd my-first-site",
      },
      {
        title: "Create one tiny page",
        explain:
          "This makes a file called index.html with a hello message inside.",
        command:
          'echo "<h1>Hello from my first deploy 🎉</h1>" > index.html',
      },
      {
        title: "Send it to the world",
        explain:
          "Netlify Drop is a website where you drag a folder and it gives you a live link. No account needed.",
        checklist: [
          "Open https://app.netlify.com/drop in your browser",
          "Drag your my-first-site folder onto the page",
          "Wait 5 seconds — copy the link Netlify gives you",
          "Open the link on your phone to check it works",
        ],
      },
    ],
  },
  {
    id: "lab-2",
    level: "Easy",
    minutes: 15,
    title: "Lab 2 · Save Your Project with Git (the Undo Button)",
    goal: "Learn the magic save-points so you never lose work again.",
    badge: "💾",
    color: "bg-brick-blue",
    steps: [
      {
        title: "Tell Git who you are (one time only)",
        explain: "Just so Git knows whose name to put on the save-points.",
        command:
          'git config --global user.name "Your Name"\ngit config --global user.email "you@example.com"',
      },
      {
        title: "Turn your folder into a Git project",
        explain: "This creates a hidden notebook where Git tracks your changes.",
        command: "git init",
      },
      {
        title: "Make your first save-point",
        explain:
          "‘add’ picks files. ‘commit’ writes the save-point with a little note.",
        command: 'git add .\ngit commit -m "My first save"',
      },
      {
        title: "You did it! Check your work",
        checklist: [
          "Run: git log — you should see your save with your name",
          "Change index.html, then run: git status",
          "Save again with: git add . && git commit -m \"Updated page\"",
        ],
      },
    ],
  },
  {
    id: "lab-3",
    level: "Medium",
    minutes: 20,
    title: "Lab 3 · Pack an App in a Docker Lunchbox",
    goal: "Wrap a tiny app in a Docker container so it runs the same on any computer.",
    badge: "📦",
    color: "bg-brick-green",
    steps: [
      {
        title: "Install Docker Desktop",
        explain:
          "Docker Desktop is a free app that runs containers on your computer.",
        checklist: [
          "Go to https://www.docker.com/products/docker-desktop",
          "Download for your system (Mac / Windows / Linux)",
          "Install it and open it once — wait for the whale icon to stop wiggling",
        ],
      },
      {
        title: "Run a real app in one line",
        explain:
          "This downloads a friendly demo web app and runs it inside a container.",
        command: "docker run -d -p 8080:80 --name my-box nginxdemos/hello",
      },
      {
        title: "Open it in your browser",
        explain:
          "Your container is now serving a website on your own computer at port 8080.",
        checklist: [
          "Open http://localhost:8080 in your browser",
          "You should see a page that says ‘Hello, World!’ with server info",
          "Run: docker ps — to see your container running",
        ],
      },
      {
        title: "Clean up when done",
        explain: "This stops and removes the container. Tidy room, happy mind.",
        command: "docker stop my-box && docker rm my-box",
      },
    ],
  },
];

function CopyBlock({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="relative mt-3">
      <pre className="bg-[color:var(--case-border)] text-plastic-white font-mono text-sm md:text-[0.95rem] leading-relaxed p-4 pr-24 rounded-xl border-2 border-[color:var(--case-border)] overflow-x-auto whitespace-pre">
        {command}
      </pre>
      <button
        type="button"
        onClick={onCopy}
        aria-label="Copy command"
        className="absolute top-2 right-2 bg-brick-yellow text-[color:var(--case-border)] border-2 border-[color:var(--case-border)] rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider brick-shadow-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

function Checklist({ items, labId, stepIdx }: { items: string[]; labId: string; stepIdx: number }) {
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  return (
    <ul className="mt-3 space-y-2">
      {items.map((item, i) => {
        const id = `${labId}-${stepIdx}-${i}`;
        const isOn = !!checked[i];
        return (
          <li key={id} className="flex items-start gap-3">
            <input
              id={id}
              type="checkbox"
              checked={isOn}
              onChange={(e) =>
                setChecked((c) => ({ ...c, [i]: e.target.checked }))
              }
              className="mt-1 size-5 shrink-0 appearance-none border-2 border-[color:var(--case-border)] rounded bg-card checked:bg-brick-green checked:border-[color:var(--case-border)] cursor-pointer relative checked:after:content-['✓'] checked:after:text-white checked:after:absolute checked:after:inset-0 checked:after:flex checked:after:items-center checked:after:justify-center checked:after:font-bold"
            />
            <label
              htmlFor={id}
              className={`cursor-pointer leading-relaxed ${isOn ? "line-through text-foreground/50" : "text-foreground/85"}`}
            >
              {item}
            </label>
          </li>
        );
      })}
    </ul>
  );
}

function LabCard({ lab }: { lab: Lab }) {
  const [open, setOpen] = useState(lab.id === "lab-1");
  return (
    <article className="bg-card border-2 border-[color:var(--case-border)] rounded-2xl brick-shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left p-6 flex items-start gap-5 hover:bg-secondary/40 transition-colors"
      >
        <div
          className={`shrink-0 size-16 ${lab.color} text-white border-2 border-[color:var(--case-border)] rounded-xl flex items-center justify-center text-3xl`}
          aria-hidden
        >
          {lab.badge}
        </div>
        <div className="grow min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="bg-brick-yellow text-[color:var(--case-border)] border-2 border-[color:var(--case-border)] rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest">
              {lab.level}
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-foreground/55">
              ~{lab.minutes} min
            </span>
          </div>
          <h3 className="font-display font-bold text-xl md:text-2xl mb-1">
            {lab.title}
          </h3>
          <p className="text-foreground/70 text-sm md:text-base">{lab.goal}</p>
        </div>
        <div
          className={`shrink-0 size-9 bg-secondary border-2 border-[color:var(--case-border)] rounded-lg flex items-center justify-center font-bold text-xl transition-transform ${open ? "rotate-45" : ""}`}
          aria-hidden
        >
          +
        </div>
      </button>

      {open && (
        <div className="border-t-2 border-[color:var(--case-border)] bg-secondary/30 p-6 md:p-8 space-y-6">
          {lab.steps.map((step, idx) => (
            <div
              key={idx}
              className="bg-card border-2 border-[color:var(--case-border)] rounded-xl p-5"
            >
              <div className="flex items-baseline gap-3 mb-2">
                <span className="font-display font-bold text-brick-red text-lg">
                  Step {idx + 1}
                </span>
                <h4 className="font-display font-bold text-lg">{step.title}</h4>
              </div>
              <p className="text-foreground/75 leading-relaxed">{step.explain}</p>
              {step.command && <CopyBlock command={step.command} />}
              {step.checklist && (
                <Checklist
                  items={step.checklist}
                  labId={lab.id}
                  stepIdx={idx}
                />
              )}
            </div>
          ))}
          <div className="bg-brick-green text-white border-2 border-[color:var(--case-border)] rounded-xl p-5 brick-shadow-sm">
            <p className="font-display font-bold text-lg">🎉 Lab complete?</p>
            <p className="opacity-90">
              Awesome. Take a screenshot and try the next one. You just did real
              DevOps work.
            </p>
          </div>
        </div>
      )}
    </article>
  );
}

export default function MiniLabs() {
  return (
    <section id="labs" className="py-24 px-6">
      <div className="max-w-4xl mx-auto text-center mb-14">
        <div className="inline-block bg-brick-red text-white px-4 py-1 border-2 border-[color:var(--case-border)] rounded-full font-bold text-sm uppercase mb-6 brick-shadow-sm">
          Hands-On Mini Labs
        </div>
        <h2 className="font-display font-bold text-4xl md:text-5xl mb-4">
          Try it yourself — no experience needed.
        </h2>
        <p className="text-lg text-foreground/65">
          Open a lab, copy each command, tick the boxes as you go. By the end
          you'll have actually deployed an app, saved code with Git, and run a
          Docker container.
        </p>
      </div>
      <div className="max-w-4xl mx-auto space-y-5">
        {labs.map((lab) => (
          <LabCard key={lab.id} lab={lab} />
        ))}
      </div>
    </section>
  );
}
