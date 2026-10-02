// How screens talk to each other. Today: BroadcastChannel (tabs/windows of one browser
// on one machine). For real multi-device tests, add a WebSocket transport with the same
// shape and pick it in createTransport() — nothing else needs to change.

import type { Intent, SimState } from "../types";

export type SyncMessage =
  | { type: "state"; hostId: string; state: SimState }
  | { type: "intent"; intent: Intent }
  | { type: "hello" };

export interface Transport {
  send(message: SyncMessage): void;
  onMessage(handler: (message: SyncMessage) => void): void;
  close(): void;
}

export function createBroadcastTransport(channelName = "av-sim"): Transport {
  const channel = new BroadcastChannel(channelName);
  return {
    send: (message) => channel.postMessage(message),
    onMessage: (handler) => {
      channel.onmessage = (e: MessageEvent<SyncMessage>) => handler(e.data);
    },
    close: () => channel.close(),
  };
}

export function createTransport(): Transport {
  return createBroadcastTransport();
}
