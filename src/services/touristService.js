import { supabase } from '../lib/supabase';
import { DEMO_TOURIST } from '../utils/constants';
import { saveOfflineData, getOfflineData } from './offlineService';

const AUTH_LOCAL_STORAGE_KEY = 'tg_auth_tourist_profile';
const DEMO_LOCAL_STORAGE_KEY = 'tg_demo_tourist_profile';

/**
 * Generates a stable Safety ID if one doesn't exist.
 * Format: TG-2026-[COUNTRY]-XXXX
 */
export function generateSafetyId(nationality = 'IND') {
  const code = nationality.substring(0, 3).toUpperCase() || 'IND';
  const random = Math.floor(1000 + Math.random() * 9000);
  return `TG-2026-${code}-${random}`;
}

/**
 * Retrieves the tourist profile.
 * STRICTLY prioritizes Supabase for authenticated users.
 * Does not fall back to Demo data if authenticated.
 */
export async function getTouristProfile() {
  try {
    let isAuthenticated = false;

    // 1. Check Authenticated Session First
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        isAuthenticated = true;
        const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
        
        if (isOnline) {
          const { data, error } = await supabase.from('tourists')
            .select('*')
            .eq('auth_user_id', user.id)
            .maybeSingle();
            
          if (data && !error) {
            // Keep a local backup of the auth profile for offline availability
            localStorage.setItem(AUTH_LOCAL_STORAGE_KEY, JSON.stringify(data));
            await saveOfflineData(user.id, 'profile', data);
            return { data, error: null };
          }
          
          // If authenticated but no profile found in DB, DO NOT FALLBACK to DEMO.
          // Return explicit NO_PROFILE error so the UI can force them to setup.
          return { data: null, error: 'NO_PROFILE' };
        } else {
          // OFFLINE for authenticated user
          const cachedData = await getOfflineData(user.id, 'profile');
          if (cachedData) {
            return { data: cachedData, error: null, isCached: true };
          }
          // Fallback to local storage if IndexedDB is empty
          const fallback = localStorage.getItem(AUTH_LOCAL_STORAGE_KEY);
          if (fallback) return { data: JSON.parse(fallback), error: null };
          
          return { data: null, error: 'NO_PROFILE' };
        }
      }
    }

    // 2. Demo Mode / Guest Fallback (ONLY if not authenticated)
    if (!isAuthenticated) {
      const demoLocal = localStorage.getItem(DEMO_LOCAL_STORAGE_KEY);
      if (demoLocal) {
        return { data: JSON.parse(demoLocal), error: null };
      }
      return { data: DEMO_TOURIST, error: null };
    }
  } catch (error) {
    console.error('Error fetching tourist profile:', error);
    return { data: null, error };
  }
}

/**
 * Creates a tourist profile.
 * Correctly splits storage between Auth cache and Demo cache.
 */
export async function createTouristProfile(profileData) {
  const safetyId = generateSafetyId(profileData.nationality);
  
  const newProfile = {
    safety_id: safetyId,
    name: profileData.fullName,
    phone: profileData.phone,
    nationality: profileData.nationality || 'India',
    preferred_language: profileData.language || 'English',
    profile_photo_url: profileData.profilePhotoUrl || null,
    date_of_birth: profileData.dateOfBirth || null,
    gender: profileData.gender || null,
    accessibility_notes: profileData.accessibilityNotes || null,
    current_location_text: profileData.currentLocationText || null,
    current_latitude: profileData.currentLatitude || null,
    current_longitude: profileData.currentLongitude || null,
    planned_destination: profileData.plannedDestination || null,
    trip_start_date: profileData.tripStartDate || null,
    trip_end_date: profileData.tripEndDate || null,
    travel_purpose: profileData.travelPurpose || null,
    home_city: profileData.homeCity || null,
    home_country: profileData.homeCountry || null,
    blood_group: profileData.bloodGroup || null,
    medical_notes: profileData.medicalNotes || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (supabase) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        newProfile.auth_user_id = user.id;

        const { data: existing, error: existingError } = await supabase.from('tourists')
          .select('id')
          .eq('auth_user_id', user.id)
          .maybeSingle();
          
        if (existingError) {
          console.error('[Tourist Service] Error checking existing profile.', existingError.message);
          return { data: null, error: existingError.message };
        }
          
        if (existing) {
          console.warn('[Tourist Service] Profile already exists for this user.');
          const { data: fullExisting, error: fullError } = await supabase.from('tourists').select('*').eq('id', existing.id).single();
          if (fullError) {
            return { data: null, error: fullError.message };
          }
          if (fullExisting) {
            localStorage.setItem(AUTH_LOCAL_STORAGE_KEY, JSON.stringify(fullExisting));
            await saveOfflineData(user.id, 'profile', fullExisting);
            return { data: fullExisting, error: null };
          }
        } else {
          // Insert into backend
          const { data, error } = await supabase.from('tourists').insert([newProfile]).select().single();
          if (error) {
            console.error('[Tourist Service] Backend write failed.', error.message);
            return { data: null, error: error.message };
          } else {
            console.log('[Tourist Service] Backend profile created successfully.');
            localStorage.setItem(AUTH_LOCAL_STORAGE_KEY, JSON.stringify(data));
            await saveOfflineData(user.id, 'profile', data);
            return { data, error: null };
          }
        }
      }
    } catch (err) {
      console.warn('[Tourist Service] Network error reaching Supabase.', err);
      return { data: null, error: err.message || 'Network error reaching Supabase' };
    }
  }

  // Fallback: If not authenticated, we are in demo mode. Save to Demo LocalStorage.
  const localProfile = {
    ...newProfile,
    id: safetyId, 
  };

  localStorage.setItem(DEMO_LOCAL_STORAGE_KEY, JSON.stringify(localProfile));
  
  return { data: localProfile, error: null };
}

export async function updateTouristProfile(updates) {
  try {
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Authenticated user: update in Supabase
        const { data, error } = await supabase.from('tourists')
          .update(updates)
          .eq('auth_user_id', user.id)
          .select()
          .maybeSingle();

          if (error) {
          console.error('[Tourist Service] Failed to update backend profile:', error);
          // Graceful fallback for missing KYC columns during dev before migration is applied
          if (error.message && error.message.includes('column') && error.message.includes('does not exist')) {
            console.warn('[Tourist Service] Missing columns in DB. Falling back to local auth cache.');
            const local = localStorage.getItem(AUTH_LOCAL_STORAGE_KEY);
            if (local) {
              const profile = JSON.parse(local);
              const updatedProfile = { ...profile, ...updates };
              localStorage.setItem(AUTH_LOCAL_STORAGE_KEY, JSON.stringify(updatedProfile));
              return { data: updatedProfile, error: null };
            }
          }
          return { data: null, error: error.message };
        } else if (data) {
          // Update local auth cache
          const local = localStorage.getItem(AUTH_LOCAL_STORAGE_KEY);
          if (local) {
            const profile = JSON.parse(local);
            localStorage.setItem(AUTH_LOCAL_STORAGE_KEY, JSON.stringify({ ...profile, ...updates }));
          } else {
            localStorage.setItem(AUTH_LOCAL_STORAGE_KEY, JSON.stringify(data));
          }
          await saveOfflineData(user.id, 'profile', data);
          return { data, error: null };
        }
      }
    }

    // Fallback: update demo local storage only
    const local = localStorage.getItem(DEMO_LOCAL_STORAGE_KEY);
    if (local) {
      const profile = JSON.parse(local);
      const updatedProfile = { ...profile, ...updates };
      localStorage.setItem(DEMO_LOCAL_STORAGE_KEY, JSON.stringify(updatedProfile));
      return { data: updatedProfile, error: null };
    }
    
    return { data: null, error: 'No local profile found' };
  } catch (error) {
    console.error('Error updating tourist profile:', error);
    return { data: null, error };
  }
}

export async function updateLiveLocation(latitude, longitude, _accuracy) {
  try {
    if (!supabase) return { error: { message: 'Supabase not configured' } };
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    const { data, error } = await supabase.from('tourists')
      .update({
        current_latitude: latitude,
        current_longitude: longitude,
        last_location_update: new Date().toISOString()
      })
      .eq('auth_user_id', user.id)
      .select()
      .maybeSingle();

    if (error) {
      console.warn('[Tourist Service] Failed to update live location:', error.message);
      return { data: null, error: error.message };
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('[Tourist Service] Exception updating live location:', error);
    return { data: null, error };
  }
}

export async function updateLiveSafetyState(score, severity, signals = []) {
  try {
    if (!supabase) return { error: { message: 'Supabase not configured' } };
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    const { data, error } = await supabase.from('tourists')
      .update({
        current_safety_score: score,
        current_safety_severity: severity,
        current_safety_signals: signals
      })
      .eq('auth_user_id', user.id)
      .select()
      .maybeSingle();

    if (error) {
      console.warn('[Tourist Service] Failed to update safety state:', error.message);
      return { data: null, error: error.message };
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('[Tourist Service] Exception updating safety state:', error);
    return { data: null, error };
  }
}
