import { useAuthorityRealtime } from '../authority/utils/AuthorityRealtimeContext';

/**
 * useRealtimeIncidents
 * 
 * Custom hook to access Supabase Realtime subscriptions for incidents.
 * This has been refactored to consume AuthorityRealtimeContext, preventing
 * duplicate subscriptions.
 */
export function useRealtimeIncidents() {
  const { realtimeIncidents } = useAuthorityRealtime();
  return { realtimeIncidents };
}
