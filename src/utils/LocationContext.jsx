import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { DEMO_MAP_DATA } from './mockMapData';

const LocationContext = createContext();

export function LocationProvider({ children }) {
  const { isDemoMode } = useAuth();
  
  // State for real device GPS
  const [realLoc, setRealLoc] = useState({
    latitude: null,
    longitude: null,
    accuracy: null,
    timestamp: null,
    heading: null,
    speed: null,
    altitude: null,
  });
  const [gpsStatus, setGpsStatus] = useState('STOPPED'); // STOPPED, PERMISSION_REQUIRED, ACTIVE, DENIED, UNAVAILABLE
  const [tracking, setTracking] = useState(false);
  const watchIdRef = useRef(null);

  // Expose current location transparently depending on demo mode
  const currentLoc = isDemoMode
    ? {
        latitude: DEMO_MAP_DATA.touristCurrent[0],
        longitude: DEMO_MAP_DATA.touristCurrent[1],
        accuracy: 5,
        isDemo: true
      }
    : realLoc;

  const requestPermissionAndStart = () => {
    if (!('geolocation' in navigator)) {
      setGpsStatus('UNAVAILABLE');
      return;
    }
    setGpsStatus('PERMISSION_REQUIRED');
    
    // Attempt one quick fetch to trigger the browser prompt
    navigator.geolocation.getCurrentPosition(
      () => {
        setGpsStatus('ACTIVE');
        setTracking(true);
      },
      (err) => {
        console.warn('GPS Permission denied or unavailable:', err);
        setGpsStatus('DENIED');
        setTracking(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const stopTracking = () => {
    setTracking(false);
    setGpsStatus('STOPPED');
  };

  useEffect(() => {
    if (isDemoMode) {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (tracking && 'geolocation' in navigator) {
      // Create a ref or just use a local variable in the closure for throttling
      let lastDbUpdate = 0;
      
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          setRealLoc({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp,
            heading: pos.coords.heading,
            speed: pos.coords.speed,
            altitude: pos.coords.altitude,
            isDemo: false
          });
          setGpsStatus('ACTIVE');
          
          // Cache the latest location to window for quick emergency fallback
          window.tgLastLat = pos.coords.latitude;
          window.tgLastLng = pos.coords.longitude;

          // Throttle Supabase updates to once every 15 seconds
          const now = Date.now();
          if (now - lastDbUpdate > 15000) {
            lastDbUpdate = now;
            // Dynamically import to avoid circular dependencies if any
            import('../services/touristService').then(({ updateLiveLocation }) => {
              updateLiveLocation(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
            });
          }
        },
        (err) => {
          console.warn("Geolocation watch failed:", err);
          if (err.code === 1) setGpsStatus('DENIED');
          else setGpsStatus('UNAVAILABLE');
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
      );
    } else {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    }

    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [tracking, isDemoMode]);

  return (
    <LocationContext.Provider
      value={{
        currentLoc,
        realLoc,
        gpsStatus,
        tracking,
        isDemoMode,
        requestPermissionAndStart,
        stopTracking
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLiveLocation() {
  return useContext(LocationContext);
}
