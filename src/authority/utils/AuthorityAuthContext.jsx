import React, { createContext, useContext, useEffect, useState } from 'react';
import { authoritySupabase } from '../../lib/supabase';

const AuthorityAuthContext = createContext({});

export function AuthorityAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [authorityProfile, setAuthorityProfile] = useState(null);
  const [isAuthority, setIsAuthority] = useState(false);
  
  useEffect(() => {
    if (!authoritySupabase) {
      setTimeout(() => setLoading(false), 0);
      return;
    }

    const initialize = async () => {
      try {
        const { data: { session } } = await authoritySupabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          const { data, error } = await authoritySupabase
            .from('authority_profiles')
            .select('*')
            .eq('auth_user_id', session.user.id)
            .maybeSingle();
            
          if (data && !error) {
            setAuthorityProfile(data);
            setIsAuthority(['AUTHORITY', 'ADMIN'].includes(data.role));
          } else {
            setAuthorityProfile(null);
            setIsAuthority(false);
          }
        } else {
          setAuthorityProfile(null);
          setIsAuthority(false);
        }
      } catch (err) {
        console.error('Authority Auth init error:', err);
      } finally {
        setLoading(false);
      }
    };
    
    initialize();

    const { data: { subscription } } = authoritySupabase.auth.onAuthStateChange(async (_event, session) => {
      setLoading(true);
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        try {
          const { data, error } = await authoritySupabase
            .from('authority_profiles')
            .select('*')
            .eq('auth_user_id', session.user.id)
            .maybeSingle();
            
          if (data && !error) {
            setAuthorityProfile(data);
            setIsAuthority(['AUTHORITY', 'ADMIN'].includes(data.role));
          } else {
            setAuthorityProfile(null);
            setIsAuthority(false);
          }
        } catch (err) {
          console.error('Authority Auth state error:', err);
        }
      } else {
        setAuthorityProfile(null);
        setIsAuthority(false);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    if (authoritySupabase) await authoritySupabase.auth.signOut();
    setUser(null);
    setSession(null);
    setAuthorityProfile(null);
    setIsAuthority(false);
  };

  return (
    <AuthorityAuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      logout, 
      authorityProfile, 
      isAuthority
    }}>
      {children}
    </AuthorityAuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuthorityAuth() {
  return useContext(AuthorityAuthContext);
}
