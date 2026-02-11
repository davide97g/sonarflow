import { PlayCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

const PROMPT = "user@host-7f3a2b your-project %";
const COMMAND_INIT = "npx sonarflow init";

/** Figlet "Slant" banner from real CLI (init.ts runBanner) */
const BANNER_ART = [
  "   _____                        ______             ",
  "  / ___/____  ____  ____ ______/ __/ /___ _      __",
  "  \\__ \\/ __ \\/ __ \\/ __ `/ ___/ /_/ / __ \\ | /| / /",
  " ___/ / /_/ / / / / /_/ / /  / __/ / /_/ / |/ |/ / ",
  "/____/\\____/_/ /_/\\__,_/_/  /_/ /_/\\____/|__/|__/  ",
];
const BANNER_VERSION = "v2.2.0";
const BANNER_TAGLINE = "⚡@Bitrock - Empowering modern engineering ⚡";
const BANNER_DURATION_MS = 3500;

/** CLI setup output from sonarflow init (screenshot) */
const INIT_OUTPUT_LINES = [
  "Welcome to sonarflow setup!",
  "📋 Found existing configuration file, using as defaults",
  "",
  "📦 Repository",
  "✓ Repository name? your-project",
  "✓ Git provider: github",
  "✓ Repository visibility: public",
  "✓ Repository organization: (optional)",
  "",
  "🔍 Sonar",
  "✓ Sonar mode: custom (self-hosted SonarQube)",
  "✓ Sonar organization (required for standard mode):",
  "✓ Sonar project key (project name): your-project",
  "✓ Sonar URL (base, e.g., https://sonar.mycompany.com): https://sonar.yourcompany.com",
  "✓ Sonar visibility: public",
  "",
  "🤖 AI",
  "✓ AI editor: cursor",
  "✓ Rules flavor: safe",
  "Rule path: .cursor/rules/sonarflow-autofix.mdc",
  "✓ Configuration saved to .sonarflowrc.json",
  "✓ package.json scripts updated",
  "✓ Rule created at .cursor/rules/sonarflow-autofix.mdc",
  "✓ Editor icon theme configured",
  "",
  "✅ Setup complete.",
  "💡 Use 'npx sonarflow@latest <command>' to always get the latest version",
];

const TYPING_DELAY_MS = 80;
const LINE_DELAY_MS = 350;
const BANNER_STEP = COMMAND_INIT.length;
const INIT_LINE_STEPS = INIT_OUTPUT_LINES.length;
const OUTPUT_INIT_START = BANNER_STEP + 1;
const OUTPUT_INIT_END = OUTPUT_INIT_START + INIT_LINE_STEPS;
const COMPLETE_STEP = OUTPUT_INIT_END;

type Phase = "typing_init" | "banner" | "output_init" | "complete";

const getPhase = (stepIndex: number): Phase => {
  if (stepIndex < BANNER_STEP) return "typing_init";
  if (stepIndex === BANNER_STEP) return "banner";
  if (stepIndex < COMPLETE_STEP) return "output_init";
  return "complete";
};

const getTotalSteps = (): number => COMPLETE_STEP + 1;

const getDelayMs = (stepIndex: number): number => {
  const phase = getPhase(stepIndex);
  if (phase === "typing_init") return TYPING_DELAY_MS;
  if (phase === "banner") return BANNER_DURATION_MS;
  if (phase === "output_init") return LINE_DELAY_MS;
  return 0;
};

interface CliDemoProps {
  autoPlay?: boolean;
  className?: string;
  /** When true, the terminal grows to fill its container (e.g. inside LaserFlow box). */
  fill?: boolean;
}

const CliDemo = ({ autoPlay = true, className = "", fill = false }: CliDemoProps) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const totalSteps = getTotalSteps();
  const isComplete = stepIndex >= totalSteps - 1 && getPhase(stepIndex) === "complete";

  const phase = getPhase(stepIndex);
  const outputLines: string[] = [];
  if (phase === "output_init" || phase === "complete") {
    const count = phase === "output_init" ? stepIndex - OUTPUT_INIT_START + 1 : INIT_LINE_STEPS;
    outputLines.push(...INIT_OUTPUT_LINES.slice(0, count));
    // scroll to the bottom of the output
    const outputElement = document.querySelector(".cli-demo-output");
    if (outputElement) {
      outputElement.scrollTop = outputElement.scrollHeight;
    }
  }

  const currentCommand = phase === "typing_init" ? COMMAND_INIT.slice(0, 0) : "";

  const showCursor =
    !isComplete &&
    (phase === "typing_init" || (phase === "output_init" && stepIndex < COMPLETE_STEP));

  const advance = useCallback(() => {
    setStepIndex((prev) => {
      const next = prev + 1;
      if (next >= totalSteps) {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        return prev;
      }
      const delay = getDelayMs(next);
      if (delay > 0) {
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          advance();
        }, delay);
      }
      return next;
    });
  }, [totalSteps]);

  const INITIAL_DELAY_MS = 800;

  const handleReplay = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setStepIndex(0);
    setHasStarted(true);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      advance();
    }, INITIAL_DELAY_MS);
  };

  useEffect(() => {
    if (!autoPlay || hasStarted) return;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setStepIndex(totalSteps - 1);
      setHasStarted(true);
      return;
    }
    setHasStarted(true);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      advance();
    }, INITIAL_DELAY_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [autoPlay, totalSteps, hasStarted, advance]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleReplay();
    }
  };

  return (
    <section
      aria-label="Sonarflow CLI demo animation"
      className={`rounded-lg border border-white/10 bg-zinc-950 text-white font-mono text-sm overflow-hidden shadow-xl ${fill ? "flex h-full min-h-0 flex-col" : ""} ${className}`}
    >
      <div className="flex shrink-0 items-center gap-2 px-3 py-2 border-b border-white/10">
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-zinc-600" aria-hidden />
          <span className="w-2.5 h-2.5 rounded-full bg-zinc-600" aria-hidden />
          <span className="w-2.5 h-2.5 rounded-full bg-zinc-600" aria-hidden />
        </div>
        <span className="text-xs text-zinc-500">your-project</span>
      </div>
      <div
        className={`p-4 overflow-y-auto cli-demo-output ${fill ? "min-h-0 flex-1" : "min-h-[280px] max-h-[400px]"}`}
      >
        {/* Command line: show when typing, or above banner/output */}
        {(phase === "typing_init" ||
          phase === "banner" ||
          phase === "output_init" ||
          phase === "complete") && (
          <div className="flex items-center gap-0.5 leading-relaxed">
            <span className="text-zinc-500 select-none">{PROMPT}</span>
            <span className="text-white">
              {phase === "typing_init" ? currentCommand : COMMAND_INIT}
            </span>
            {phase === "typing_init" && showCursor && (
              <span className="inline-block w-2 h-4 bg-white animate-pulse ml-0.5" aria-hidden />
            )}
          </div>
        )}

        {/* Colorful banner (after Enter on sonarflow init) */}
        {phase === "banner" && (
          <div className="flex flex-col items-center justify-center py-4 text-center" aria-hidden>
            <pre
              className="cli-demo-banner-art text-left text-[0.5rem] leading-tight tracking-tight sm:text-xs"
              style={{
                background: "linear-gradient(90deg, #A4A5A7, #C74600, #EB640A, #F2A65D, #A4A5A7)",
                backgroundSize: "300% 100%",
                animation: "cli-demo-gradient 3.5s ease-in-out infinite",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              {BANNER_ART.join("\n")}
            </pre>
            <p
              className="mt-1 font-bold sm:text-sm"
              style={{
                background: "linear-gradient(90deg, #A4A5A7, #C74600, #EB640A, #F2A65D)",
                backgroundSize: "200% 100%",
                animation: "cli-demo-gradient 3.5s ease-in-out infinite",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              {BANNER_VERSION}
            </p>
            <p
              className="mt-2 text-xs text-zinc-400 sm:text-sm"
              style={{
                background: "linear-gradient(90deg, #A4A5A7, #EB640A, #F2A65D)",
                backgroundSize: "200% 100%",
                animation: "cli-demo-gradient 3.5s ease-in-out infinite",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              {BANNER_TAGLINE}
            </p>
          </div>
        )}

        {/* CLI setup output (screenshot content) */}
        {(phase === "output_init" || phase === "complete") && (
          <>
            <div className="mt-1 space-y-0.5 text-green-200/90">
              {outputLines.map((line, i) => (
                <div key={`line-${i}-${line.slice(0, 12)}`} className="leading-relaxed">
                  {line === "" ? "\u00A0" : line}
                </div>
              ))}
            </div>
            {(phase === "complete" || showCursor) && (
              <div className="mt-1 flex items-center gap-0.5 leading-relaxed">
                <span className="text-zinc-500 select-none">{PROMPT}</span>
                {showCursor && (
                  <span
                    className="inline-block w-2 h-4 bg-white animate-pulse ml-0.5"
                    aria-hidden
                  />
                )}
              </div>
            )}
          </>
        )}
      </div>
      <div className="shrink-0 border-t border-white/10 px-3 py-2 flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleReplay}
          onKeyDown={handleKeyDown}
          className="text-zinc-400 hover:text-white hover:bg-white/10 font-mono text-xs"
          aria-label="Replay CLI demo animation"
          tabIndex={0}
        >
          <PlayCircle className="h-3.5 w-3.5 mr-1.5" />
          See it in action
        </Button>
      </div>
    </section>
  );
};

export default CliDemo;
