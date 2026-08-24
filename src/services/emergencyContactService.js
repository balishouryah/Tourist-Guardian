import { supabase } from '../lib/supabase';
import { getTouristProfile } from './touristService';
import { saveOfflineData, getOfflineData } from './offlineService';

const LOCAL_STORAGE_KEY = 'tourist_emergency_contacts';

const DEFAULT_CONTACTS = [
  { id: 'c1', name: 'Emergency Contact', relationship: 'Default', phone: '+91 90000 00000' }
];

/**
 * Normalizes phone numbers slightly, ensuring it's valid.
 * Supports international formats by trimming and leaving '+' alone.
 */
function normalizeContact(contact) {
  return {
    ...contact,
    name: contact.name?.trim(),
    relationship: contact.relationship?.trim() || '',
    phone: contact.phone?.trim(),
  };
}

/**
 * Validates the contact fields before insertion.
 */
function validateContact(contact) {
  if (!contact.name) throw new Error('Contact name is required.');
  if (!contact.phone) throw new Error('Contact phone is required.');
  return true;
}

/**
 * Fetches emergency contacts for the current tourist.
 * Falls back to localStorage and default contacts if backend is unavailable.
 */
export async function getEmergencyContacts() {
  try {
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
        
        if (isOnline) {
          // Authenticated fetch: Rely on RLS which only allows reading own contacts
          const { data, error } = await supabase
            .from('emergency_contacts')
            .select('*')
            .order('created_at', { ascending: true });
            
          if (data && !error) {
            await saveOfflineData(user.id, 'contacts', data);
            return { data, error: null };
          }
          
          return { data: [], error: error ? error.message : 'Failed to fetch contacts' };
        } else {
          // Offline fetch
          const cachedData = await getOfflineData(user.id, 'contacts');
          if (cachedData) {
            return { data: cachedData, error: null, isCached: true };
          }
          return { data: [], error: null }; // No cached contacts available
        }
      }
    }

    // Demo Fallback
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      return { data: JSON.parse(stored), error: null };
    }

    return { data: DEFAULT_CONTACTS, error: null };
  } catch (error) {
    console.error('[EmergencyContactService] Error fetching contacts:', error);
    return { data: [], error: error.message || 'Unknown error' };
  }
}

/**
 * Adds an emergency contact.
 */
export async function addEmergencyContact(contact) {
  try {
    const normalized = normalizeContact(contact);
    validateContact(normalized);

    const { data: profile, error: profileError } = await getTouristProfile();

    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        if (profileError === 'NO_PROFILE' || !profile) {
          throw new Error('You must set up your safety profile first.');
        }

        // Authenticated insert
        const dbContact = {
          tourist_id: profile.id, // Must match the tourists.id UUID
          name: normalized.name,
          relationship: normalized.relationship,
          phone: normalized.phone
        };
        const { data, error } = await supabase.from('emergency_contacts').insert([dbContact]).select().single();
        if (error) {
          console.error('[EmergencyContactService] Backend write failed.', error.message);
          return { data: null, error: error.message };
        } else if (data) {
          // update cache
          const { data: existingContacts } = await getEmergencyContacts();
          await saveOfflineData(user.id, 'contacts', existingContacts);
          return { data, error: null };
        }
      }
    }

    // Demo Fallback
    const newId = Date.now().toString();
    const newContact = {
      ...normalized,
      id: newId
    };
    const { data: existingContacts } = await getEmergencyContacts();
    const updatedContacts = [...existingContacts, newContact];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedContacts));

    return { data: newContact, error: null };
  } catch (error) {
    console.error('[EmergencyContactService] Error adding contact:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Deletes an emergency contact by ID.
 */
export async function deleteEmergencyContact(contactId) {
  try {
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase.from('emergency_contacts').delete().eq('id', contactId);
        if (error) {
          console.error('[EmergencyContactService] Backend delete failed.', error.message);
          return { data: false, error: error.message };
        } else {
          return { data: true, error: null };
        }
      }
    }

    // Demo Fallback
    const { data: existingContacts } = await getEmergencyContacts();
    const updatedContacts = existingContacts.filter(c => c.id !== contactId);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedContacts));

    return { data: true, error: null };
  } catch (error) {
    console.error('[EmergencyContactService] Error deleting contact:', error);
    return { data: false, error: error.message };
  }
}
