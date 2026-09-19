import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
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

// الحصول على إعدادات Firebase النشطة (المخصصة أو الافتراضية)
export const getActiveFirebaseConfig = () => {
  try {
    const saved = localStorage.getItem('sarmed_firebase_config');
    if (saved) {
      return JSON.parse(saved);
    }
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

let app = null;
let db = null;
let analytics = null;

export const initFirebase = () => {
  const config = getActiveFirebaseConfig();
  try {
    // تهيئة Firebase App
    if (!getApps().length) {
      app = initializeApp(config);
    } else {
      app = getApp();
    }

    // تهيئة Analytics (داخل المتصفح فقط)
    try {
      if (typeof window !== 'undefined') {
        analytics = getAnalytics(app);
        console.log('✅ Firebase Analytics مفعّل');
      }
    } catch (analyticsErr) {
      console.info('Analytics init skipped:', analyticsErr.message);
    }

    // تهيئة Firestore مع التخزين المحلي المؤقت متعدد التبويب
    try {
      db = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        })
      });
      console.log('✅ Firestore مفعّل مع التخزين المحلي التلقائي (IndexedDB)');
    } catch (fsErr) {
      try {
        db = getFirestore(app);
        console.log('✅ Firestore مفعّل عبر getFirestore القياسي');
      } catch (fallbackErr) {
        console.warn('Firestore initialization notice:', fsErr, fallbackErr);
      }
    }
  } catch (err) {
    console.warn('Firebase init notice:', err);
  }

  return { app, db };
};

// تشغيل التهيئة تلقائياً عند الاستيراد
initFirebase();

export {
  app,
  db,
  analytics,
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
