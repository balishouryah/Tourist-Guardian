import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSharedDemoState } from '../../utils/useSharedDemoState';
import './AISafetyAlert.css';

export default function AISafetyAlert() {
  const navigate = useNavigate();
  const { markSafe, needHelp, activateSOS } = useSharedDemoState();
  const [countdown, setCountdown] = useState(165); // 2:45 in seconds

  // Auto-escalation countdown (prototype — does NOT call real services)
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;
  const countdownStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const handleSafe = () => {
    markSafe();
    navigate('/tourist/dashboard');
  };

  const handleHelp = () => {
    needHelp();
    navigate('/tourist/dashboard');
  };

  const handleSOS = () => {
    activateSOS();
    navigate('/tourist/sos');
  };

  return (
    <div className="ai-alert-screen">
      {/* Pulsing red bar */}
      <div className="ai-alert-top-bar" />

      {/* Main alert card */}
      <div className="ai-alert-card pulse-bg">
        {/* Warning icon */}
        <div className="ai-alert-icon-wrap">
          <div className="ai-alert-icon pulse-ring">
            <span className="material-symbols-outlined icon-filled">warning</span>
          </div>
        </div>

        {/* Title */}
        <h1 className="ai-alert-title">POSSIBLE DISTRESS DETECTED</h1>
        <p className="ai-alert-desc">
          Your recent route and movement differ significantly from your planned journey.
        </p>

        {/* Detected Signals */}
        <div className="ai-alert-signals">
          <h2 className="ai-alert-signals-title">
            <span className="material-symbols-outlined">radar</span>
            DETECTED SIGNALS
          </h2>

          <div className="ai-alert-signal-item">
            <div className="ai-alert-signal-left">
              <span className="material-symbols-outlined">moving</span>
              Route deviation
            </div>
            <span className="ai-alert-signal-value">1.4km off path</span>
          </div>

          <div className="ai-alert-signal-item">
            <div className="ai-alert-signal-left">
              <span className="material-symbols-outlined">schedule</span>
              Prolonged inactivity
            </div>
            <span className="ai-alert-signal-value">32 min stopped</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="ai-alert-actions">
          <button className="ai-alert-safe-btn" onClick={handleSafe}>
            <span className="material-symbols-outlined icon-filled" style={{ fontSize: 22 }}>
              check_circle
            </span>
            I'M SAFE
          </button>

          <button className="ai-alert-help-btn" onClick={handleHelp}>
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
              chat_bubble
            </span>
            NEED HELP (NON-EMERGENCY)
          </button>

          <button className="ai-alert-sos-btn" onClick={handleSOS}>
            <span className="material-symbols-outlined icon-filled">
              emergency_share
            </span>
            ACTIVATE SOS
          </button>
        </div>

        {/* Countdown */}
        <p className="ai-alert-countdown">
          Auto-escalation in {countdownStr}
        </p>
      </div>
    </div>
  );
}
