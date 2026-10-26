// A one-page, click-around demo of the Troubleshoot cabin screen. Runs the simulation
// in this page (no /control window), starts the ride by itself, and puts the
// facilitator's few controls under the screen. Build with `npm run build:demo`.
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { formatDuration, heldSeconds, isHolding, SimHost, useSend, useSim } from "./engine";
import { scenarios } from "./scenarios";
import { CabinScreen } from "./surfaces/cabin/CabinScreen";
import { variantIds } from "./surfaces/cabin/registry";
import { ScaledFrame, SimGate } from "./surfaces/shared";
import "./styles.css";
import "./demo.css";

const VARIANT = "troubleshoot";
const SCENARIO = "parked-fire-truck";

// Same ids as TBD_CANDIDATES in surfaces/cabin/variants/troubleshoot.tsx.
const TBD_OPTIONS = [
  { id: "", label: "TBD" },
  { id: "why", label: "Why stopped?" },
  { id: "exit", label: "Get out nearby" },
  { id: "reroute", label: "Try another way" },
  { id: "message", label: "Message Support" },
  { id: "notify", label: "I'll be late" },
  { id: "all", label: "All" },
];

const REPLIES = [
  { text: "Hi, I can see you're stopped for a parked fire truck. Give me a moment.", clear: false },
  { text: "Thanks for waiting. The car is cleared to go around now.", clear: true },
];

function Demo() {
  const sim = useSim();
  const send = useSend();
  const [tbd, setTbd] = useState(() => new URLSearchParams(location.search).get("tbd") ?? "");

  // Load the Troubleshoot screen and start driving as soon as the page opens (and after Restart).
  useEffect(() => {
    if (sim.variantId !== VARIANT) send({ kind: "facilitator", action: "load", scenarioId: SCENARIO, variantId: VARIANT });
    else if (sim.status === "ready") send({ kind: "facilitator", action: "start" });
  }, [sim.variantId, sim.status, send]);

  const pickTbd = (id: string) => {
    // The variant reads ?tbd= when it mounts; remounting via `key` below applies it.
    history.replaceState(null, "", id ? `?tbd=${id}` : location.pathname);
    setTbd(id);
  };

  const holding = isHolding(sim);
  const status =
    sim.status === "ended" || sim.car.mode === "arrived"
      ? "Arrived"
      : holding
        ? `Stopped for a fire truck · ${formatDuration(heldSeconds(sim))}`
        : sim.car.v < 0.1
          ? "Starting…"
          : "Driving";

  return (
    <div className="demo">
      <header className="demo-head">
        <h1>Troubleshoot drawer</h1>
        <p>
          Cabin screen prototype. The car stops for a parked fire truck about 20 seconds in. Tap <b>Troubleshoot</b> on the
          screen to get unstuck.
        </p>
      </header>

      <div className="demo-screen">
        <ScaledFrame width={1280} height={800}>
          <div key={tbd} style={{ width: "100%", height: "100%" }}>
            <CabinScreen />
          </div>
        </ScaledFrame>
      </div>

      <footer className="demo-controls">
        <section>
          <h2>Third option in the drawer</h2>
          <div className="demo-seg" role="radiogroup" aria-label="Third option">
            {TBD_OPTIONS.map((o) => (
              <button key={o.id} role="radio" aria-checked={tbd === o.id} className={tbd === o.id ? "on" : ""} onClick={() => pickTbd(o.id)}>
                {o.label}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2>
            Ride <span className={`demo-pill${holding ? " warn" : ""}`}>{status}</span>
          </h2>
          <div className="demo-row">
            <button disabled={!holding} onClick={() => send({ kind: "facilitator", action: "clearToProceed" })}>
              Clear the car to go
            </button>
            <button onClick={() => send({ kind: "facilitator", action: "reset" })}>Restart ride</button>
          </div>
        </section>

        <section>
          <h2>Reply as Rider Support {sim.support.requested ? "" : <span className="demo-muted">(after the rider calls)</span>}</h2>
          <div className="demo-row">
            {REPLIES.map((r) => (
              <button
                key={r.text}
                disabled={!sim.support.requested}
                onClick={() => send({ kind: "facilitator", action: "supportReply", text: r.text, clear: r.clear && holding })}
              >
                {r.clear ? "“You're cleared to go”" : "“Give me a moment”"}
              </button>
            ))}
          </div>
        </section>
      </footer>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SimHost scenarios={scenarios} variants={variantIds}>
      <SimGate>
        <Demo />
      </SimGate>
    </SimHost>
  </StrictMode>,
);
