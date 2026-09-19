import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, doc, setDoc, onSnapshot } from '../services/firebase';

const AuthContext = createContext();
const AUTH_STORAGE_KEY = 'sarmed_user_session';
const SETTINGS_STORAGE_KEY = 'sarmed_app_settings';

const DEFAULT_SETTINGS = {
  managerUsername: '1111',
  managerPassword: '1111',
  managerName: 'سرمد مؤيد',
  workers: [{ id: 'worker-default', username: 'عامل', password: '1111', name: 'عامل' }],
  storeName: 'سوبرماركت السبطين',
  storePhone: '',
  storeAddress: '',
  currency: 'د.ع',
  workerRequiresApproval: true,
  theme: 'dark'
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY)) || null; } catch { return null; }
  });

  const [settings, setSettings] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY));
      return saved ? {
        ...DEFAULT_SETTINGS, ...saved,
        managerUsername: saved.managerUsername || '1111',
        managerPassword: saved.managerPassword || '1111',
        managerName: saved.managerName === 'صاحب المحل' ? 'سرمد مؤيد' : (saved.managerName || 'سرمد مؤيد'),
        storeName: saved.storeName === 'سوبرماركت البركة النموذجي' ? 'سوبرماركت السبطين' : (saved.storeName || 'سوبرماركت السبطين'),
        workers: Array.isArray(saved.workers) ? saved.workers : DEFAULT_SETTINGS.workers
      } : DEFAULT_SETTINGS;
    } catch { return DEFAULT_SETTINGS; }
  });

  // مزامنة الإعدادات وحسابات العمال مع Firestore سحابياً لتعمل في جميع الأجهزة
  useEffect(() => {
    if (!db) return;
    try {
      const unsub = onSnapshot(doc(db, 'app', 'settings'), (snap) => {
        if (snap.exists()) {
          const cloudData = snap.data();
          setSettings((prev) => {
            const merged = { ...prev, ...cloudData };
            localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));
            return merged;
          });
        } else {
          // رفع الإعدادات الحالية لأول مرة عند توفر السحابة
          void setDoc(doc(db, 'app', 'settings'), settings).catch(() => {});
        }
      }, (err) => {
        console.info('Settings cloud sync offline/fallback notice:', err.message);
      });
      return () => unsub();
    } catch (e) {}
  }, []);

  const updateSettings = (changes) => {
    const updated = { ...settings, ...changes };
    setSettings(updated);
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
    if (db) {
      try {
        void setDoc(doc(db, 'app', 'settings'), updated, { merge: true }).catch(() => {});
      } catch (e) {}
    }
  };

  const login = (username, password) => {
    const cleanUsername = username.trim();
    const cleanPassword = password.trim();
    if (!cleanUsername || !cleanPassword) return { success: false, error: 'أدخل اسم المستخدم وكلمة المرور.' };

    if (cleanUsername === settings.managerUsername && cleanPassword === settings.managerPassword) {
      const user = { role: 'manager', name: settings.managerName, username: cleanUsername, loginTime: new Date().toISOString() };
      setCurrentUser(user);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      return { success: true };
    }

    const worker = settings.workers.find((item) => item.username === cleanUsername && item.password === cleanPassword);
    if (worker) {
      const user = { role: 'worker', name: worker.name || worker.username, username: worker.username, loginTime: new Date().toISOString() };
      setCurrentUser(user);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      return { success: true };
    }

    return { success: false, error: 'بيانات الدخول غير صحيحة.' };
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      settings,
      updateSettings,
      login,
      logout,
      isManager: currentUser?.role === 'manager',
      isWorker: currentUser?.role === 'worker'
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
