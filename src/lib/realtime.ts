// Client-side real-time event broadcaster and listener
export type RealtimeEventType =
  | "PROJECT_UPDATED"
  | "BUDGET_PROPOSED"
  | "BUDGET_APPROVED"
  | "BUDGET_DECLINED"
  | "STATUS_CHANGED"
  | "PAYMENT_RECORDED"
  | "NOTIFICATION_SENT";

let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof window === "undefined") return null;
  if (!channel && typeof BroadcastChannel !== "undefined") {
    try {
      channel = new BroadcastChannel("nexus_realtime_sync");
    } catch {
      channel = null;
    }
  }
  return channel;
}

export interface RealtimeMessage {
  type: RealtimeEventType;
  projectId?: string;
  payload?: any;
  timestamp?: number;
  [key: string]: any;
}

export function broadcastRealtimeEvent(
  typeOrObj: RealtimeEventType | RealtimeMessage,
  payload?: any
) {
  if (typeof window === "undefined") return;

  const msg: RealtimeMessage =
    typeof typeOrObj === "string"
      ? { type: typeOrObj, payload, timestamp: Date.now() }
      : { ...typeOrObj, timestamp: typeOrObj.timestamp || Date.now() };

  try {
    const ch = getChannel();
    if (ch) {
      ch.postMessage(msg);
    }
  } catch (err) {
    console.error("BroadcastChannel postMessage error:", err);
  }

  // Also dispatch window custom event for same-page components
  try {
    window.dispatchEvent(new CustomEvent("nexus:realtime", { detail: msg }));
  } catch {}
}

export function subscribeToRealtime(
  callback: (event: RealtimeMessage) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  const ch = getChannel();

  const handleChannelMessage = (ev: MessageEvent) => {
    if (ev.data && ev.data.type) {
      callback(ev.data);
    }
  };

  const handleWindowEvent = (ev: Event) => {
    const detail = (ev as CustomEvent).detail;
    if (detail && detail.type) {
      callback(detail);
    }
  };

  if (ch) {
    ch.addEventListener("message", handleChannelMessage);
  }
  window.addEventListener("nexus:realtime", handleWindowEvent);

  return () => {
    if (ch) {
      ch.removeEventListener("message", handleChannelMessage);
    }
    window.removeEventListener("nexus:realtime", handleWindowEvent);
  };
}
