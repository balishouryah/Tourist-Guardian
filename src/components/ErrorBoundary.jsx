import React from 'react';
import { useNavigate } from 'react-router-dom';
import EmergencyPoliceButton from './EmergencyPoliceButton';

class ErrorBoundaryInner extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--background)', color: 'var(--on-background)', padding: '24px', boxSizing: 'border-box' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 64, color: 'var(--error)', marginBottom: '16px' }}>warning</span>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '24px', color: 'var(--error)' }}>⚠️ Emergency Screen Error</h2>
            <p style={{ fontSize: '16px', color: 'var(--on-surface)', marginBottom: '24px' }}>
              Something went wrong while displaying this screen.
            </p>
            <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)', marginBottom: '32px', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {this.state.error?.toString()}
            </p>
            <div style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  this.props.navigate('/tourist/dashboard');
                }}
                style={{ padding: '16px', fontSize: '16px', fontWeight: 'bold', width: '100%' }}
              >
                RETURN TO DASHBOARD
              </button>
              <EmergencyPoliceButton phoneNumber="112" />
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function ErrorBoundary(props) {
  const navigate = useNavigate();
  return <ErrorBoundaryInner {...props} navigate={navigate} />;
}
