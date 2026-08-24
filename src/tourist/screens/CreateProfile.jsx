import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEMO_TOURIST } from '../../utils/constants';
import { createTouristProfile, getTouristProfile } from '../../services/touristService';
import { addEmergencyContact } from '../../services/emergencyContactService';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../utils/AuthContext';
import './CreateProfile.css';

const STEPS = [
  { number: 1, title: 'Account Setup', desc: 'Create your secure account.' },
  { number: 2, title: 'Personal Profile', desc: 'Identify yourself.' },
  { number: 3, title: 'Travel Info', desc: 'Share your trip details.' },
  { number: 4, title: 'Emergency', desc: 'Add emergency contacts.' },
];

const COUNTRIES = ['India', 'United States', 'United Kingdom', 'Australia', 'Canada', 'Germany', 'Japan', 'France', 'Other'];
const LANGUAGES = ['English', 'Hindi', 'Bengali', 'Tamil', 'Telugu', 'Marathi', 'Gujarati', 'Kannada', 'Other'];

export default function CreateProfile() {
  const navigate = useNavigate();
  const { user, refreshTouristProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phone: '',
    nationality: '',
    language: '',
    dateOfBirth: '',
    gender: '',
    accessibilityNotes: '',
    profilePhotoUrl: null, // base64 string
    currentLocationText: '',
    currentLatitude: null,
    currentLongitude: null,
    plannedDestination: '',
    tripStartDate: '',
    tripEndDate: '',
    travelPurpose: '',
    homeCity: '',
    homeCountry: '',
    bloodGroup: '',
    medicalNotes: '',
    emergencyContacts: [{ name: '', phone: '', relationship: '' }]
  });

  useEffect(() => {
    let active = true;
    if (user && active) {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      setTimeout(() => setStep(prev => prev === 0 ? 1 : prev), 0);
    }
    
    getTouristProfile().then(({ data }) => {
      if (active && data && data.id !== DEMO_TOURIST.id) {
        setForm((prev) => ({
          ...prev,
          fullName: data.name || '',
          phone: data.phone || '',
          nationality: data.nationality || '',
          language: data.preferred_language || '',
          dateOfBirth: data.date_of_birth || '',
          gender: data.gender || '',
          accessibilityNotes: data.accessibility_notes || '',
          profilePhotoUrl: data.profile_photo_url || null,
          currentLocationText: data.current_location_text || '',
          currentLatitude: data.current_latitude || null,
          currentLongitude: data.current_longitude || null,
          plannedDestination: data.planned_destination || '',
          tripStartDate: data.trip_start_date || '',
          tripEndDate: data.trip_end_date || '',
          travelPurpose: data.travel_purpose || '',
          homeCity: data.home_city || '',
          homeCountry: data.home_country || '',
          bloodGroup: data.blood_group || '',
          medicalNotes: data.medical_notes || ''
        }));
      }
    });
    return () => { active = false; };
  }, [user]);

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const updateContact = (index, field, value) => {
    const newContacts = [...form.emergencyContacts];
    newContacts[index][field] = value;
    update('emergencyContacts', newContacts);
  };

  const addContactRow = () => {
    update('emergencyContacts', [...form.emergencyContacts, { name: '', phone: '', relationship: '' }]);
  };

  const removeContactRow = (index) => {
    const newContacts = [...form.emergencyContacts];
    newContacts.splice(index, 1);
    update('emergencyContacts', newContacts);
  };

  const canProceed = () => {
    if (step === 0) return form.email && form.password.length >= 6 && form.password === form.confirmPassword;
    if (step === 1) return form.fullName && form.phone && form.nationality;
    if (step === 2) return form.currentLocationText && form.plannedDestination;
    if (step === 3) return form.emergencyContacts.length > 0 && form.emergencyContacts[0].name && form.emergencyContacts[0].phone;
    return true;
  };

  const handleNext = async () => {
    setErrorMsg('');

    if (step === 0) {
      setLoading(true);
      try {
        const { data, error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
        });

        if (error) {
          setErrorMsg(error.message);
          return;
        }
        
        if (data.session) {
          setStep(1);
        } else if (data.user) {
          setErrorMsg('Account created! Please check your email to verify your account. Once verified, you can log in to complete your profile.');
        } else {
          setErrorMsg('An unexpected error occurred during account creation.');
        }
      } catch (err) {
        setErrorMsg(err.message || 'An unexpected network error occurred.');
      } finally {
        setLoading(false);
      }
    } else if (step < 3) {
      setStep(step + 1);
    } else {
      setLoading(true);
      try {
        // Create the tourist profile row in Supabase / localStorage
        const { error: profileError } = await createTouristProfile(form);
        if (profileError) {
          throw new Error(profileError);
        }
        
        // Loop over the contacts array and explicitly add them via service.
        // This ensures they map to the correct tourist.id generated in the previous step.
        const validContacts = form.emergencyContacts.filter(c => c.name && c.phone);
        await Promise.all(validContacts.map(c => addEmergencyContact(c)));
        
        // Refresh AuthContext profile state before navigating
        if (user) {
          await refreshTouristProfile(user.id);
        }
        navigate('/tourist/dashboard'); 
      } catch (err) {
        setErrorMsg(err.message || 'Failed to create profile.');
      } finally {
        setLoading(false);
      }
    }
  };


  const handleBack = () => {
    if (step > 0 && !(step === 1 && user)) {
      setStep(step - 1);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="profile-screen">
      <div className="profile-header">
        <h1 className="profile-brand">Tourist Guardian</h1>
        <p className="profile-subtitle">Safety Profile Setup</p>
      </div>

      <div className="profile-stepper">
        {STEPS.map((s, i) => (
          <span key={s.number} style={{ display: 'contents' }}>
            <div className={`stepper-step${i === step ? ' active' : ''}${i < step ? ' completed' : ''}`}>
              {i < step ? (
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check</span>
              ) : (
                s.number
              )}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`stepper-line${i < step ? ' completed' : ''}`} />
            )}
          </span>
        ))}
      </div>

      <div className="animate-fade-in" key={step}>
        <h2 className="profile-section-title">{STEPS[step].title}</h2>
        <p className="profile-section-desc">{STEPS[step].desc}</p>
        
        {errorMsg && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
            {errorMsg}
          </div>
        )}

        {step === 0 && (
          <>
            <div className="profile-form-group">
              <label className="input-label">Email Address</label>
              <input type="email" className="input-field" placeholder="you@example.com" value={form.email} onChange={(e) => update('email', e.target.value)} />
            </div>
            <div className="profile-form-group">
              <label className="input-label">Password</label>
              <input type="password" className="input-field" placeholder="Minimum 6 characters" value={form.password} onChange={(e) => update('password', e.target.value)} />
            </div>
            <div className="profile-form-group">
              <label className="input-label">Confirm Password</label>
              <input type="password" className="input-field" placeholder="Retype password" value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)} />
            </div>
          </>
        )}
        
        {step === 1 && <StepPersonal form={form} update={update} />}
        {step === 2 && <StepTravel form={form} update={update} />}
        {step === 3 && <StepEmergency form={form} updateContact={updateContact} addContactRow={addContactRow} removeContactRow={removeContactRow} update={update} />}
      </div>

      <div className="profile-actions">
        <button className="btn btn-secondary" onClick={handleBack} disabled={loading}>
          {step === 0 || (step === 1 && user) ? 'Cancel' : 'Back'}
        </button>
        <button className="btn btn-primary" onClick={handleNext} disabled={!canProceed() || loading} style={{ opacity: canProceed() && !loading ? 1 : 0.5 }}>
          {step === 3 ? 'Complete Setup' : loading ? 'Processing...' : 'Continue'}
        </button>
      </div>
    </div>
  );
}

function StepPersonal({ form, update }) {
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        update('profilePhotoUrl', reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-md)' }}>
        <div style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'var(--surface-container-high)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', border: '1px solid var(--outline)' }}>
          {form.profilePhotoUrl ? (
            <img src={form.profilePhotoUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span className="material-symbols-outlined" style={{ fontSize: 32, color: 'var(--outline)' }}>person</span>
          )}
          <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
        </div>
      </div>
      <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--on-surface-variant)', marginTop: -12, marginBottom: 16 }}>Tap to upload photo</p>
      
      <div className="profile-form-group">
        <label className="input-label">Full Legal Name *</label>
        <input className="input-field" type="text" placeholder="e.g. Jane Doe" value={form.fullName} onChange={(e) => update('fullName', e.target.value)} />
      </div>
      <div className="profile-form-group">
        <label className="input-label">Phone Number *</label>
        <input className="input-field" type="tel" placeholder="+91 9876543210" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
      </div>
      <div className="profile-form-group">
        <label className="input-label">Date of Birth (Optional)</label>
        <input className="input-field" type="date" value={form.dateOfBirth} onChange={(e) => update('dateOfBirth', e.target.value)} />
      </div>
      <div className="profile-form-group">
        <label className="input-label">Nationality *</label>
        <select className="select-field" value={form.nationality} onChange={(e) => update('nationality', e.target.value)}>
          <option value="">Select Country</option>
          {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="profile-form-group">
        <label className="input-label">Preferred Language</label>
        <select className="select-field" value={form.language} onChange={(e) => update('language', e.target.value)}>
          <option value="">Select Language</option>
          {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>
      <div className="profile-form-group">
        <label className="input-label">Accessibility / Mobility Notes (Optional)</label>
        <input className="input-field" type="text" placeholder="e.g. Wheelchair user, Deaf" value={form.accessibilityNotes} onChange={(e) => update('accessibilityNotes', e.target.value)} />
      </div>
    </>
  );
}

function StepTravel({ form, update }) {
  const requestLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          update('currentLatitude', pos.coords.latitude);
          update('currentLongitude', pos.coords.longitude);
          update('currentLocationText', `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)} (GPS)`);
        },
        (err) => {
          console.error("Location error", err);
          alert("Could not get location. Please type it manually.");
        }
      );
    }
  };

  return (
    <>
      <div className="profile-form-group">
        <label className="input-label">Current Location / Hotel *</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input className="input-field" style={{ flex: 1 }} type="text" placeholder="e.g. Shillong City Center" value={form.currentLocationText} onChange={(e) => update('currentLocationText', e.target.value)} />
          <button className="btn btn-secondary" onClick={requestLocation} title="Use GPS" style={{ padding: '0 12px' }}>
            <span className="material-symbols-outlined">my_location</span>
          </button>
        </div>
      </div>
      <div className="profile-form-group">
        <label className="input-label">Planned Destination(s) *</label>
        <input className="input-field" type="text" placeholder="e.g. Cherrapunji, Dawki" value={form.plannedDestination} onChange={(e) => update('plannedDestination', e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <div className="profile-form-group" style={{ flex: 1 }}>
          <label className="input-label">Trip Start Date (Optional)</label>
          <input className="input-field" type="date" value={form.tripStartDate} onChange={(e) => update('tripStartDate', e.target.value)} />
        </div>
        <div className="profile-form-group" style={{ flex: 1 }}>
          <label className="input-label">Trip End Date (Optional)</label>
          <input className="input-field" type="date" value={form.tripEndDate} onChange={(e) => update('tripEndDate', e.target.value)} />
        </div>
      </div>
      <div className="profile-form-group">
        <label className="input-label">Travel Purpose</label>
        <select className="select-field" value={form.travelPurpose} onChange={(e) => update('travelPurpose', e.target.value)}>
          <option value="">Select Purpose</option>
          <option value="Tourism">Tourism</option>
          <option value="Trekking / Adventure">Trekking / Adventure</option>
          <option value="Business">Business</option>
          <option value="Education">Education</option>
          <option value="Visiting family">Visiting family</option>
          <option value="Other">Other</option>
        </select>
      </div>
    </>
  );
}

function StepEmergency({ form, updateContact, addContactRow, removeContactRow, update }) {
  return (
    <>
      <div className="emergency-note">
        <span className="material-symbols-outlined" style={{ color: 'var(--caution)', fontSize: 18, flexShrink: 0 }}>info</span>
        <span className="emergency-note-text">
          These contacts will be notified automatically if you trigger an SOS.
        </span>
      </div>

      {form.emergencyContacts.map((c, i) => (
        <div key={i} style={{ padding: '16px', background: 'var(--surface-container-low)', borderRadius: '8px', marginBottom: '16px', position: 'relative' }}>
          {form.emergencyContacts.length > 1 && (
            <button 
              onClick={() => removeContactRow(i)} 
              style={{ position: 'absolute', top: 8, right: 8, color: 'var(--error)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>delete</span>
            </button>
          )}
          <div className="profile-form-group" style={{ marginBottom: 12 }}>
            <label className="input-label">Contact Name *</label>
            <input className="input-field" type="text" placeholder="e.g. John Doe" value={c.name} onChange={(e) => updateContact(i, 'name', e.target.value)} />
          </div>
          <div className="profile-form-group" style={{ marginBottom: 12 }}>
            <label className="input-label">Phone Number *</label>
            <input className="input-field" type="tel" placeholder="+91 9999999999" value={c.phone} onChange={(e) => updateContact(i, 'phone', e.target.value)} />
          </div>
          <div className="profile-form-group" style={{ marginBottom: 0 }}>
            <label className="input-label">Relationship (Optional)</label>
            <input className="input-field" type="text" placeholder="e.g. Brother" value={c.relationship} onChange={(e) => updateContact(i, 'relationship', e.target.value)} />
          </div>
        </div>
      ))}

      <button className="btn btn-secondary btn-full" onClick={addContactRow} style={{ marginBottom: '24px' }}>
        <span className="material-symbols-outlined">add</span> Add Another Contact
      </button>

      <div className="profile-form-group">
        <label className="input-label">Medical Notes / Allergies (Optional)</label>
        <textarea className="input-field" placeholder="e.g. Penicillin allergy" value={form.medicalNotes} onChange={(e) => update('medicalNotes', e.target.value)} style={{ minHeight: 80 }} />
      </div>
      <div className="profile-form-group">
        <label className="input-label">Blood Group (Optional)</label>
        <input className="input-field" type="text" placeholder="e.g. O+" value={form.bloodGroup} onChange={(e) => update('bloodGroup', e.target.value)} />
      </div>
    </>
  );
}
