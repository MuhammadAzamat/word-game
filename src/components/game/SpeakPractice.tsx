"use client";
import { Loader2, Mic } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { canListen, heardWord, listenOnce } from "@/lib/speech";

type State = { kind: "idle" } | { kind: "listening" } | { kind: "ok"; heard: string } | { kind: "retry"; heard: string } | { kind: "error"; message: string };

/** "Say it" button: listens through the microphone and checks the word was pronounced. */
export function SpeakPractice({ word, onSuccess }: { word: string; onSuccess?: () => void }) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const [supported, setSupported] = useState(false);
  const stopRef = useRef<() => void>(() => {});

  useEffect(() => {
    setSupported(canListen());
    return () => stopRef.current();
  }, []);

  if (!supported) return null;

  async function go() {
    setState({ kind: "listening" });
    const { promise, stop } = listenOnce();
    stopRef.current = stop;
    try {
      const alts = await promise;
      const heard = alts[0] ?? "";
      if (heardWord(alts, word)) {
        setState({ kind: "ok", heard });
        onSuccess?.();
      } else setState({ kind: "retry", heard });
    } catch (e) {
      setState({ kind: "error", message: (e as Error).message });
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={go}
        disabled={state.kind === "listening"}
        className={`btn rounded-xl px-3 py-1.5 text-xs ${
          state.kind === "listening"
            ? "bg-rose-500 text-white"
            : state.kind === "ok"
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
              : "bg-pink-500/12 text-pink-600 hover:bg-pink-500/20 dark:text-pink-300"
        }`}
      >
        {state.kind === "listening" ? <Loader2 className="size-3.5 animate-spin" /> : <Mic className="size-3.5" />}
        {state.kind === "listening" ? "Listening…" : state.kind === "ok" ? "Great!" : "Say it"}
      </button>
      {state.kind === "ok" && <span className="text-xs text-emerald-600 dark:text-emerald-400">✓ We heard “{state.heard}”</span>}
      {state.kind === "retry" && (
        <span className="text-xs text-amber-600 dark:text-amber-400">
          {state.heard ? `We heard “${state.heard}” — try again` : "Didn't catch that — try again"}
        </span>
      )}
      {state.kind === "error" && <span className="text-xs text-rose-500">{state.message}</span>}
    </div>
  );
}
