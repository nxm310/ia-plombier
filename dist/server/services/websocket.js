let broadcastFn = () => { };
export function setBroadcastHandler(fn) {
    broadcastFn = fn;
}
export function broadcast(event, data) {
    try {
        broadcastFn(event, data);
    }
    catch (err) {
        console.error('[WebSocket Broadcast] Erreur:', err);
    }
}
