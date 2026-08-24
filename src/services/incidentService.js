import { supabase } from '../lib/supabase';

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

    return { data, error };
  } catch (error) {
    console.error('[SOS] Incident insert failed (Exception):', error);
    alert(`[SOS] EXCEPTION: ${error.message}`);
    return { data: null, error };
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
