import { initializeApp, getApps, getApp as _getApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  increment,
  writeBatch
} from 'firebase/firestore';

// ✅ مفاتيح Firebase الحقيقية لمشروع sarmed-fef02
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyA0XT_ZKvaaHhmOWFPwGQyeEYoLHeYt5zQ",
  authDomain: "sarmed-fef02.firebaseapp.com",
  projectId: "sarmed-fef02",
  storageBucket: "sarmed-fef02.firebasestorage.app",
  messagingSenderId: "185120739256",
  appId: "1:185120739256:web:3c9252518b62d47b46c94d",
  measurementId: "G-6PH1N07E1F"
};

// الحصول على إعدادات Firebase النشطة
export const getActiveFirebaseConfig = () => {
  try {
    const saved = localStorage.getItem('sarmed_firebase_config');
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.warn('Error reading saved firebase config', e);
  }
  return DEFAULT_FIREBASE_CONFIG;
};

// حفظ إعدادات Firebase مخصصة
export const saveFirebaseConfig = (config) => {
  localStorage.setItem('sarmed_firebase_config', JSON.stringify(config));
  window.location.reload();
};

// ✅ Initialize Firebase once
let _app = null;
let _db = null;

const _init = (() => {
  const config = getActiveFirebaseConfig();
  try {
    _app = getApps().length ? _getApp() : initializeApp(config);
  } catch (err) {
    console.warn('Firebase App init failed:', err.message);
  }

  if (_app) {
    try {
      _db = initializeFirestore(_app, {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
      });
      console.log('✅ Firestore مفعّل مع IndexedDB cache');
    } catch (e1) {
      try {
        _db = getFirestore(_app);
        console.log('✅ Firestore مفعّل (getFirestore fallback)');
      } catch (e2) {
        console.warn('Firestore init failed:', e1.message, e2?.message);
        _db = null;
      }
    }
  }
})();

// Named exports (backward compatible)
export const app = _app;
export const db = _db;
export const analytics = null;

// Getter functions (always up to date - useful after dynamic re-init)
export const getDb = () => _db;
export const getFirebaseApp = () => _app;

export const initFirebase = () => ({ app: _app, db: _db });

// Re-export firebase/firestore helpers
export {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  increment,
  writeBatch
};
