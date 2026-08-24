import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEmergencyContacts, addEmergencyContact, deleteEmergencyContact } from '../../services/emergencyContactService';
import './EmergencyContacts.css';

export default function EmergencyContacts() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCached, setIsCached] = useState(false);

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRel, setNewRel] = useState('');
  const [newPhone, setNewPhone] = useState('');

  useEffect(() => {
    let active = true;
    const fetchContacts = async () => {
      setLoading(true);
      const { data, isCached: cached } = await getEmergencyContacts();
      if (active) {
        setContacts(data || []);
        setIsCached(!!cached);
        setLoading(false);
      }
    };
    fetchContacts();
    return () => { active = false; };
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName || !newPhone) return;
    
    const contact = {
      name: newName,
      relationship: newRel,
      phone: newPhone
    };
    
    const { data, error } = await addEmergencyContact(contact);
    if (error) {
      alert(error);
    } else if (data) {
      setContacts(prev => [...prev, data]);
      setNewName('');
      setNewRel('');
      setNewPhone('');
      setShowAdd(false);
    }
  };

  const handleDelete = async (id) => {
    const { error } = await deleteEmergencyContact(id);
    if (!error) {
      setContacts(prev => prev.filter(c => c.id !== id));
    }
  };

  return (
    <div className="ec-screen">
      <div className="ec-header">
        <button className="ec-back-btn" onClick={() => navigate(-1)}>
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="ec-title">Emergency Contacts</div>
        <div style={{width: 44}}></div>
      </div>
      
      {isCached && (
        <div style={{ background: 'var(--warning)', color: '#000', padding: '8px 16px', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 600 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>offline_bolt</span>
          Cached for offline emergency use
        </div>
      )}

      <div className="ec-content">
        <p className="ec-desc">
          These contacts will be displayed for quick access during an emergency.
        </p>

        <div className="ec-list">
          {loading ? (
            <div className="ec-empty">Loading contacts...</div>
          ) : (
            <>
              {contacts.map(c => (
                <div key={c.id} className="ec-card">
                  <div className="ec-info">
                    <div className="ec-name">{c.name}</div>
                    <div className="ec-rel">{c.relationship}</div>
                    <div className="ec-phone">{c.phone}</div>
                  </div>
                  <div className="ec-actions">
                    <button className="ec-del-btn" onClick={() => handleDelete(c.id)}>
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </div>
              ))}
              {contacts.length === 0 && (
                <div className="ec-empty">No emergency contacts added.</div>
              )}
            </>
          )}
        </div>

        {!showAdd ? (
          <button className="ec-add-btn" onClick={() => setShowAdd(true)}>
            <span className="material-symbols-outlined">add</span>
            ADD CONTACT
          </button>
        ) : (
          <form className="ec-add-form" onSubmit={handleAdd}>
            <div className="ec-form-title">New Contact</div>
            <input 
              className="ec-input" 
              placeholder="Name (e.g. Mum)" 
              value={newName} 
              onChange={e => setNewName(e.target.value)} 
              required
            />
            <input 
              className="ec-input" 
              placeholder="Relationship (e.g. Parent)" 
              value={newRel} 
              onChange={e => setNewRel(e.target.value)} 
            />
            <input 
              className="ec-input" 
              placeholder="Phone Number" 
              type="tel"
              value={newPhone} 
              onChange={e => setNewPhone(e.target.value)} 
              required
            />
            <div className="ec-form-actions">
              <button type="button" className="ec-cancel-btn" onClick={() => setShowAdd(false)}>CANCEL</button>
              <button type="submit" className="ec-save-btn">SAVE</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
