import React, { createContext, useContext, useEffect, useState } from 'react';
import { authoritySupabase } from '../../lib/supabase';
import { useAuthorityAuth } from './AuthorityAuthContext';
import { useAuth } from '../../utils/AuthContext'; // for global isDemoMode

const AuthorityRealtimeContext = createContext({
  realtimeIncidents: {},
  latestIncident: null, // to trigger toasts easily
  activeTourists: {} // mapping of tourist_id -> tourist presence data
});

export function AuthorityRealtimeProvider({ children }) {
  const [realtimeIncidents, setRealtimeIncidents] = useState({});
  const [latestIncident, setLatestIncident] = useState(null);
  const [activeTourists, setActiveTourists] = useState({});
  
  const { isAuthority, user, loading } = useAuthorityAuth();
  const { isDemoMode } = useAuth(); // Global demo state

  useEffect(() => {
    // Only proceed if authority client exists and user is authenticated
    if (!authoritySupabase || loading) return;
    if (!isAuthority && !isDemoMode) return;

    let isMounted = true;
    console.log('[Authority Realtime] Initializing subscription process...');

    const fetchInitial = async () => {
      try {
        const { data, error } = await authoritySupabase
          .from('incidents')
          .select('*, tourists(name, safety_id)')
          .in('status', ['ACTIVE', 'ACKNOWLEDGED', 'RESPONDING', 'ESCALATED']);
          
        if (error) {
          console.error('[Authority Realtime] Initial fetch error:', error);
          return;
        }

        if (isMounted && data) {
          const incMap = {};
          data.forEach(inc => { incMap[inc.id] = inc; });
          setRealtimeIncidents(incMap);
          console.log(`[Authority Realtime] Fetched ${data.length} active incidents.`);
        }
      } catch (err) {
        console.error('[Authority Realtime] Exception during initial fetch:', err);
      }
    };

    const fetchActiveTourists = async () => {
      try {
        // Fetch tourists that have updated their location within the last 5 minutes
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const { data, error } = await authoritySupabase
          .from('tourists')
          .select('id, name, safety_id, current_latitude, current_longitude, last_location_update, current_safety_score, current_safety_severity, current_safety_signals')
          .gte('last_location_update', fiveMinutesAgo);

        if (error) {
          console.error('[Authority Realtime] Initial fetch tourists error:', error);
          return;
        }

        if (isMounted && data) {
          const tMap = {};
          data.forEach(t => { tMap[t.id] = t; });
          setActiveTourists(tMap);
          console.log(`[Authority Realtime] Fetched ${data.length} active tourists.`);
        }
      } catch (err) {
        console.error('[Authority Realtime] Exception during tourist fetch:', err);
      }
    };

    fetchInitial();
    fetchActiveTourists();

    console.log('[Authority Realtime] Attempting to subscribe to public:incidents and public:tourists...');
    
    // Create ONE channel for both incidents and tourists to save resources
    const channel = authoritySupabase.channel('public:authority_central')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, async (payload) => {
        if (!isMounted) return;
        
        const { new: newRow, eventType } = payload;
        
        if (eventType === 'DELETE' || ['RESOLVED', 'CANCELLED'].includes(newRow.status)) {
          setRealtimeIncidents(prev => {
            const next = { ...prev };
            delete next[newRow.id];
            return next;
          });
          return;
        }

        // For INSERT or UPDATE (ACTIVE, etc.), fetch tourist info if needed
        let touristData = null;
        try {
          const res = await authoritySupabase
            .from('tourists')
            .select('name, safety_id')
            .eq('id', newRow.tourist_id)
            .single();
          touristData = res.data;
        } catch (err) {
          console.error('[Authority Realtime] Failed to fetch tourist for update:', err);
        }

        if (isMounted) {
          const fullIncident = { ...newRow, tourists: touristData };
          
          if (touristData) {
            console.log(`[AUTHORITY REALTIME] Tourist resolved: ${touristData.name}`);
          }
          
          setRealtimeIncidents(prev => ({
            ...prev,
            [newRow.id]: fullIncident
          }));

          // If this is a new incident, trigger latestIncident for toasts
          if (eventType === 'INSERT') {
            console.log(`[AUTHORITY REALTIME] Incident INSERT received: ${newRow.id}`);
            setLatestIncident(fullIncident);
          } else if (eventType === 'UPDATE') {
            console.log('[Authority Realtime] UPDATE received:', newRow.id, newRow.status);
          }
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tourists' }, (payload) => {
        if (!isMounted) return;
        
        if (payload.eventType === 'DELETE') {
          setActiveTourists(prev => {
            const next = { ...prev };
            delete next[payload.old.id];
            return next;
          });
          return;
        }

        const updatedTourist = payload.new;
        
        // Only care if they have location data
        if (updatedTourist && updatedTourist.last_location_update) {
           setActiveTourists(prev => ({
             ...prev,
             [updatedTourist.id]: updatedTourist
           }));
        }
      })
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Authority Realtime] SUBSCRIBED successfully to central channel');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Authority Realtime] Channel error', err);
        }
      });

    // Cleanup active tourists every minute (remove stale ones)
    const cleanupInterval = setInterval(() => {
      if (!isMounted) return;
      const now = Date.now();
      setActiveTourists(prev => {
        const next = { ...prev };
        let changed = false;
        Object.keys(next).forEach(id => {
          const t = next[id];
          if (t.last_location_update && (now - new Date(t.last_location_update).getTime() > 5 * 60 * 1000)) {
            delete next[id];
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 60000);

    return () => {
      isMounted = false;
      clearInterval(cleanupInterval);
      console.log('[Authority Realtime] Unsubscribing channel...');
      authoritySupabase.removeChannel(channel);
    };
  }, [isAuthority, isDemoMode, loading, user]);

  return (
    <AuthorityRealtimeContext.Provider value={{ realtimeIncidents, latestIncident, activeTourists }}>
      {children}
    </AuthorityRealtimeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuthorityRealtime() {
  return useContext(AuthorityRealtimeContext);
}
