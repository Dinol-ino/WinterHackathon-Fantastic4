// frontend/src/pages/ResaleMarketplace.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where, orderBy, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import Navbar from '../components/Navbar';

/**
 * ResaleMarketplace
 * Secondary market for users to buy/sell owned shares at custom prices
 */
const ResaleMarketplace = () => {
    const navigate = useNavigate();
    const { currentUser, userData } = useAuth();
    const { account, isConnected, connectWallet } = useWallet();

    const [listings, setListings] = useState([]);
    const [myListings, setMyListings] = useState([]);
    const [myShares, setMyShares] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('browse'); // 'browse', 'sell', 'my-listings'

    // Sell form state
    const [sellForm, setSellForm] = useState({
        propertyId: '',
        shares: '',
        pricePerShare: ''
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch active resale listings
                const listingsRef = collection(db, 'resaleListings');
                const listingsQuery = query(listingsRef, where('isActive', '==', true), orderBy('createdAt', 'desc'));
                const listingsSnap = await getDocs(listingsQuery);
                setListings(listingsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

                // Fetch user's own listings
                if (currentUser) {
                    const myListingsQuery = query(listingsRef, where('sellerUid', '==', currentUser.uid));
                    const myListingsSnap = await getDocs(myListingsQuery);
                    setMyListings(myListingsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

                    // Fetch user's owned shares
                    const sharesRef = collection(db, 'userShares');
                    const sharesQuery = query(sharesRef, where('userId', '==', currentUser.uid));
                    const sharesSnap = await getDocs(sharesQuery);
                    setMyShares(sharesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [currentUser]);

    // Create resale listing
    const handleCreateListing = async (e) => {
        e.preventDefault();

        if (!currentUser || !isConnected) {
            alert('Please login and connect your wallet');
            return;
        }

        try {
            await addDoc(collection(db, 'resaleListings'), {
                propertyId: sellForm.propertyId,
                sellerUid: currentUser.uid,
                sellerWallet: account,
                sellerEmail: currentUser.email,
                sharesForSale: parseInt(sellForm.shares),
                pricePerShare: parseFloat(sellForm.pricePerShare),
                sharesSold: 0,
                isActive: true,
                createdAt: serverTimestamp()
            });

            alert('Listing created successfully!');
            setSellForm({ propertyId: '', shares: '', pricePerShare: '' });
            setTab('my-listings');

            // Refresh listings
            window.location.reload();
        } catch (error) {
            console.error('Error creating listing:', error);
            alert('Failed to create listing: ' + error.message);
        }
    };

    // Buy from resale listing
    const handleBuy = async (listing, sharesToBuy) => {
        if (!currentUser || !isConnected) {
            alert('Please login and connect your wallet');
            return;
        }

        try {
            const totalCost = sharesToBuy * listing.pricePerShare;

            // In production, this would:
            // 1. Call smart contract buyFromResale()
            // 2. Update Firestore listing
            // 3. Record in resale history
            // 4. Update property's current price

            alert(`Purchase initiated!\n\nShares: ${sharesToBuy}\nTotal: ${totalCost} MATIC\n\nThis updates the market price.`);

            // Update listing in Firestore (mock)
            const listingRef = doc(db, 'resaleListings', listing.id);
            const newSharesSold = listing.sharesSold + sharesToBuy;
            await updateDoc(listingRef, {
                sharesSold: newSharesSold,
                isActive: newSharesSold < listing.sharesForSale
            });

            // Record resale for price history
            await addDoc(collection(db, 'resaleHistory'), {
                propertyId: listing.propertyId,
                listingId: listing.id,
                pricePerShare: listing.pricePerShare,
                shares: sharesToBuy,
                buyer: account,
                seller: listing.sellerWallet,
                timestamp: serverTimestamp()
            });

            // Update property's current price
            const propRef = doc(db, 'properties', listing.propertyId);
            await updateDoc(propRef, {
                currentPrice: listing.pricePerShare,
                lastResaleAt: serverTimestamp()
            });

            window.location.reload();
        } catch (error) {
            console.error('Purchase failed:', error);
            alert('Purchase failed: ' + error.message);
        }
    };

    // Cancel listing
    const handleCancelListing = async (listing) => {
        if (!confirm('Cancel this listing?')) return;

        try {
            await updateDoc(doc(db, 'resaleListings', listing.id), {
                isActive: false,
                cancelledAt: serverTimestamp()
            });

            alert('Listing cancelled');
            window.location.reload();
        } catch (error) {
            console.error('Cancel failed:', error);
        }
    };

    return (
        <div>
            <Navbar />

            <main className="container" style={{ paddingTop: '100px', paddingBottom: '50px' }}>
                {/* Header */}
                <div style={{ marginBottom: '30px' }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '10px' }}>
                        Resale Marketplace
                    </h1>
                    <p style={{ color: '#6b7280' }}>
                        Buy and sell property shares on the secondary market
                    </p>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', borderBottom: '2px solid #e5e7eb', paddingBottom: '10px' }}>
                    {['browse', 'sell', 'my-listings'].map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            style={{
                                padding: '10px 20px',
                                borderRadius: '8px',
                                border: 'none',
                                backgroundColor: tab === t ? '#2563eb' : 'transparent',
                                color: tab === t ? 'white' : '#6b7280',
                                cursor: 'pointer',
                                fontWeight: tab === t ? '600' : '400'
                            }}
                        >
                            {t === 'browse' ? '🛒 Browse Listings' : t === 'sell' ? '💰 Sell Shares' : '📋 My Listings'}
                        </button>
                    ))}
                </div>

                {/* Browse Listings Tab */}
                {tab === 'browse' && (
                    <div>
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                                Loading listings...
                            </div>
                        ) : listings.length === 0 ? (
                            <div style={{
                                textAlign: 'center',
                                padding: '60px',
                                backgroundColor: '#f9fafb',
                                borderRadius: '12px'
                            }}>
                                <h3>No Active Listings</h3>
                                <p style={{ color: '#6b7280', marginTop: '10px' }}>
                                    Be the first to list your shares for resale!
                                </p>
                                <button
                                    onClick={() => setTab('sell')}
                                    className="btn-primary"
                                    style={{ marginTop: '20px' }}
                                >
                                    List Shares for Sale
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                                {listings.map(listing => {
                                    const remainingShares = listing.sharesForSale - listing.sharesSold;
                                    return (
                                        <div key={listing.id} className="card" style={{ padding: '20px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                                                <span style={{ fontWeight: '600' }}>Property #{listing.propertyId?.slice(-6)}</span>
                                                <span style={{
                                                    backgroundColor: '#10b981',
                                                    color: 'white',
                                                    padding: '4px 10px',
                                                    borderRadius: '12px',
                                                    fontSize: '0.8rem'
                                                }}>
                                                    {remainingShares} shares
                                                </span>
                                            </div>

                                            <div style={{ marginBottom: '15px' }}>
                                                <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>Price per share</div>
                                                <div style={{ fontSize: '1.3rem', fontWeight: '600', color: '#2563eb' }}>
                                                    {listing.pricePerShare} MATIC
                                                </div>
                                            </div>

                                            <div style={{
                                                backgroundColor: '#f3f4f6',
                                                padding: '10px',
                                                borderRadius: '8px',
                                                marginBottom: '15px',
                                                fontSize: '0.85rem'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span>Total value:</span>
                                                    <span style={{ fontWeight: '600' }}>
                                                        {(remainingShares * listing.pricePerShare).toFixed(4)} MATIC
                                                    </span>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleBuy(listing, 1)}
                                                className="btn-primary btn-full"
                                                disabled={!isConnected || listing.sellerUid === currentUser?.uid}
                                            >
                                                {listing.sellerUid === currentUser?.uid ? 'Your Listing' : 'Buy 1 Share'}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Sell Shares Tab */}
                {tab === 'sell' && (
                    <div style={{ maxWidth: '500px', margin: '0 auto' }}>
                        <div className="card" style={{ padding: '30px' }}>
                            <h3 style={{ marginBottom: '20px' }}>List Shares for Sale</h3>

                            {!currentUser ? (
                                <div style={{ textAlign: 'center' }}>
                                    <p style={{ marginBottom: '15px', color: '#6b7280' }}>
                                        Please login to sell shares
                                    </p>
                                    <button onClick={() => navigate('/login')} className="btn-primary">
                                        Login
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleCreateListing}>
                                    <div className="form-group">
                                        <label>Property ID</label>
                                        <input
                                            className="form-input"
                                            value={sellForm.propertyId}
                                            onChange={e => setSellForm({ ...sellForm, propertyId: e.target.value })}
                                            placeholder="Enter property ID"
                                            required
                                        />
                                        <small style={{ color: '#9ca3af' }}>
                                            Find this in your dashboard under owned shares
                                        </small>
                                    </div>

                                    <div className="form-group">
                                        <label>Number of Shares to Sell</label>
                                        <input
                                            type="number"
                                            min="1"
                                            className="form-input"
                                            value={sellForm.shares}
                                            onChange={e => setSellForm({ ...sellForm, shares: e.target.value })}
                                            placeholder="10"
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Price per Share (MATIC)</label>
                                        <input
                                            type="number"
                                            step="0.001"
                                            min="0.001"
                                            className="form-input"
                                            value={sellForm.pricePerShare}
                                            onChange={e => setSellForm({ ...sellForm, pricePerShare: e.target.value })}
                                            placeholder="0.5"
                                            required
                                        />
                                        <small style={{ color: '#9ca3af' }}>
                                            Set any price you want - this affects the market price when sold
                                        </small>
                                    </div>

                                    {sellForm.shares && sellForm.pricePerShare && (
                                        <div style={{
                                            backgroundColor: '#f0fdf4',
                                            padding: '15px',
                                            borderRadius: '8px',
                                            marginBottom: '20px',
                                            border: '1px solid #10b981'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span>Total if all sold:</span>
                                                <strong style={{ color: '#10b981' }}>
                                                    {(parseFloat(sellForm.pricePerShare) * parseInt(sellForm.shares)).toFixed(4)} MATIC
                                                </strong>
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        className="btn-primary btn-full"
                                        disabled={!isConnected}
                                        style={{ padding: '14px' }}
                                    >
                                        {isConnected ? 'Create Listing' : 'Connect Wallet First'}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                )}

                {/* My Listings Tab */}
                {tab === 'my-listings' && (
                    <div>
                        {myListings.length === 0 ? (
                            <div style={{
                                textAlign: 'center',
                                padding: '60px',
                                backgroundColor: '#f9fafb',
                                borderRadius: '12px'
                            }}>
                                <h3>No Active Listings</h3>
                                <p style={{ color: '#6b7280', marginTop: '10px' }}>
                                    You haven't listed any shares for resale yet.
                                </p>
                                <button
                                    onClick={() => setTab('sell')}
                                    className="btn-primary"
                                    style={{ marginTop: '20px' }}
                                >
                                    Create Listing
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                                {myListings.map(listing => {
                                    const remainingShares = listing.sharesForSale - listing.sharesSold;
                                    return (
                                        <div key={listing.id} className="card" style={{ padding: '20px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                                                <span style={{ fontWeight: '600' }}>Property #{listing.propertyId?.slice(-6)}</span>
                                                <span style={{
                                                    backgroundColor: listing.isActive ? '#10b981' : '#6b7280',
                                                    color: 'white',
                                                    padding: '4px 10px',
                                                    borderRadius: '12px',
                                                    fontSize: '0.8rem'
                                                }}>
                                                    {listing.isActive ? 'Active' : 'Completed'}
                                                </span>
                                            </div>

                                            <div style={{ marginBottom: '10px' }}>
                                                <span style={{ color: '#6b7280' }}>Price: </span>
                                                <strong>{listing.pricePerShare} MATIC</strong>
                                            </div>

                                            <div style={{ marginBottom: '15px' }}>
                                                <span style={{ color: '#6b7280' }}>Sold: </span>
                                                <strong>{listing.sharesSold} / {listing.sharesForSale}</strong>
                                            </div>

                                            {listing.isActive && (
                                                <button
                                                    onClick={() => handleCancelListing(listing)}
                                                    className="btn-secondary btn-full"
                                                >
                                                    Cancel Listing
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

export default ResaleMarketplace;
