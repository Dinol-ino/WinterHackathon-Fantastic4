// frontend/src/pages/Login.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';

const Login = () => {
  const navigate = useNavigate();
  const { login, userData } = useAuth();
  const { connectWallet, account, isConnected, connecting } = useWallet();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);

      // Role-based redirect will happen after userData loads
      // For now, redirect to dashboard (protected route will handle the rest)
      navigate('/dashboard');

    } catch (err) {
      console.error('Login error:', err);
      let errorMessage = err.message.replace('Firebase: ', '');
      if (errorMessage.includes('auth/invalid-credential')) {
        errorMessage = 'Invalid email or password';
      } else if (errorMessage.includes('auth/user-not-found')) {
        errorMessage = 'No account found with this email';
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="text-center" style={{ marginBottom: '10px' }}>Welcome Back</h2>
        <p className="text-center" style={{ color: '#6b7280', marginBottom: '25px', fontSize: '0.9rem' }}>
          Sign in to access your portfolio
        </p>

        {error && (
          <div style={{
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            padding: '10px',
            borderRadius: '6px',
            marginBottom: '15px',
            fontSize: '0.9rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary btn-full"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{
          marginTop: '25px',
          borderTop: '1px solid #e5e7eb',
          paddingTop: '25px'
        }}>
          <p className="text-center" style={{ fontSize: '0.9rem', marginBottom: '12px', color: '#6b7280' }}>
            Connect your wallet for blockchain transactions
          </p>
          <button
            onClick={connectWallet}
            type="button"
            className="btn-secondary btn-full"
            disabled={connecting}
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '10px',
              opacity: connecting ? 0.7 : 1
            }}
          >
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg"
              width="20"
              alt="MetaMask"
            />
            {connecting
              ? "Connecting..."
              : isConnected
                ? `Connected: ${account.slice(0, 6)}...${account.slice(-4)}`
                : "Connect MetaMask"
            }
          </button>
          {isConnected && (
            <p style={{
              marginTop: '10px',
              fontSize: '0.8rem',
              color: '#10b981',
              textAlign: 'center'
            }}>
              ✓ Wallet connected to Polygon Amoy
            </p>
          )}
        </div>

        <p className="text-center" style={{ marginTop: '20px', fontSize: '0.9rem' }}>
          Don't have an account? <Link to="/register" style={{ color: 'var(--primary)' }}>Sign up</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;