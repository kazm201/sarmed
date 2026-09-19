import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, doc, setDoc, onSnapshot } from '../services/firebase';

const AuthContext = createContext();
const AUTH_STORAGE_KEY = 'sarmed_user_session';
export const STORE_ID_KEY = 'sarmed_active_store_id';
export const DEFAULT_STORE_ID = '1111';

export const getSavedStoreId = () => {
  try {
    return localStorage.getItem(STORE_ID_KEY) || DEFAULT_STORE_ID;
  } catch {
    return DEFAULT_STORE_ID;
  }
};

const getSettingsStorageKey = (sId) => `sarmed_${sId}_app_settings`;

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

const loadInitialSettings = (sId) => {
  try {
    // 1. Check store-scoped settings
    const scopedSaved = localStorage.getItem(getSettingsStorageKey(sId));
    if (scopedSaved) {
      const parsed = JSON.parse(scopedSaved);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
    // 2. Check legacy global settings
    const legacySaved = localStorage.getItem('sarmed_app_settings');
    if (legacySaved) {
      const parsed = JSON.parse(legacySaved);
      const merged = { ...DEFAULT_SETTINGS, ...parsed };
      localStorage.setItem(getSettingsStorageKey(sId), JSON.stringify(merged));
      return merged;
    }
  } catch {}
  return DEFAULT_SETTINGS;
};

export const AuthProvider = ({ children }) => {
  const [storeId, setStoreIdState] = useState(getSavedStoreId);

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY)) || null;
    } catch {
      return null;
    }
  });

  const [settings, setSettings] = useState(() => loadInitialSettings(storeId));

  const setStoreId = (newId) => {
    const cleanId = (newId || '').trim() || DEFAULT_STORE_ID;
    setStoreIdState(cleanId);
    try {
      localStorage.setItem(STORE_ID_KEY, cleanId);
    } catch {}
    setSettings(loadInitialSettings(cleanId));
  };

  // مزامنة إعدادات المتجر وحسابات العمال مع Firestore سحابياً حسب الـ Store ID
  useEffect(() => {
    if (!db || !storeId) return;

    let unsub = () => {};
    try {
      // Listen to store-scoped settings doc
      const storeSettingsDoc = doc(db, 'stores', storeId, 'config', 'settings');
      unsub = onSnapshot(
        storeSettingsDoc,
        (snap) => {
          if (snap.exists()) {
            const cloudData = snap.data();
            setSettings((prev) => {
              const merged = { ...prev, ...cloudData };
              localStorage.setItem(getSettingsStorageKey(storeId), JSON.stringify(merged));
              return merged;
            });
          } else {
            // If empty in cloud, push current local settings
            void setDoc(storeSettingsDoc, settings, { merge: true }).catch(() => {});
          }
        },
        (err) => {
          console.info('Store settings cloud sync offline/fallback notice:', err.message);
        }
      );
    } catch (e) {}

    return () => unsub();
  }, [storeId]);

  const updateSettings = (changes) => {
    const updated = { ...settings, ...changes };
    setSettings(updated);
    try {
      localStorage.setItem(getSettingsStorageKey(storeId), JSON.stringify(updated));
    } catch {}

    if (db && storeId) {
      try {
        void setDoc(doc(db, 'stores', storeId, 'config', 'settings'), updated, { merge: true }).catch(() => {});
        // Also update legacy location for fallback
        void setDoc(doc(db, 'app', 'settings'), updated, { merge: true }).catch(() => {});
      } catch (e) {}
    }
  };

  const login = (storeIdInput, username, password) => {
    const cleanStoreId = (storeIdInput || '').trim() || DEFAULT_STORE_ID;
    const cleanUsername = (username || '').trim();
    const cleanPassword = (password || '').trim();

    if (!cleanStoreId) return { success: false, error: 'يرجى إدخال معرّف الحساب (ID).' };
    if (!cleanUsername || !cleanPassword) return { success: false, error: 'أدخل اسم المستخدم وكلمة المرور.' };

    // Update active storeId
    setStoreId(cleanStoreId);
    const currentStoreSettings = loadInitialSettings(cleanStoreId);

    // 1. Manager Login
    if (
      cleanUsername === currentStoreSettings.managerUsername &&
      cleanPassword === currentStoreSettings.managerPassword
    ) {
      const user = {
        role: 'manager',
        name: currentStoreSettings.managerName || 'صاحب المحل',
        username: cleanUsername,
        storeId: cleanStoreId,
        loginTime: new Date().toISOString()
      };
      setCurrentUser(user);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      return { success: true };
    }

    // 2. Worker Login
    const worker = (currentStoreSettings.workers || []).find(
      (item) => item.username === cleanUsername && item.password === cleanPassword
    );
    if (worker) {
      const user = {
        role: 'worker',
        name: worker.name || worker.username,
        username: worker.username,
        storeId: cleanStoreId,
        loginTime: new Date().toISOString()
      };
      setCurrentUser(user);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      return { success: true };
    }

    return { success: false, error: 'بيانات الدخول غير صحيحة لهذا المعرّف (تأكد من الـ ID والاسم والرمز).' };
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        storeId,
        setStoreId,
        currentUser,
        settings,
        updateSettings,
        login,
        logout,
        isManager: currentUser?.role === 'manager',
        isWorker: currentUser?.role === 'worker'
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
