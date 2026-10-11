/** Text-to-speech with an English voice, if the browser has one. */
export function speak(text: string, rate = 0.92) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-GB";
  u.rate = rate;
  const voices = synth.getVoices();
  const voice =
    voices.find((v) => v.lang === "en-GB" && /natural|google|daniel|serena/i.test(v.name)) ??
    voices.find((v) => v.lang.startsWith("en-GB")) ??
    voices.find((v) => v.lang.startsWith("en"));
  if (voice) u.voice = voice;
  synth.speak(u);
  return true;
}

export const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window;

// Minimal typing for the Web Speech recognition API (not in lib.dom yet).
interface RecognitionResultEvent {
  results: ArrayLike<ArrayLike<{ transcript: string; confidence: number }>>;
}
interface Recognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: RecognitionResultEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
}

function recognitionCtor(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as (new () => Recognition) | null;
}

export const canListen = () => recognitionCtor() !== null;

/**
 * Listens once and resolves with every alternative the recogniser heard.
 * Rejects with a readable message on errors such as a blocked microphone.
 */
export function listenOnce(): { promise: Promise<string[]>; stop: () => void } {
  const Ctor = recognitionCtor();
  if (!Ctor) return { promise: Promise.reject(new Error("Speech recognition isn't supported in this browser")), stop: () => {} };
  const rec = new Ctor();
  rec.lang = "en-US";
  rec.interimResults = false;
  rec.maxAlternatives = 5;
  const promise = new Promise<string[]>((resolve, reject) => {
    let done = false;
    rec.onresult = (e) => {
      done = true;
      const alts = Array.from(e.results[0] ?? []).map((a) => a.transcript);
      resolve(alts);
    };
    rec.onerror = (e) => {
      done = true;
      reject(new Error(e.error === "not-allowed" ? "Microphone access was blocked" : e.error === "no-speech" ? "We didn't hear anything — try again" : `Speech error: ${e.error}`));
    };
    rec.onend = () => { if (!done) resolve([]); };
  });
  rec.start();
  return { promise, stop: () => rec.abort() };
}

/** True when the target word appears in any of the heard phrases. */
export function heardWord(alternatives: string[], target: string) {
  const t = target.toLowerCase().replace(/[^a-z]/g, "");
  return alternatives.some((alt) =>
    alt
      .toLowerCase()
      .split(/[^a-z']+/)
      .map((w) => w.replace(/'/g, ""))
      .some((w) => w === t) || alt.toLowerCase().replace(/[^a-z]/g, "").includes(t),
  );
}
