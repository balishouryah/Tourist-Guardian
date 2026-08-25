import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../utils/AuthContext';

export default function FamilyTracking() {
  const { user, touristProfile: profile, refreshTouristProfile: fetchProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberContact, setNewMemberContact] = useState('');
  
  const isEnabled = profile?.family_tracking_enabled || false;

  useEffect(() => {
    if (user && profile) {
      fetchMembers();
      
      // Subscribe to real-time changes
      const channel = supabase.channel(`family_tracking_${profile.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'family_tracking_access',
            filter: `tourist_id=eq.${profile.id}`
          },
          (payload) => {
            if (payload.new && payload.new.status === 'ACTIVE' && payload.old.status === 'PENDING') {
              // Notification toast
              if (window.showToast) {
                window.showToast(`Family member ${payload.new.family_name} accepted your invitation!`);
              } else {
                alert(`Family member ${payload.new.family_name} accepted your invitation and can now view your shared location.`);
              }
            }
            fetchMembers(); // refresh list
          }
        )
        .subscribe();
        
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, profile]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('family_tracking_access')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setMembers(data || []);
    } catch (err) {
      console.error('Error fetching family members:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleTracking = async (desiredState) => {
    if (desiredState === isEnabled) return;
    
    const confirmMessage = desiredState 
      ? 'ENABLE FAMILY TRACKING?\n\nWhen enabled, people you authorize can view your live location and safety status while tracking is active.\n\nYou can disable this at any time.'
      : 'TURN OFF FAMILY TRACKING?\n\nAll family members will immediately lose access to your live location and safety status.';
      
    if (!window.confirm(confirmMessage)) return;

    try {
      const { error } = await supabase
        .from('tourists')
        .update({ family_tracking_enabled: desiredState })
        .eq('id', profile.id);
        
      if (error) throw error;
      await fetchProfile(); // refresh the profile context
    } catch (err) {
      console.error('Error toggling family tracking:', err);
      alert('Failed to update tracking settings.');
    }
  };

  const generateInviteToken = () => {
    // Generate a secure random string (fallback to Math.random if crypto not available)
    if (window.crypto && window.crypto.randomUUID) {
      return window.crypto.randomUUID().replace(/-/g, '') + Math.random().toString(36).substring(2, 10);
    }
    return Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2) + Date.now().toString(36);
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMemberName) return;
    
    // Ensure email is provided for real invitation flow
    if (!newMemberContact || !newMemberContact.includes('@')) {
      alert('Please provide a valid email address to send the invitation.');
      return;
    }
    
    try {
      const token = generateInviteToken();
      
      // 1. Create DB record as PENDING
      const { data, error } = await supabase
        .from('family_tracking_access')
        .insert({
          tourist_id: profile.id,
          family_name: newMemberName,
          family_contact: newMemberContact,
          access_token: token,
          status: 'PENDING'
        })
        .select()
        .single();
        
      if (error) throw error;
      
      setMembers([data, ...members]);
      setShowAddForm(false);
      setNewMemberName('');
      setNewMemberContact('');
      
      // 2. Trigger Edge Function to send email
      const inviteUrl = `${window.location.origin}/family/invite/${token}`;
      try {
        const response = await supabase.functions.invoke('family-email', {
          body: {
            action: 'invite',
            touristName: profile.name,
            safetyId: profile.safety_id || profile.id.split('-')[0].toUpperCase(),
            familyEmail: newMemberContact,
            familyName: newMemberName,
            inviteLink: inviteUrl
          }
        });
        
        if (response.error) {
          console.error('Edge Function Error (handled):', response.error);
          alert('Invitation saved, but email provider is not configured. Please use development link manually.');
        } else {
          // Success
          console.log('Email sent or mocked:', response.data);
          alert('Invitation email sent (or logged to edge function console)!');
        }
      } catch (err) {
        console.error('Failed to trigger email:', err);
      } // Missing closing brace here
      
      // Insert notification
      await supabase.from('notifications').insert({
        tourist_id: profile.id,
        title: 'Family invitation sent',
        message: `Family tracking invitation sent to ${newMemberContact}.`,
        type: 'SYSTEM'
      });
      
    } catch (err) {
      console.error('Error adding member:', err);
      alert('Failed to add family member.');
    }
  };

  const handleRevoke = async (id, name) => {
    if (!window.confirm(`REVOKE ACCESS?\n\n${name} will immediately lose access to your live location.`)) return;
    
    try {
      const { error } = await supabase
        .from('family_tracking_access')
        .update({ status: 'REVOKED', revoked_at: new Date().toISOString() })
        .eq('id', id);
        
      if (error) throw error;
      
      // Insert notification
      await supabase.from('notifications').insert({
        tourist_id: profile.id,
        title: 'Family access revoked',
        message: `Family Tracking access for ${name} has been revoked.`,
        type: 'SYSTEM'
      });
      
      fetchMembers();
    } catch (err) {
      console.error('Error revoking access:', err);
      alert('Failed to revoke access.');
    }
  };

  const copyInvite = async (token) => {
    const inviteUrl = `${window.location.origin}/family/track/${token}`;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      alert('Link copied to clipboard!');
    } catch (err) {
      alert(`Link: ${inviteUrl}`);
    }
  };

  if (loading && !members.length) {
    return <div style={{ padding: '24px', textAlign: 'center', color: 'var(--on-surface)' }}>Loading Family Tracking...</div>;
  }

  return (
    <div className="tourist-screen">
      <div className="screen-header">
        <h1 className="screen-title">FAMILY TRACKING</h1>
      </div>
      
      <div className="screen-content" style={{ padding: '24px', paddingBottom: '100px' }}>
        <p style={{ color: 'var(--on-surface-variant)', marginBottom: '32px' }}>
          Share your live safety status and location with trusted family members.
        </p>
        
        {/* Main Status Card */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--outline-variant)', borderRadius: '16px', padding: '24px', marginBottom: '32px' }}>
          <div style={{ fontSize: 14, color: 'var(--on-surface-variant)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '16px' }}>Status</div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 32, color: isEnabled ? 'var(--safe)' : 'var(--error)' }}>
              {isEnabled ? 'share_location' : 'location_disabled'}
            </span>
            <div style={{ fontSize: 24, fontWeight: 700, color: isEnabled ? 'var(--safe)' : 'var(--error)' }}>
              FAMILY TRACKING {isEnabled ? 'ON' : 'OFF'}
            </div>
          </div>
          
          <p style={{ color: 'var(--on-surface)', marginBottom: '24px', fontSize: 15, lineHeight: 1.5 }}>
            {isEnabled 
              ? 'Your approved family members can currently view your shared information.' 
              : 'Your location is not being shared with family.'}
          </p>
          
          {!isEnabled ? (
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => toggleTracking(true)}>
              ENABLE FAMILY TRACKING
            </button>
          ) : (
            <>
              <button className="btn btn-secondary" style={{ width: '100%', marginBottom: '12px', background: 'var(--primary-container)', color: 'var(--on-primary-container)', border: 'none' }} onClick={() => setShowAddForm(true)}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>person_add</span>
                ADD FAMILY MEMBER
              </button>
              <button className="btn btn-secondary" style={{ width: '100%', borderColor: 'var(--error)', color: 'var(--error)' }} onClick={() => toggleTracking(false)}>
                TURN OFF FAMILY TRACKING
              </button>
            </>
          )}
        </div>
        
        {/* Add Member Form */}
        {showAddForm && (
          <form onSubmit={handleAddMember} style={{ background: 'var(--surface)', border: '1px solid var(--outline-variant)', borderRadius: '16px', padding: '24px', marginBottom: '32px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '24px' }}>Add Family Member</h3>
            <div className="input-group">
              <label>Family Member Name *</label>
              <input type="text" required value={newMemberName} onChange={e => setNewMemberName(e.target.value)} placeholder="e.g. Sarah" className="input-field" />
            </div>
            <div className="input-group" style={{ marginTop: '16px' }}>
              <label>Email or Phone (Optional)</label>
              <input type="text" value={newMemberContact} onChange={e => setNewMemberContact(e.target.value)} placeholder="e.g. sarah@example.com" className="input-field" />
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowAddForm(false)}>CANCEL</button>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>CREATE INVITE</button>
            </div>
          </form>
        )}
        
        {/* Shared With List */}
        {members.length > 0 && (
          <div>
            <div style={{ fontSize: 14, color: 'var(--on-surface-variant)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '16px' }}>Shared With</div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {members.map(member => (
                <div key={member.id} style={{ background: 'var(--surface)', border: '1px solid var(--outline-variant)', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 18 }}>{member.family_name}</div>
                      {member.family_contact && <div style={{ fontSize: 14, color: 'var(--on-surface-variant)' }}>{member.family_contact}</div>}
                    </div>
                    <div style={{ 
                      display: 'flex', alignItems: 'center', gap: '6px', fontSize: 12, fontWeight: 700, padding: '4px 8px', borderRadius: '4px',
                      background: member.status === 'ACTIVE' ? 'var(--safe-container, #dcfce7)' : 'var(--surface-variant)',
                      color: member.status === 'ACTIVE' ? 'var(--safe, #16a34a)' : 'var(--on-surface-variant)'
                    }}>
                      {member.status === 'ACTIVE' && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />}
                      {member.status}
                    </div>
                  </div>
                  
                  {member.status === 'ACTIVE' && (
                    <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                      <button className="btn btn-secondary" style={{ flex: 1, padding: '8px', fontSize: 13 }} onClick={() => copyInvite(member.access_token)}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>content_copy</span> COPY LINK
                      </button>
                      <button className="btn btn-secondary" style={{ flex: 1, padding: '8px', fontSize: 13, borderColor: 'var(--error)', color: 'var(--error)' }} onClick={() => handleRevoke(member.id, member.family_name)}>
                        REVOKE ACCESS
                      </button>
                    </div>
                  )}
                  {member.status === 'PENDING' && (
                    <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                      <button className="btn btn-secondary" style={{ flex: 1, padding: '8px', fontSize: 13, borderColor: 'var(--error)', color: 'var(--error)' }} onClick={() => handleRevoke(member.id, member.family_name)}>
                        CANCEL INVITATION
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div style={{ marginTop: '48px', padding: '24px', background: 'var(--surface-variant)', borderRadius: '12px', color: 'var(--on-surface-variant)', fontSize: 13, textAlign: 'center' }}>
          <h4 style={{ margin: '0 0 8px 0', color: 'var(--on-surface)' }}>PRIVACY FIRST</h4>
          You have full control. You can revoke individual access or completely stop sharing your location at any time.
        </div>
      </div>
    </div>
  );
}
