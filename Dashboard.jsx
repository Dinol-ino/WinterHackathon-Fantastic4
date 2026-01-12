// src/pages/Dashboard.jsx
import React from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import { Navigate, Link } from 'react-router-dom';

// Mock Data for MVP - will be replaced with real data from Firestore/Blockchain
const MOCK_INVESTMENTS = [
  {
    id: 1,
    title: "Luxury Apartment #402",
    location: "Mumbai, India",
    invested: 50,
    shares: 10,
    currentValue: 55,
    image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=100&q=80"
  },
  {
    id: 2,
    title: "Oceanview Villa",
    location: "Goa, India",
    invested: 120,
    shares: 5,
    currentValue: 135,
    image: "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=100&q=80"
  },
];

const Dashboard = () => {
  const { currentUser, userData, logout, isAdmin } = useAuth();
  const { account, isConnected, connectWallet } = useWallet();

  // Redirect to login if not authenticated
  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  // Calculate Totals
  const totalInvested = MOCK_INVESTMENTS.reduce((acc, item) => acc + item.invested, 0);
  const totalValue = MOCK_INVESTMENTS.reduce((acc, item) => acc + item.currentValue, 0);

  return (
    <div>
      <Navbar />

      <main className="container" style={{ paddingTop: '100px', paddingBottom: '50px' }}>

        {/* Header */}
        <div className="flex justify-between" style={{ marginBottom: '30px', alignItems: 'flex-start', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '5px' }}>
              Welcome back, {userData?.firstName || 'Investor'}
            </h1>
            <p style={{ color: '#666' }}>
              {isAdmin ? 'Manage your property listings' : 'Here is your portfolio performance overview.'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {isAdmin && (
              <Link to="/admin/create" className="btn-primary" style={{ padding: '10px 20px' }}>
                + List Property
              </Link>
            )}
            <button onClick={logout} className="btn-secondary" style={{ padding: '10px 20px' }}>
              Sign Out
            </button>
          </div>
        </div>

        {/* Wallet Connection Warning */}
        {!isConnected && (
          <div style={{
            backgroundColor: '#fef3c7',
            border: '1px solid #f59e0b',
            color: '#92400e',
            padding: '15px 20px',
            borderRadius: '8px',
            marginBottom: '25px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <span>⚠️ Connect your MetaMask wallet to make blockchain transactions</span>
            <button
              onClick={connectWallet}
              style={{
                backgroundColor: '#f59e0b',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Connect Wallet
            </button>
          </div>
        )}

        {/* Wallet Info */}
        {isConnected && (
          <div style={{
            backgroundColor: '#ecfdf5',
            border: '1px solid #10b981',
            color: '#065f46',
            padding: '12px 20px',
            borderRadius: '8px',
            marginBottom: '25px',
            fontSize: '0.9rem'
          }}>
            ✓ Wallet Connected: <code style={{ backgroundColor: '#d1fae5', padding: '2px 6px', borderRadius: '4px' }}>{account}</code>
          </div>
        )}

        {/* Stats Row */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Invested</div>
            <div className="stat-value">{totalInvested} MATIC</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Current Valuation</div>
            <div className="stat-value" style={{ color: '#10b981' }}>{totalValue} MATIC</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Active Properties</div>
            <div className="stat-value">{MOCK_INVESTMENTS.length}</div>
          </div>
        </div>

        {/* Assets Table */}
        <h3 style={{ fontSize: '1.2rem', marginBottom: '15px', fontWeight: '600' }}>Your Assets</h3>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Property</th>
                <th>Shares</th>
                <th>Avg. Cost</th>
                <th>Current Value</th>
                <th>Return</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_INVESTMENTS.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                    No investments yet. <Link to="/marketplace" style={{ color: 'var(--primary)' }}>Browse properties</Link>
                  </td>
                </tr>
              ) : (
                MOCK_INVESTMENTS.map((asset) => {
                  const gain = ((asset.currentValue - asset.invested) / asset.invested * 100).toFixed(1);
                  const isPositive = asset.currentValue >= asset.invested;

                  return (
                    <tr key={asset.id}>
                      <td>
                        <div className="asset-info">
                          <img src={asset.image} alt="" className="asset-img" />
                          <div>
                            <div style={{ fontWeight: '600', color: '#111827' }}>{asset.title}</div>
                            <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>{asset.location}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ color: '#4b5563' }}>{asset.shares}</td>
                      <td style={{ color: '#4b5563' }}>{(asset.invested / asset.shares).toFixed(2)} MATIC</td>
                      <td style={{ fontWeight: '600' }}>{asset.currentValue} MATIC</td>
                      <td>
                        <span className={`badge ${isPositive ? 'badge-green' : 'badge-red'}`}>
                          {isPositive ? '+' : ''}{gain}%
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </main>
    </div>
  );
};

export default Dashboard;