import { supabase } from '../lib/supabase';
import { queueSafetyEvent, getQueuedSafetyEvents, clearQueuedSafetyEvent } from './offlineService';

/**
 * Logs a safety event (zone entry, score change, etc).
 * If offline, queues it in IndexedDB for later sync.
 */
export async function logSafetyEvent(touristId, eventPayload, isOnline) {
  if (!isOnline) {
    // Queue offline
    return await queueSafetyEvent({ tourist_id: touristId, ...eventPayload });
  }

  try {
    const { data, error } = await supabase
      .from('safety_events')
      .insert([{
        tourist_id: touristId,
        ...eventPayload
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to log safety event, queueing offline...', error);
    return await queueSafetyEvent({ tourist_id: touristId, ...eventPayload });
  }
}

/**
 * Syncs offline queued safety events when back online.
 */
export async function syncSafetyEvents() {
  const pending = await getQueuedSafetyEvents();
  if (!pending || pending.length === 0) return 0;

  let successCount = 0;
  for (const event of pending) {
    try {
      const { id, queued_at, ...payload } = event; // Strip offline-specific keys
      const { error } = await supabase
        .from('safety_events')
        .insert([payload]);

      if (!error) {
        await clearQueuedSafetyEvent(id);
        successCount++;
      }
    } catch (err) {
      console.error('Failed to sync safety event', err);
    }
  }
  return successCount;
}

/**
 * Fetches recent safety events for a tourist.
 */
export async function getTouristSafetyEvents(touristId) {
  const { data, error } = await supabase
    .from('safety_events')
    .select('*')
    .eq('tourist_id', touristId)
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (error) {
    console.warn('Failed to fetch safety events:', error);
    return [];
  }
  return data || [];
}
