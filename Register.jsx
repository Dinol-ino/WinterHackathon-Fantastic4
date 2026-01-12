// src/pages/Register.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';

const Register = () => {
  const navigate = useNavigate();
  const { register, updateWalletAddress } = useAuth();
  const { connectWallet, account, isConnected } = useWallet();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'investor' // Default role
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      // Register user with Firebase Auth and Firestore
      await register(
        formData.email,
        formData.password,
        formData.firstName,
        formData.lastName,
        formData.role
      );

      // If wallet is connected, save the address
      if (isConnected && account) {
        await updateWalletAddress(account);
      }

      // Redirect based on role
      if (formData.role === 'admin') {
        navigate('/admin/create');
      } else {
        navigate('/dashboard');
      }

    } catch (err) {
      console.error("Registration error:", err);
      let cleanError = err.message.replace('Firebase: ', '');
      if (cleanError.includes('email-already-in-use')) {
        cleanError = "An account with this email already exists";
      }
      setError(cleanError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: '450px' }}>
        <h2 className="text-center" style={{ marginBottom: '10px' }}>Create Account</h2>
        <p className="text-center" style={{ color: '#6b7280', marginBottom: '25px', fontSize: '0.9rem' }}>
          Start investing in tokenized real estate
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div className="form-group">
              <label>First Name</label>
              <input
                name="firstName"
                type="text"
                className="form-input"
                required
                onChange={handleChange}
                placeholder="John"
              />
            </div>
            <div className="form-group">
              <label>Last Name</label>
              <input
                name="lastName"
                type="text"
                className="form-input"
                required
                onChange={handleChange}
                placeholder="Doe"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input
              name="email"
              type="email"
              className="form-input"
              required
              onChange={handleChange}
              placeholder="you@example.com"
            />
          </div>

          <div className="form-group">
            <label>I want to</label>
            <select
              name="role"
              className="form-input"
              value={formData.role}
              onChange={handleChange}
              style={{ cursor: 'pointer' }}
            >
              <option value="investor">Invest in Properties</option>
              <option value="admin">List Properties for Sale</option>
            </select>
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              name="password"
              type="password"
              className="form-input"
              required
              onChange={handleChange}
              placeholder="At least 6 characters"
            />
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
            <input
              name="confirmPassword"
              type="password"
              className="form-input"
              required
              onChange={handleChange}
              placeholder="••••••••"
            />
          </div>

          {/* Wallet Connection Section */}
          <div style={{
            backgroundColor: '#f3f4f6',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <p style={{ fontSize: '0.85rem', marginBottom: '10px', color: '#374151' }}>
              <strong>Optional:</strong> Connect your MetaMask wallet now
            </p>
            <button
              onClick={connectWallet}
              type="button"
              className="btn-secondary"
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '10px',
                padding: '10px'
              }}
            >
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg"
                width="18"
                alt="MetaMask"
              />
              {isConnected
                ? `${account.slice(0, 6)}...${account.slice(-4)}`
                : "Connect Wallet"
              }
            </button>
          </div>

          <button
            type="submit"
            className="btn-primary btn-full"
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center" style={{ marginTop: '20px', fontSize: '0.9rem' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--primary)' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;