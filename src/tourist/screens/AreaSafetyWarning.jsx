import { useNavigate } from 'react-router-dom';
import './AreaSafetyWarning.css';

export default function AreaSafetyWarning() {
  const navigate = useNavigate();

  return (
    <div className="area-warning-screen">
      {/* Warning icon */}
      <div className="area-warning-icon-wrap">
        <div className="area-warning-icon pulse-ring">
          <span className="material-symbols-outlined icon-filled">warning</span>
        </div>
      </div>

      {/* Title */}
      <h1 className="area-warning-title">ENTERING HIGH-RISK AREA</h1>
      <p className="area-warning-location">Mawphlang Forest Trail</p>
      <p className="area-warning-date">August 2026</p>

      {/* Safety Score */}
      <div className="area-warning-score-card">
        <p className="area-warning-score-label">Safety Score</p>
        <div className="area-warning-score-row">
          <span className="area-warning-score-number">64</span>
          <span className="area-warning-score-max">/100</span>
        </div>
        <div className="area-warning-score-bar">
          <div className="area-warning-score-fill" />
        </div>
      </div>

      {/* Active Concerns */}
      <div className="area-warning-concerns">
        <p className="area-warning-concerns-title">Active Concerns</p>
        <div className="area-warning-concern-item">
          <span className="material-symbols-outlined">signal_cellular_connected_no_internet_0_bar</span>
          Weak cellular network
        </div>
        <div className="area-warning-concern-item">
          <span className="material-symbols-outlined">group_off</span>
          Low tourist density currently
        </div>
      </div>

      {/* Required Actions */}
      <div className="area-warning-actions-card">
        <p className="area-warning-actions-title">Required Actions</p>

        <div className="area-warning-action-item">
          <div className="area-warning-action-left">
            <span className="material-symbols-outlined">download</span>
            <span className="area-warning-action-text">Download offline maps & info</span>
          </div>
          <button className="area-warning-action-btn">Download</button>
        </div>

        <div className="area-warning-action-item">
          <div className="area-warning-action-left">
            <span className="material-symbols-outlined">contact_emergency</span>
            <span className="area-warning-action-text">Notify emergency contact</span>
          </div>
          <button className="area-warning-action-btn">Notify</button>
        </div>
      </div>

      {/* CTA */}
      <div className="area-warning-cta">
        <button
          className="btn btn-primary btn-full btn-lg"
          onClick={() => navigate('/tourist/dashboard')}
        >
          ACKNOWLEDGE & CONTINUE
        </button>
      </div>
    </div>
  );
}
