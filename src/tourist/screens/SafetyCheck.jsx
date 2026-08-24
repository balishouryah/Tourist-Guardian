import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSafetyContext } from '../../utils/SafetyContext';
import { saveOfflineData } from '../../services/offlineService';
import { useAuth } from '../../utils/AuthContext';
import { useLanguage } from '../../utils/LanguageContext';
import EmergencyPoliceButton from '../../components/EmergencyPoliceButton';

export default function SafetyCheck() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { submitQuestionnaire } = useSafetyContext();
  const { touristProfile } = useAuth();
  
  const [answers, setAnswers] = useState({
    immediateDanger: false,
    threatened: false,
    unsafe: false,
    lost: false,
    noTransport: false,
    lowBattery: false,
    alone: false,
  });
  const [submittedResult, setSubmittedResult] = useState(null);

  const handleChange = (key, value) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Update global safety context and log to Supabase
    await submitQuestionnaire(answers);

    // Persist locally for offline reliability
    if (touristProfile) {
      await saveOfflineData(touristProfile.auth_user_id, 'safety_questionnaire', answers);
    }
    
    const severity = answers.immediateDanger || answers.threatened ? 'CRITICAL' 
                   : answers.unsafe || answers.lost ? 'HIGH' 
                   : 'CAUTION';
                   
    setSubmittedResult(severity);
  };

  if (submittedResult) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--background)' }}>
        <div style={{ padding: '16px', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid var(--outline-variant)' }}>
          <button onClick={() => navigate('/tourist/dashboard')} style={{ background: 'none', border: 'none', padding: 0, display: 'flex', cursor: 'pointer' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 24 }}>close</span>
          </button>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 'bold' }}>Assessment Complete</h1>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {(submittedResult === 'CRITICAL' || submittedResult === 'HIGH') ? (
            <div style={{ 
              background: 'var(--error-container)', 
              padding: '24px', 
              borderRadius: '16px', 
              border: '2px solid var(--error)',
              textAlign: 'center'
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--error)', marginBottom: '8px' }}>warning</span>
              <h2 style={{ color: 'var(--on-error-container)', margin: '0 0 8px 0', fontSize: '20px' }}>YOUR SAFETY SCORE IS {submittedResult}</h2>
              <p style={{ color: 'var(--on-error-container)', margin: 0, fontSize: '15px' }}>Based on your answers, you may be in danger.</p>
            </div>
          ) : (
            <div style={{ 
              background: 'var(--safe-bg)', 
              padding: '24px', 
              borderRadius: '16px', 
              textAlign: 'center'
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--safe)', marginBottom: '8px' }}>check_circle</span>
              <h2 style={{ color: 'var(--safe)', margin: '0 0 8px 0', fontSize: '20px' }}>ASSESSMENT RECORDED</h2>
              <p style={{ color: 'var(--on-surface-variant)', margin: 0, fontSize: '15px' }}>Your safety status has been updated.</p>
            </div>
          )}

          <EmergencyPoliceButton phoneNumber="112" showNearbyAction={true} />

          {(submittedResult === 'CRITICAL' || submittedResult === 'HIGH') && (
            <button 
              onClick={() => navigate('/tourist/sos')}
              style={{
                width: '100%',
                background: 'var(--error)',
                color: '#fff',
                padding: '16px',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '16px',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer'
              }}
            >
              <span className="material-symbols-outlined">emergency_share</span>
              SEND SOS
            </button>
          )}

          <button 
            onClick={() => navigate('/tourist/dashboard')}
            style={{
              width: '100%',
              background: 'var(--surface-variant)',
              color: 'var(--on-surface)',
              padding: '16px',
              borderRadius: '12px',
              fontWeight: 600,
              fontSize: '16px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--background)' }}>
      {/* Header */}
      <div style={{ padding: '16px', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid var(--outline-variant)' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', padding: 0, display: 'flex', cursor: 'pointer' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 24 }}>arrow_back</span>
        </button>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 'bold' }}>{t('questionnaire_title')}</h1>
      </div>

      {/* Form */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
          
          <QuestionItem 
            label={t('immediate_danger')} 
            value={answers.immediateDanger} 
            onChange={(val) => handleChange('immediateDanger', val)} 
            dangerLevel="high"
          />
          <QuestionItem 
            label={t('threatened')} 
            value={answers.threatened} 
            onChange={(val) => handleChange('threatened', val)} 
            dangerLevel="high"
          />
          <QuestionItem 
            label={t('unsafe')} 
            value={answers.unsafe} 
            onChange={(val) => handleChange('unsafe', val)} 
            dangerLevel="medium"
          />
          <QuestionItem 
            label={t('lost')} 
            value={answers.lost} 
            onChange={(val) => handleChange('lost', val)} 
            dangerLevel="medium"
          />
          <QuestionItem 
            label={t('no_transport')} 
            value={answers.noTransport} 
            onChange={(val) => handleChange('noTransport', val)} 
            dangerLevel="low"
          />
          <QuestionItem 
            label={t('low_battery')} 
            value={answers.lowBattery} 
            onChange={(val) => handleChange('lowBattery', val)} 
            dangerLevel="low"
          />
          <QuestionItem 
            label={t('alone')} 
            value={answers.alone} 
            onChange={(val) => handleChange('alone', val)} 
            dangerLevel="none"
          />

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ marginTop: '24px', padding: '16px', fontSize: 16, fontWeight: 'bold' }}
          >
            {t('submit_assessment')}
          </button>
        </form>
      </div>
    </div>
  );
}

function QuestionItem({ label, value, onChange, dangerLevel }) {
  const { t } = useLanguage();
  const getHighlightColor = () => {
    if (!value) return 'transparent';
    switch(dangerLevel) {
      case 'high': return 'var(--error-container)';
      case 'medium': return 'var(--caution-bg)';
      default: return 'var(--surface-variant)';
    }
  };

  const getBorderColor = () => {
    if (!value) return 'var(--outline-variant)';
    switch(dangerLevel) {
      case 'high': return 'var(--error)';
      case 'medium': return 'var(--caution)';
      default: return 'var(--primary)';
    }
  };

  return (
    <div style={{ 
      background: 'var(--surface)', 
      padding: '16px', 
      borderRadius: '12px',
      border: `1px solid ${getBorderColor()}`,
      backgroundColor: getHighlightColor(),
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      transition: 'all 0.2s ease'
    }}>
      <label style={{ fontSize: 15, fontWeight: 500, color: 'var(--on-surface)' }}>{label}</label>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button 
          type="button"
          onClick={() => onChange(true)}
          style={{
            flex: 1, padding: '10px', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer',
          background: value === true ? 'var(--primary)' : 'var(--surface-variant)',
            color: value === true ? 'var(--on-primary)' : 'var(--on-surface-variant)'
          }}
        >{t('yes')}</button>
        <button 
          type="button"
          onClick={() => onChange(false)}
          style={{
            flex: 1, padding: '10px', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer',
            background: value === false ? 'var(--primary)' : 'var(--surface-variant)',
            color: value === false ? 'var(--on-primary)' : 'var(--on-surface-variant)'
          }}
        >{t('no')}</button>
      </div>
    </div>
  );
}
