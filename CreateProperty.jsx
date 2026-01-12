// frontend/src/pages/Admin/CreateProperty.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import axios from 'axios';
import { useWallet } from '../../context/WalletContext';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import Navbar from '../../components/Navbar';
import LocationPicker from '../../components/LocationPicker';
import ImageUploader from '../../components/ImageUploader';

// Minimum images required for listing
const MIN_IMAGES = 3;

// Validation rules
const VALIDATION_RULES = {
  title: { minLength: 10, maxLength: 100 },
  description: { minLength: 50, maxLength: 2000 },
  pricePerShare: { min: 0.001, max: 1000 },
  totalShares: { min: 10, max: 100000 },
  area: { min: 100, max: 1000000 }
};

const CreateProperty = () => {
  const navigate = useNavigate();
  const { signer, isConnected, connectWallet, account, isAmoy } = useWallet();
  const { currentUser, userData, isAdmin } = useAuth();

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [step, setStep] = useState(1); // 1: Details, 2: Location, 3: Images, 4: Review
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    title: '',
    description: '',
    propertyType: 'residential',
    area: '',
    amenities: '',
    pricePerShare: '',
    totalShares: '',

    // Legal & Documents
    ownershipDocType: '',
    legalStatus: 'freehold'
  });

  const [location, setLocation] = useState(null);
  const [images, setImages] = useState([]);
  const [documents, setDocuments] = useState([]);

  // Redirect non-admins
  useEffect(() => {
    if (userData && !isAdmin) {
      navigate('/dashboard');
    }
  }, [userData, isAdmin, navigate]);

  // Validate form fields
  const validateStep = (stepNum) => {
    const newErrors = {};

    if (stepNum === 1) {
      // Title validation
      if (!form.title || form.title.length < VALIDATION_RULES.title.minLength) {
        newErrors.title = `Title must be at least ${VALIDATION_RULES.title.minLength} characters`;
      }

      // Description validation
      if (!form.description || form.description.length < VALIDATION_RULES.description.minLength) {
        newErrors.description = `Description must be at least ${VALIDATION_RULES.description.minLength} characters`;
      }

      // Price validation
      const price = parseFloat(form.pricePerShare);
      if (!price || price < VALIDATION_RULES.pricePerShare.min) {
        newErrors.pricePerShare = `Minimum price is ${VALIDATION_RULES.pricePerShare.min} MATIC`;
      }

      // Shares validation
      const shares = parseInt(form.totalShares);
      if (!shares || shares < VALIDATION_RULES.totalShares.min) {
        newErrors.totalShares = `Minimum ${VALIDATION_RULES.totalShares.min} shares required`;
      }

      // Area validation
      if (form.area && (parseInt(form.area) < VALIDATION_RULES.area.min)) {
        newErrors.area = `Minimum area is ${VALIDATION_RULES.area.min} sq ft`;
      }
    }

    if (stepNum === 2) {
      // Location validation
      if (!location || !location.lat || !location.lng) {
        newErrors.location = 'Please select a location on the map';
      }
    }

    if (stepNum === 3) {
      // Images validation
      if (images.length < MIN_IMAGES) {
        newErrors.images = `Please upload at least ${MIN_IMAGES} images`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    setStep(step - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Final validation
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      setStatus('Please fix all errors before submitting');
      return;
    }

    if (!isConnected) {
      alert("Please connect your MetaMask wallet first!");
      return;
    }

    setLoading(true);
    setStatus("Uploading images...");

    try {
      // Step 1: Upload all images to IPFS
      const uploadedImages = [];
      for (let i = 0; i < images.length; i++) {
        setStatus(`Uploading image ${i + 1}/${images.length}...`);

        const formData = new FormData();
        formData.append('file', images[i].file);

        try {
          const res = await axios.post(
            `${import.meta.env.VITE_API_BASE_URL}/admin/upload`,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } }
          );
          uploadedImages.push({
            url: res.data.url,
            ipfsHash: res.data.ipfsHash,
            isMain: i === 0
          });
        } catch (uploadError) {
          console.error(`Image ${i + 1} upload failed:`, uploadError);
          uploadedImages.push({
            url: images[i].preview,
            ipfsHash: null,
            isMain: i === 0,
            local: true
          });
        }
      }

      // Step 2: Create metadata
      setStatus("Creating property metadata...");
      const metadata = {
        name: form.title,
        description: form.description,
        image: uploadedImages[0]?.url,
        images: uploadedImages,
        attributes: [
          { trait_type: "Location", value: location.address },
          { trait_type: "Coordinates", value: `${location.lat}, ${location.lng}` },
          { trait_type: "Property Type", value: form.propertyType },
          { trait_type: "Area", value: `${form.area} sq ft` },
          { trait_type: "Total Shares", value: form.totalShares },
          { trait_type: "Price Per Share", value: `${form.pricePerShare} MATIC` },
          { trait_type: "Legal Status", value: form.legalStatus }
        ]
      };

      // Step 3: Save to Firestore
      setStatus("Saving to database...");
      const propertyId = `prop_${Date.now()}`;

      await setDoc(doc(db, "properties", propertyId), {
        propertyId: propertyId,

        // Basic Info
        title: form.title,
        description: form.description,
        propertyType: form.propertyType,
        area: parseInt(form.area) || 0,
        amenities: form.amenities.split(',').map(a => a.trim()).filter(Boolean),

        // Location
        location: {
          address: location.address,
          lat: location.lat,
          lng: location.lng
        },

        // Pricing
        pricePerShare: parseFloat(form.pricePerShare),
        totalShares: parseInt(form.totalShares),
        availableShares: parseInt(form.totalShares),
        initialPrice: parseFloat(form.pricePerShare),
        currentPrice: parseFloat(form.pricePerShare),

        // Media
        images: uploadedImages,
        mainImageUrl: uploadedImages[0]?.url,

        // Legal
        legalStatus: form.legalStatus,
        ownershipDocType: form.ownershipDocType,

        // Ownership
        owner: account,
        ownerUid: currentUser.uid,

        // Status
        status: "PENDING_TOKENIZATION",
        isVerified: true, // Admin-listed properties are auto-verified

        // Timestamps
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),

        // Resale tracking
        resaleHistory: [],
        resaleCount: 0
      });

      setStatus("Property created successfully! 🎉");

      setTimeout(() => {
        navigate('/admin');
      }, 2000);

    } catch (err) {
      console.error("Create property error:", err);
      setStatus("Failed: " + err.message);
      setErrors({ submit: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Redirect if not authenticated
  if (!currentUser) {
    navigate('/login');
    return null;
  }

  return (
    <div>
      <Navbar />

      <div className="container" style={{ paddingTop: '100px', paddingBottom: '50px', maxWidth: '800px' }}>
        <div className="auth-card" style={{ padding: '35px' }}>
          <h2 className="text-center" style={{ marginBottom: '10px' }}>List New Property</h2>
          <p className="text-center" style={{ color: '#6b7280', marginBottom: '30px' }}>
            Tokenize your real estate asset on the blockchain
          </p>

          {/* Progress Steps */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '5px', marginBottom: '30px' }}>
            {['Details', 'Location', 'Images', 'Review'].map((label, idx) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  color: step > idx + 1 ? '#10b981' : step === idx + 1 ? '#2563eb' : '#9ca3af'
                }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: step > idx + 1 ? '#10b981' : step === idx + 1 ? '#2563eb' : '#e5e7eb',
                  color: step >= idx + 1 ? 'white' : '#9ca3af',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '600',
                  fontSize: '0.9rem'
                }}>
                  {step > idx + 1 ? '✓' : idx + 1}
                </div>
                <span style={{
                  marginLeft: '8px',
                  marginRight: '20px',
                  fontWeight: step === idx + 1 ? '600' : '400',
                  fontSize: '0.9rem'
                }}>
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* Status Message */}
          {status && (
            <div style={{
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '20px',
              backgroundColor: status.includes('Failed') ? '#fef2f2' : '#e0f2fe',
              color: status.includes('Failed') ? '#b91c1c' : '#0369a1',
              textAlign: 'center'
            }}>
              {status}
            </div>
          )}

          {/* Wallet Check */}
          {!isConnected && (
            <div style={{
              backgroundColor: '#fef3c7',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '20px',
              textAlign: 'center',
              border: '1px solid #f59e0b'
            }}>
              <p style={{ color: '#92400e', marginBottom: '10px' }}>
                🔐 Connect your wallet to list properties
              </p>
              <button onClick={connectWallet} className="btn-primary">
                Connect MetaMask
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* STEP 1: Property Details */}
            {step === 1 && (
              <div>
                <h3 style={{ marginBottom: '20px', color: '#374151' }}>Property Details</h3>

                <div className="form-group">
                  <label>Property Title *</label>
                  <input
                    className={`form-input ${errors.title ? 'error' : ''}`}
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Luxury Sea View Villa in Goa"
                    maxLength={VALIDATION_RULES.title.maxLength}
                  />
                  {errors.title && <span className="error-text">{errors.title}</span>}
                  <small style={{ color: '#9ca3af' }}>{form.title.length}/{VALIDATION_RULES.title.maxLength}</small>
                </div>

                <div className="form-group">
                  <label>Description *</label>
                  <textarea
                    className={`form-input ${errors.description ? 'error' : ''}`}
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    placeholder="Provide a detailed description of the property, its features, neighborhood, and investment potential..."
                    rows={5}
                    maxLength={VALIDATION_RULES.description.maxLength}
                  />
                  {errors.description && <span className="error-text">{errors.description}</span>}
                  <small style={{ color: '#9ca3af' }}>{form.description.length}/{VALIDATION_RULES.description.maxLength}</small>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div className="form-group">
                    <label>Property Type *</label>
                    <select
                      className="form-input"
                      value={form.propertyType}
                      onChange={e => setForm({ ...form, propertyType: e.target.value })}
                    >
                      <option value="residential">Residential</option>
                      <option value="commercial">Commercial</option>
                      <option value="land">Land/Plot</option>
                      <option value="industrial">Industrial</option>
                      <option value="mixed">Mixed Use</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Legal Status *</label>
                    <select
                      className="form-input"
                      value={form.legalStatus}
                      onChange={e => setForm({ ...form, legalStatus: e.target.value })}
                    >
                      <option value="freehold">Freehold</option>
                      <option value="leasehold">Leasehold</option>
                      <option value="agricultural">Agricultural</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div className="form-group">
                    <label>Area (sq ft) *</label>
                    <input
                      type="number"
                      className={`form-input ${errors.area ? 'error' : ''}`}
                      value={form.area}
                      onChange={e => setForm({ ...form, area: e.target.value })}
                      placeholder="2500"
                      min={VALIDATION_RULES.area.min}
                    />
                    {errors.area && <span className="error-text">{errors.area}</span>}
                  </div>
                  <div className="form-group">
                    <label>Amenities</label>
                    <input
                      className="form-input"
                      value={form.amenities}
                      onChange={e => setForm({ ...form, amenities: e.target.value })}
                      placeholder="Parking, Pool, Gym, Security"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div className="form-group">
                    <label>Price Per Share (MATIC) *</label>
                    <input
                      type="number"
                      step="0.001"
                      className={`form-input ${errors.pricePerShare ? 'error' : ''}`}
                      value={form.pricePerShare}
                      onChange={e => setForm({ ...form, pricePerShare: e.target.value })}
                      placeholder="0.5"
                    />
                    {errors.pricePerShare && <span className="error-text">{errors.pricePerShare}</span>}
                  </div>
                  <div className="form-group">
                    <label>Total Shares *</label>
                    <input
                      type="number"
                      className={`form-input ${errors.totalShares ? 'error' : ''}`}
                      value={form.totalShares}
                      onChange={e => setForm({ ...form, totalShares: e.target.value })}
                      placeholder="1000"
                    />
                    {errors.totalShares && <span className="error-text">{errors.totalShares}</span>}
                  </div>
                </div>

                {/* Total Value Display */}
                {form.pricePerShare && form.totalShares && (
                  <div style={{
                    backgroundColor: '#f0fdf4',
                    padding: '15px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    border: '1px solid #10b981'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Total Property Value:</span>
                      <strong style={{ color: '#10b981', fontSize: '1.1rem' }}>
                        {(parseFloat(form.pricePerShare) * parseInt(form.totalShares)).toFixed(2)} MATIC
                      </strong>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={nextStep}
                  className="btn-primary btn-full"
                  style={{ padding: '14px' }}
                >
                  Continue to Location →
                </button>
              </div>
            )}

            {/* STEP 2: Location */}
            {step === 2 && (
              <div>
                <h3 style={{ marginBottom: '20px', color: '#374151' }}>Property Location</h3>

                <LocationPicker
                  onLocationSelect={setLocation}
                  initialLocation={location}
                />

                {errors.location && (
                  <div className="error-text" style={{ marginBottom: '15px' }}>
                    {errors.location}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
                  <button
                    type="button"
                    onClick={prevStep}
                    className="btn-secondary"
                    style={{ flex: 1, padding: '14px' }}
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={nextStep}
                    className="btn-primary"
                    style={{ flex: 1, padding: '14px' }}
                    disabled={!location}
                  >
                    Continue to Images →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Images */}
            {step === 3 && (
              <div>
                <h3 style={{ marginBottom: '20px', color: '#374151' }}>Property Images</h3>

                <ImageUploader
                  minImages={MIN_IMAGES}
                  maxImages={10}
                  onImagesChange={setImages}
                  initialImages={images}
                />

                {errors.images && (
                  <div className="error-text" style={{ marginBottom: '15px' }}>
                    {errors.images}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
                  <button
                    type="button"
                    onClick={prevStep}
                    className="btn-secondary"
                    style={{ flex: 1, padding: '14px' }}
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={nextStep}
                    className="btn-primary"
                    style={{ flex: 1, padding: '14px' }}
                    disabled={images.length < MIN_IMAGES}
                  >
                    Review Listing →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: Review */}
            {step === 4 && (
              <div>
                <h3 style={{ marginBottom: '20px', color: '#374151' }}>Review & Submit</h3>

                {/* Summary Card */}
                <div style={{
                  backgroundColor: '#f9fafb',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '20px'
                }}>
                  {/* Main Image */}
                  {images[0] && (
                    <img
                      src={images[0].preview}
                      alt="Main"
                      style={{
                        width: '100%',
                        height: '200px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        marginBottom: '15px'
                      }}
                    />
                  )}

                  <h4 style={{ marginBottom: '10px' }}>{form.title}</h4>
                  <p style={{ color: '#6b7280', marginBottom: '15px', fontSize: '0.9rem' }}>
                    {form.description.substring(0, 150)}...
                  </p>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px',
                    fontSize: '0.9rem'
                  }}>
                    <div><strong>Location:</strong> {location?.address?.split(',')[0]}</div>
                    <div><strong>Type:</strong> {form.propertyType}</div>
                    <div><strong>Area:</strong> {form.area} sq ft</div>
                    <div><strong>Legal Status:</strong> {form.legalStatus}</div>
                    <div><strong>Price/Share:</strong> {form.pricePerShare} MATIC</div>
                    <div><strong>Total Shares:</strong> {form.totalShares}</div>
                    <div><strong>Images:</strong> {images.length} uploaded</div>
                    <div><strong>Total Value:</strong> {(parseFloat(form.pricePerShare) * parseInt(form.totalShares)).toFixed(2)} MATIC</div>
                  </div>
                </div>

                {errors.submit && (
                  <div className="error-text" style={{ marginBottom: '15px' }}>
                    {errors.submit}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '15px' }}>
                  <button
                    type="button"
                    onClick={prevStep}
                    className="btn-secondary"
                    style={{ flex: 1, padding: '14px' }}
                    disabled={loading}
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{ flex: 1, padding: '14px' }}
                    disabled={loading || !isConnected}
                  >
                    {loading ? 'Creating...' : '🚀 Create Listing'}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>

      <style>{`
        .error { border-color: #ef4444 !important; }
        .error-text { color: #ef4444; font-size: 0.85rem; margin-top: 5px; display: block; }
      `}</style>
    </div>
  );
};

export default CreateProperty;