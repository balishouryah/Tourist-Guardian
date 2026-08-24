import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { getTouristProfile } from '../services/touristService';

/**
 * Hook to manage live incident state for authenticated users.
 * Directly listens to Supabase for incident updates instead of the generic BroadcastChannel.
 */
export function useLiveIncident() {
  const { user, isDemoMode } = useAuth();
  const [liveIncident, setLiveIncident] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !supabase || isDemoMode) {
      setTimeout(() => {
        setLiveIncident(null);
        setIsLoading(false);
      }, 0);
      return;
    }

    let isMounted = true;
    let channel = null;

    const initialize = async () => {
      try {
        const { data: profile } = await getTouristProfile();
        if (!profile || !isMounted) {
          if (isMounted) setIsLoading(false);
          return;
        }

        // Fetch current active incident
        const { data: incidentData } = await supabase
          .from('incidents')
          .select('*')
          .eq('tourist_id', profile.id)
          .in('status', ['ACTIVE', 'ACKNOWLEDGED', 'RESPONDING', 'ESCALATED'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (isMounted) {
          setLiveIncident(incidentData);
          setIsLoading(false);
        }

        // Subscribe to changes for this tourist's incidents
        channel = supabase.channel(`tourist_incident_live_${profile.id}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents', filter: `tourist_id=eq.${profile.id}` }, (payload) => {
            if (!isMounted) return;
            const newRow = payload.new;
            
            if (payload.eventType === 'DELETE' || newRow.status === 'CANCELLED') {
              setLiveIncident(null);
            } else {
              setLiveIncident(newRow);
            }
          })
          .subscribe();
          
      } catch (err) {
        console.error('[LiveIncident] Initialization error:', err);
      }
    };

    initialize();

    return () => {
      isMounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [user, isDemoMode]);

  return { liveIncident, setLiveIncident, isLoading };
}
