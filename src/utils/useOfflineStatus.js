import { useState, useEffect, useCallback } from 'react';
import { getQueuedSOS, clearQueuedSOS } from '../services/offlineService';
import { createIncident } from '../services/incidentService';

export function useOfflineStatus() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingSOSCount, setPendingSOSCount] = useState(0);

  const refreshQueueCount = useCallback(async () => {
    const q = await getQueuedSOS();
    setPendingSOSCount(q.length);
  }, []);

  const syncOfflineData = useCallback(async () => {
    if (!isOnline) return;
    setIsSyncing(true);

    try {
      const queued = await getQueuedSOS();
      for (const incident of queued) {
        // Attempt to sync to backend
        const { data, error } = await createIncident(incident);
        if (!error && data) {
          // Success, clear from queue
          await clearQueuedSOS(incident.id);
          console.log(`[Offline Sync] Successfully synced queued incident ${incident.id}`);
        } else {
          console.error(`[Offline Sync] Failed to sync incident ${incident.id}`, error);
        }
      }
      refreshQueueCount();
    } catch (err) {
      console.error('[Offline Sync] Sync process failed', err);
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, refreshQueueCount]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineData(); // Trigger sync when we come back online
    };
    
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial sync check just in case we started online with queued items
    if (navigator.onLine) {
      setTimeout(() => syncOfflineData(), 0);
    } else {
      refreshQueueCount();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncOfflineData, refreshQueueCount]);

  return { isOnline, isSyncing, syncOfflineData, pendingSOSCount };
}
