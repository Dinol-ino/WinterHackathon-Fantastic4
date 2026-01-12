// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Register new user
  const register = async (email, password, firstName, lastName, role = 'investor') => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Create user document in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: email,
      firstName: firstName,
      lastName: lastName,
      role: role,
      walletAddress: null,
      createdAt: serverTimestamp()
    });

    return user;
  };

  // Login user
  const login = async (email, password) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  };

  // Logout user
  const logout = async () => {
    await signOut(auth);
    setCurrentUser(null);
    setUserData(null);
  };

  // Update user's wallet address
  const updateWalletAddress = async (walletAddress) => {
    if (!currentUser) return;

    await setDoc(doc(db, 'users', currentUser.uid), {
      walletAddress: walletAddress
    }, { merge: true });

    setUserData(prev => ({ ...prev, walletAddress }));
  };

  // Fetch user data from Firestore
  const fetchUserData = async (uid) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        return userDoc.data();
      }
      return null;
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        const data = await fetchUserData(user.uid);
        setUserData(data);
      } else {
        setUserData(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userData,
    loading,
    register,
    login,
    logout,
    updateWalletAddress,
    isAdmin: userData?.role === 'admin',
    isInvestor: userData?.role === 'investor'
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export default AuthContext;
