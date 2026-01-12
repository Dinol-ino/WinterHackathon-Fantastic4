// frontend/src/pages/PropertyDetails.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import Navbar from '../components/Navbar';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const PropertyDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const { account, isConnected, connectWallet, signer } = useWallet();

    const [property, setProperty] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState(0);
    const [sharesToBuy, setSharesToBuy] = useState(1);
    const [purchasing, setPurchasing] = useState(false);

    useEffect(() => {
        const fetchProperty = async () => {
            try {
                const docRef = doc(db, 'properties', id);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setProperty({ id: docSnap.id, ...docSnap.data() });
                } else {
                    // Try demo properties
                    console.log('Property not found in Firestore');
                }
            } catch (error) {
                console.error('Error fetching property:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchProperty();
    }, [id]);

    const handleBuyShares = async () => {
        if (!isConnected) {
            alert('Please connect your wallet first');
            return;
        }

        if (!currentUser) {
            navigate('/login');
            return;
        }

        setPurchasing(true);
        try {
            const totalCost = sharesToBuy * property.currentPrice;

            // In production, this would call the smart contract
            alert(`Purchase initiated!\n\nShares: ${sharesToBuy}\nTotal: ${totalCost} MATIC\n\nThis would trigger a blockchain transaction.`);

        } catch (error) {
            console.error('Purchase failed:', error);
            alert('Purchase failed: ' + error.message);
        } finally {
            setPurchasing(false);
        }
    };

    if (loading) {
        return (
            <div>
                <Navbar />
                <div style={{ paddingTop: '120px', textAlign: 'center' }}>Loading...</div>
            </div>
        );
    }

    if (!property) {
        return (
            <div>
                <Navbar />
                <div className="container" style={{ paddingTop: '120px', textAlign: 'center' }}>
                    <h2>Property Not Found</h2>
                    <button onClick={() => navigate('/marketplace')} className="btn-primary" style={{ marginTop: '20px' }}>
                        Back to Marketplace
                    </button>
                </div>
            </div>
        );
    }

    const soldPercent = Math.round(((property.totalShares - property.availableShares) / property.totalShares) * 100);
    const totalCost = sharesToBuy * (property.currentPrice || property.pricePerShare);
    const priceChange = property.currentPrice && property.initialPrice
        ? ((property.currentPrice - property.initialPrice) / property.initialPrice * 100).toFixed(2)
        : 0;

    return (
        <div>
            <Navbar />

            <main className="container" style={{ paddingTop: '100px', paddingBottom: '50px' }}>
                {/* Back Button */}
                <button
                    onClick={() => navigate(-1)}
                    style={{
                        marginBottom: '20px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#6b7280',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                    }}
                >
                    ← Back to listings
                </button>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
                    {/* Left Column - Images & Details */}
                    <div>
                        {/* Main Image */}
                        <div style={{
                            borderRadius: '16px',
                            overflow: 'hidden',
                            marginBottom: '15px'
                        }}>
                            <img
                                src={property.images?.[selectedImage]?.url || property.mainImageUrl || 'https://via.placeholder.com/800x400'}
                                alt={property.title}
                                style={{ width: '100%', height: '400px', objectFit: 'cover' }}
                            />
                        </div>

                        {/* Thumbnail Gallery */}
                        {property.images?.length > 1 && (
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '25px', overflowX: 'auto' }}>
                                {property.images.map((img, idx) => (
                                    <img
                                        key={idx}
                                        src={img.url}
                                        alt={`View ${idx + 1}`}
                                        onClick={() => setSelectedImage(idx)}
                                        style={{
                                            width: '80px',
                                            height: '60px',
                                            objectFit: 'cover',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            border: selectedImage === idx ? '3px solid #2563eb' : '2px solid transparent'
                                        }}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Property Info */}
                        <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '10px' }}>
                            {property.title}
                        </h1>

                        <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
                            <span style={{
                                backgroundColor: '#f3f4f6',
                                padding: '6px 12px',
                                borderRadius: '20px',
                                fontSize: '0.85rem'
                            }}>
                                📍 {property.location?.address?.split(',').slice(0, 2).join(',')}
                            </span>
                            <span style={{
                                backgroundColor: '#f3f4f6',
                                padding: '6px 12px',
                                borderRadius: '20px',
                                fontSize: '0.85rem'
                            }}>
                                🏠 {property.propertyType}
                            </span>
                            <span style={{
                                backgroundColor: '#f3f4f6',
                                padding: '6px 12px',
                                borderRadius: '20px',
                                fontSize: '0.85rem'
                            }}>
                                📐 {property.area} sq ft
                            </span>
                        </div>

                        <p style={{ color: '#4b5563', lineHeight: 1.7, marginBottom: '30px' }}>
                            {property.description}
                        </p>

                        {/* Map */}
                        {property.location?.lat && (
                            <div style={{ marginBottom: '30px' }}>
                                <h3 style={{ marginBottom: '15px', fontWeight: '600' }}>Location</h3>
                                <div style={{ height: '250px', borderRadius: '12px', overflow: 'hidden' }}>
                                    <MapContainer
                                        center={[property.location.lat, property.location.lng]}
                                        zoom={15}
                                        style={{ height: '100%', width: '100%' }}
                                    >
                                        <TileLayer
                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        />
                                        <Marker position={[property.location.lat, property.location.lng]} />
                                    </MapContainer>
                                </div>
                            </div>
                        )}

                        {/* Amenities */}
                        {property.amenities?.length > 0 && (
                            <div>
                                <h3 style={{ marginBottom: '15px', fontWeight: '600' }}>Amenities</h3>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    {property.amenities.map((amenity, idx) => (
                                        <span key={idx} style={{
                                            backgroundColor: '#ecfdf5',
                                            color: '#065f46',
                                            padding: '8px 14px',
                                            borderRadius: '8px',
                                            fontSize: '0.9rem'
                                        }}>
                                            ✓ {amenity}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column - Investment Card */}
                    <div>
                        <div style={{
                            backgroundColor: 'white',
                            borderRadius: '16px',
                            padding: '25px',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                            position: 'sticky',
                            top: '100px'
                        }}>
                            <h3 style={{ marginBottom: '20px', fontWeight: '600' }}>Invest in this Property</h3>

                            {/* Pricing */}
                            <div style={{ marginBottom: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <span style={{ color: '#6b7280' }}>Current Price</span>
                                    <span style={{ fontWeight: '600', color: '#2563eb', fontSize: '1.2rem' }}>
                                        {property.currentPrice || property.pricePerShare} MATIC
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <span style={{ color: '#6b7280' }}>Initial Price</span>
                                    <span style={{ color: '#9ca3af' }}>
                                        {property.initialPrice || property.pricePerShare} MATIC
                                    </span>
                                </div>
                                {priceChange !== 0 && (
                                    <div style={{
                                        textAlign: 'right',
                                        fontSize: '0.85rem',
                                        color: priceChange > 0 ? '#10b981' : '#ef4444'
                                    }}>
                                        {priceChange > 0 ? '↑' : '↓'} {Math.abs(priceChange)}% from initial
                                    </div>
                                )}
                            </div>

                            {/* Progress */}
                            <div style={{ marginBottom: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '0.9rem' }}>
                                    <span>{soldPercent}% Funded</span>
                                    <span>{property.availableShares} / {property.totalShares} shares</span>
                                </div>
                                <div style={{
                                    backgroundColor: '#e5e7eb',
                                    borderRadius: '10px',
                                    height: '10px',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{
                                        width: `${soldPercent}%`,
                                        height: '100%',
                                        backgroundColor: '#10b981',
                                        borderRadius: '10px'
                                    }} />
                                </div>
                            </div>

                            {/* Share Calculator */}
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ fontWeight: '500', marginBottom: '8px', display: 'block' }}>
                                    Shares to Buy
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max={property.availableShares}
                                    value={sharesToBuy}
                                    onChange={(e) => setSharesToBuy(Math.max(1, parseInt(e.target.value) || 1))}
                                    className="form-input"
                                    style={{ marginBottom: '10px' }}
                                />
                                <div style={{
                                    backgroundColor: '#f3f4f6',
                                    padding: '15px',
                                    borderRadius: '8px'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span>Shares</span>
                                        <span>{sharesToBuy}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span>Price/Share</span>
                                        <span>{property.currentPrice || property.pricePerShare} MATIC</span>
                                    </div>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        fontWeight: '600',
                                        fontSize: '1.1rem',
                                        paddingTop: '8px',
                                        borderTop: '1px solid #e5e7eb'
                                    }}>
                                        <span>Total</span>
                                        <span style={{ color: '#2563eb' }}>{totalCost.toFixed(4)} MATIC</span>
                                    </div>
                                </div>
                            </div>

                            {/* Buy Button */}
                            {isConnected ? (
                                <button
                                    onClick={handleBuyShares}
                                    disabled={purchasing || property.availableShares === 0}
                                    className="btn-primary btn-full"
                                    style={{ padding: '15px', fontSize: '1rem' }}
                                >
                                    {purchasing ? 'Processing...' : `Buy ${sharesToBuy} Share${sharesToBuy > 1 ? 's' : ''}`}
                                </button>
                            ) : (
                                <button
                                    onClick={connectWallet}
                                    className="btn-primary btn-full"
                                    style={{ padding: '15px', fontSize: '1rem' }}
                                >
                                    Connect Wallet to Invest
                                </button>
                            )}

                            {/* Market Value */}
                            <div style={{
                                marginTop: '20px',
                                padding: '15px',
                                backgroundColor: '#f0fdf4',
                                borderRadius: '8px',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '5px' }}>
                                    Implied Market Value
                                </div>
                                <div style={{ fontSize: '1.3rem', fontWeight: '600', color: '#059669' }}>
                                    {((property.currentPrice || property.pricePerShare) * property.totalShares).toFixed(2)} MATIC
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default PropertyDetails;
