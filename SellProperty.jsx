// frontend/src/pages/SellProperty.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import Navbar from '../components/Navbar';
import axios from 'axios';

const SellProperty = () => {
    const navigate = useNavigate();
    const { currentUser, userData } = useAuth();
    const { account, isConnected, connectWallet } = useWallet();

    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);
    const [form, setForm] = useState({
        title: '',
        description: '',
        location: '',
        pricePerShare: '',
        totalShares: '',
        propertyType: 'residential',
        area: '',
        amenities: ''
    });
    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [documents, setDocuments] = useState([]);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImage(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleDocumentChange = (e) => {
        const files = Array.from(e.target.files);
        setDocuments(prev => [...prev, ...files.map(f => ({ file: f, name: f.name }))]);
    };

    const removeDocument = (index) => {
        setDocuments(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!currentUser) {
            alert('Please login first');
            navigate('/login');
            return;
        }

        if (!isConnected) {
            alert('Please connect your MetaMask wallet');
            return;
        }

        setLoading(true);

        try {
            // Step 1: Upload image
            let imageUrl = '';
            if (image) {
                const formData = new FormData();
                formData.append('file', image);

                try {
                    const res = await axios.post(
                        `${import.meta.env.VITE_API_BASE_URL}/admin/upload`,
                        formData,
                        { headers: { 'Content-Type': 'multipart/form-data' } }
                    );
                    imageUrl = res.data.url;
                } catch {
                    // Use placeholder if upload fails
                    imageUrl = `https://via.placeholder.com/400x300?text=${encodeURIComponent(form.title)}`;
                }
            }

            // Step 2: Upload documents (simplified - would use IPFS in production)
            const uploadedDocs = documents.map(doc => ({
                name: doc.name,
                url: '#', // Would be IPFS URL in production
                uploadedAt: new Date().toISOString()
            }));

            // Step 3: Create property request in Firestore
            await addDoc(collection(db, 'propertyRequests'), {
                // Property Details
                title: form.title,
                description: form.description,
                location: form.location,
                pricePerShare: parseFloat(form.pricePerShare),
                totalShares: parseInt(form.totalShares),
                propertyType: form.propertyType,
                area: form.area,
                amenities: form.amenities.split(',').map(a => a.trim()),
                imageUrl: imageUrl,
                documents: uploadedDocs,

                // Seller Info
                sellerUid: currentUser.uid,
                sellerEmail: currentUser.email,
                sellerWallet: account,
                sellerName: userData?.firstName + ' ' + userData?.lastName,

                // Status & Tracking
                status: 'REQUESTED',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),

                // Admin fields (to be filled by admin)
                adminNotes: '',
                reviewedBy: null,
                certificateGenerated: false,
                rejectionReason: '',
                responseDeadline: null // Will be set to 10 days if issues found
            });

            alert('Property request submitted successfully! You will receive an email once reviewed.');
            navigate('/dashboard');

        } catch (error) {
            console.error('Error submitting request:', error);
            alert('Failed to submit request: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    if (!currentUser) {
        return (
            <div>
                <Navbar />
                <div className="container" style={{ paddingTop: '120px', textAlign: 'center' }}>
                    <h2>Please login to sell a property</h2>
                    <button onClick={() => navigate('/login')} className="btn-primary" style={{ marginTop: '20px' }}>
                        Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div>
            <Navbar />

            <main className="container" style={{ paddingTop: '100px', paddingBottom: '50px', maxWidth: '700px' }}>
                <div className="auth-card" style={{ padding: '35px' }}>
                    <h2 className="text-center" style={{ marginBottom: '10px' }}>Sell Your Property</h2>
                    <p className="text-center" style={{ color: '#6b7280', marginBottom: '30px' }}>
                        Submit your property for tokenization and reach global investors
                    </p>

                    {/* Progress Steps */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '30px' }}>
                        {[1, 2, 3].map(s => (
                            <div key={s} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                color: step >= s ? '#2563eb' : '#9ca3af'
                            }}>
                                <div style={{
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '50%',
                                    backgroundColor: step >= s ? '#2563eb' : '#e5e7eb',
                                    color: step >= s ? 'white' : '#9ca3af',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: '600',
                                    fontSize: '0.85rem'
                                }}>
                                    {step > s ? '✓' : s}
                                </div>
                                <span style={{ fontSize: '0.9rem', fontWeight: step === s ? '600' : '400' }}>
                                    {s === 1 ? 'Details' : s === 2 ? 'Documents' : 'Review'}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Wallet Check */}
                    {!isConnected && (
                        <div style={{
                            backgroundColor: '#fef3c7',
                            padding: '15px',
                            borderRadius: '8px',
                            marginBottom: '20px',
                            textAlign: 'center'
                        }}>
                            <p style={{ color: '#92400e', marginBottom: '10px' }}>Connect wallet to proceed</p>
                            <button onClick={connectWallet} className="btn-primary" style={{ padding: '8px 20px' }}>
                                Connect MetaMask
                            </button>
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        {/* Step 1: Property Details */}
                        {step === 1 && (
                            <div>
                                <div className="form-group">
                                    <label>Property Title *</label>
                                    <input
                                        className="form-input"
                                        value={form.title}
                                        onChange={e => setForm({ ...form, title: e.target.value })}
                                        placeholder="e.g. Luxury 3BHK Apartment"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Description *</label>
                                    <textarea
                                        className="form-input"
                                        value={form.description}
                                        onChange={e => setForm({ ...form, description: e.target.value })}
                                        placeholder="Describe your property, its features, and investment potential..."
                                        rows={4}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Location *</label>
                                    <input
                                        className="form-input"
                                        value={form.location}
                                        onChange={e => setForm({ ...form, location: e.target.value })}
                                        placeholder="Full address"
                                        required
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    <div className="form-group">
                                        <label>Property Type</label>
                                        <select
                                            className="form-input"
                                            value={form.propertyType}
                                            onChange={e => setForm({ ...form, propertyType: e.target.value })}
                                        >
                                            <option value="residential">Residential</option>
                                            <option value="commercial">Commercial</option>
                                            <option value="land">Land</option>
                                            <option value="industrial">Industrial</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Area (sq ft)</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={form.area}
                                            onChange={e => setForm({ ...form, area: e.target.value })}
                                            placeholder="2500"
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    <div className="form-group">
                                        <label>Price Per Share (MATIC) *</label>
                                        <input
                                            type="number"
                                            step="0.001"
                                            className="form-input"
                                            value={form.pricePerShare}
                                            onChange={e => setForm({ ...form, pricePerShare: e.target.value })}
                                            placeholder="0.5"
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Total Shares *</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={form.totalShares}
                                            onChange={e => setForm({ ...form, totalShares: e.target.value })}
                                            placeholder="1000"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Amenities (comma separated)</label>
                                    <input
                                        className="form-input"
                                        value={form.amenities}
                                        onChange={e => setForm({ ...form, amenities: e.target.value })}
                                        placeholder="Parking, Swimming Pool, Gym, 24x7 Security"
                                    />
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setStep(2)}
                                    className="btn-primary btn-full"
                                    disabled={!form.title || !form.location || !form.pricePerShare || !form.totalShares}
                                >
                                    Continue to Documents →
                                </button>
                            </div>
                        )}

                        {/* Step 2: Documents & Image */}
                        {step === 2 && (
                            <div>
                                <div className="form-group">
                                    <label>Property Image *</label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                        style={{ marginBottom: '10px' }}
                                    />
                                    {imagePreview && (
                                        <img
                                            src={imagePreview}
                                            alt="Preview"
                                            style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px' }}
                                        />
                                    )}
                                </div>

                                <div className="form-group">
                                    <label>Legal Documents (Deed, Title, etc.)</label>
                                    <input
                                        type="file"
                                        accept=".pdf,.doc,.docx,.jpg,.png"
                                        multiple
                                        onChange={handleDocumentChange}
                                    />
                                    <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '5px' }}>
                                        Upload ownership proof, property deed, tax receipts, etc.
                                    </p>
                                </div>

                                {documents.length > 0 && (
                                    <div style={{ marginBottom: '20px' }}>
                                        <label style={{ fontWeight: '500', marginBottom: '10px', display: 'block' }}>
                                            Uploaded Documents ({documents.length})
                                        </label>
                                        {documents.map((doc, i) => (
                                            <div key={i} style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '10px',
                                                backgroundColor: '#f3f4f6',
                                                borderRadius: '6px',
                                                marginBottom: '8px'
                                            }}>
                                                <span>📄 {doc.name}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => removeDocument(i)}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        color: '#ef4444',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: '15px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setStep(1)}
                                        className="btn-secondary"
                                        style={{ flex: 1 }}
                                    >
                                        ← Back
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setStep(3)}
                                        className="btn-primary"
                                        style={{ flex: 1 }}
                                        disabled={!image}
                                    >
                                        Review & Submit →
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Review */}
                        {step === 3 && (
                            <div>
                                <div style={{
                                    backgroundColor: '#f0fdf4',
                                    padding: '20px',
                                    borderRadius: '12px',
                                    marginBottom: '20px',
                                    border: '1px solid #10b981'
                                }}>
                                    <h4 style={{ marginBottom: '15px', color: '#065f46' }}>Review Your Submission</h4>

                                    {imagePreview && (
                                        <img
                                            src={imagePreview}
                                            alt=""
                                            style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '8px', marginBottom: '15px' }}
                                        />
                                    )}

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.9rem' }}>
                                        <div><strong>Title:</strong> {form.title}</div>
                                        <div><strong>Location:</strong> {form.location}</div>
                                        <div><strong>Type:</strong> {form.propertyType}</div>
                                        <div><strong>Area:</strong> {form.area} sq ft</div>
                                        <div><strong>Price/Share:</strong> {form.pricePerShare} MATIC</div>
                                        <div><strong>Total Shares:</strong> {form.totalShares}</div>
                                    </div>

                                    <div style={{ marginTop: '15px' }}>
                                        <strong>Total Value:</strong>{' '}
                                        <span style={{ color: '#10b981', fontWeight: '600' }}>
                                            {(parseFloat(form.pricePerShare || 0) * parseInt(form.totalShares || 0)).toFixed(2)} MATIC
                                        </span>
                                    </div>

                                    <div style={{ marginTop: '10px' }}>
                                        <strong>Documents:</strong> {documents.length} file(s)
                                    </div>
                                </div>

                                <div style={{
                                    backgroundColor: '#fef3c7',
                                    padding: '15px',
                                    borderRadius: '8px',
                                    marginBottom: '20px',
                                    fontSize: '0.85rem',
                                    color: '#92400e'
                                }}>
                                    ⚠️ Your submission will be reviewed by our admin team. You will receive:
                                    <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
                                        <li>A verification certificate upon approval</li>
                                        <li>Email notification if additional information is needed</li>
                                        <li>10 days to respond if documents need correction</li>
                                    </ul>
                                </div>

                                <div style={{ display: 'flex', gap: '15px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setStep(2)}
                                        className="btn-secondary"
                                        style={{ flex: 1 }}
                                    >
                                        ← Back
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn-primary"
                                        style={{ flex: 1 }}
                                        disabled={loading || !isConnected}
                                    >
                                        {loading ? 'Submitting...' : '🚀 Submit for Review'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </form>
                </div>
            </main>
        </div>
    );
};

export default SellProperty;
