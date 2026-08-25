import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { DEMO_TOURIST } from './constants';

const AuthContext = createContext({});
const AUTH_LOCAL_STORAGE_KEY = 'tg_auth_tourist_profile';
const DEMO_LOCAL_STORAGE_KEY = 'tg_demo_tourist_profile';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [isDemoMode, setIsDemoMode] = useState(() => {
    // Check if demo mode was previously active
    return localStorage.getItem('tg_demo_mode') === 'true';
  });
  
  // NEW: Single source of truth for tourist profile
  const [touristProfile, setTouristProfile] = useState(null);
  
  // Expose a way to manually refresh the profile (e.g. after onboarding)
  const refreshTouristProfile = async (currentUserId) => {
    if (!supabase || !currentUserId) return;
    try {
      const { data, error } = await supabase
        .from('tourists')
        .select('*')
        .eq('auth_user_id', currentUserId)
        .maybeSingle();
        
      if (data && !error) {
        setTouristProfile(data);
        localStorage.setItem(AUTH_LOCAL_STORAGE_KEY, JSON.stringify(data));
      } else {
        setTouristProfile(null);
      }
    } catch (err) {
      console.error('Error refreshing tourist profile:', err);
    }
  };

  useEffect(() => {
    // If supabase isn't configured, we stay in loading=false and user=null
    if (!supabase) {
      setTimeout(() => setLoading(false), 0);
      return;
    }

    // Initialize session and profiles
    const initialize = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setIsDemoMode(false);
          localStorage.removeItem('tg_demo_mode');
          
          const touristRes = await supabase.from('tourists').select('*').eq('auth_user_id', session.user.id).maybeSingle();
            
          if (touristRes.data && !touristRes.error) {
            setTouristProfile(touristRes.data);
            localStorage.setItem(AUTH_LOCAL_STORAGE_KEY, JSON.stringify(touristRes.data));
          } else {
            setTouristProfile(null);
          }
        } else {
          setTouristProfile(null);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        setLoading(false);
      }
    };
    
    initialize();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setLoading(true); // Re-enter loading state while fetching new profiles
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setIsDemoMode(false);
        localStorage.removeItem('tg_demo_mode');
        
        try {
          const touristRes = await supabase.from('tourists').select('*').eq('auth_user_id', session.user.id).maybeSingle();
            
          if (touristRes.data && !touristRes.error) {
            setTouristProfile(touristRes.data);
            localStorage.setItem(AUTH_LOCAL_STORAGE_KEY, JSON.stringify(touristRes.data));
          } else {
            setTouristProfile(null);
          }
        } catch (err) {
          console.error('Auth state change error:', err);
        }
      } else {
        setTouristProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // NEW: Realtime subscription for Tourist Profile updates (e.g., KYC approval/rejection)
  useEffect(() => {
    if (!supabase || !user || !touristProfile?.id) return;

    const channelName = `tourist_profile_${touristProfile.id}`;
    
    // Safety check: ensure no stale channels of the same name are lingering
    supabase.getChannels().forEach(ch => {
      if (ch.topic === `realtime:${channelName}`) {
        supabase.removeChannel(ch);
      }
    });

    const channel = supabase.channel(channelName);
    
    channel.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'tourists', filter: `id=eq.${touristProfile.id}` },
      (payload) => {
        console.log('[KYC REALTIME] Tourist profile updated remotely:', payload.new?.kyc_status);
        
        // Atomically update React state without relying solely on a delayed fetch
        if (payload.new) {
          setTouristProfile(prev => {
            const next = { ...prev, ...payload.new };
            // Also persist to local storage to keep it synced
            localStorage.setItem(AUTH_LOCAL_STORAGE_KEY, JSON.stringify(next));
            return next;
          });
        }
      }
    );
    
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, touristProfile?.id]);

  // NEW: Heartbeat for online status (last_seen)
  useEffect(() => {
    if (!user || !touristProfile?.id || isDemoMode) return;
    
    let isMounted = true;
    let heartbeatInterval;
    
    // Import dynamically to avoid circular dependencies
    const startHeartbeat = async () => {
      try {
        const { updateLastSeen } = await import('../services/touristService');
        // Initial ping
        if (isMounted) updateLastSeen();
        
        // Setup interval for every 60 seconds
        heartbeatInterval = setInterval(() => {
          if (isMounted && typeof navigator !== 'undefined' && navigator.onLine) {
            updateLastSeen();
          }
        }, 60000);
      } catch (err) {
        console.error('Error starting heartbeat:', err);
      }
    };
    
    startHeartbeat();
    
    return () => {
      isMounted = false;
      if (heartbeatInterval) clearInterval(heartbeatInterval);
    };
  }, [user, touristProfile?.id, isDemoMode]);

  const enableDemoMode = () => {
    setIsDemoMode(true);
    localStorage.setItem('tg_demo_mode', 'true');
    const demoLocal = localStorage.getItem(DEMO_LOCAL_STORAGE_KEY);
    setTouristProfile(demoLocal ? JSON.parse(demoLocal) : DEMO_TOURIST);
  };

  const logout = async () => {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setIsDemoMode(false);
    setTouristProfile(null);
    localStorage.removeItem('tg_demo_mode');
    // We do NOT clear demo states here, so demo remains intact.
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      isDemoMode, 
      enableDemoMode, 
      logout, 
      touristProfile,
      setTouristProfile,
      refreshTouristProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
