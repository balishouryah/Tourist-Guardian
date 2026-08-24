import { openDB } from 'idb';

const DB_NAME = 'TouristGuardianOfflineDB';
const DB_VERSION = 1;

const STORES = {
  CACHE: 'cache_store',       // For profile, contacts, etc. Keyed by auth.uid() + '_type'
  SOS_QUEUE: 'sos_queue',     // For pending incidents
  EVENTS_QUEUE: 'events_queue'// For pending safety events
};

let dbPromise = null;

if (typeof window !== 'undefined') {
  dbPromise = openDB(DB_NAME, DB_VERSION + 1, { // Increment version to trigger upgrade
    upgrade(db, oldVersion, newVersion) {
      if (!db.objectStoreNames.contains(STORES.CACHE)) {
        db.createObjectStore(STORES.CACHE);
      }
      if (!db.objectStoreNames.contains(STORES.SOS_QUEUE)) {
        db.createObjectStore(STORES.SOS_QUEUE, { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(STORES.EVENTS_QUEUE)) {
        db.createObjectStore(STORES.EVENTS_QUEUE, { keyPath: 'id', autoIncrement: true });
      }
    },
  });
}

/**
 * Saves arbitrary data to offline cache for a specific user and type.
 */
export async function saveOfflineData(userId, type, data) {
  if (!dbPromise || !userId) return;
  try {
    const db = await dbPromise;
    await db.put(STORES.CACHE, data, `${userId}_${type}`);
  } catch (error) {
    console.warn('[OfflineService] Failed to save offline data:', error);
  }
}

/**
 * Retrieves cached data for a specific user and type.
 */
export async function getOfflineData(userId, type) {
  if (!dbPromise || !userId) return null;
  try {
    const db = await dbPromise;
    return await db.get(STORES.CACHE, `${userId}_${type}`);
  } catch (error) {
    console.warn('[OfflineService] Failed to get offline data:', error);
    return null;
  }
}

export async function clearOfflineData(userId, type) {
  if (!dbPromise || !userId) return;
  try {
    const db = await dbPromise;
    await db.delete(STORES.CACHE, `${userId}_${type}`);
  } catch (error) {
    console.warn('[OfflineService] Failed to clear offline data:', error);
  }
}

/**
 * Queues an SOS incident locally when offline.
 */
export async function queueSOS(incidentData) {
  if (!dbPromise) return null;
  try {
    const db = await dbPromise;
    const queuedData = {
      ...incidentData,
      queued_at: new Date().toISOString(),
      status: 'QUEUED'
    };
    const id = await db.add(STORES.SOS_QUEUE, queuedData);
    return { ...queuedData, id };
  } catch (error) {
    console.warn('[OfflineService] Failed to queue SOS:', error);
    return null;
  }
}

/**
 * Gets all pending queued incidents.
 */
export async function getQueuedSOS() {
  if (!dbPromise) return [];
  try {
    const db = await dbPromise;
    return await db.getAll(STORES.SOS_QUEUE);
  } catch (error) {
    console.warn('[OfflineService] Failed to get queued SOS:', error);
    return [];
  }
}

/**
 * Removes a specific incident from the queue after successful sync.
 */
export async function clearQueuedSOS(id) {
  if (!dbPromise) return;
  try {
    const db = await dbPromise;
    await db.delete(STORES.SOS_QUEUE, id);
  } catch (error) {
    console.warn('[OfflineService] Failed to clear queued SOS:', error);
  }
}

/**
 * Queues a safety event locally when offline.
 */
export async function queueSafetyEvent(eventData) {
  if (!dbPromise) return null;
  try {
    const db = await dbPromise;
    const queuedData = {
      ...eventData,
      queued_at: new Date().toISOString()
    };
    const id = await db.add(STORES.EVENTS_QUEUE, queuedData);
    return { ...queuedData, id };
  } catch (error) {
    console.warn('[OfflineService] Failed to queue safety event:', error);
    return null;
  }
}

export async function getQueuedSafetyEvents() {
  if (!dbPromise) return [];
  try {
    const db = await dbPromise;
    return await db.getAll(STORES.EVENTS_QUEUE);
  } catch (error) {
    console.warn('[OfflineService] Failed to get queued safety events:', error);
    return [];
  }
}

export async function clearQueuedSafetyEvent(id) {
  if (!dbPromise) return;
  try {
    const db = await dbPromise;
    await db.delete(STORES.EVENTS_QUEUE, id);
  } catch (error) {
    console.warn('[OfflineService] Failed to clear queued safety event:', error);
  }
}
