// src/components/Navbar.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';

const Navbar = () => {
  const { currentUser, userData, logout } = useAuth();
  const { account, isConnected, connectWallet } = useWallet();

  return (
    <nav className="navbar">
      <div className="container flex justify-between" style={{ height: '100%' }}>
        <Link to="/" className="nav-logo">BlockEstate</Link>

        <div className="nav-links flex" style={{ alignItems: 'center' }}>
          <a href="/#process">How it Works</a>
          <Link to="/marketplace">Marketplace</Link>

          {currentUser ? (
            <>
              <Link to="/sell">Sell</Link>
              <Link to="/resale">Resale</Link>
              {userData?.role === 'admin' && (
                <Link to="/admin">Admin</Link>
              )}
              <Link to="/dashboard">Dashboard</Link>

              {/* Wallet Button */}
              {isConnected ? (
                <span style={{
                  backgroundColor: '#ecfdf5',
                  color: '#065f46',
                  padding: '8px 14px',
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                  marginLeft: '10px'
                }}>
                  {account.slice(0, 6)}...{account.slice(-4)}
                </span>
              ) : (
                <button
                  onClick={connectWallet}
                  style={{
                    backgroundColor: '#f59e0b',
                    color: 'white',
                    padding: '8px 14px',
                    borderRadius: '20px',
                    border: 'none',
                    cursor: 'pointer',
                    marginLeft: '10px',
                    fontSize: '0.85rem'
                  }}
                >
                  Connect Wallet
                </button>
              )}

              <button
                onClick={logout}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6b7280',
                  cursor: 'pointer',
                  marginLeft: '15px',
                  fontSize: '0.9rem'
                }}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Log In</Link>
              <Link to="/register" className="btn-nav">Get Started</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;