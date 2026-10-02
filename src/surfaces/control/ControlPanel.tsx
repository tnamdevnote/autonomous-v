// Facilitator console: run the session, play Rider Support / fleet response, add
// observation markers and export the log. Never shown to participants.

import { useState } from "react";
import {
  downloadText,
  formatDuration,
  heldSeconds,
  isHolding,
  logToCSV,
  logToJSON,
  useSend,
  useSim,
  useSimStore,
} from "../../engine";
import { scenarios } from "../../scenarios";
import { variants } from "../cabin/registry";

const QUICK_REPLIES = [
  { text: "Hi, this is Rider Support. I can see you're stopped. Give me a moment to check.", clear: false },
  { text: "Your car stopped for a parked fire truck. It's safe; we're confirming the way around.", clear: false },
  { text: "You're all set. The car will continue in a moment.", clear: true },
];

const MARKERS = ["Visibly anxious", "Looked around", "Asked a question", "Looked for help", "Relieved"];

export function ControlPanel() {
  const sim = useSim();
  const send = useSend();
  const problems = useSimStore((s) => s.problems);
  const hostConflict = useSimStore((s) => s.hostConflict);
  const [reply, setReply] = useState("");
  const [alsoClear, setAlsoClear] = useState(false);
  const [note, setNote] = useState("");

  const holding = isHolding(sim);
  const waitingForReply =
    sim.support.requested && !sim.support.messages.some((m) => m.from === "support" && m.t >= (sim.support.requestedAt ?? 0));
  const maxWait = scenarios[sim.scenarioId]?.maxWaitSeconds;

  const load = (scenarioId: string, variantId: string) => send({ kind: "facilitator", action: "load", scenarioId, variantId });
  const sendReply = (text: string, clear: boolean) => {
    if (!text.trim()) return;
    send({ kind: "facilitator", action: "supportReply", text: text.trim(), clear: clear && holding });
  };

  return (
    <div className="control">
      <header className="control-header">
        <h1>Facilitator console</h1>
        <span className="muted">{sim.sessionId}</span>
      </header>
      {hostConflict && (
        <div className="alert">Another tab is also running the simulation. Close it: only one /control or lab (/) should be open.</div>
      )}
      {problems.length > 0 && (
        <div className="alert">
          <strong>Scenario problems:</strong>
          <ul>
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      )}

      <section>
        <h2>Session</h2>
        <label>
          Scenario
          <select value={sim.scenarioId} onChange={(e) => load(e.target.value, sim.variantId)}>
            {Object.entries(scenarios).map(([id, s]) => (
              <option key={id} value={id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Cabin design
          <select value={sim.variantId} onChange={(e) => load(sim.scenarioId, e.target.value)}>
            {variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Participant
          <input
            defaultValue={sim.participant}
            key={sim.sessionId}
            placeholder="e.g. P07"
            onBlur={(e) => e.target.value !== sim.participant && send({ kind: "facilitator", action: "setParticipant", participant: e.target.value })}
          />
        </label>
      </section>

      <section>
        <h2>
          Playback <span className="clock">{formatDuration(sim.t)}</span> <span className={`pill ${sim.status}`}>{sim.status}</span>
        </h2>
        <div className="row">
          {sim.status === "ready" && (
            <button className="primary" onClick={() => send({ kind: "facilitator", action: "start" })}>
              ▶ Start
            </button>
          )}
          {sim.status === "running" && <button onClick={() => send({ kind: "facilitator", action: "pause" })}>❚❚ Pause</button>}
          {sim.status === "paused" && (
            <button className="primary" onClick={() => send({ kind: "facilitator", action: "resume" })}>
              ▶ Resume
            </button>
          )}
          <button disabled={sim.status !== "running" && sim.status !== "paused"} onClick={() => send({ kind: "facilitator", action: "skipNext" })}>
            ⏭ Next step now
          </button>
          <button onClick={() => send({ kind: "facilitator", action: "reset" })}>↺ Reset</button>
        </div>
        <div className="row">
          Speed
          {[0.5, 1, 2, 4].map((speed) => (
            <button key={speed} className={sim.speed === speed ? "selected" : ""} onClick={() => send({ kind: "facilitator", action: "setSpeed", speed })}>
              {speed}×
            </button>
          ))}
          <label className="inline">
            <input type="checkbox" checked={sim.voice} onChange={(e) => send({ kind: "facilitator", action: "setVoice", on: e.target.checked })} />
            Voice
          </label>
        </div>
        <dl className="live">
          <dt>Car</dt>
          <dd>
            {sim.car.mode} · {(sim.car.v / 0.44704).toFixed(0)} mph · {sim.car.s.toFixed(0)}/{sim.trip.routeMeters} m
          </dd>
          {holding && (
            <>
              <dt>Waiting</dt>
              <dd>
                {formatDuration(heldSeconds(sim))}
                {maxWait ? ` of max ${formatDuration(maxWait)}` : ""}
              </dd>
            </>
          )}
          <dt>Screen says</dt>
          <dd>{sim.message?.text ?? "—"}</dd>
          <dt>Coming up</dt>
          <dd>
            {sim.upcoming.length === 0
              ? "—"
              : sim.upcoming.map((u, i) => (
                  <div key={i} className="upcoming">
                    {formatDuration(u.at)} {u.label}
                  </div>
                ))}
          </dd>
        </dl>
      </section>

      <section>
        <h2>Fleet response</h2>
        <button className="primary" disabled={!holding} onClick={() => send({ kind: "facilitator", action: "clearToProceed" })}>
          Clear to proceed
        </button>
        {!holding && <span className="muted"> Available while the car is waiting.</span>}
      </section>

      <section className={waitingForReply ? "attention" : ""}>
        <h2>Rider Support {waitingForReply && <span className="pill warning">rider asked for help</span>}</h2>
        {sim.pullOverRequested && <div className="muted">Rider asked to pull over.</div>}
        <div className="chat">
          {sim.support.messages.map((m, i) => (
            <div key={i} className={`chat-msg from-${m.from}`}>
              <span className="muted">{formatDuration(m.t)}</span> {m.text}
            </div>
          ))}
        </div>
        <div className="quick">
          {QUICK_REPLIES.map((q) => (
            <button key={q.text} onClick={() => sendReply(q.text, q.clear)}>
              {q.text}
              {q.clear && <span className="pill ok">+ clears car</span>}
            </button>
          ))}
        </div>
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault();
            sendReply(reply, alsoClear);
            setReply("");
          }}
        >
          <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Type a reply to the rider…" />
          <button type="submit">Send</button>
        </form>
        <label className="inline">
          <input type="checkbox" checked={alsoClear} onChange={(e) => setAlsoClear(e.target.checked)} />
          Typed reply also clears the car (if it's waiting)
        </label>
      </section>

      <section>
        <h2>Observations</h2>
        <div className="row">
          Anxiety
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <button key={n} onClick={() => send({ kind: "facilitator", action: "marker", label: "anxiety", value: n })}>
              {n}
            </button>
          ))}
        </div>
        <div className="row wrap">
          {MARKERS.map((m) => (
            <button key={m} onClick={() => send({ kind: "facilitator", action: "marker", label: m })}>
              {m}
            </button>
          ))}
        </div>
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault();
            if (note.trim()) send({ kind: "facilitator", action: "marker", label: "note", value: note.trim() });
            setNote("");
          }}
        >
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (Enter to add)" />
        </form>
      </section>

      <LogSection />
    </div>
  );
}

function LogSection() {
  const sim = useSim();
  const log = useSimStore((s) => s.log);
  const name = `${sim.sessionId}${sim.participant ? `-${sim.participant}` : ""}`;
  const scenarioName = scenarios[sim.scenarioId]?.name ?? sim.scenarioId;
  return (
    <section>
      <h2>
        Session log <span className="muted">({log.length} entries)</span>
      </h2>
      <div className="row">
        <button onClick={() => downloadText(`${name}.json`, logToJSON(sim, scenarioName, log), "application/json")}>Export JSON</button>
        <button onClick={() => downloadText(`${name}.csv`, logToCSV(sim, log), "text/csv")}>Export CSV</button>
      </div>
      <div className="log">
        {log
          .slice(-14)
          .reverse()
          .map((e, i) => (
            <div key={i} className={`log-row src-${e.source}`}>
              <span className="muted">{formatDuration(e.t)}</span> <b>{e.source}</b> {e.type} {e.detail && <span className="muted">{e.detail}</span>}
            </div>
          ))}
      </div>
    </section>
  );
}
