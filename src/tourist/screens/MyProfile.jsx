import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createTouristProfile } from '../../services/touristService';
import { useAuth } from '../../utils/AuthContext';

export default function MyProfile() {
  const navigate = useNavigate();
  const { touristProfile: profile, refreshTouristProfile, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => {
    loadProfile(profile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  async function loadProfile(data) {
    if (!data) {
      // If we are authenticated but have no profile after loading, go to onboarding
      if (user) navigate('/tourist/onboarding');
      return;
    }

    if (data) {
      setProfile(data);
      setForm({
        fullName: data.name || '',
        phone: data.phone || '',
        nationality: data.nationality || '',
        language: data.preferred_language || '',
        dateOfBirth: data.date_of_birth || '',
        gender: data.gender || '',
        accessibilityNotes: data.accessibility_notes || '',
        profilePhotoUrl: data.profile_photo_url || null,
        currentLocationText: data.current_location_text || '',
        plannedDestination: data.planned_destination || '',
        tripStartDate: data.trip_start_date || '',
        tripEndDate: data.trip_end_date || '',
        travelPurpose: data.travel_purpose || '',
        homeCity: data.home_city || '',
        homeCountry: data.home_country || '',
        bloodGroup: data.blood_group || '',
        medicalNotes: data.medical_notes || ''
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setLoading(true);
    await createTouristProfile(form); // createTouristProfile also acts as upsert logic
    if (user) await refreshTouristProfile(user.id);
    setEditing(false);
    setLoading(false);
  };

  const update = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  if (loading && !profile) {
    return <div style={{ padding: 'var(--space-lg)', textAlign: 'center' }}>Loading profile...</div>;
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-md)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-lg)' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>My Safety Profile</h1>
        {!editing ? (
          <button className="btn btn-secondary" onClick={() => setEditing(true)} style={{ padding: '8px 16px' }}>Edit</button>
        ) : (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn" onClick={() => setEditing(false)} style={{ padding: '8px 16px', border: '1px solid var(--outline)' }}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} style={{ padding: '8px 16px' }} disabled={loading}>Save</button>
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
          <div style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'var(--surface-container-high)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {form.profilePhotoUrl ? (
              <img src={form.profilePhotoUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span className="material-symbols-outlined" style={{ fontSize: 32, color: 'var(--outline)' }}>person</span>
            )}
          </div>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 600 }}>{profile?.name || 'Unknown'}</h2>
            <div style={{ fontSize: 14, color: 'var(--on-surface-variant)', fontFamily: 'monospace' }}>{profile?.safety_id || profile?.id || 'Unknown ID'}</div>
          </div>
        </div>

        {editing && (
          <div style={{ marginBottom: 'var(--space-md)' }}>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Profile Photo (Base64 URL)</label>
            <input className="input-field" type="text" value={form.profilePhotoUrl || ''} onChange={e => update('profilePhotoUrl', e.target.value)} placeholder="data:image/jpeg;base64,..." style={{ fontSize: 12 }} />
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 'var(--space-sm)' }}>Personal Information</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
          <InfoField label="Full Name" value={form.fullName} editing={editing} onChange={v => update('fullName', v)} />
          <InfoField label="Phone" value={form.phone} editing={editing} onChange={v => update('phone', v)} />
          <InfoField label="Nationality" value={form.nationality} editing={editing} onChange={v => update('nationality', v)} />
          <InfoField label="Language" value={form.language} editing={editing} onChange={v => update('language', v)} />
          <InfoField label="Date of Birth" value={form.dateOfBirth} editing={editing} onChange={v => update('dateOfBirth', v)} type="date" />
          <InfoField label="Gender" value={form.gender} editing={editing} onChange={v => update('gender', v)} />
        </div>
      </div>

      <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 'var(--space-sm)' }}>Travel Information</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          <InfoField label="Current Location" value={form.currentLocationText} editing={editing} onChange={v => update('currentLocationText', v)} />
          <InfoField label="Planned Destination" value={form.plannedDestination} editing={editing} onChange={v => update('plannedDestination', v)} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
            <InfoField label="Start Date" value={form.tripStartDate} editing={editing} onChange={v => update('tripStartDate', v)} type="date" />
            <InfoField label="End Date" value={form.tripEndDate} editing={editing} onChange={v => update('tripEndDate', v)} type="date" />
          </div>
          <InfoField label="Travel Purpose" value={form.travelPurpose} editing={editing} onChange={v => update('travelPurpose', v)} />
        </div>
      </div>

      <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 'var(--space-sm)' }}>Health & Accessibility</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          <InfoField label="Blood Group" value={form.bloodGroup} editing={editing} onChange={v => update('bloodGroup', v)} />
          <InfoField label="Medical Notes" value={form.medicalNotes} editing={editing} onChange={v => update('medicalNotes', v)} />
          <InfoField label="Accessibility Notes" value={form.accessibilityNotes} editing={editing} onChange={v => update('accessibilityNotes', v)} />
        </div>
      </div>
      
      {!editing && (
        <button className="btn btn-secondary btn-full" onClick={() => navigate('/tourist/settings/emergency')}>
          Manage Emergency Contacts
        </button>
      )}
    </div>
  );
}

function InfoField({ label, value, editing, onChange, type = 'text' }) {
  if (editing) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label style={{ fontSize: 12, color: 'var(--on-surface-variant)' }}>{label}</label>
        <input 
          type={type}
          className="input-field" 
          value={value || ''} 
          onChange={e => onChange(e.target.value)}
          style={{ padding: '6px 8px', fontSize: 14 }}
        />
      </div>
    );
  }
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={{ fontSize: 12, color: 'var(--on-surface-variant)' }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 500 }}>{value || '-'}</span>
    </div>
  );
}
