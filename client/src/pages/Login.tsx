import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';
import { LogIn, UserPlus } from 'lucide-react';

const Login: React.FC = () => {
  const { login } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    setError('');
    setSuccessMsg('');
    setEmail('');
    setPassword('');
    setFullName('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      if (isRegistering) {
        await authAPI.registerPublic({ email, password, fullName });
        setSuccessMsg('Registration successful! Please sign in with your credentials.');
        setIsRegistering(false);
        setEmail('');
        setPassword('');
        setFullName('');
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || `${isRegistering ? 'Registration' : 'Login'} failed. Please check your credentials.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card slide-up">
        <div className="logo-section">
          <div className="logo-icon">R</div>
          <h2>{isRegistering ? 'Create Landlord Account' : 'Welcome to RentaHub'}</h2>
          <p className="subtitle">
            {isRegistering ? 'Register as building admin/landlord' : 'Sign in to your property management portal'}
          </p>
        </div>

        {error && <div className="login-error">{error}</div>}
        {successMsg && (
          <div 
            className="login-success" 
            style={{ 
              background: 'rgba(16, 185, 129, 0.1)', 
              border: '1px solid rgba(16, 185, 129, 0.3)', 
              borderRadius: 'var(--radius-sm)', 
              padding: '0.75rem 1rem', 
              fontSize: '0.82rem', 
              color: 'var(--success)', 
              marginBottom: '1rem' 
            }}
          >
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isRegistering && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input id="register-fullname" type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="John Doe" required />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input id="login-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input id="login-password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          <button id="login-submit" type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }} disabled={loading}>
            {isRegistering ? (
              <>
                <UserPlus size={18} /> {loading ? 'Registering...' : 'Register'}
              </>
            ) : (
              <>
                <LogIn size={18} /> {loading ? 'Signing in...' : 'Sign In'}
              </>
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button 
            type="button" 
            onClick={toggleMode}
            style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 600, padding: 0, fontSize: 'inherit', textDecoration: 'underline' }}
          >
            {isRegistering ? 'Sign In' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
