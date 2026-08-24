import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authoritySupabase } from '../../lib/supabase';
import { useAuthorityAuth } from '../utils/AuthorityAuthContext';

import './AuthorityLogin.css';

export default function AuthorityLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/authority/dashboard';

  const { isAuthority, user, loading: authLoading } = useAuthorityAuth();

  // If already authenticated and authorized, redirect immediately
  useEffect(() => {
    if (!authLoading && user && isAuthority) {
      navigate(from, { replace: true });
    }
  }, [user, isAuthority, authLoading, navigate, from]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setLoading(true);
    setErrorMsg('');

    try {
      const { data, error } = await authoritySupabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message);
      } else if (data.session) {
        // AuthContext will fetch the profile and check role
        // The router will automatically handle the redirect in App.jsx if we trigger a re-render
        // For AuthorityLogin, we should probably wait for context to update, or just navigate
        // and let RequireAuthorityAuth do its job.
        navigate(from, { replace: true });
      }
    } catch (err) {
      setErrorMsg(err.message || 'An unexpected network error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="authority-login-screen">
      <div className="authority-login-container animate-fade-in">
        <div className="authority-login-header">
          <h1 className="authority-brand">TOURIST GUARDIAN</h1>
          <p className="authority-subtitle">Authority Command Portal</p>
        </div>

        {errorMsg && (
          <div className="authority-message error">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="authority-form-group">
            <label className="authority-input-label">Official Email</label>
            <input
              type="email"
              className="authority-input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operator@authority.gov"
              required
            />
          </div>

          <div className="authority-form-group" style={{ position: 'relative' }}>
            <label className="authority-input-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? "text" : "password"}
                className="authority-input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter secure password"
                required
                style={{ paddingRight: 40 }}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: 12, top: 12, color: 'var(--outline)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="authority-btn authority-btn-primary"
            disabled={loading || !email || !password}
          >
            {loading ? 'Authenticating...' : 'Access Command Center'}
          </button>
          
          <button
            type="button"
            className="authority-btn authority-btn-secondary"
            onClick={() => navigate('/')}
            disabled={loading}
          >
            Return to Public Portal
          </button>
        </form>
      </div>
    </div>
  );
}
