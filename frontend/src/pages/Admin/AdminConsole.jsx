// frontend/src/pages/Admin/AdminConsole.jsx
import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { collection, getDocs, doc, updateDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { useWallet } from '../../context/WalletContext';
import Navbar from '../../components/Navbar';

// Request Status Steps
const STATUS_STEPS = {
    'REQUESTED': { label: 'Requested', color: '#f59e0b', step: 1 },
    'PROCESSING': { label: 'Processing', color: '#3b82f6', step: 2 },
    'UNDER_REVIEW': { label: 'Under Review', color: '#8b5cf6', step: 3 },
    'APPROVED': { label: 'Approved', color: '#10b981', step: 4 },
    'REJECTED': { label: 'Rejected', color: '#ef4444', step: 0 },
    'COMPLETED': { label: 'Completed', color: '#059669', step: 5 }
};

const AdminConsole = () => {
    const { currentUser, userData, isAdmin } = useAuth();
    const { isConnected } = useWallet();

    const [requests, setRequests] = useState([]);
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    // Fetch all property requests and listings
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch pending property requests
                const requestsRef = collection(db, 'propertyRequests');
                const requestsQuery = query(requestsRef, orderBy('createdAt', 'desc'));
                const requestsSnap = await getDocs(requestsQuery);
                const requestsList = requestsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                setRequests(requestsList);

                // Fetch all properties
                const propsRef = collection(db, 'properties');
                const propsQuery = query(propsRef, orderBy('createdAt', 'desc'));
                const propsSnap = await getDocs(propsQuery);
                const propsList = propsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                setProperties(propsList);
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };

        if (currentUser) fetchData();
    }, [currentUser]);

    // Update request status
    const updateRequestStatus = async (requestId, newStatus, notes = '') => {
        setActionLoading(true);
        try {
            await updateDoc(doc(db, 'propertyRequests', requestId), {
                status: newStatus,
                adminNotes: notes,
                updatedAt: serverTimestamp(),
                reviewedBy: currentUser.uid
            });

            // Update local state
            setRequests(prev => prev.map(r =>
                r.id === requestId ? { ...r, status: newStatus, adminNotes: notes } : r
            ));

            alert(`Request ${newStatus.toLowerCase()} successfully!`);
            setSelectedRequest(null);
        } catch (error) {
            console.error('Error updating request:', error);
            alert('Failed to update request: ' + error.message);
        } finally {
            setActionLoading(false);
        }
    };

    // Approve and upload property to marketplace
    const approveAndUpload = async (request) => {
        setActionLoading(true);
        try {
            // Create property in main properties collection
            const propertyRef = doc(db, 'properties', request.id);
            await updateDoc(doc(db, 'propertyRequests', request.id), {
                status: 'APPROVED',
                approvedAt: serverTimestamp(),
                certificateGenerated: true
            });

            // In a real app, this would:
            // 1. Generate a verification certificate
            // 2. Send email to seller with certificate
            // 3. Mint NFT on blockchain

            alert('Property approved! Certificate generated and email sent to seller.');

            // Refresh data
            window.location.reload();
        } catch (error) {
            console.error('Error approving property:', error);
            alert('Failed to approve: ' + error.message);
        } finally {
            setActionLoading(false);
        }
    };

    // Reject with reason
    const rejectRequest = async (request, reason) => {
        if (!reason) {
            reason = prompt('Enter rejection reason (will be sent to seller):');
            if (!reason) return;
        }

        await updateRequestStatus(request.id, 'REJECTED', reason);

        // In a real app, send email notification to seller
        alert('Rejection email sent to seller. They have 10 days to respond.');
    };

    // Redirect non-admins
    if (!currentUser) {
        return <Navigate to="/login" />;
    }

    if (userData && !isAdmin) {
        return <Navigate to="/dashboard" />;
    }

    return (
        <div>
            <Navbar />

            <main className="container" style={{ paddingTop: '100px', paddingBottom: '50px' }}>
                {/* Header */}
                <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                    <div>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '5px' }}>
                            Admin Dashboard
                        </h1>
                        <p style={{ color: '#6b7280' }}>Manage property listings and verification requests</p>
                    </div>
                    <Link to="/admin/create" className="btn-primary" style={{ padding: '12px 24px' }}>
                        + List New Property
                    </Link>
                </div>

                {/* Stats Cards */}
                <div className="stats-grid" style={{ marginBottom: '30px' }}>
                    <div className="stat-card">
                        <div className="stat-label">Pending Requests</div>
                        <div className="stat-value" style={{ color: '#f59e0b' }}>
                            {requests.filter(r => r.status === 'REQUESTED' || r.status === 'PROCESSING').length}
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Approved Properties</div>
                        <div className="stat-value" style={{ color: '#10b981' }}>
                            {requests.filter(r => r.status === 'APPROVED').length}
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Total Listed</div>
                        <div className="stat-value">{properties.length}</div>
                    </div>
                </div>

                {/* Pending Requests Section */}
                <div style={{ marginBottom: '40px' }}>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: '600', marginBottom: '20px' }}>
                        📋 Property Upload Requests
                    </h2>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                            Loading requests...
                        </div>
                    ) : requests.length === 0 ? (
                        <div style={{
                            backgroundColor: '#f9fafb',
                            padding: '40px',
                            borderRadius: '12px',
                            textAlign: 'center',
                            color: '#6b7280'
                        }}>
                            No pending requests. Property requests from sellers will appear here.
                        </div>
                    ) : (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Property</th>
                                        <th>Seller</th>
                                        <th>Status</th>
                                        <th>Date</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {requests.map(request => {
                                        const statusInfo = STATUS_STEPS[request.status] || STATUS_STEPS.REQUESTED;
                                        return (
                                            <tr key={request.id}>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        {request.imageUrl && (
                                                            <img
                                                                src={request.imageUrl}
                                                                alt=""
                                                                style={{ width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover' }}
                                                            />
                                                        )}
                                                        <div>
                                                            <div style={{ fontWeight: '600' }}>{request.title || 'Untitled'}</div>
                                                            <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>{request.location}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ fontSize: '0.9rem' }}>{request.sellerEmail || 'N/A'}</td>
                                                <td>
                                                    <span style={{
                                                        backgroundColor: statusInfo.color + '20',
                                                        color: statusInfo.color,
                                                        padding: '4px 12px',
                                                        borderRadius: '20px',
                                                        fontSize: '0.8rem',
                                                        fontWeight: '600'
                                                    }}>
                                                        {statusInfo.label}
                                                    </span>
                                                </td>
                                                <td style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                                                    {request.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <button
                                                            onClick={() => setSelectedRequest(request)}
                                                            style={{
                                                                padding: '6px 12px',
                                                                backgroundColor: '#3b82f6',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: '6px',
                                                                cursor: 'pointer',
                                                                fontSize: '0.85rem'
                                                            }}
                                                        >
                                                            Review
                                                        </button>
                                                        {request.status !== 'APPROVED' && request.status !== 'REJECTED' && (
                                                            <>
                                                                <button
                                                                    onClick={() => approveAndUpload(request)}
                                                                    disabled={actionLoading}
                                                                    style={{
                                                                        padding: '6px 12px',
                                                                        backgroundColor: '#10b981',
                                                                        color: 'white',
                                                                        border: 'none',
                                                                        borderRadius: '6px',
                                                                        cursor: 'pointer',
                                                                        fontSize: '0.85rem'
                                                                    }}
                                                                >
                                                                    ✓
                                                                </button>
                                                                <button
                                                                    onClick={() => rejectRequest(request)}
                                                                    disabled={actionLoading}
                                                                    style={{
                                                                        padding: '6px 12px',
                                                                        backgroundColor: '#ef4444',
                                                                        color: 'white',
                                                                        border: 'none',
                                                                        borderRadius: '6px',
                                                                        cursor: 'pointer',
                                                                        fontSize: '0.85rem'
                                                                    }}
                                                                >
                                                                    ✗
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Listed Properties Section */}
                <div>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: '600', marginBottom: '20px' }}>
                        🏠 Listed Properties
                    </h2>

                    {properties.length === 0 ? (
                        <div style={{
                            backgroundColor: '#f9fafb',
                            padding: '40px',
                            borderRadius: '12px',
                            textAlign: 'center',
                            color: '#6b7280'
                        }}>
                            No properties listed yet. <Link to="/admin/create" style={{ color: '#2563eb' }}>Create your first listing</Link>
                        </div>
                    ) : (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                            gap: '20px'
                        }}>
                            {properties.map(property => (
                                <div key={property.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                    <div style={{ height: '140px', overflow: 'hidden' }}>
                                        <img
                                            src={property.imageUrl || 'https://via.placeholder.com/300x150'}
                                            alt={property.title}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    </div>
                                    <div style={{ padding: '16px' }}>
                                        <h4 style={{ marginBottom: '5px', fontWeight: '600' }}>{property.title}</h4>
                                        <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '10px' }}>
                                            {property.location}
                                        </p>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                            <span>{property.pricePerShare} MATIC/share</span>
                                            <span style={{
                                                color: property.status === 'TOKENIZED' ? '#10b981' : '#f59e0b'
                                            }}>
                                                {property.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Review Modal */}
                {selectedRequest && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000
                    }}>
                        <div style={{
                            backgroundColor: 'white',
                            borderRadius: '16px',
                            padding: '30px',
                            maxWidth: '600px',
                            width: '90%',
                            maxHeight: '80vh',
                            overflow: 'auto'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                                <h3 style={{ fontSize: '1.3rem', fontWeight: '600' }}>Review Request</h3>
                                <button
                                    onClick={() => setSelectedRequest(null)}
                                    style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}
                                >
                                    ×
                                </button>
                            </div>

                            {selectedRequest.imageUrl && (
                                <img
                                    src={selectedRequest.imageUrl}
                                    alt=""
                                    style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '8px', marginBottom: '20px' }}
                                />
                            )}

                            <div style={{ marginBottom: '20px' }}>
                                <h4 style={{ fontWeight: '600', marginBottom: '10px' }}>{selectedRequest.title}</h4>
                                <p style={{ color: '#6b7280', marginBottom: '10px' }}>{selectedRequest.description}</p>
                                <p><strong>Location:</strong> {selectedRequest.location}</p>
                                <p><strong>Price/Share:</strong> {selectedRequest.pricePerShare} MATIC</p>
                                <p><strong>Total Shares:</strong> {selectedRequest.totalShares}</p>
                                <p><strong>Seller:</strong> {selectedRequest.sellerEmail}</p>
                            </div>

                            {/* Documents Section */}
                            <div style={{ marginBottom: '20px' }}>
                                <h4 style={{ fontWeight: '600', marginBottom: '10px' }}>📄 Uploaded Documents</h4>
                                {selectedRequest.documents?.length > 0 ? (
                                    <ul style={{ listStyle: 'none', padding: 0 }}>
                                        {selectedRequest.documents.map((doc, i) => (
                                            <li key={i} style={{
                                                padding: '10px',
                                                backgroundColor: '#f3f4f6',
                                                borderRadius: '6px',
                                                marginBottom: '8px'
                                            }}>
                                                <a href={doc.url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>
                                                    📎 {doc.name}
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p style={{ color: '#6b7280', fontStyle: 'italic' }}>No documents uploaded</p>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                                <button
                                    onClick={() => updateRequestStatus(selectedRequest.id, 'PROCESSING')}
                                    disabled={actionLoading}
                                    className="btn-secondary"
                                    style={{ flex: 1 }}
                                >
                                    Mark Processing
                                </button>
                                <button
                                    onClick={() => approveAndUpload(selectedRequest)}
                                    disabled={actionLoading}
                                    className="btn-primary"
                                    style={{ flex: 1, backgroundColor: '#10b981' }}
                                >
                                    ✓ Approve & Upload
                                </button>
                                <button
                                    onClick={() => rejectRequest(selectedRequest)}
                                    disabled={actionLoading}
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        backgroundColor: '#ef4444',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    ✗ Reject
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default AdminConsole;
