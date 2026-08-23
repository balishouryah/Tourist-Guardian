/**
 * EventBus — Cross-window communication for Tourist Guardian.
 *
 * Uses BroadcastChannel so two browser windows (Tourist + Authority)
 * can share state changes in real time, without a backend.
 *
 * Architecture rule: All cross-window events go through this module.
 * To swap to WebSocket/API later, only this file needs to change.
 */

const CHANNEL_NAME = 'tourist-guardian';

let channel = null;
const listeners = new Set();

function getChannel() {
  if (!channel) {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (e) => {
      listeners.forEach((fn) => {
        try {
          fn(e.data);
        } catch (err) {
          console.error('[EventBus] Listener error:', err);
        }
      });
    };
  }
  return channel;
}

/**
 * Broadcast an event to all other windows/tabs on the same origin.
 * @param {string} type  - Event type, e.g. 'ROUTE_DEVIATION'
 * @param {object} payload - Any JSON-serializable data
 */
export function broadcast(type, payload = {}) {
  const event = { type, payload, timestamp: Date.now() };
  getChannel().postMessage(event);

  // Also deliver to listeners in the SAME window so the sending
  // window can react to its own events (useful for authority view
  // when running in the same tab during development).
  listeners.forEach((fn) => {
    try {
      fn(event);
    } catch (err) {
      console.error('[EventBus] Listener error:', err);
    }
  });
}

/**
 * Subscribe to all cross-window events.
 * @param {function} callback - Receives { type, payload, timestamp }
 * @returns {function} unsubscribe function
 */
export function subscribe(callback) {
  getChannel(); // ensure channel is initialized
  listeners.add(callback);
  return () => listeners.delete(callback);
}

// Event type constants — single source of truth
export const EventTypes = {
  JOURNEY_STARTED:      'JOURNEY_STARTED',
  ROUTE_DEVIATION:      'ROUTE_DEVIATION',
  INACTIVITY_DETECTED:  'INACTIVITY_DETECTED',
  HIGH_RISK_ZONE_ENTRY: 'HIGH_RISK_ZONE_ENTRY',
  DISTRESS_ALERT:       'DISTRESS_ALERT',
  TOURIST_RESPONSE:     'TOURIST_RESPONSE',
  SOS_ACTIVATED:        'SOS_ACTIVATED',
  SOS_DEACTIVATED:      'SOS_DEACTIVATED',
  SCORE_UPDATE:         'SCORE_UPDATE',
  INCIDENT_CREATED:     'INCIDENT_CREATED',
  DEMO_RESET:           'DEMO_RESET',
};
