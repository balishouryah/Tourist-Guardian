import { supabase } from '../lib/supabase';
import { queueSOS } from './offlineService';

/**
 * incidentService.js
 * 
 * Handles all backend interactions for the `incidents` table.
 * Resolves the authenticated tourist profile automatically for RLS.
 */

export async function createIncident({ incidentType, severity, riskScore, signals, latitude, longitude }) {
  if (!supabase) return { error: { message: 'Supabase not configured' } };
  
  console.log('[SOS] Request started');

  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) throw new Error('Not authenticated');

    // Resolve tourist_id from auth_user_id
    const { data: profile, error: profileError } = await supabase
      .from('tourists')
      .select('id')
      .eq('auth_user_id', authData.user.id)
      .single();

    if (profileError || !profile) throw new Error('Tourist profile not found');

    const touristId = profile.id;
    
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    
    if (!isOnline) {
      console.log(`[SOS] Offline - queueing incident`);
      const queuedData = await queueSOS({
        tourist_id: touristId,
        incident_type: incidentType,
        status: 'ACTIVE',
        severity,
        risk_score: riskScore,
        latitude,
        longitude,
        detected_signals: signals,
      });
      return { data: queuedData, error: null, isQueued: true };
    }

    console.log(`[SOS] Incident insert started (Lat: ${latitude}, Lng: ${longitude})`);

    const { data, error } = await supabase
      .from('incidents')
      .insert({
        tourist_id: touristId,
        incident_type: incidentType,
        status: 'ACTIVE',
        severity,
        risk_score: riskScore,
        latitude,
        longitude,
        detected_signals: signals,
      })
      .select()
      .single();
      
    if (error) {
      console.error('[SOS] Incident insert failed:', error.message);
      alert(`[SOS] INSERT ERROR: ${error.message}`);
      return { data: null, error };
    }
    
    console.log(`[TOURIST SOS] Incident created: ${data.id}`);

    // Asynchronously send SOS emails to active family members
    // We do NOT await this so that the SOS flow is never blocked
    notifyFamilyOfSOS(profile, data, latitude, longitude).catch(err => {
      console.error('[SOS] Background family notification failed:', err);
    });

    return { data, error };
  } catch (error) {
    console.error('[SOS] Incident insert failed (Exception):', error);
    alert(`[SOS] EXCEPTION: ${error.message}`);
    return { data: null, error };
  }
}

/**
 * Background task to notify family members when SOS is triggered.
 */
async function notifyFamilyOfSOS(profile, incident, latitude, longitude) {
  try {
    // 1. Ensure tourist has family tracking enabled
    const { data: touristInfo, error: tError } = await supabase
      .from('tourists')
      .select('name, family_tracking_enabled, safety_id')
      .eq('id', profile.id)
      .single();
      
    if (tError || !touristInfo || !touristInfo.family_tracking_enabled) return;
    
    // 2. Fetch active family relationships
    const { data: familyMembers, error: fError } = await supabase
      .from('family_tracking_access')
      .select('*')
      .eq('tourist_id', profile.id)
      .eq('status', 'ACTIVE');
      
    if (fError || !familyMembers || familyMembers.length === 0) return;
    
    // 3. Send email to each family member
    const timestamp = new Date().toLocaleString();
    const locationStr = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    
    for (const member of familyMembers) {
      if (!member.family_contact || !member.family_contact.includes('@')) continue;
      
      const liveLink = `${window.location.origin}/family/track/${member.access_token}`;
      
      supabase.functions.invoke('family-email', {
        body: {
          action: 'sos',
          touristName: touristInfo.name,
          safetyId: touristInfo.safety_id || profile.id.split('-')[0].toUpperCase(),
          familyEmail: member.family_contact,
          timestamp: timestamp,
          location: locationStr,
          liveLink: liveLink
        }
      }).catch(err => console.error('Error invoking family-email Edge Function:', err));
    }
    // 4. Send notification to the Tourist
    if (familyMembers.length > 0) {
      await supabase.from('notifications').insert({
        tourist_id: profile.id,
        title: 'SOS family notification',
        message: 'Emergency notification sent to your authorized family members.',
        type: 'SYSTEM'
      });
    }
  } catch (err) {
    console.error('[SOS] Error in notifyFamilyOfSOS:', err);
  }
}

export async function updateIncidentStatus(incidentId, status) {
  if (!supabase) return { error: { message: 'Supabase not configured' } };

  try {
    const { data, error } = await supabase
      .from('incidents')
      .update({ status })
      .eq('id', incidentId)
      .select()
      .single();

    return { data, error };
  } catch (error) {
    console.error('[IncidentService] Update Status Error:', error);
    return { data: null, error };
  }
}

export async function getMyActiveIncidents() {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };

  try {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return { data: null, error: new Error('Not authenticated') };

    const { data: profile } = await supabase
      .from('tourists')
      .select('id')
      .eq('auth_user_id', authData.user.id)
      .single();

    if (!profile) return { data: null, error: new Error('Profile not found') };

    const { data, error } = await supabase
      .from('incidents')
      .select('*')
      .eq('tourist_id', profile.id)
      .in('status', ['ACTIVE', 'ACKNOWLEDGED', 'RESPONDING', 'ESCALATED'])
      .order('created_at', { ascending: false });

    return { data, error };
  } catch (error) {
    console.error('[IncidentService] Get My Incidents Error:', error);
    return { data: null, error };
  }
}

export async function updateIncidentLocation(incidentId, latitude, longitude, accuracy) {
  if (!supabase) return { error: { message: 'Supabase not configured' } };

  try {
    const { data, error } = await supabase
      .from('incidents')
      .update({ 
        latitude, 
        longitude,
        location_accuracy_m: accuracy || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', incidentId)
      .select()
      .single();

    return { data, error };
  } catch (error) {
    console.error('[IncidentService] Update Location Error:', error);
    return { data: null, error };
  }
}
