import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const authStyles = `
  .auth-page {
    min-height: 100vh; display: flex;
    background: linear-gradient(135deg, var(--navy-dark) 0%, var(--navy) 60%, var(--royal) 100%);
  }
  .auth-left {
    flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center;
    padding: 60px 48px; color: #fff;
  }
  .auth-right {
    width: 480px; background: var(--bg-primary);
    display: flex; align-items: center; justify-content: center;
    padding: 48px 40px; min-height: 100vh;
  }
  .auth-box { width: 100%; max-width: 400px; }
  .auth-logo { font-size: 2.2rem; margin-bottom: 24px; }
  .auth-brand { font-size: 1.8rem; font-weight: 800; margin-bottom: 8px; }
  .auth-brand-sub { font-size: 0.85rem; opacity: 0.6; margin-bottom: 40px; letter-spacing: 0.04em; }
  .auth-feature { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 20px; }
  .auth-feature-icon { font-size: 1.4rem; flex-shrink: 0; margin-top: 2px; }
  .auth-feature-text h4 { font-size: 0.95rem; font-weight: 600; margin-bottom: 2px; }
  .auth-feature-text p { font-size: 0.8rem; opacity: 0.6; }
  .auth-title { font-size: 1.5rem; font-weight: 800; color: var(--navy); margin-bottom: 4px; }
  .auth-subtitle { font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 32px; }
  .auth-divider { text-align: center; margin: 20px 0; position: relative; }
  .auth-divider::before { content:''; position:absolute; top:50%; left:0; right:0; height:1px; background:var(--border); }
  .auth-divider span { background: var(--bg-primary); padding: 0 12px; position:relative; font-size:0.8rem; color:var(--text-muted); }
  @media(max-width:768px){.auth-left{display:none}.auth-right{width:100%;min-height:100vh}}
`;

export const Login = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res = await authAPI.login(form);
      login(res.data.token, res.data.user);
      navigate(res.data.user.role === 'admin' ? '/admin' : '/');
    } catch (err) { setError(err.response?.data?.message || 'Login failed'); }
    setLoading(false);
  };

  return (
    <>
      <style>{authStyles}</style>
      <div className="auth-page">
        <div className="auth-left">
          <div className="auth-logo">🏆</div>
          <div className="auth-brand">PU TMS</div>
          <div className="auth-brand-sub">PANJAB UNIVERSITY TOURNAMENT MANAGEMENT SYSTEM</div>
          <div className="auth-feature">
            <div className="auth-feature-icon">🌐</div>
            <div className="auth-feature-text"><h4>Public Access</h4><p>Anyone can view tournaments, live scores & fixtures</p></div>
          </div>
          <div className="auth-feature">
            <div className="auth-feature-icon">👤</div>
            <div className="auth-feature-text"><h4>Team Registration</h4><p>Login to register your team in tournaments</p></div>
          </div>
          <div className="auth-feature">
            <div className="auth-feature-icon">⚙️</div>
            <div className="auth-feature-text"><h4>Admin Control</h4><p>Full tournament management and live scoring</p></div>
          </div>
        </div>
        <div className="auth-right">
          <div className="auth-box">
            <div className="auth-title">Welcome Back</div>
            <p className="auth-subtitle">Sign in to your PU TMS account</p>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input className="form-input" type="email" placeholder="your@email.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="form-input" type="password" placeholder="Enter password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
              </div>
              <button type="submit" className="btn btn-primary btn-lg" style={{width:'100%',marginTop:8}} disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
            <div className="auth-divider"><span>or</span></div>
            <p style={{textAlign:'center',fontSize:'0.875rem',color:'var(--text-secondary)'}}>
              Don't have an account? <Link to="/register" style={{color:'var(--royal)',fontWeight:600}}>Register here</Link>
            </p>
            <p style={{textAlign:'center',marginTop:16}}>
              <Link to="/tournaments" style={{color:'var(--text-muted)',fontSize:'0.8rem'}}>← Continue as guest (view only)</Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export const Register = () => {
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    if (form.password !== form.confirmPassword) return setError('Passwords do not match');
    if (form.password.length < 6) return setError('Password must be at least 6 characters');
    setLoading(true);
    try {
      const res = await authAPI.register({ username: form.username, email: form.email, password: form.password });
      login(res.data.token, res.data.user);
      navigate('/tournaments');
    } catch (err) { setError(err.response?.data?.message || 'Registration failed'); }
    setLoading(false);
  };

  return (
    <>
      <style>{authStyles}</style>
      <div className="auth-page">
        <div className="auth-left">
          <div className="auth-logo">🏆</div>
          <div className="auth-brand">PU TMS</div>
          <div className="auth-brand-sub">PANJAB UNIVERSITY TOURNAMENT MANAGEMENT SYSTEM</div>
          <div className="auth-feature">
            <div className="auth-feature-icon">📋</div>
            <div className="auth-feature-text"><h4>Register Teams</h4><p>Submit your team for any open tournament</p></div>
          </div>
          <div className="auth-feature">
            <div className="auth-feature-icon">📊</div>
            <div className="auth-feature-text"><h4>Track Progress</h4><p>Follow your team through the bracket live</p></div>
          </div>
          <div className="auth-feature">
            <div className="auth-feature-icon">🏆</div>
            <div className="auth-feature-text"><h4>Compete & Win</h4><p>Double Knockout — second chances for every team</p></div>
          </div>
        </div>
        <div className="auth-right">
          <div className="auth-box">
            <div className="auth-title">Create Account</div>
            <p className="auth-subtitle">Join PU TMS to register your team</p>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Username</label>
                <input className="form-input" type="text" placeholder="Choose a username" value={form.username} onChange={e => setForm({...form, username: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input className="form-input" type="email" placeholder="your@email.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="form-input" type="password" placeholder="Min 6 characters" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input className="form-input" type="password" placeholder="Re-enter password" value={form.confirmPassword} onChange={e => setForm({...form, confirmPassword: e.target.value})} required />
              </div>
              <button type="submit" className="btn btn-primary btn-lg" style={{width:'100%',marginTop:8}} disabled={loading}>
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
            <div className="auth-divider"><span>or</span></div>
            <p style={{textAlign:'center',fontSize:'0.875rem',color:'var(--text-secondary)'}}>
              Already have an account? <Link to="/login" style={{color:'var(--royal)',fontWeight:600}}>Sign in</Link>
            </p>
            <p style={{textAlign:'center',marginTop:12}}>
              <Link to="/tournaments" style={{color:'var(--text-muted)',fontSize:'0.8rem'}}>← Browse tournaments without account</Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};
