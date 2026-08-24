import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../utils/AuthContext';
import './CreateProfile.css';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { logout } = useAuth();
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const from = location.state?.from?.pathname || '/tourist/dashboard';

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message);
      } else if (data.session) {
        navigate(from, { replace: true });
      }
    } catch (err) {
      setErrorMsg(err.message || 'An unexpected network error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setErrorMsg('Please enter your email address first to reset your password.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/tourist/login',
      });
      if (error) {
        setErrorMsg(error.message);
      } else {
        setSuccessMsg('Password reset instructions have been sent to your email.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-screen">
      <div className="profile-header">
        <h1 className="profile-brand">Tourist Guardian</h1>
        <p className="profile-subtitle">Secure Login</p>
      </div>

      <div className="animate-fade-in" style={{ marginTop: '20px' }}>
        <h2 className="profile-section-title">Welcome Back</h2>
        <p className="profile-section-desc">Sign in to access your personal safety profile and emergency contacts.</p>

        {errorMsg && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div style={{ backgroundColor: 'rgba(22, 163, 74, 0.1)', color: '#16a34a', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
            {successMsg}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="profile-form-group">
            <label className="input-label">Email Address</label>
            <input
              type="email"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="profile-form-group" style={{ position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="input-label" style={{ marginBottom: 0 }}>Password</label>
              <button 
                type="button" 
                onClick={handleForgotPassword}
                style={{ fontSize: 12, color: 'var(--secondary)', fontWeight: 600 }}
              >
                Forgot Password?
              </button>
            </div>
            <div style={{ position: 'relative', marginTop: 'var(--space-xs)' }}>
              <input
                type={showPassword ? "text" : "password"}
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                style={{ paddingRight: 40 }}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: 12, top: 12, color: 'var(--outline)' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <div className="profile-actions" style={{ flexDirection: 'column', gap: '12px', borderTop: 'none', paddingTop: 0 }}>
            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading || !email || !password}
            >
              {loading ? 'Processing...' : 'Sign In'}
            </button>
            
            <button
              type="button"
              className="btn btn-secondary btn-full"
              onClick={() => navigate('/')}
              disabled={loading}
            >
              Back to Welcome
            </button>
          </div>
          
          <div style={{ textAlign: 'center', marginTop: '24px', fontSize: 14, color: 'var(--on-surface-variant)' }}>
            Don't have an account? <button type="button" onClick={async () => { await logout(); navigate('/tourist/onboarding'); }} style={{ color: 'var(--secondary)', fontWeight: 600 }}>Create one</button>
          </div>
        </form>
      </div>
    </div>
  );
}
