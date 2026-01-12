// backend/src/config/firebase.js
import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Firebase Admin with credentials from .env
try {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Handle newlines in private key string
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
  console.log("✅ Firebase Admin Initialized");
} catch (error) {
  console.error("❌ Firebase Admin Initialization Error:", error.message);
}

export const db = admin.firestore();
export const auth = admin.auth();
export default admin;