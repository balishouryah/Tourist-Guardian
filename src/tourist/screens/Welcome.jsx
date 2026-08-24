import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../utils/AuthContext';
import './Welcome.css';

export default function Welcome() {
  const navigate = useNavigate();
  const { enableDemoMode, logout } = useAuth();

  const handleCreateAccount = async () => {
    await logout();
    navigate('/tourist/onboarding');
  };

  const handleDemoMode = () => {
    enableDemoMode();
    navigate('/tourist/dashboard');
  };

  return (
    <div className="welcome-screen animate-fade-in">
      <h1 className="welcome-brand">
        Tourist<br />Guardian
      </h1>
      <p className="welcome-tagline">
        Your journey. Your safety. Your guardian.
      </p>

      <div className="welcome-actions">
        <p style={{ fontSize: 13, color: 'var(--on-surface-variant)', textAlign: 'center', marginBottom: 16 }}>
          Create an account to securely save your safety profile, emergency contacts and trip information.
        </p>
        <button
          className="btn btn-primary btn-lg btn-full"
          onClick={handleCreateAccount}
        >
          Create Account
        </button>
        <button
          className="btn btn-secondary btn-full"
          onClick={() => navigate('/tourist/login')}
        >
          Login
        </button>
        <button
          className="btn btn-interactive btn-full"
          style={{ marginTop: '8px' }}
          onClick={handleDemoMode}
        >
          Try Demo Mode
        </button>
      </div>

      <div className="welcome-footer">
        <button className="welcome-footer-btn">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            language
          </span>
          English
        </button>
        <button className="welcome-footer-btn">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            accessibility_new
          </span>
          Accessibility
        </button>
      </div>
    </div>
  );
}
