import { useEffect, useMemo, useState } from "react";
import { LEVELS, type Difficulty, type LevelDef } from "../utils/colors";
import { GameBoard, generatePreview } from "./GameBoard";
import { loadSave, saveSave, type SaveData } from "../utils/storage";
import { setAudioEnabled, playVictory, unlockAudio } from "../utils/audio";
import { haptics, setHapticsEnabled } from "../utils/haptics";

type Screen = { kind: "home" } | { kind: "gallery"; filter?: Difficulty } | { kind: "game"; levelId: string };

export function ChromaWeaveApp() {
  const [save, setSave] = useState<SaveData>(() => loadSave());
  const [screen, setScreen] = useState<Screen>({ kind: "home" });
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    saveSave(save);
    setAudioEnabled(save.settings.sound);
    setHapticsEnabled(save.settings.haptics);
  }, [save]);

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

      <div className="flex flex-1 items-center justify-center">
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