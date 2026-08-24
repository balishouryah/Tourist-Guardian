import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const NotificationContext = createContext({});

export function NotificationProvider({ children }) {
  const { touristProfile } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!supabase || !touristProfile?.id) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    let isMounted = true;

    const fetchNotifications = async () => {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('tourist_id', touristProfile.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        if (isMounted) {
          setNotifications(data || []);
          setUnreadCount((data || []).filter(n => !n.is_read).length);
        }
      } catch (err) {
        console.error('Error fetching notifications:', err);
      }
    };

    fetchNotifications();

    // STRICT LIFECYCLE FOR SUPABASE CHANNELS
    // 1. Create channel instance
    // 2. Add .on() listener BEFORE subscribe
    // 3. Call .subscribe()
    const channelName = `notifications_${touristProfile.id}`;
    
    // Safety check: ensure no stale channels of the same name are lingering
    supabase.getChannels().forEach(ch => {
      if (ch.topic === `realtime:${channelName}`) {
        supabase.removeChannel(ch);
      }
    });

    const channel = supabase.channel(channelName);
    
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `tourist_id=eq.${touristProfile.id}` },
      (payload) => {
        // Optimize: Append to existing state or just refetch
        fetchNotifications();
      }
    );
    
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('Successfully subscribed to notifications');
      }
    });

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [touristProfile?.id]);

  const markAsRead = async (notificationId) => {
    if (!supabase) return;
    
    // Optimistic update
    setNotifications(prev => prev.map(n => 
      n.id === notificationId ? { ...n, is_read: true } : n
    ));
    setUnreadCount(prev => Math.max(0, prev - 1));

    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    if (!supabase || !touristProfile?.id) return;
    
    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);

    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('tourist_id', touristProfile.id)
        .eq('is_read', false);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
