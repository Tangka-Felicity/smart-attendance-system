import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { auth, db } from './firebase';

/**
 * Authentication Services
 */
export const authService = {
  // Register new user
  async register(email: string, password: string) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      return { user: userCredential.user, error: null };
    } catch (error: any) {
      return { user: null, error: error.message };
    }
  },

  // Login user
  async login(email: string, password: string) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return { user: userCredential.user, error: null };
    } catch (error: any) {
      return { user: null, error: error.message };
    }
  },

  // Logout user
  async logout() {
    try {
      await signOut(auth);
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  },

  // Get current user
  getCurrentUser(): Promise<User | null> {
    return new Promise((resolve) => {
      onAuthStateChanged(auth, (user) => {
        resolve(user);
      });
    });
  },

  // Listen to auth state changes
  onAuthStateChange(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback);
  },
};

/**
 * Firestore Services
 */
export const firestoreService = {
  // Add document to collection
  async addDocument(collectionName: string, data: any, docId?: string) {
    try {
      const docRef = docId ? doc(db, collectionName, docId) : doc(collection(db, collectionName));
      await setDoc(docRef, { ...data, createdAt: new Date(), updatedAt: new Date() });
      return { id: docRef.id, error: null };
    } catch (error: any) {
      return { id: null, error: error.message };
    }
  },

  // Get single document
  async getDocument(collectionName: string, docId: string) {
    try {
      const docRef = doc(db, collectionName, docId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { data: docSnap.data(), error: null };
      } else {
        return { data: null, error: 'Document not found' };
      }
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },

  // Get all documents from collection
  async getCollection(collectionName: string) {
    try {
      const q = query(collection(db, collectionName));
      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      return { data: docs, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },

  // Query documents with condition
  async queryDocuments(collectionName: string, field: string, operator: any, value: any) {
    try {
      const q = query(collection(db, collectionName), where(field, operator, value));
      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      return { data: docs, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },

  // Update document
  async updateDocument(collectionName: string, docId: string, data: any) {
    try {
      const docRef = doc(db, collectionName, docId);
      await updateDoc(docRef, { ...data, updatedAt: new Date() });
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  },

  // Delete document
  async deleteDocument(collectionName: string, docId: string) {
    try {
      const docRef = doc(db, collectionName, docId);
      await deleteDoc(docRef);
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  },
};
