type BroadcastFn = (event: string, data: any) => void;

let broadcastFn: BroadcastFn = () => {};

export function setBroadcastHandler(fn: BroadcastFn) {
  broadcastFn = fn;
}

export function broadcast(event: string, data: any) {
  try {
    broadcastFn(event, data);
  } catch (err) {
    console.error('[WebSocket Broadcast] Erreur:', err);
  }
}
