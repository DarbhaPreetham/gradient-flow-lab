import { useEffect, useMemo, useState } from "react";
import { LEVELS, type Difficulty, type LevelDef } from "../utils/colors";
import { GameBoard, generatePreview } from "./GameBoard";
import { loadSave, saveSave, type SaveData } from "../utils/storage";
import { setAudioEnabled, playVictory, unlockAudio } from "../utils/audio";
import { haptics, setHapticsEnabled } from "../utils/haptics";

type Screen = { kind: "home" } | { kind: "gallery"; filter?: Difficulty } | { kind: "game"; levelId: string };

export function ChromaWeaveApp() {
  // Use defaults on first render to keep SSR/CSR markup identical, then hydrate from localStorage.
  const [save, setSave] = useState<SaveData>(() => loadSave.defaults());
  const [hydrated, setHydrated] = useState(false);
  const [screen, setScreen] = useState<Screen>({ kind: "home" });
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    setSave(loadSave());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveSave(save);
    setAudioEnabled(save.settings.sound);
    setHapticsEnabled(save.settings.haptics);
  }, [save, hydrated]);

  // Apply theme to <html>
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("light", save.settings.theme === "light");
    root.classList.toggle("dark", save.settings.theme === "dark");
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", save.settings.theme === "light" ? "#F6F4FB" : "#0F0F16");
  }, [save.settings.theme]);

  const updateSettings = (patch: Partial<SaveData["settings"]>) =>
    setSave((s) => ({ ...s, settings: { ...s.settings, ...patch } }));

  const completeLevel = (id: string, moves: number) => {
    setSave((s) => {
      const completed = s.completed.includes(id) ? s.completed : [...s.completed, id];
      const best = { ...s.best, [id]: Math.min(s.best[id] ?? Infinity, moves) };
      const idx = LEVELS.findIndex((l) => l.id === id);
      const next = LEVELS[idx + 1];
      const unlocked = next && !s.unlocked.includes(next.id) ? [...s.unlocked, next.id] : s.unlocked;
      return { ...s, completed, best, unlocked };
    });
  };

  const startGame = (levelId: string) => {
    unlockAudio();
    if (!save.tutorialSeen) setShowTutorial(true);
    setScreen({ kind: "game", levelId });
  };

  const finishTutorial = () => {
    setShowTutorial(false);
    setSave((s) => ({ ...s, tutorialSeen: true }));
  };

  return (
    <main className="radial-bg min-h-dvh w-full overflow-hidden">
      {screen.kind === "home" && (
        <HomeScreen
          onPlay={() => {
            // resume latest unlocked, not-yet-completed level
            const next = LEVELS.find((l) => save.unlocked.includes(l.id) && !save.completed.includes(l.id)) ?? LEVELS[0];
            startGame(next.id);
          }}
          onGallery={(filter) => setScreen({ kind: "gallery", filter })}
          onShowTutorial={() => setShowTutorial(true)}
          settings={save.settings}
          onSettings={updateSettings}
          completedCount={save.completed.length}
        />
      )}
      {screen.kind === "gallery" && (
        <GalleryScreen
          save={save}
          filter={screen.filter}
          onBack={() => setScreen({ kind: "home" })}
          onPick={(id) => startGame(id)}
        />
      )}
      {screen.kind === "game" && (
        <GameScreen
          level={LEVELS.find((l) => l.id === screen.levelId)!}
          save={save}
          onBack={() => setScreen({ kind: "gallery" })}
          onComplete={completeLevel}
          onNext={(id) => {
            const idx = LEVELS.findIndex((l) => l.id === id);
            const next = LEVELS[idx + 1];
            if (next) setScreen({ kind: "game", levelId: next.id });
            else setScreen({ kind: "gallery" });
          }}
          onToggleSound={() => updateSettings({ sound: !save.settings.sound })}
          onShowTutorial={() => setShowTutorial(true)}
        />
      )}
      {showTutorial && <TutorialOverlay onDone={finishTutorial} />}
    </main>
  );
}

function HomeScreen({
  onPlay,
  onGallery,
  onShowTutorial,
  settings,
  onSettings,
  completedCount,
}: {
  onPlay: () => void;
  onGallery: (d?: Difficulty) => void;
  onShowTutorial: () => void;
  settings: SaveData["settings"];
  onSettings: (p: Partial<SaveData["settings"]>) => void;
  completedCount: number;
}) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-between px-6 py-10">
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle
          theme={settings.theme}
          onToggle={() => onSettings({ theme: settings.theme === "dark" ? "light" : "dark" })}
        />
      </div>
      <header className="mt-6 text-center">
        <p className="font-display text-xs uppercase tracking-[0.4em]" style={{ color: "var(--cw-muted-soft)" }}>A Color Tapestry</p>
        <h1 className="font-display title-shimmer mt-3 text-5xl font-extrabold leading-none sm:text-6xl">ChromaWeave</h1>
        <p className="mt-4 text-sm" style={{ color: "var(--cw-muted)" }}>Weave gradients of light into living tapestries.</p>
      </header>

      <div className="my-10 flex w-full flex-col items-center gap-4">
        <button
          type="button"
          onClick={onPlay}
          className="glow-button font-display w-full rounded-2xl px-8 py-5 text-xl font-bold"
        >
          ▶  Play
        </button>
        <div className="grid w-full grid-cols-3 gap-3">
          {(["beginner", "casual", "master"] as const).map((d) => (
            <button
              key={d}
              onClick={() => onGallery(d)}
              className="glass-panel font-display rounded-xl px-2 py-3 text-xs font-semibold uppercase tracking-wider transition hover:opacity-90"
            >
              {d}
            </button>
          ))}
        </div>
        <button
          onClick={() => onGallery()}
          className="glass-panel font-display w-full rounded-xl px-4 py-3 text-sm font-medium hover:opacity-90"
        >
          Browse all {LEVELS.length} tapestries • {completedCount} complete
        </button>
        <button
          onClick={onShowTutorial}
          className="font-display text-xs uppercase tracking-[0.3em] underline-offset-4 hover:underline"
          style={{ color: "var(--cw-muted)" }}
        >
          How to play
        </button>
      </div>

      <section className="glass-panel w-full rounded-2xl p-5">
        <h2 className="font-display mb-3 text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--cw-muted)" }}>Settings</h2>
        <Toggle
          label="Light mode"
          checked={settings.theme === "light"}
          onChange={(v) => onSettings({ theme: v ? "light" : "dark" })}
        />
        <Toggle label="Sound FX" checked={settings.sound} onChange={(v) => onSettings({ sound: v })} />
        <Toggle label="Haptics" checked={settings.haptics} onChange={(v) => onSettings({ haptics: v })} />
        <Toggle label="Color Blind Assist" checked={settings.colorBlind} onChange={(v) => onSettings({ colorBlind: v })} />
      </section>

      <footer className="mt-8 text-center text-xs" style={{ color: "var(--cw-muted-soft)" }}>Crafted with light, color, and patience.</footer>
    </div>
  );
}

function ThemeToggle({ theme, onToggle }: { theme: "light" | "dark"; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="glass-panel font-display flex h-11 min-w-11 items-center gap-2 rounded-full px-4 text-sm"
    >
      <span aria-hidden>{theme === "dark" ? "🌙" : "☀️"}</span>
      <span className="hidden sm:inline">{theme === "dark" ? "Dark" : "Light"}</span>
    </button>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center justify-between py-2 text-sm">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => {
          onChange(!checked);
          haptics.light();
        }}
        className={`relative h-7 w-12 rounded-full transition ${checked ? "bg-gradient-to-r from-fuchsia-400 to-cyan-300" : ""}`}
        style={!checked ? { background: "var(--cw-glass-border)" } : undefined}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : ""}`}
        />
      </button>
    </label>
  );
}

function GalleryScreen({
  save,
  filter,
  onBack,
  onPick,
}: {
  save: SaveData;
  filter?: Difficulty;
  onBack: () => void;
  onPick: (id: string) => void;
}) {
  const levels = useMemo(() => (filter ? LEVELS.filter((l) => l.difficulty === filter) : LEVELS), [filter]);
  const previews = useMemo(() => {
    const m: Record<string, string> = {};
    for (const l of LEVELS) m[l.id] = generatePreview(l, 160);
    return m;
  }, []);

  return (
    <div className="mx-auto min-h-dvh max-w-md px-5 py-8">
      <header className="mb-6 flex items-center justify-between">
        <button onClick={onBack} className="glass-panel min-h-11 rounded-xl px-4 py-2 text-sm font-medium text-white/90" aria-label="Back to home">
          ← Home
        </button>
        <h2 className="font-display text-lg font-bold">{filter ? capitalize(filter) : "Tapestries"}</h2>
        <div className="w-16" />
      </header>
      <div className="grid grid-cols-2 gap-4">
        {levels.map((l) => {
          const locked = !save.unlocked.includes(l.id);
          const done = save.completed.includes(l.id);
          return (
            <button
              key={l.id}
              disabled={locked}
              onClick={() => onPick(l.id)}
              className={`glass-panel relative aspect-square overflow-hidden rounded-2xl p-3 text-left transition ${locked ? "opacity-50" : "hover:scale-[1.02]"}`}
            >
              <div
                className="absolute inset-0 -z-10"
                style={{
                  backgroundImage: `url(${previews[l.id]})`,
                  backgroundSize: "cover",
                  filter: locked ? "blur(8px) grayscale(0.4)" : "saturate(1.1)",
                }}
              />
              <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/70 via-black/0 to-black/0" />
              <div className="flex h-full flex-col justify-end">
                <p className="font-display text-[10px] uppercase tracking-widest text-white/70">{l.difficulty} • {l.cols}×{l.rows}</p>
                <p className="font-display text-base font-bold text-white drop-shadow">{l.name}</p>
              </div>
              {locked && (
                <span aria-label="locked" className="absolute right-3 top-3 text-2xl">🔒</span>
              )}
              {done && (
                <span aria-label="completed" className="absolute right-3 top-3 text-2xl drop-shadow">✓</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function capitalize(s: string) { return s[0].toUpperCase() + s.slice(1); }

function GameScreen({
  level,
  save,
  onBack,
  onComplete,
  onNext,
  onToggleSound,
  onShowTutorial,
}: {
  level: LevelDef;
  save: SaveData;
  onBack: () => void;
  onComplete: (id: string, moves: number) => void;
  onNext: (id: string) => void;
  onToggleSound: () => void;
  onShowTutorial: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const [moves, setMoves] = useState(0);
  const [hintToken, setHintToken] = useState(0);
  const [resetToken, setResetToken] = useState(0);
  const [victory, setVictory] = useState(false);
  const [goalExpanded, setGoalExpanded] = useState(false);
  const goalPreview = useMemo(() => generatePreview(level, 220), [level.id]);

  useEffect(() => {
    setProgress(0);
    setMoves(0);
    setVictory(false);
  }, [level.id, resetToken]);

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-6">
      <header className="mb-4 flex items-center justify-between gap-2">
        <button onClick={onBack} className="glass-panel min-h-11 rounded-xl px-4 py-2 text-sm font-medium" aria-label="Back to gallery">
          ← Gallery
        </button>
        <div className="text-center">
          <p className="font-display text-[10px] uppercase tracking-[0.3em] text-white/60">{level.difficulty}</p>
          <h2 className="font-display text-base font-bold">{level.name}</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setResetToken((t) => t + 1)}
            className="glass-panel min-h-11 min-w-11 rounded-xl px-3 py-2 text-sm"
            aria-label="Reset level"
            title="Reset"
          >
            ↺
          </button>
          <button
            onClick={onToggleSound}
            className="glass-panel min-h-11 min-w-11 rounded-xl px-3 py-2 text-sm"
            aria-label={save.settings.sound ? "Mute sound" : "Unmute sound"}
          >
            {save.settings.sound ? "🔊" : "🔇"}
          </button>
          <button
            onClick={onShowTutorial}
            className="glass-panel min-h-11 min-w-11 rounded-xl px-3 py-2 text-sm"
            aria-label="How to play"
            title="How to play"
          >
            ?
          </button>
        </div>
      </header>

      <div className="relative flex flex-1 items-center justify-center">
        <button
          type="button"
          onClick={() => setGoalExpanded((v) => !v)}
          aria-label={goalExpanded ? "Shrink goal preview" : "Enlarge goal preview"}
          className="glass-panel absolute left-0 top-0 z-10 flex items-center gap-2 rounded-xl px-2 py-1.5 transition"
          title="Goal gradient — arrange tiles to match"
        >
          <img
            src={goalPreview}
            alt="Goal gradient preview"
            className={`rounded-md transition-all ${goalExpanded ? "h-24 w-24" : "h-9 w-9"}`}
            style={{ imageRendering: "pixelated" as const }}
          />
          <span
            className="font-display text-[9px] font-semibold uppercase tracking-[0.18em] leading-none"
            style={{ color: "var(--cw-muted)" }}
          >
            Goal
          </span>
        </button>
        <GameBoard
          level={level}
          colorBlind={save.settings.colorBlind}
          onProgress={setProgress}
          onMove={() => setMoves((m) => m + 1)}
          onComplete={() => {
            playVictory();
            haptics.victory();
            setVictory(true);
            onComplete(level.id, moves + 1);
          }}
          hintToken={hintToken}
          resetToken={resetToken}
        />
      </div>

      <footer className="mt-4">
        <div className="glass-panel rounded-2xl p-4">
          <div className="mb-2 flex items-center justify-between text-xs text-white/70">
            <span>{Math.round(progress * 100)}% woven</span>
            <span>{moves} moves</span>
            <button
              onClick={() => setHintToken((t) => t + 1)}
              className="font-display rounded-md bg-white/10 px-3 py-1 text-xs uppercase tracking-wider hover:bg-white/20"
              aria-label="Show hint"
            >
              ✨ Hint
            </button>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-300 via-fuchsia-400 to-cyan-300 transition-all duration-300"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        </div>
      </footer>

      {victory && (
        <VictoryModal
          level={level}
          moves={moves}
          onNext={() => onNext(level.id)}
          onGallery={onBack}
        />
      )}
    </div>
  );
}

function VictoryModal({
  level,
  moves,
  onNext,
  onGallery,
}: {
  level: LevelDef;
  moves: number;
  onNext: () => void;
  onGallery: () => void;
}) {
  const preview = useMemo(() => generatePreview(level, 280), [level]);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tapestry complete"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6 backdrop-blur-md"
    >
      <div className="glass-panel w-full max-w-sm rounded-3xl p-6 text-center">
        <div className="relative mx-auto mb-5 h-56 w-56">
          <div
            className="absolute inset-0 rounded-2xl"
            style={{
              backgroundImage: `url(${preview})`,
              backgroundSize: "cover",
              boxShadow: "0 0 60px 10px rgba(244,114,182,0.45), 0 0 120px 20px rgba(56,189,248,0.35)",
              animation: "chromaweave-pulse 3s ease-in-out infinite",
            }}
          />
        </div>
        <p className="font-display text-xs uppercase tracking-[0.3em] text-white/60">{level.name}</p>
        <h3 className="font-display title-shimmer mt-2 text-3xl font-extrabold">Stunning tapestry complete!</h3>
        <p className="mt-2 text-sm text-white/70">Woven in {moves} moves.</p>
        <div className="mt-6 flex flex-col gap-3">
          <button onClick={onNext} className="glow-button font-display rounded-2xl px-6 py-4 text-lg font-bold">
            Next Tapestry →
          </button>
          <button onClick={onGallery} className="glass-panel font-display rounded-2xl px-6 py-3 text-sm font-medium">
            Back to gallery
          </button>
        </div>
      </div>
    </div>
  );
}

type TutorialStep = {
  title: string;
  body: string;
  icon: string;
  visual: "grid" | "drag" | "anchor" | "progress" | "hint" | "victory";
};

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    icon: "🎨",
    title: "Welcome to ChromaWeave",
    body: "You are a weaver of light. Each level is a tapestry whose colors have been gently shuffled. Your task is to put every color back into its perfect place — calmly, beautifully, at your own pace.",
    visual: "grid",
  },
  {
    icon: "👆",
    title: "Drag a tile",
    body: "Press and hold any tile, then drag it onto another tile. When you let go, the two tiles swap colors. There is no timer — take a breath, look at the gradient, and follow the flow of light.",
    visual: "drag",
  },
  {
    icon: "📌",
    title: "Anchor tiles guide you",
    body: "Tiles marked with a small dot are anchors — they are already in the right place and cannot move. Use them as a compass: every other tile flows smoothly between the anchors.",
    visual: "anchor",
  },
  {
    icon: "🌈",
    title: "Follow the gradient",
    body: "Colors should fade smoothly from one anchor to the next. If a tile breaks the flow, it belongs somewhere else. Look at its neighbors above, below, left and right — the right home will feel obvious.",
    visual: "grid",
  },
  {
    icon: "📈",
    title: "Watch your progress",
    body: "The bar at the bottom shows how much of the tapestry is woven. Each correct tile lights it up. There are no wrong moves — only steps closer to the finished pattern.",
    visual: "progress",
  },
  {
    icon: "✨",
    title: "Stuck? Ask for a hint",
    body: "Tap the ✨ Hint button anytime to see where a misplaced tile wants to go. Tap ↺ to reshuffle the level, 🔊 to mute, and ? to revisit this guide.",
    visual: "hint",
  },
  {
    icon: "🏆",
    title: "Complete the tapestry",
    body: "When every tile is home, the tapestry comes alive — and the next one unlocks. Beginner levels are small and gentle; Casual sharpens your eye; Master is a slow, meditative challenge. Ready to weave?",
    visual: "victory",
  },
];

function TutorialOverlay({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const s = TUTORIAL_STEPS[step];
  const isLast = step === TUTORIAL_STEPS.length - 1;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDone();
      if (e.key === "ArrowRight") setStep((i) => Math.min(i + 1, TUTORIAL_STEPS.length - 1));
      if (e.key === "ArrowLeft") setStep((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDone]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="How to play ChromaWeave"
      className="fixed inset-0 z-50 flex items-center justify-center px-5 backdrop-blur-md"
      style={{ background: "var(--cw-overlay)" }}
    >
      <div className="glass-panel w-full max-w-md rounded-3xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <span className="font-display text-[10px] uppercase tracking-[0.3em]" style={{ color: "var(--cw-muted-soft)" }}>
            Step {step + 1} of {TUTORIAL_STEPS.length}
          </span>
          <button
            onClick={onDone}
            className="font-display text-xs uppercase tracking-wider opacity-70 hover:opacity-100"
            aria-label="Skip tutorial"
          >
            Skip
          </button>
        </div>

        <TutorialVisual kind={s.visual} />

        <div className="mt-5 text-center">
          <div className="text-4xl" aria-hidden>{s.icon}</div>
          <h3 className="font-display mt-2 text-2xl font-extrabold">{s.title}</h3>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--cw-muted)" }}>{s.body}</p>
        </div>

        <div className="mt-5 flex items-center justify-center gap-1.5" aria-hidden>
          {TUTORIAL_STEPS.map((_, i) => (
            <span
              key={i}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === step ? 24 : 8,
                background: i === step ? "var(--cw-fg)" : "var(--cw-glass-border)",
              }}
            />
          ))}
        </div>

        <div className="mt-5 flex gap-3">
          <button
            disabled={step === 0}
            onClick={() => setStep((i) => Math.max(i - 1, 0))}
            className="glass-panel font-display min-h-12 flex-1 rounded-2xl px-4 py-3 text-sm font-medium disabled:opacity-40"
          >
            ← Back
          </button>
          <button
            onClick={() => (isLast ? onDone() : setStep((i) => i + 1))}
            className="glow-button font-display min-h-12 flex-[1.4] rounded-2xl px-4 py-3 text-base font-bold"
          >
            {isLast ? "Start weaving ✨" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TutorialVisual({ kind }: { kind: TutorialStep["visual"] }) {
  // Tiny illustrative 4x4 swatch derived from a warm gradient
  const cells = useMemo(() => {
    const palette = [
      "#FFD89B", "#FFB778", "#FF8E64", "#FF6F61",
      "#F5C39A", "#F0A07A", "#E07A6A", "#C04848",
      "#D9A38F", "#C57F84", "#A66D8E", "#84529A",
      "#A88FB8", "#8A7BC2", "#6C7CD0", "#4D6BD8",
    ];
    return palette;
  }, []);

  const highlight =
    kind === "drag" ? 5 :
    kind === "anchor" ? -1 :
    kind === "hint" ? 10 : -2;
  const anchors = new Set(kind === "anchor" ? [0, 3, 12, 15] : []);
  const dragTarget = kind === "drag" ? 10 : -1;

  if (kind === "progress") {
    return (
      <div className="rounded-2xl p-4" style={{ background: "var(--cw-glass-border)" }}>
        <div className="mb-2 flex justify-between text-xs" style={{ color: "var(--cw-muted)" }}>
          <span>62% woven</span><span>14 moves</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full" style={{ background: "var(--cw-glass-bg)" }}>
          <div className="h-full rounded-full bg-gradient-to-r from-amber-300 via-fuchsia-400 to-cyan-300" style={{ width: "62%" }} />
        </div>
      </div>
    );
  }

  if (kind === "victory") {
    return (
      <div className="grid grid-cols-4 gap-1.5 rounded-2xl p-3" style={{ background: "var(--cw-glass-border)" }}>
        {cells.map((c, i) => (
          <div
            key={i}
            className="aspect-square rounded-md"
            style={{
              background: c,
              boxShadow: "0 0 12px rgba(255,255,255,0.25)",
              animation: `chromaweave-pulse ${2 + (i % 4) * 0.2}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="relative grid grid-cols-4 gap-1.5 rounded-2xl p-3" style={{ background: "var(--cw-glass-border)" }}>
      {cells.map((c, i) => {
        const isHighlight = i === highlight;
        const isAnchor = anchors.has(i);
        const isTarget = i === dragTarget;
        return (
          <div
            key={i}
            className="relative aspect-square rounded-md"
            style={{
              background: c,
              outline: isHighlight ? "3px solid rgba(255,255,255,0.95)" : isTarget ? "2px dashed rgba(255,255,255,0.85)" : "none",
              outlineOffset: 1,
              transform: isHighlight && kind === "drag" ? "translate(8px, 10px) scale(1.08)" : "none",
              transition: "transform 400ms ease",
              animation: isHighlight && kind === "hint" ? "chromaweave-pulse 1.2s ease-in-out infinite" : undefined,
              zIndex: isHighlight ? 2 : 1,
            }}
          >
            {isAnchor && (
              <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80" />
            )}
          </div>
        );
      })}
    </div>
  );
}