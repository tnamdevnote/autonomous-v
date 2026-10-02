// One route per surface. /control (or the all-in-one lab at /) runs the simulation;
// /world, /cabin and /phone mirror it, so they can live on separate screens.

import { Link } from "react-router-dom";
import { SimFollower, SimHost } from "./engine";
import { scenarios } from "./scenarios";
import { CabinScreen } from "./surfaces/cabin/CabinScreen";
import { variantIds } from "./surfaces/cabin/registry";
import { ControlPanel } from "./surfaces/control/ControlPanel";
import { PhoneApp } from "./surfaces/phone/PhoneApp";
import { ScaledFrame, SimGate, StartGate, useRiderKeys, Voice } from "./surfaces/shared";
import { WorldView } from "./surfaces/world/WorldView";

export const CABIN_SIZE = { width: 1280, height: 800 };
export const PHONE_SIZE = { width: 390, height: 844 };

export function LabRoute() {
  return (
    <SimHost scenarios={scenarios} variants={variantIds}>
      <SimGate>
        <Lab />
      </SimGate>
    </SimHost>
  );
}

function Lab() {
  useRiderKeys("lab");
  return (
    <div className="lab">
      <Panel title="World (windshield)" to="/world" className="lab-world">
        <WorldView />
      </Panel>
      <Panel title="Cabin screen" to="/cabin" className="lab-cabin">
        <ScaledFrame {...CABIN_SIZE}>
          <CabinScreen />
        </ScaledFrame>
        <Voice />
      </Panel>
      <Panel title="Phone" to="/phone" className="lab-phone">
        <ScaledFrame {...PHONE_SIZE}>
          <PhoneApp />
        </ScaledFrame>
      </Panel>
      <Panel title="Facilitator" to="/control" className="lab-control">
        <ControlPanel />
      </Panel>
    </div>
  );
}

function Panel({ title, to, className, children }: { title: string; to: string; className: string; children: React.ReactNode }) {
  return (
    <section className={`lab-panel ${className}`}>
      <header>
        {title}
        <Link to={to} target="_blank" title="Open on its own (for a second screen)">
          ↗
        </Link>
      </header>
      <div className="lab-body">{children}</div>
    </section>
  );
}

export function ControlRoute() {
  return (
    <SimHost scenarios={scenarios} variants={variantIds}>
      <SimGate>
        <div className="control-page">
          <ControlPanel />
        </div>
      </SimGate>
    </SimHost>
  );
}

function Participant({ surface, label, children }: { surface: string; label: string; children: React.ReactNode }) {
  useRiderKeys(surface);
  return (
    <SimGate>
      <StartGate label={label}>{children}</StartGate>
    </SimGate>
  );
}

export function WorldRoute() {
  return (
    <SimFollower>
      <Participant surface="world" label="Windshield view">
        <div className="fullscreen">
          <WorldView />
        </div>
      </Participant>
    </SimFollower>
  );
}

export function CabinRoute() {
  return (
    <SimFollower>
      <Participant surface="cabin" label="Cabin screen">
        <div className="fullscreen dark">
          <ScaledFrame {...CABIN_SIZE}>
            <CabinScreen />
          </ScaledFrame>
          <Voice />
        </div>
      </Participant>
    </SimFollower>
  );
}

export function PhoneRoute() {
  return (
    <SimFollower>
      <Participant surface="phone" label="Phone">
        <div className="fullscreen dark">
          <ScaledFrame {...PHONE_SIZE}>
            <PhoneApp />
          </ScaledFrame>
        </div>
      </Participant>
    </SimFollower>
  );
}
