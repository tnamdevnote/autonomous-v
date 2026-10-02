import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { RIDER_KEYS } from "../../config/keys";
import { useSimStore } from "../../engine";

/** Renders children only once a simulation state exists. */
export function SimGate({ children }: { children: ReactNode }) {
  const ready = useSimStore((s) => s.state !== null);
  if (ready) return <>{children}</>;
  return (
    <div className="waiting">
      <p>Waiting for the simulation…</p>
      <p className="muted">
        Open <a href="/control">/control</a> in another window (or use the all-in-one lab at <a href="/">/</a>).
      </p>
    </div>
  );
}

/**
 * Scales a fixed-size design (e.g. a 1280×800 cabin screen) to fit its container,
 * so designers can work in real pixels.
 */
export function ScaledFrame({ width, height, children }: { width: number; height: number; children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const el = outer.current!;
    const ro = new ResizeObserver(() => setScale(Math.min(el.clientWidth / width, el.clientHeight / height)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [width, height]);
  return (
    <div ref={outer} className="scaled-outer">
      <div className="scaled-inner" style={{ width, height, transform: `translate(-50%, -50%) scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
}

/** Keyboard (and keyboard-emulating hardware buttons) → rider actions. */
export function useRiderKeys(surface: string) {
  const send = useSimStore((s) => s.send);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      if (target.closest("input, textarea, select, [contenteditable=true]")) return;
      const action = RIDER_KEYS[e.key.toLowerCase()];
      if (action) send({ kind: "rider", action, surface: `${surface} (key ${e.key.toUpperCase()})` });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [send, surface]);
}

/**
 * A tap-to-begin overlay for participant screens. Browsers only allow sound after a
 * user gesture, and it's a natural moment to go full screen.
 */
export function StartGate({ label, children }: { label: string; children: ReactNode }) {
  const [started, setStarted] = useState(false);
  if (started) return <>{children}</>;
  return (
    <button
      className="start-gate"
      onClick={() => {
        setStarted(true);
        document.documentElement.requestFullscreen?.().catch(() => {});
      }}
    >
      <strong>{label}</strong>
      <span>Tap to begin</span>
    </button>
  );
}

/** Speaks the car's lines (browser speech for now; swap for recorded audio later). */
export function Voice() {
  const sessionId = useSimStore((s) => s.state?.sessionId);
  const utterance = useSimStore((s) => s.state?.utterance);
  const on = useSimStore((s) => s.state?.voice ?? true);
  const spoken = useRef({ sessionId: sessionId, id: utterance?.id ?? 0 });

  useEffect(() => {
    if (spoken.current.sessionId !== sessionId) spoken.current = { sessionId, id: 0 };
    if (!utterance || utterance.id <= spoken.current.id) return;
    spoken.current.id = utterance.id;
    if (!on || typeof speechSynthesis === "undefined") return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(utterance.text);
    const voice = speechSynthesis.getVoices().find((v) => v.lang.startsWith("en") && /female|samantha|google us/i.test(v.name));
    if (voice) u.voice = voice;
    speechSynthesis.speak(u);
  }, [sessionId, utterance, on]);

  return null;
}
