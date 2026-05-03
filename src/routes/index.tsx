import { createFileRoute, Link } from "@tanstack/react-router";
import MiniLabs from "@/components/MiniLabs";
import RealWorldScenarios from "@/components/RealWorldScenarios";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DevKit — Learn DevOps Like You're 12" },
      {
        name: "description",
        content:
          "DevOps explained in simple words for total beginners. Learn servers, Git, Docker, CI/CD and the cloud with kid-friendly analogies.",
      },
      { property: "og:title", content: "DevKit — Learn DevOps Like You're 12" },
      {
        property: "og:description",
        content:
          "DevOps explained in simple words. Servers, Git, Docker and the cloud — taught with toys and analogies anyone can understand.",
      },
      { property: "og:type", content: "website" },
    ],
    links: [
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Outfit:wght@400;500;600&display=swap",
      },
    ],
  }),
  component: HomePage,
});

const lessons = [
  {
    n: "01",
    title: "The Storage Bin",
    sub: "Servers",
    color: "bg-brick-red text-white",
    body: "A server is just a computer that never sleeps. Think of it like a giant toy box that everyone in the world can reach into.",
  },
  {
    n: "02",
    title: "Instruction History",
    sub: "Git",
    color: "bg-brick-blue text-white",
    body: "Git is a magic 'undo' button. Every time you change your project, it remembers — so you can rewind to yesterday morning.",
  },
  {
    n: "03",
    title: "The Perfect Box",
    sub: "Docker",
    color: "bg-brick-yellow text-[color:var(--case-border)]",
    body: "Docker packs your app into a special lunchbox. It works the same on your laptop, your friend's laptop, or a giant computer in the cloud.",
  },
  {
    n: "04",
    title: "The Robot Helper",
    sub: "CI/CD",
    color: "bg-brick-green text-white",
    body: "A robot that watches your code. When you change something, it builds it and tests it — like a teacher who grades your homework instantly.",
  },
  {
    n: "05",
    title: "The Sky Warehouse",
    sub: "The Cloud",
    color: "bg-brick-red text-white",
    body: "The cloud is a city of computers in big buildings far away. You rent a tiny piece, and your app lives there for the whole world to use.",
  },
];

const faqs = [
  {
    q: "Do I need to be a programmer?",
    a: "Nope! If you've used a computer and you're curious, you can start. We explain every word the first time we use it.",
  },
  {
    q: "Why is it called 'DevOps'?",
    a: "It mashes two words: Development (building stuff) and Operations (keeping it running). DevOps is the friendship between them.",
  },
  {
    q: "Is this for kids only?",
    a: "Not at all. It's for anyone who wants the simple version. Adults learning DevOps for the first time love it too.",
  },
  {
    q: "How long does it take?",
    a: "Each kit is about 15 minutes. You can finish the whole path in a weekend if you want.",
  },
];

function HomePage() {
  return (
    <div className="min-h-dvh bg-background text-foreground font-body">
      <Nav />
      <Hero />
      <WhatIsDevOps />
      <LearningPath />
      <MiniLabs />
      <RealWorldScenarios />
      <Faq />
      <CTA />
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b-2 border-[color:var(--case-border)] px-6 py-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <a href="#top" className="flex items-center gap-3">
          <div className="size-10 bg-brick-red border-2 border-[color:var(--case-border)] rounded-lg flex items-center justify-center brick-shadow-sm">
            <div className="size-4 bg-white rounded-full" />
          </div>
          <span className="font-display font-bold text-2xl tracking-tight uppercase">
            DevKit
          </span>
        </a>
        <div className="hidden md:flex items-center gap-8 font-semibold uppercase text-sm tracking-wider">
          <a href="#what" className="hover:text-brick-red transition-colors">
            What is DevOps?
          </a>
          <a href="#path" className="hover:text-brick-red transition-colors">
            The Path
          </a>
          <a href="#labs" className="hover:text-brick-red transition-colors">
            Labs
          </a>
          <a href="#scenarios" className="hover:text-brick-red transition-colors">
            Scenarios
          </a>
          <a href="#faq" className="hover:text-brick-red transition-colors">
            FAQ
          </a>
          <AuthButton />
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section
      id="top"
      className="relative px-6 py-20 md:py-28 overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-1/3 h-full stud-pattern opacity-10 pointer-events-none" />
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center relative">
        <div>
          <div className="inline-block bg-brick-green text-white px-4 py-1 border-2 border-[color:var(--case-border)] rounded-full font-bold text-sm uppercase mb-6 brick-shadow-sm">
            Level 1 · Total Beginner
          </div>
          <h1 className="font-display font-bold text-5xl md:text-7xl lg:text-8xl leading-[0.9] mb-8 text-balance">
            Learn DevOps like you're <span className="text-brick-red">12</span>.
          </h1>
          <p className="text-lg md:text-xl text-foreground/75 max-w-[48ch] mb-10 leading-relaxed">
            Big scary words. Tiny simple ideas. We use toys, lunchboxes, and
            sticker albums to explain how the internet really works — no
            experience needed.
          </p>
          <div className="flex flex-wrap gap-4">
            <a
              href="#path"
              className="bg-brick-red text-white border-2 border-[color:var(--case-border)] px-8 py-4 rounded-xl font-display font-bold text-xl brick-shadow hover:-translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
            >
              Open Your First Kit
            </a>
            <a
              href="#what"
              className="bg-card border-2 border-[color:var(--case-border)] px-8 py-4 rounded-xl font-display font-bold text-xl brick-shadow-sm hover:-translate-y-0.5 transition-transform"
            >
              How it Works
            </a>
          </div>
        </div>
        <div className="relative">
          <div className="absolute -top-10 -right-10 size-64 bg-brick-yellow/30 rounded-full blur-3xl" />
          <div className="relative bg-card border-2 border-[color:var(--case-border)] rounded-3xl p-6 brick-shadow rotate-2">
            <div className="grid grid-cols-3 gap-3">
              {[
                "bg-brick-red",
                "bg-brick-yellow",
                "bg-brick-blue",
                "bg-brick-green",
                "bg-brick-blue",
                "bg-brick-red",
                "bg-brick-yellow",
                "bg-brick-green",
                "bg-brick-red",
              ].map((c, i) => (
                <div
                  key={i}
                  className={`${c} aspect-square rounded-lg border-2 border-[color:var(--case-border)] flex items-center justify-center`}
                >
                  <div className="size-3 rounded-full bg-white/70" />
                </div>
              ))}
            </div>
            <div className="absolute -bottom-5 -left-5 bg-brick-blue text-white px-5 py-3 border-2 border-[color:var(--case-border)] rounded-2xl brick-shadow-sm -rotate-3">
              <p className="font-display font-bold">Snap. Build. Ship.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function WhatIsDevOps() {
  const cards = [
    {
      tag: "Step 1",
      title: "The Blueprint",
      body: "We write code — the instructions that tell the computer how all the pieces should snap together.",
      color: "bg-brick-red",
    },
    {
      tag: "Step 2",
      title: "The Robot Factory",
      body: "Instead of building by hand, robots build, test, and pack our project for us. Every. Single. Time.",
      color: "bg-brick-yellow",
    },
    {
      tag: "Step 3",
      title: "The Big Delivery",
      body: "We ship the finished thing to the cloud — a giant warehouse where anyone in the world can use it.",
      color: "bg-brick-green",
    },
  ];
  return (
    <section id="what" className="bg-brick-blue text-white py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-end justify-between gap-8 mb-16">
          <div className="max-w-2xl">
            <h2 className="font-display font-bold text-4xl lg:text-5xl mb-6">
              So… what is DevOps anyway?
            </h2>
            <p className="text-lg text-white/80">
              Imagine building a giant LEGO castle. DevOps is the instruction
              manual, the storage bins, and the conveyor belts that help you
              build it perfectly every single time — without dropping a brick.
            </p>
          </div>
          <div className="flex gap-2">
            <div className="size-8 bg-brick-red border-2 border-white rounded" />
            <div className="size-8 bg-brick-yellow border-2 border-white rounded" />
            <div className="size-8 bg-brick-green border-2 border-white rounded" />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {cards.map((c) => (
            <article
              key={c.title}
              className="bg-card text-foreground p-8 border-2 border-[color:var(--case-border)] rounded-2xl brick-shadow-sm"
            >
              <div
                className={`${c.color} inline-block px-3 py-1 text-xs font-bold uppercase tracking-widest border-2 border-[color:var(--case-border)] rounded mb-6 text-[color:var(--case-border)]`}
              >
                {c.tag}
              </div>
              <h3 className="font-display font-bold text-2xl mb-3">
                {c.title}
              </h3>
              <p className="opacity-80 leading-relaxed">{c.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function LearningPath() {
  return (
    <section id="path" className="py-24 px-6">
      <div className="max-w-4xl mx-auto text-center mb-16">
        <h2 className="font-display font-bold text-4xl md:text-5xl mb-4">
          Your Master Builder Path
        </h2>
        <p className="text-lg text-foreground/60">
          Five tiny kits. Each one explains one big scary word using something
          you already understand.
        </p>
      </div>

      <div className="max-w-5xl mx-auto space-y-5">
        {lessons.map((l) => (
          <div
            key={l.n}
            className="group bg-card border-2 border-[color:var(--case-border)] rounded-2xl p-6 flex flex-col md:flex-row md:items-center gap-6 hover:translate-x-1 hover:-translate-y-0.5 transition-transform cursor-pointer brick-shadow-sm"
          >
            <div
              className={`shrink-0 size-20 ${l.color} border-2 border-[color:var(--case-border)] rounded-xl flex items-center justify-center font-display font-bold text-3xl`}
            >
              {l.n}
            </div>
            <div className="grow">
              <div className="flex items-baseline gap-3 flex-wrap mb-1">
                <h3 className="font-display font-bold text-2xl">{l.title}</h3>
                <span className="text-sm font-bold uppercase tracking-widest text-foreground/50">
                  ({l.sub})
                </span>
              </div>
              <p className="text-foreground/70">{l.body}</p>
            </div>
            <div className="shrink-0 bg-secondary px-5 py-3 border-2 border-[color:var(--case-border)] rounded-lg font-bold text-sm uppercase">
              Kit #{l.n}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Faq() {
  return (
    <section id="faq" className="py-24 px-6 bg-secondary/40">
      <div className="max-w-3xl mx-auto">
        <h2 className="font-display font-bold text-4xl md:text-5xl mb-12 text-center">
          Questions, answered simply.
        </h2>
        <div className="space-y-4">
          {faqs.map((f) => (
            <details
              key={f.q}
              className="group bg-card border-2 border-[color:var(--case-border)] rounded-2xl p-6 brick-shadow-sm open:bg-card"
            >
              <summary className="font-display font-bold text-xl cursor-pointer flex items-center justify-between gap-4 list-none">
                {f.q}
                <span className="size-8 bg-brick-yellow border-2 border-[color:var(--case-border)] rounded-md flex items-center justify-center font-bold transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-4 text-foreground/75 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section id="start" className="px-6 py-24">
      <div className="max-w-7xl mx-auto bg-brick-yellow border-2 border-[color:var(--case-border)] rounded-[2.5rem] p-12 md:p-20 text-center relative overflow-hidden brick-shadow">
        <div className="absolute inset-0 stud-pattern opacity-10" />
        <div className="relative">
          <h2 className="font-display font-bold text-4xl md:text-6xl mb-6 leading-tight text-[color:var(--case-border)]">
            Ready to build your first thing?
          </h2>
          <p className="text-lg md:text-xl mb-10 font-medium max-w-2xl mx-auto text-[color:var(--case-border)]/80">
            No credit card. No scary terminal screens (yet). Just one small
            click to begin.
          </p>
          <a
            href="#top"
            className="inline-block bg-brick-blue text-white border-2 border-[color:var(--case-border)] px-10 py-5 rounded-2xl font-display font-bold text-2xl brick-shadow hover:-translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
          >
            Start Building — Free
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-card border-t-2 border-[color:var(--case-border)] py-10 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="size-8 bg-brick-red border-2 border-[color:var(--case-border)] rounded flex items-center justify-center">
            <div className="size-3 bg-white rounded-full" />
          </div>
          <span className="font-display font-bold text-xl uppercase tracking-tight">
            DevKit
          </span>
        </div>
        <div className="flex gap-6 font-bold text-xs uppercase tracking-widest text-foreground/60">
          <a href="#what" className="hover:text-brick-red">
            What is DevOps?
          </a>
          <a href="#path" className="hover:text-brick-red">
            The Path
          </a>
          <a href="#faq" className="hover:text-brick-red">
            FAQ
          </a>
        </div>
        <p className="text-foreground/50 text-sm italic">
          Made with friendly bricks. Not affiliated with any toy company.
        </p>
      </div>
    </footer>
  );
}

// Keep Link import used (TanStack tree-shake friendliness)
void Link;
