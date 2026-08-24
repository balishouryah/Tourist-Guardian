import { useState, useEffect } from 'react';
import { authoritySupabase } from '../../lib/supabase';
import { verifyIdentity } from '../../services/blockchainIdentityService';
import { useAuthorityAuth } from '../utils/AuthorityAuthContext';
import './KYCReviewModal.css';

export default function KYCReviewModal({ tourist, onClose, onSuccess }) {
  const { user } = useAuthorityAuth();
  const [docUrl, setDocUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchDocument = async () => {
      if (!tourist.kyc_document_path) {
        setLoading(false);
        return;
      }
      
      // If it's a demo mode document (not actually in supabase)
      if (tourist.kyc_document_path.startsWith('demo_mode/')) {
        if (isMounted) {
          setDocUrl(null); // No real doc to show
          setLoading(false);
        }
        return;
      }

      try {
        const { data, error: urlError } = await authoritySupabase.storage
          .from('kyc-documents')
          .createSignedUrl(tourist.kyc_document_path, 3600); // 1 hour expiry
          
        if (urlError) throw urlError;
        
        if (isMounted) setDocUrl(data.signedUrl);
      } catch (err) {
        console.error('Error fetching KYC document:', err);
        if (isMounted) setError('Failed to load document securely.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDocument();
    return () => { isMounted = false; };
  }, [tourist.kyc_document_path]);

  const handleApprove = async () => {
    setActionLoading(true);
    setError(null);
    try {
      // 1. Generate Blockchain Mock Hash via blockchainIdentityService
      const payload = {
        fullName: tourist.name,
        dateOfBirth: tourist.date_of_birth,
        nationality: tourist.nationality,
        documentType: tourist.kyc_type,
        // The real document number isn't stored in DB in our implementation, only the reference (masked).
        // For the hash, we'll just use the masked reference as the commitment seed alongside the ID.
        documentNumber: tourist.kyc_reference 
      };
      
      const verificationResult = await verifyIdentity(payload, tourist.safety_id || tourist.id);
      
      // 2. Update tourist record
      const { data: updateData, error: updateError } = await authoritySupabase
        .from('tourists')
        .update({
          kyc_status: 'VERIFIED',
          kyc_reviewed_at: new Date().toISOString(),
          kyc_reviewed_by: user.id,
          blockchain_status: 'VERIFIED',
          blockchain_reference: verificationResult.transactionId,
          identity_hash: verificationResult.identityHash,
          digital_id_issued_at: verificationResult.issuedAt,
          digital_id_expires_at: verificationResult.expiresAt,
          kyc_rejection_reason: null
        })
        .eq('id', tourist.id)
        .select();
        
      if (updateError) throw updateError;
      if (!updateData || updateData.length === 0) throw new Error("Approval failed: Row not updated. You may lack permission.");
      
      // 3. Create Notification
      const { error: notifError } = await authoritySupabase
        .from('notifications')
        .insert({
          tourist_id: tourist.id,
          type: 'KYC_APPROVED',
          title: 'KYC Verification Approved',
          message: 'Your identity has been verified successfully. Your Digital Tourist ID is now active.'
        });
        
      if (notifError) console.error('Failed to create notification', notifError);
      
      if (onSuccess) onSuccess(tourist.id, 'VERIFIED');
      onClose(); // Close modal on success (realtime will update the list)
    } catch (err) {
      console.error(err);
      setError('Approval failed: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason) {
      setError('Please provide a rejection reason.');
      return;
    }
    
    setActionLoading(true);
    setError(null);
    try {
      const { data: updateData, error: updateError } = await authoritySupabase
        .from('tourists')
        .update({
          kyc_status: 'REJECTED',
          kyc_reviewed_at: new Date().toISOString(),
          kyc_reviewed_by: user.id,
          kyc_rejection_reason: rejectionReason
        })
        .eq('id', tourist.id)
        .select();
        
      if (updateError) throw updateError;
      if (!updateData || updateData.length === 0) throw new Error("Rejection failed: Row not updated. You may lack permission.");
      
      // 3. Create Notification
      const { error: notifError } = await authoritySupabase
        .from('notifications')
        .insert({
          tourist_id: tourist.id,
          type: 'KYC_REJECTED',
          title: 'KYC Verification Rejected',
          message: `Your KYC verification was rejected. Reason: ${rejectionReason}. Please review your document and resubmit.`
        });
        
      if (notifError) console.error('Failed to create notification', notifError);
      
      if (onSuccess) onSuccess(tourist.id, 'REJECTED');
      onClose();
    } catch (err) {
      console.error(err);
      setError('Rejection failed: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="kyc-modal-overlay">
      <div className="kyc-modal">
        <div className="kyc-modal-header">
          <h2>IDENTITY VERIFICATION</h2>
          <button className="kyc-modal-close" onClick={onClose} disabled={actionLoading}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <div className="kyc-modal-content">
          {error && <div className="kyc-modal-error">{error}</div>}
          
          <div className="kyc-modal-grid">
            <div className="kyc-modal-details">
              <div className="kyc-detail-group">
                <label>Tourist</label>
                <div className="value">{tourist.name}</div>
              </div>
              <div className="kyc-detail-group">
                <label>Digital Tourist ID</label>
                <div className="value" style={{ fontFamily: 'monospace' }}>{tourist.safety_id}</div>
              </div>
              <div className="kyc-detail-group">
                <label>Date of Birth</label>
                <div className="value">{tourist.date_of_birth ? new Date(tourist.date_of_birth).toLocaleDateString() : 'N/A'}</div>
              </div>
              <div className="kyc-detail-group">
                <label>Nationality</label>
                <div className="value">{tourist.nationality || 'N/A'}</div>
              </div>
              <div className="kyc-detail-group">
                <label>Identification Type</label>
                <div className="value">{tourist.kyc_type || 'N/A'}</div>
              </div>
              <div className="kyc-detail-group">
                <label>Document Reference</label>
                <div className="value">{tourist.kyc_reference || 'N/A'}</div>
              </div>
            </div>
            
            <div className="kyc-modal-document">
              <label>Uploaded Document</label>
              <div className="kyc-doc-viewer">
                {loading ? (
                  <div className="kyc-doc-loading">Loading secure document...</div>
                ) : docUrl ? (
                  tourist.kyc_document_path.toLowerCase().endsWith('.pdf') ? (
                    <iframe src={docUrl} title="KYC Document" className="kyc-pdf-viewer" />
                  ) : (
                    <img src={docUrl} alt="KYC Document" className="kyc-img-viewer" />
                  )
                ) : (
                  <div className="kyc-doc-loading">
                    <span className="material-symbols-outlined" style={{ fontSize: 48, opacity: 0.3 }}>image_not_supported</span>
                    <p>No document available or demo mode active.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {tourist.kyc_status === 'PENDING' && (
            <div className="kyc-modal-actions">
              {!rejectMode ? (
                <>
                  <button className="btn btn-secondary" onClick={() => setRejectMode(true)} disabled={actionLoading} style={{ flex: 1, borderColor: 'var(--error)', color: 'var(--error)' }}>
                    ✕ REJECT KYC
                  </button>
                  <button className="btn btn-primary" onClick={handleApprove} disabled={actionLoading} style={{ flex: 1, background: 'var(--safe)', border: 'none' }}>
                    {actionLoading ? 'PROCESSING...' : '✓ APPROVE KYC'}
                  </button>
                </>
              ) : (
                <div className="kyc-reject-form">
                  <label>REJECTION REASON</label>
                  <select 
                    value={rejectionReason} 
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="kyc-reject-select"
                  >
                    <option value="">Select a reason...</option>
                    <option value="Document unclear or illegible">Document unclear or illegible</option>
                    <option value="Information mismatch">Information mismatch</option>
                    <option value="Invalid document type">Invalid document type</option>
                    <option value="Expired document">Expired document</option>
                    <option value="Suspected fraudulent document">Suspected fraudulent document</option>
                    <option value="Other">Other</option>
                  </select>
                  <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                    <button className="btn btn-secondary" onClick={() => setRejectMode(false)} disabled={actionLoading} style={{ flex: 1 }}>
                      CANCEL
                    </button>
                    <button className="btn btn-primary" onClick={handleReject} disabled={actionLoading} style={{ flex: 2, background: 'var(--error)', border: 'none' }}>
                      {actionLoading ? 'REJECTING...' : 'CONFIRM REJECTION'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
