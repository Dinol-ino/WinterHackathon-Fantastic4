// backend/src/server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

// ES Module dirname workaround
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Import Firebase Admin
import admin, { db, auth } from './config/firebase.js';

// Multer config for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Real Estate Tokenization API',
    timestamp: new Date().toISOString()
  });
});

// ==========================================
// AUTH MIDDLEWARE
// ==========================================
const verifyFirebaseToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

const verifyAdmin = async (req, res, next) => {
  try {
    const userDoc = await db.collection('users').doc(req.user.uid).get();

    if (!userDoc.exists || userDoc.data().role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.userData = userDoc.data();
    next();
  } catch (error) {
    console.error('Admin verification failed:', error);
    res.status(500).json({ error: 'Failed to verify admin status' });
  }
};

// ==========================================
// PUBLIC ROUTES
// ==========================================

// Get all active properties
app.get('/api/properties', async (req, res) => {
  try {
    const snapshot = await db.collection('properties')
      .orderBy('createdAt', 'desc')
      .get();

    const properties = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(properties);
  } catch (error) {
    console.error('Error fetching properties:', error);
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
});

// Get single property
app.get('/api/properties/:id', async (req, res) => {
  try {
    const doc = await db.collection('properties').doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Property not found' });
    }

    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error fetching property:', error);
    res.status(500).json({ error: 'Failed to fetch property' });
  }
});

// ==========================================
// PROTECTED USER ROUTES
// ==========================================

// Get user profile
app.get('/api/users/profile', verifyFirebaseToken, async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.user.uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(userDoc.data());
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update wallet address
app.post('/api/users/wallet', verifyFirebaseToken, async (req, res) => {
  try {
    const { walletAddress } = req.body;

    await db.collection('users').doc(req.user.uid).update({
      walletAddress: walletAddress,
      updatedAt: new Date()
    });

    res.json({ success: true, message: 'Wallet address updated' });
  } catch (error) {
    console.error('Error updating wallet:', error);
    res.status(500).json({ error: 'Failed to update wallet' });
  }
});

// Get user portfolio/investments
app.get('/api/users/portfolio', verifyFirebaseToken, async (req, res) => {
  try {
    const snapshot = await db.collection('transactions')
      .where('buyerUid', '==', req.user.uid)
      .orderBy('timestamp', 'desc')
      .get();

    const investments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(investments);
  } catch (error) {
    console.error('Error fetching portfolio:', error);
    res.status(500).json({ error: 'Failed to fetch portfolio' });
  }
});

// ==========================================
// ADMIN ROUTES
// ==========================================

// Import Pinata service
import { uploadFileToPinata, testPinataConnection } from './services/pinata.js';

// Upload file to IPFS via Pinata
app.post('/api/admin/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const fileName = req.file.originalname;

    // Try IPFS upload first
    try {
      const ipfsResult = await uploadFileToPinata(filePath, fileName);
      console.log('✅ File uploaded to IPFS:', ipfsResult.ipfsHash);

      return res.json({
        success: true,
        url: ipfsResult.gatewayUrl,
        ipfsHash: ipfsResult.ipfsHash,
        ipfsUri: `ipfs://${ipfsResult.ipfsHash}`,
        filename: req.file.filename,
        storage: 'ipfs'
      });
    } catch (ipfsError) {
      console.warn('⚠️ IPFS upload failed, using local storage:', ipfsError.message);

      // Fallback to local storage
      const localUrl = `http://localhost:${process.env.PORT || 5000}/uploads/${req.file.filename}`;

      return res.json({
        success: true,
        url: localUrl,
        filename: req.file.filename,
        storage: 'local',
        warning: 'IPFS upload failed, using local storage'
      });
    }
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed: ' + error.message });
  }
});

// Create property (draft in Firestore)
app.post('/api/admin/properties', verifyFirebaseToken, verifyAdmin, async (req, res) => {
  try {
    const { title, description, location, pricePerShare, totalShares, imageUrl } = req.body;

    const propertyRef = db.collection('properties').doc();

    await propertyRef.set({
      propertyId: propertyRef.id,
      title,
      description,
      location,
      pricePerShare: parseFloat(pricePerShare),
      totalShares: parseInt(totalShares),
      availableShares: parseInt(totalShares),
      imageUrl,
      owner: req.userData.walletAddress,
      ownerUid: req.user.uid,
      status: 'DRAFT',
      createdAt: new Date()
    });

    res.json({
      success: true,
      propertyId: propertyRef.id,
      message: 'Property created successfully'
    });
  } catch (error) {
    console.error('Error creating property:', error);
    res.status(500).json({ error: 'Failed to create property' });
  }
});

// ==========================================
// ERROR HANDLING
// ==========================================
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ==========================================
// START SERVER
// ==========================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 API URL: http://localhost:${PORT}`);
});
