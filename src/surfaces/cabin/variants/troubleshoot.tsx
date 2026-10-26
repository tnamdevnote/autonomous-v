// TROUBLESHOOT: a copy of today's Waymo cabin screen (full-width map, "Arriving at" pill,
// floating control bar) where "Support" becomes "Troubleshoot". It opens a bottom drawer
// of ways to get unstuck when the ride is disrupted: Call Support, Call 911, and one
// option still being decided.
//
// The third option is picked with ?tbd=<id> on the URL (e.g. /world?tbd=why). Leave it
// off for a dashed placeholder, or use ?tbd=all to show every candidate at once for a
// brainstorm. Candidates live in TBD_CANDIDATES below; add one by adding an entry.
//
// Every tap in the drawer is written to the session log, so the facilitator sees what
// the rider tried even when the option only exists on screen (Wizard of Oz).
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  arrivalClock,
  formatClock,
  formatDuration,
  heldSeconds,
  isHolding,
  stopTargetObject,
  useSend,
  type RiderAction,
} from "../../../engine";
import { CarViz, useCabinDisplay, useSim } from "../components";

export const meta = {
  name: "Troubleshoot drawer",
  description: "Today-like screen; Troubleshoot opens a drawer with Call Support, Call 911 and a TBD option (?tbd=).",
};

type Overlay = { kind: "support" } | { kind: "911" } | { kind: "toast"; text: string } | null;

interface Candidate {
  id: string;
  title: string;
  subtitle: string;
  icon: ReactNode;
  /** What the rider sees after tapping. Return a node to show it inside the drawer. */
  run: (ctx: RunContext) => ReactNode | void;
}

interface RunContext {
  rider: (action: RiderAction) => void;
  log: (detail: string) => void;
  show: (overlay: Overlay) => void;
  close: () => void;
}

// Candidates for the third slot. Each answers a different "I'm stuck" need:
// understand (why), leave (exit), nudge the car (reroute), ask quietly (message),
// and handle the knock-on effect (notify).
const TBD_CANDIDATES: Candidate[] = [
  {
    id: "why",
    title: "Why are we stopped?",
    subtitle: "See what the car is waiting for",
    icon: <Icon d="M12 17v-.01M12 13.5a2 2 0 1 0-2-2M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18Z" />,
    run: () => <WhyAnswer />,
  },
  {
    id: "exit",
    title: "Get out nearby",
    subtitle: "End the ride at the closest safe spot",
    icon: <Icon d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l-4-4 4-4M6 12h10" />,
    run: ({ rider, show, close }) => {
      rider("pressPullOver");
      close();
      show({ kind: "toast", text: "Finding a safe spot to let you out" });
    },
  },
  {
    id: "reroute",
    title: "Try another way",
    subtitle: "Ask the car to route around this",
    icon: <Icon d="M6 20V9a4 4 0 0 1 4-4h8M14 1l4 4-4 4M6 20h0" />,
    run: ({ log, show, close }) => {
      log("troubleshoot: reroute requested");
      close();
      show({ kind: "toast", text: "Looking for another route…" });
    },
  },
  {
    id: "message",
    title: "Message Support",
    subtitle: "Text instead of a call",
    icon: <Icon d="M4 5h16v11H8l-4 4V5Z" />,
    run: ({ rider, log }) => {
      rider("pressHelp");
      return <QuickReplies log={log} />;
    },
  },
  {
    id: "notify",
    title: "I'll be late",
    subtitle: "Share your new arrival time",
    icon: <Icon d="M12 7v5l3 2M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18Z" />,
    run: ({ log, show, close }) => {
      log("troubleshoot: shared late arrival");
      close();
      show({ kind: "toast", text: "New arrival time sent to your contact" });
    },
  },
];

function tbdSelection(): Candidate[] | null {
  const id = new URLSearchParams(window.location.search).get("tbd");
  if (id === "all") return TBD_CANDIDATES;
  const one = TBD_CANDIDATES.find((c) => c.id === id);
  return one ? [one] : null;
}

export default function Troubleshoot() {
  const sim = useSim();
  const send = useSend();
  const { surface } = useCabinDisplay();
  const [open, setOpen] = useState(false);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [expanded, setExpanded] = useState<{ id: string; node: ReactNode } | null>(null);
  const tbd = useState(tbdSelection)[0];

  const log = (detail: string) => send({ kind: "rider", action: "interaction", detail, surface });
  const rider = (action: RiderAction) => send({ kind: "rider", action, surface });

  const openDrawer = () => {
    log("troubleshoot: open");
    setExpanded(null);
    setOpen(true);
  };
  const closeDrawer = () => setOpen(false);

  // Toasts clear themselves.
  useEffect(() => {
    if (overlay?.kind !== "toast") return;
    const id = setTimeout(() => setOverlay(null), 3500);
    return () => clearTimeout(id);
  }, [overlay]);

  const ctx: RunContext = { rider, log, show: setOverlay, close: closeDrawer };

  return (
    <div className="ts">
      <CarViz showPath />

      <div className="ts-arriving">Arriving at {formatClock(arrivalClock(sim))}</div>
      <div className="ts-edge-tab" aria-hidden>
        ‹
      </div>

      {overlay?.kind === "support" && <CallCard title="Rider Support" onEnd={() => setOverlay(null)} />}
      {overlay?.kind === "911" && <CallCard title="911 (simulated)" emergency onEnd={() => setOverlay(null)} />}
      {overlay?.kind === "toast" && <div className="ts-toast">{overlay.text}</div>}

      <nav className="ts-bar">
        <BarButton onClick={() => log("bar: play music")} icon={<Icon d="M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm11-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />}>
          Play music
        </BarButton>
        <BarButton onClick={() => log("bar: climate")}>70°</BarButton>
        <BarButton
          onClick={() => {
            rider("pressPullOver");
            setOverlay({ kind: "toast", text: "Pulling over when it's safe" });
          }}
        >
          Pull over
        </BarButton>
        <BarButton onClick={openDrawer} active={open} icon={<Icon d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4 2.5-2.5Z" />}>
          Troubleshoot
        </BarButton>
      </nav>

      <div className={`ts-scrim${open ? " open" : ""}`} onClick={closeDrawer} />
      <section className={`ts-drawer${open ? " open" : ""}`} aria-hidden={!open} aria-label="Troubleshoot">
        <div className="ts-handle" onClick={closeDrawer} />
        <header className="ts-drawer-head">
          <h2>Troubleshoot</h2>
          <p>{isHolding(sim) ? `Stopped · ${formatDuration(heldSeconds(sim))}` : "Get help with your ride"}</p>
        </header>

        <div className="ts-options">
          <Option
            title="Call Support"
            subtitle="Talk to a Rider Support agent now"
            icon={<Icon d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />}
            onClick={() => {
              rider("pressHelp");
              closeDrawer();
              setOverlay({ kind: "support" });
            }}
          />
          <HoldToCall
            onConfirm={() => {
              log("troubleshoot: call 911 (simulated)");
              closeDrawer();
              setOverlay({ kind: "911" });
            }}
            onAttempt={() => log("troubleshoot: 911 pressed, not held")}
          />
          {tbd === null ? (
            <div className="ts-option ts-tbd">
              <span className="ts-option-icon">?</span>
              <span className="ts-option-text">
                <strong>TBD option</strong>
                <small>Pick one with ?tbd=why · exit · reroute · message · notify · all</small>
              </span>
            </div>
          ) : (
            tbd.map((c) => (
              <div key={c.id}>
                <Option
                  title={c.title}
                  subtitle={c.subtitle}
                  icon={c.icon}
                  onClick={() => {
                    log(`troubleshoot: ${c.id}`);
                    const node = c.run(ctx);
                    setExpanded(node ? { id: c.id, node } : null);
                  }}
                />
                {expanded?.id === c.id && <div className="ts-expand">{expanded.node}</div>}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function BarButton({ children, icon, onClick, active }: { children: ReactNode; icon?: ReactNode; onClick: () => void; active?: boolean }) {
  return (
    <button className={`ts-bar-button${active ? " active" : ""}`} onClick={onClick}>
      {icon}
      {children}
    </button>
  );
}

function Option({ title, subtitle, icon, onClick }: { title: string; subtitle: string; icon: ReactNode; onClick: () => void }) {
  return (
    <button className="ts-option" onClick={onClick}>
      <span className="ts-option-icon">{icon}</span>
      <span className="ts-option-text">
        <strong>{title}</strong>
        <small>{subtitle}</small>
      </span>
    </button>
  );
}

const HOLD_MS = 1200;

/** Press and hold to call, so a stray tap can't dial 911. A quick tap shows a hint. */
function HoldToCall({ onConfirm, onAttempt }: { onConfirm: () => void; onAttempt: () => void }) {
  const [holding, setHolding] = useState(false);
  const [hint, setHint] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const started = useRef(0);

  const start = () => {
    started.current = performance.now();
    setHolding(true);
    setHint(false);
    timer.current = setTimeout(() => {
      setHolding(false);
      onConfirm();
    }, HOLD_MS);
  };
  const cancel = () => {
    if (!timer.current) return;
    clearTimeout(timer.current);
    timer.current = undefined;
    if (holding && performance.now() - started.current < HOLD_MS) {
      setHint(true);
      onAttempt();
    }
    setHolding(false);
  };

  return (
    <button
      className={`ts-option ts-911${holding ? " holding" : ""}`}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onContextMenu={(e) => e.preventDefault()}
      style={{ ["--hold" as string]: `${HOLD_MS}ms` }}
    >
      <span className="ts-911-fill" />
      <span className="ts-option-icon">
        <Icon d="M12 3 2 20h20L12 3Zm0 6v5m0 3v.01" />
      </span>
      <span className="ts-option-text">
        <strong>Call 911</strong>
        <small>{hint ? "Keep holding to call" : "Press and hold for emergencies"}</small>
      </span>
    </button>
  );
}

function CallCard({ title, emergency, onEnd }: { title: string; emergency?: boolean; onEnd: () => void }) {
  const sim = useSim();
  const last = sim.support.messages.filter((m) => m.from !== "rider").at(-1);
  return (
    <div className={`ts-call${emergency ? " emergency" : ""}`}>
      <span className="ts-call-dot" />
      <div className="ts-call-body">
        <strong>{title}</strong>
        <small>{emergency ? "Connecting… the car will stay stopped." : (last?.text ?? "Connecting…")}</small>
      </div>
      <button className="ts-call-end" onClick={onEnd}>
        End
      </button>
    </div>
  );
}

/** Live: the wait keeps counting while the answer is open. */
function WhyAnswer() {
  const sim = useSim();
  // Scenario labels read like "Fire truck · parked"; keep the noun.
  const what = stopTargetObject(sim)?.label?.split("·")[0].trim().toLowerCase() ?? "something ahead";
  return (
    <p className="ts-answer">
      {isHolding(sim)
        ? `We stopped for a ${what} and are checking it's safe to go around. Waiting ${formatDuration(heldSeconds(sim))} so far.`
        : "The car is driving normally. Nothing is holding it up right now."}
    </p>
  );
}

function QuickReplies({ log }: { log: (detail: string) => void }) {
  const [sent, setSent] = useState<string | null>(null);
  const replies = ["The car is stuck", "I'm going to be late", "I don't feel safe"];
  if (sent) return <p className="ts-answer">Sent “{sent}”. Support will reply here.</p>;
  return (
    <div className="ts-chips">
      {replies.map((r) => (
        <button
          key={r}
          className="ts-chip"
          onClick={() => {
            log(`troubleshoot: message "${r}"`);
            setSent(r);
          }}
        >
          {r}
        </button>
      ))}
    </div>
  );
}

function Icon({ d }: { d: string }) {
  return (
    <svg className="ts-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}
