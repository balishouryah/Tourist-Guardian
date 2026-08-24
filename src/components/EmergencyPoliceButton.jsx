import { useNavigate } from 'react-router-dom';

export default function EmergencyPoliceButton({ phoneNumber = '112', showNearbyAction = false }) {
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
      <a 
        href={`tel:${phoneNumber}`} 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          background: 'var(--error)',
          color: '#fff',
          textDecoration: 'none',
          padding: '16px',
          borderRadius: '12px',
          fontWeight: 700,
          fontSize: '16px',
          boxShadow: '0 4px 12px rgba(255, 59, 48, 0.3)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease'
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.transform = 'scale(0.98)';
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        <span className="material-symbols-outlined icon-filled">call</span>
        CALL EMERGENCY SERVICES ({phoneNumber})
      </a>

      {showNearbyAction && (
        <button 
          onClick={() => navigate('/tourist/nearby')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            background: 'var(--surface-variant)',
            color: 'var(--on-surface)',
            border: 'none',
            padding: '14px',
            borderRadius: '12px',
            fontWeight: 600,
            fontSize: '15px',
            cursor: 'pointer'
          }}
        >
          <span className="material-symbols-outlined">local_police</span>
          Find Nearby Police Stations
        </button>
      )}
    </div>
  );
}
