import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function FamilyInvite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [invite, setInvite] = useState(null);

  useEffect(() => {
    async function fetchInvite() {
      if (!token || !supabase) {
        setError('Invalid invitation link.');
        setLoading(false);
        return;
      }
      
      try {
        // Find the pending invite by token
        const { data, error } = await supabase
          .from('family_tracking_access')
          .select('*, tourists(name)')
          .eq('access_token', token)
          .maybeSingle();

        if (error || !data) {
          setError('Invitation not found or invalid.');
        } else if (data.status === 'ACTIVE') {
          // Already accepted, redirect to map
          navigate(`/family/track/${token}`, { replace: true });
        } else if (data.status !== 'PENDING') {
          setError(`This invitation is ${data.status.toLowerCase()}.`);
        } else {
          setInvite(data);
        }
      } catch (err) {
        console.error('Error fetching invite:', err);
        setError('An error occurred loading the invitation.');
      } finally {
        setLoading(false);
      }
    }
    fetchInvite();
  }, [token, navigate]);

  const handleAccept = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('family_tracking_access')
        .update({ status: 'ACTIVE', accepted_at: new Date().toISOString() })
        .eq('id', invite.id);

      if (error) throw error;
      
      // Insert notification for Tourist
      await supabase.from('notifications').insert({
        tourist_id: invite.tourist_id,
        title: 'Family member accepted',
        message: `Your family member has accepted your Family Tracking invitation and can now view your shared location.`,
        type: 'SYSTEM'
      });
      
      // Successfully accepted, redirect to track view
      navigate(`/family/track/${token}`, { replace: true });
    } catch (err) {
      console.error('Error accepting invite:', err);
      setError('Failed to accept invitation. Please try again.');
      setLoading(false);
    }
  };
  
  const handleDecline = async () => {
    if (!window.confirm("Are you sure you want to decline this invitation?")) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('family_tracking_access')
        .update({ status: 'DECLINED' })
        .eq('id', invite.id);

      if (error) throw error;
      
      setError('You have declined the invitation. You may now close this page.');
    } catch (err) {
      console.error('Error declining invite:', err);
      setError('Failed to decline invitation.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--surface)' }}>
        <div style={{ color: 'var(--on-surface)' }}>Loading Invitation...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--surface)', padding: '24px' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px', background: 'var(--surface-container)', padding: '32px', borderRadius: '16px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--error)', marginBottom: '16px' }}>error</span>
          <h2 style={{ margin: '0 0 16px 0', color: 'var(--on-surface)' }}>Invitation Unavailable</h2>
          <p style={{ color: 'var(--on-surface-variant)', margin: 0 }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--surface)', padding: '24px' }}>
      <div style={{ maxWidth: '480px', width: '100%', background: 'var(--surface-container)', borderRadius: '24px', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
        <div style={{ background: 'var(--primary)', color: 'var(--on-primary)', padding: '32px 24px', textAlign: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, marginBottom: '16px' }}>family_restroom</span>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>TOURIST GUARDIAN</h1>
          <div style={{ opacity: 0.9, marginTop: '8px', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>Family Tracking Invitation</div>
        </div>
        
        <div style={{ padding: '32px 24px' }}>
          <p style={{ margin: '0 0 24px 0', fontSize: '16px', lineHeight: 1.5, color: 'var(--on-surface)', textAlign: 'center' }}>
            <strong>{invite?.tourists?.name || 'A tourist'}</strong> has invited you to view their shared safety information.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '32px' }}>
            <button onClick={handleAccept} className="btn btn-primary" style={{ padding: '16px', fontSize: '16px', fontWeight: 600 }}>
              ACCEPT INVITATION
            </button>
            <button onClick={handleDecline} className="btn btn-secondary" style={{ padding: '16px', fontSize: '16px', fontWeight: 600, borderColor: 'var(--error)', color: 'var(--error)' }}>
              DECLINE
            </button>
          </div>
          
          <p style={{ margin: '32px 0 0 0', fontSize: '13px', color: 'var(--on-surface-variant)', textAlign: 'center' }}>
            By accepting, you will be granted secure access to view their live GPS location and safety status.
          </p>
        </div>
      </div>
    </div>
  );
}
