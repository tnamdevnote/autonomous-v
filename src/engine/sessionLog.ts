import type { LogEntry, SimState } from "./types";

export function logToJSON(state: SimState, scenarioName: string, entries: LogEntry[]): string {
  return JSON.stringify(
    {
      session: state.sessionId,
      participant: state.participant,
      scenario: state.scenarioId,
      scenarioName,
      variant: state.variantId,
      exportedAt: new Date().toISOString(),
      entries,
    },
    null,
    2,
  );
}

export function logToCSV(state: SimState, entries: LogEntry[]): string {
  const header = ["session", "participant", "scenario", "variant", "scenario_time_s", "wall_clock", "source", "type", "detail"];
  const rows = entries.map((e) =>
    [state.sessionId, state.participant, state.scenarioId, state.variantId, e.t, e.wall, e.source, e.type, e.detail ?? ""].map(csvCell).join(","),
  );
  return [header.join(","), ...rows].join("\n");
}

function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function downloadText(filename: string, text: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
