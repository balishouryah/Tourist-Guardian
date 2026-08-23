import { useNavigate } from 'react-router-dom';
import './Welcome.css';

export default function Welcome() {
  const navigate = useNavigate();

  return (
    <div className="welcome-screen animate-fade-in">
      <h1 className="welcome-brand">
        Tourist<br />Guardian
      </h1>
      <p className="welcome-tagline">
        Your journey. Your safety. Your guardian.
      </p>

      <div className="welcome-actions">
        <button
          className="btn btn-primary btn-lg btn-full"
          onClick={() => navigate('/tourist/profile')}
        >
          Get Started
        </button>
        <button
          className="btn btn-secondary btn-full"
          onClick={() => navigate('/tourist/dashboard')}
        >
          Already Have Safety ID
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
