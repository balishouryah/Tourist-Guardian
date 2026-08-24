import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../utils/AuthContext';
import { updateTouristProfile } from '../../services/touristService';
import { supabase } from '../../lib/supabase';
import './KYCVerification.css';

export default function KYCVerification() {
  const navigate = useNavigate();
  const { touristProfile: profile, user, refreshTouristProfile } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  
  // Form State
  const [form, setForm] = useState({
    fullName: profile?.name || '',
    dateOfBirth: profile?.date_of_birth || '',
    nationality: profile?.nationality || '',
    documentType: 'AADHAAR',
    documentNumber: '',
    documentFile: null
  });

  // Check if profile updated externally
  useEffect(() => {
    if (profile && form.fullName === '') {
      setForm(prev => ({
        ...prev,
        fullName: profile.name || '',
        dateOfBirth: profile.date_of_birth || '',
        nationality: profile.nationality || ''
      }));
    }
  }, [profile]);

  // Verify status from profile
  let kycStatus = profile?.kyc_status || 'NOT_SUBMITTED';
  
  console.log('[KYC DEBUG] tourist profile:', profile);
  console.log('[KYC DEBUG] status:', kycStatus);
  console.log('[KYC DEBUG] isPending:', kycStatus === 'PENDING');
  console.log('[KYC DEBUG] isVerified:', kycStatus === 'VERIFIED' || kycStatus === 'APPROVED');
  
  // Robust fallback: if marked PENDING but no document was actually submitted, force NOT_SUBMITTED
  if (kycStatus === 'PENDING' && !profile?.kyc_document_path && !profile?.kyc_submitted_at) {
    kycStatus = 'NOT_SUBMITTED';
  }

  const isPending = kycStatus === 'PENDING';
  const isVerified = kycStatus === 'VERIFIED' || kycStatus === 'APPROVED';
  const isRejected = kycStatus === 'REJECTED';
  
  const blockchainStatus = profile?.blockchain_status || 'PENDING';
  
  const formatDate = (isoString) => {
    if (!isoString) return '-';
    const d = new Date(isoString);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handleUpdate = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      setError('Invalid file type. Please upload a PDF, JPG, or PNG.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setError(null);
    handleUpdate('documentFile', file);
  };

  const validateDOB = (dobStr) => {
    if (!dobStr) return "Date of Birth is required.";
    const dob = new Date(dobStr);
    const today = new Date();
    
    if (isNaN(dob.getTime())) return "Invalid date format.";
    if (dob > today) return "Date of Birth cannot be in the future.";
    
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--;
    }
    
    if (age < 12) return "You must be at least 12 years old.";
    if (age > 120) return "Please enter a valid Date of Birth.";
    
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // 1. Validations
    if (!form.fullName || !form.nationality || !form.documentNumber || !form.documentFile) {
      setError('Please fill in all required fields and upload your document.');
      return;
    }

    const dobError = validateDOB(form.dateOfBirth);
    if (dobError) {
      setError(dobError);
      return;
    }
    
    setLoading(true);
    
    try {
      let documentPath = null;

      // 2. Upload Document to Supabase Storage (Private Bucket)
      if (supabase && user) {
        const fileExt = form.documentFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError, data } = await supabase.storage
          .from('kyc-documents')
          .upload(fileName, form.documentFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw new Error('Failed to upload document: ' + uploadError.message);
        documentPath = data.path;
      } else {
        // Fallback for strict demo mode without db connection
        documentPath = `demo_mode/${form.documentFile.name}`;
      }
      
      // 3. Prepare Update Payload (Switch to PENDING, NOT Verified instantly)
      const updates = {
        name: form.fullName,
        date_of_birth: form.dateOfBirth,
        nationality: form.nationality,
        kyc_status: 'PENDING',
        kyc_type: form.documentType,
        kyc_document_path: documentPath,
        kyc_submitted_at: new Date().toISOString(),
        // Mask the raw document number before saving to the DB reference (if needed temporarily, though usually we don't save raw. 
        // For Authority view, we will just pass it or they view the document. Let's just store a masked reference).
        kyc_reference: `••••${form.documentNumber.slice(-4)}`
      };
      
      // 4. Update Supabase Profile
      const { error: updateError } = await updateTouristProfile(updates);
      
      if (updateError) throw new Error(updateError);
      
      // 5. Refresh Auth Context
      if (user) {
        await refreshTouristProfile(user.id);
      } else {
        window.location.reload();
      }
      
    } catch (err) {
      console.error(err);
      setError('Submission failed. ' + (err.message || 'Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return <div style={{ padding: 24, textAlign: 'center', color: '#fff' }}>Loading...</div>;

  return (
    <div className="kyc-screen animate-fade-in">
      <div className="kyc-header">
        <button className="kyc-back-btn" onClick={() => navigate(-1)}>
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="kyc-title">KYC & Digital Identity</h1>
      </div>

      <div className="kyc-content">
        
        {isPending && (
          <div className="status-card-pending">
            <span className="material-symbols-outlined status-icon">pending_actions</span>
            <h2 className="status-title">KYC VERIFICATION PENDING</h2>
            <p className="status-message">
              Your identity document has been submitted and is waiting for verification by an authorized officer.
            </p>
            <div className="status-details">
              <div className="status-detail-row">
                <span className="status-detail-label">Document</span>
                <span className="status-detail-value">{profile.kyc_type}</span>
              </div>
              <div className="status-detail-row">
                <span className="status-detail-label">Submitted</span>
                <span className="status-detail-value">{formatDate(profile.kyc_submitted_at)}</span>
              </div>
              <div className="status-detail-row">
                <span className="status-detail-label">Status</span>
                <span className="status-detail-value" style={{ color: 'var(--caution)' }}>PENDING AUTHORITY REVIEW</span>
              </div>
            </div>
          </div>
        )}

        {isRejected && (
          <div className="status-card-rejected" style={{ marginBottom: 24 }}>
            <span className="material-symbols-outlined status-icon">cancel</span>
            <h2 className="status-title">KYC VERIFICATION REJECTED</h2>
            <div className="status-details" style={{ marginBottom: 16 }}>
              <div className="status-detail-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                <span className="status-detail-label">Reason</span>
                <span className="status-detail-value" style={{ color: 'var(--error)' }}>
                  {profile.kyc_rejection_reason || 'Information mismatch or document unclear.'}
                </span>
              </div>
            </div>
            <p className="status-message" style={{ marginBottom: 0 }}>
              Please correct your details and re-submit your document below.
            </p>
          </div>
        )}

        {isVerified && (
          <div className="digital-id-card">
            <div className="digital-id-header">
              <h3>TOURIST GUARDIAN</h3>
              <p>DIGITAL TOURIST ID</p>
            </div>
            
            <div className="digital-id-body">
              <div className="digital-id-number">{profile.safety_id || profile.id}</div>
              
              <div className="digital-id-row">
                <div className="digital-id-photo">
                  {profile.profile_photo_url ? (
                    <img src={profile.profile_photo_url} alt="Profile" />
                  ) : (
                    <span className="material-symbols-outlined">person</span>
                  )}
                </div>
                
                <div className="digital-id-info">
                  <h4 className="digital-id-name">{profile.name}</h4>
                  <p className="digital-id-nationality">{profile.nationality}</p>
                </div>
              </div>

              <div className="digital-id-status-list">
                <div className="id-badge-row">
                  <span className="material-symbols-outlined">verified</span>
                  KYC VERIFIED
                </div>
                <div className="id-badge-row">
                  <span className="material-symbols-outlined">how_to_reg</span>
                  DIGITAL ID ACTIVE
                </div>
                <div className="id-badge-row">
                  <span className="material-symbols-outlined">enhanced_encryption</span>
                  VERIFICATION RECORD CREATED
                </div>
              </div>

              <div className="digital-id-dates">
                <div>
                  <label>ISSUED</label>
                  <span>{formatDate(profile.digital_id_issued_at)}</span>
                </div>
                <div>
                  <label>VALID UNTIL</label>
                  <span>{formatDate(profile.digital_id_expires_at)}</span>
                </div>
              </div>
              
              <div className="digital-id-footer">
                <div className="verification-id">
                  Verification Reference:<br/>
                  <strong>{profile.blockchain_reference || '-'}</strong>
                </div>
              </div>
            </div>
            
            <div className="digital-id-action">
              <span className="material-symbols-outlined">qr_code_2</span>
              <span>Blockchain Verification — Prototype</span>
            </div>
          </div>
        )}

        {(!isPending && !isVerified) && (
          <div className="kyc-form-container">
            {!isRejected && (
              <div className="kyc-form-header">
                <span className="material-symbols-outlined header-icon">id_card</span>
                <h2>KYC & Digital Identity</h2>
                <p>Complete your identity verification to activate your Digital Tourist ID.</p>
              </div>
            )}
            
            {error && <div className="kyc-error">{error}</div>}

            <form onSubmit={handleSubmit} className="kyc-form">
              <div className="form-group">
                <label>Full Name</label>
                <input 
                  type="text" 
                  value={form.fullName} 
                  onChange={(e) => handleUpdate('fullName', e.target.value)} 
                  required 
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Date of Birth</label>
                  <input 
                    type="date" 
                    value={form.dateOfBirth} 
                    onChange={(e) => handleUpdate('dateOfBirth', e.target.value)} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Nationality</label>
                  <input 
                    type="text" 
                    value={form.nationality} 
                    onChange={(e) => handleUpdate('nationality', e.target.value)} 
                    required 
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Identification Type</label>
                <div className="radio-group">
                  <label className={`radio-option ${form.documentType === 'AADHAAR' ? 'selected' : ''}`}>
                    <input 
                      type="radio" 
                      name="docType" 
                      value="AADHAAR" 
                      checked={form.documentType === 'AADHAAR'}
                      onChange={() => handleUpdate('documentType', 'AADHAAR')}
                    />
                    Aadhaar
                  </label>
                  <label className={`radio-option ${form.documentType === 'PASSPORT' ? 'selected' : ''}`}>
                    <input 
                      type="radio" 
                      name="docType" 
                      value="PASSPORT" 
                      checked={form.documentType === 'PASSPORT'}
                      onChange={() => handleUpdate('documentType', 'PASSPORT')}
                    />
                    Passport
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>Document Number</label>
                <input 
                  type="text" 
                  value={form.documentNumber} 
                  onChange={(e) => handleUpdate('documentNumber', e.target.value)} 
                  placeholder={form.documentType === 'AADHAAR' ? '12-digit Aadhaar Number' : 'Passport Number'}
                  required 
                />
              </div>

              <div className="form-group" style={{ marginTop: 8 }}>
                <label>Upload Identity Document</label>
                <input 
                  type="file" 
                  accept=".pdf, .jpg, .jpeg, .png"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  required 
                />
                <span style={{ fontSize: 11, color: 'var(--on-surface-variant)', marginTop: 4 }}>
                  Supported: PDF, JPG, JPEG, PNG (Max 5MB)
                </span>
              </div>

              <div className="kyc-demo-notice">
                <span className="material-symbols-outlined">shield</span>
                <p><strong>Secure Submission.</strong><br/>Your document will be encrypted and stored securely for authority review.</p>
              </div>

              <button type="submit" className="btn btn-primary submit-btn" disabled={loading}>
                {loading ? 'SUBMITTING...' : isRejected ? 'RE-SUBMIT FOR VERIFICATION' : 'SUBMIT FOR VERIFICATION'}
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
