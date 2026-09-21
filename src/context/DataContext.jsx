import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  getDb,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  onSnapshot
} from '../services/firebase';
import { useAuth, getSavedStoreId, DEFAULT_STORE_ID } from './AuthContext';
import { notificationService } from '../services/notificationService';

// ✅ Always get the live Firestore instance (not a stale null from module init)
const db = getDb();

// 🔤 Smart name normalization for duplicate detection
export const normalizeCustomerName = (name) => {
  if (!name) return '';
  return name
    .trim()
    .replace(/\s+/g, ' ')            // collapse multiple spaces
    .toLowerCase()
    .replace(/[ًٌٍَُِّْـ]/g, '')     // remove Arabic diacritics (tashkeel) & tatweel
    .replace(/[أإآٱ]/g, 'ا')         // normalize alef variants
    .replace(/ة/g, 'ه')              // normalize ta marbuta
    .replace(/[ىي]/g, 'ي')          // normalize alef maqsura and ya
    .replace(/ؤ/g, 'و')              // normalize waw with hamza
    .replace(/ئ/g, 'ي');             // normalize ya with hamza
};

const normalizeName = normalizeCustomerName;

const DataContext = createContext();

// Local Storage Key Builders by Store ID
const getCustomersKey = (sId) => `sarmed_${sId || DEFAULT_STORE_ID}_customers_db`;
const getTransactionsKey = (sId) => `sarmed_${sId || DEFAULT_STORE_ID}_transactions_db`;
const getNotificationsKey = (sId) => `sarmed_${sId || DEFAULT_STORE_ID}_notifications_db`;
const getTombstonesKey = (sId) => `sarmed_${sId || DEFAULT_STORE_ID}_tombstones`;

const loadInitialScopedData = (key, legacyKey, storeId) => {
  try {
    let tombstones = [];
    if (storeId) {
      try {
        tombstones = JSON.parse(localStorage.getItem(getTombstonesKey(storeId)) || '[]');
      } catch (e) {}
    }
    const tombSet = new Set(tombstones);

    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed.filter(item => !tombSet.has(item.id) && !tombSet.has(item.customerId)) : parsed;
    }
    if (legacyKey) {
      const legacy = localStorage.getItem(legacyKey);
      if (legacy) {
        const parsed = JSON.parse(legacy);
        const filtered = Array.isArray(parsed) ? parsed.filter(item => !tombSet.has(item.id) && !tombSet.has(item.customerId)) : parsed;
        localStorage.setItem(key, JSON.stringify(filtered));
        return filtered;
      }
    }
  } catch {}
  return [];
};

export const DataProvider = ({ children }) => {
  const { currentUser, isManager, settings, storeId: authStoreId, updateSettings, setStoreId } = useAuth();
  const activeStoreId = authStoreId || currentUser?.storeId || getSavedStoreId() || DEFAULT_STORE_ID;

  const isWipingRef = useRef(false);

  const [customers, setCustomers] = useState(() =>
    loadInitialScopedData(getCustomersKey(activeStoreId), 'sarmed_customers_db', activeStoreId)
  );

  const [transactions, setTransactions] = useState(() =>
    loadInitialScopedData(getTransactionsKey(activeStoreId), 'sarmed_transactions_db', activeStoreId)
  );

  const [notifications, setNotifications] = useState(() =>
    loadInitialScopedData(getNotificationsKey(activeStoreId), 'sarmed_notifications_db', activeStoreId)
  );

  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [cloudStatus, setCloudStatus] = useState('connecting'); // 'connecting' | 'connected' | 'needs_activation' | 'error' | 'offline'
  const [cloudError, setCloudError] = useState(null);
  const [lastCloudSyncTime, setLastCloudSyncTime] = useState(null);
  // True while we are waiting for the first Firebase snapshot on this device
  const [isLoadingCloudData, setIsLoadingCloudData] = useState(true);

  // 10-Hour Auto-Upload to Cloud Tracking
  const getAutoSyncKey = (sId) => `sarmed_${sId || DEFAULT_STORE_ID}_last_auto_upload_ts`;
  const [lastAutoSyncTime, setLastAutoSyncTime] = useState(() => {
    try {
      const saved = localStorage.getItem(getAutoSyncKey(activeStoreId));
      return saved ? parseInt(saved, 10) : null;
    } catch {
      return null;
    }
  });

  // Reload local state whenever activeStoreId changes
  useEffect(() => {
    setIsLoadingCloudData(true); // Reset loading on store switch
    setCustomers(loadInitialScopedData(getCustomersKey(activeStoreId), 'sarmed_customers_db', activeStoreId));
    setTransactions(loadInitialScopedData(getTransactionsKey(activeStoreId), 'sarmed_transactions_db', activeStoreId));
    setNotifications(loadInitialScopedData(getNotificationsKey(activeStoreId), 'sarmed_notifications_db', activeStoreId));
  }, [activeStoreId]);

  // Monitor Network Online/Offline Status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (cloudStatus === 'offline') setCloudStatus('connecting');
    };
    const handleOffline = () => {
      setIsOnline(false);
      setCloudStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [cloudStatus]);

  // Save to persistent storage whenever state changes
  useEffect(() => {
    if (isWipingRef.current) return;
    try {
      localStorage.setItem(getCustomersKey(activeStoreId), JSON.stringify(customers));
      if (activeStoreId === DEFAULT_STORE_ID) {
        localStorage.setItem('sarmed_customers_db', JSON.stringify(customers));
      }
    } catch (e) {
      console.warn('Failed to save customers locally', e);
    }
  }, [customers, activeStoreId]);

  useEffect(() => {
    if (isWipingRef.current) return;
    try {
      localStorage.setItem(getTransactionsKey(activeStoreId), JSON.stringify(transactions));
      if (activeStoreId === DEFAULT_STORE_ID) {
        localStorage.setItem('sarmed_transactions_db', JSON.stringify(transactions));
      }
    } catch (e) {
      console.warn('Failed to save transactions locally', e);
    }
  }, [transactions, activeStoreId]);

  useEffect(() => {
    if (isWipingRef.current) return;
    try {
      localStorage.setItem(getNotificationsKey(activeStoreId), JSON.stringify(notifications));
    } catch (e) {
      console.warn('Failed to save notifications locally', e);
    }
  }, [notifications, activeStoreId]);

  // Firestore Realtime Synchronization by Store ID
  useEffect(() => {
    if (!db || !activeStoreId) {
      setCloudStatus('offline');
      setIsLoadingCloudData(false);
      return;
    }

    let unsubCustomers = () => {};
    let unsubTransactions = () => {};
    let unsubNotifications = () => {};
    let unsubTombstones = () => {};
    let customersLoaded = false;
    let transactionsLoaded = false;

    const checkAllLoaded = () => {
      if (customersLoaded && transactionsLoaded) {
        setIsLoadingCloudData(false);
      }
    };

    // Safety timeout: if Firebase doesn't respond in 8s, stop loading
    const safetyTimer = setTimeout(() => {
      setIsLoadingCloudData(false);
    }, 8000);

    try {
      setIsSyncing(true);

      // 1. Listen to store-scoped Tombstones Collection (for realtime deletion sync across devices)
      const storeTombCollection = collection(db, 'stores', activeStoreId, 'tombstones');
      unsubTombstones = onSnapshot(
        storeTombCollection,
        (snapshot) => {
          if (isWipingRef.current || snapshot.empty) return;
          const remoteTombIds = snapshot.docs.map((d) => d.id);
          try {
            const localTombs = JSON.parse(localStorage.getItem(getTombstonesKey(activeStoreId)) || '[]');
            const merged = Array.from(new Set([...localTombs, ...remoteTombIds]));
            localStorage.setItem(getTombstonesKey(activeStoreId), JSON.stringify(merged));
            const mergedSet = new Set(merged);

            // Immediately purge any deleted customers or transactions from state
            setCustomers((prev) => prev.filter((c) => !mergedSet.has(c.id)));
            setTransactions((prev) => prev.filter((t) => !mergedSet.has(t.customerId) && !mergedSet.has(t.id)));
          } catch (e) {}
        },
        (err) => {}
      );

      // 2. Listen to store-scoped Customers Collection
      const storeCustCollection = collection(db, 'stores', activeStoreId, 'customers');
      unsubCustomers = onSnapshot(
        storeCustCollection,
        (snapshot) => {
          setCloudStatus('connected');
          setCloudError(null);
          setLastCloudSyncTime(new Date().toLocaleTimeString('ar-IQ'));
          setIsSyncing(false);

          if (isWipingRef.current) return;

          let tombstones = [];
          try {
            tombstones = JSON.parse(localStorage.getItem(getTombstonesKey(activeStoreId)) || '[]');
          } catch (e) {}
          const tombSet = new Set(tombstones);

          const cloudList = snapshot.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((c) => !tombSet.has(c.id)); // 🚫 NEVER restore tombstoned/deleted customers!

          cloudList.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));

          // ✅ Set state from cloud data. DO NOT automatically push local data to cloud here!
          setCustomers(cloudList);
          try {
            localStorage.setItem(getCustomersKey(activeStoreId), JSON.stringify(cloudList));
            if (activeStoreId === DEFAULT_STORE_ID) {
              localStorage.setItem('sarmed_customers_db', JSON.stringify(cloudList));
            }
          } catch (e) {}

          customersLoaded = true;
          checkAllLoaded();
        },
        (error) => {
          console.warn('Firestore customers listener error:', error.code, error.message);
          setIsSyncing(false);
          customersLoaded = true;
          checkAllLoaded();

          if (
            error.code === 'permission-denied' ||
            error.message?.includes('PERMISSION_DENIED') ||
            error.message?.includes('not been used in project') ||
            error.message?.includes('disabled')
          ) {
            setCloudStatus('needs_activation');
            setCloudError('قاعدة بيانات Cloud Firestore بحاجة لإنشاء وتفعيل في لوحة تحكم Firebase');
          } else {
            setCloudStatus('error');
            setCloudError(error.message);
          }
        }
      );

      // 3. Listen to store-scoped Transactions Collection
      const storeTransCollection = collection(db, 'stores', activeStoreId, 'transactions');
      unsubTransactions = onSnapshot(
        storeTransCollection,
        (snapshot) => {
          if (isWipingRef.current) return;

          let tombstones = [];
          try {
            tombstones = JSON.parse(localStorage.getItem(getTombstonesKey(activeStoreId)) || '[]');
          } catch (e) {}
          const tombSet = new Set(tombstones);

          const cloudList = snapshot.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((t) => !tombSet.has(t.id) && !tombSet.has(t.customerId)); // filter out deleted customer transactions

          cloudList.sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0));

          setTransactions(cloudList);
          try {
            localStorage.setItem(getTransactionsKey(activeStoreId), JSON.stringify(cloudList));
            if (activeStoreId === DEFAULT_STORE_ID) {
              localStorage.setItem('sarmed_transactions_db', JSON.stringify(cloudList));
            }
          } catch (e) {}

          transactionsLoaded = true;
          checkAllLoaded();
        },
        (error) => {
          console.warn('Firestore transactions listener notice:', error.message);
          transactionsLoaded = true;
          checkAllLoaded();
        }
      );

      // 4. Listen to store-scoped Notifications Collection
      const storeNotifCollection = collection(db, 'stores', activeStoreId, 'notifications');
      unsubNotifications = onSnapshot(
        storeNotifCollection,
        (snapshot) => {
          if (isWipingRef.current) return;
          if (!snapshot.empty) {
            const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
            list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
            setNotifications(list);
          }
        },
        (error) => {}
      );
    } catch (err) {
      console.warn('Firebase snapshot listener initialization notice:', err);
      setIsSyncing(false);
      setIsLoadingCloudData(false);
    }

    return () => {
      clearTimeout(safetyTimer);
      unsubCustomers();
      unsubTransactions();
      unsubNotifications();
      unsubTombstones();
    };
  }, [activeStoreId]);

  // --- ACTIONS ---

  // Add a Customer
  const addCustomer = async ({ name, phone = '', address = '', notes = '', initialDebt = 0 }) => {
    if (!isManager) throw new Error('إضافة زبون جديد متاحة لصاحب السوبرماركت فقط');
    if (!name?.trim()) throw new Error('يرجى إدخال اسم الزبون');

    // 🚫 Smart duplicate name detection
    const normalizedNewName = normalizeName(name);
    const existingDuplicate = customers.find(c => normalizeName(c.name) === normalizedNewName);
    if (existingDuplicate) {
      throw new Error(`يوجد زبون مسجل بنفس الاسم بالفعل: "${existingDuplicate.name}"`);
    }

    const parsedInitialDebt = parseFloat(initialDebt) || 0;
    const customerId = 'cust_' + Date.now();
    const newCustomer = {
      id: customerId,
      storeId: activeStoreId,
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      notes: notes.trim(),
      currentDebt: parsedInitialDebt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Update local state immediately
    setCustomers((prev) => [newCustomer, ...prev]);

    // If initial debt > 0, create an initial approved transaction
    if (parsedInitialDebt > 0) {
      const initialTx = {
        id: 'tx_' + Date.now(),
        storeId: activeStoreId,
        customerId: customerId,
        customerName: newCustomer.name,
        type: 'debt',
        amount: parsedInitialDebt,
        details: 'رصيد دين سابق عند إنشاء الحساب',
        date: new Date().toISOString().split('T')[0],
        createdBy: currentUser?.name || 'المدير',
        creatorRole: currentUser?.role || 'manager',
        status: 'approved',
        createdAt: new Date().toISOString()
      };
      setTransactions((prev) => [initialTx, ...prev]);

      if (db) {
        try {
          void setDoc(doc(db, 'stores', activeStoreId, 'transactions', initialTx.id), initialTx).catch(() => {});
          void setDoc(doc(db, 'transactions', initialTx.id), initialTx).catch(() => {});
        } catch (e) {}
      }
    }

    // Sync to Firestore
    if (db) {
      try {
        void setDoc(doc(db, 'stores', activeStoreId, 'customers', customerId), newCustomer).catch(() => {});
        void setDoc(doc(db, 'customers', customerId), newCustomer).catch(() => {});
      } catch (err) {
        console.warn('Firestore add customer buffered locally');
      }
    }

    return newCustomer;
  };

  // Update Customer Details
  const updateCustomer = async (id, updatedFields) => {
    const updated = {
      ...updatedFields,
      updatedAt: new Date().toISOString()
    };

    setCustomers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updated } : c))
    );

    if (db) {
      try {
        void updateDoc(doc(db, 'stores', activeStoreId, 'customers', id), updated).catch(() => {});
        void updateDoc(doc(db, 'customers', id), updated).catch(() => {});
      } catch (err) {
        console.warn('Firestore update customer notice', err);
      }
    }
  };

  // Delete Customer — Permanent deletion across all devices & Firebase
  const deleteCustomer = async (id) => {
    if (!id) return { success: false };

    // 1. Record in local tombstones immediately
    const tombKey = getTombstonesKey(activeStoreId);
    try {
      const tombstones = JSON.parse(localStorage.getItem(tombKey) || '[]');
      if (!tombstones.includes(id)) {
        tombstones.push(id);
        localStorage.setItem(tombKey, JSON.stringify(tombstones));
      }
    } catch (e) {}

    // 2. Identify related transactions and notifications
    const relatedTxIds = transactions.filter((t) => t.customerId === id).map((t) => t.id);
    const relatedNotifIds = notifications.filter((n) => n.meta?.customerId === id).map((n) => n.id);

    // 3. Update React state immediately
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    setTransactions((prev) => prev.filter((t) => t.customerId !== id));
    setNotifications((prev) => prev.filter((n) => n.meta?.customerId !== id));

    // 4. Update localStorage synchronously so there is no race condition
    try {
      const savedCusts = JSON.parse(localStorage.getItem(getCustomersKey(activeStoreId)) || '[]');
      const filteredCusts = savedCusts.filter((c) => c.id !== id);
      localStorage.setItem(getCustomersKey(activeStoreId), JSON.stringify(filteredCusts));
      if (activeStoreId === DEFAULT_STORE_ID) {
        localStorage.setItem('sarmed_customers_db', JSON.stringify(filteredCusts));
      }

      const savedTxs = JSON.parse(localStorage.getItem(getTransactionsKey(activeStoreId)) || '[]');
      const filteredTxs = savedTxs.filter((t) => t.customerId !== id);
      localStorage.setItem(getTransactionsKey(activeStoreId), JSON.stringify(filteredTxs));
      if (activeStoreId === DEFAULT_STORE_ID) {
        localStorage.setItem('sarmed_transactions_db', JSON.stringify(filteredTxs));
      }
    } catch (e) {}

    // 5. Delete permanently from Firebase Firestore and register tombstone
    if (db) {
      try {
        // Register tombstone in Firestore so ALL other devices see and enforce deletion
        await setDoc(doc(db, 'stores', activeStoreId, 'tombstones', id), {
          id,
          type: 'customer',
          deletedAt: new Date().toISOString()
        }).catch(() => {});

        // Delete customer documents
        await deleteDoc(doc(db, 'stores', activeStoreId, 'customers', id)).catch(() => {});
        await deleteDoc(doc(db, 'customers', id)).catch(() => {});

        // Delete all customer transactions from Firestore
        for (const txId of relatedTxIds) {
          await deleteDoc(doc(db, 'stores', activeStoreId, 'transactions', txId)).catch(() => {});
          await deleteDoc(doc(db, 'transactions', txId)).catch(() => {});
        }

        // Delete customer notifications from Firestore
        for (const notifId of relatedNotifIds) {
          await deleteDoc(doc(db, 'stores', activeStoreId, 'notifications', notifId)).catch(() => {});
          await deleteDoc(doc(db, 'notifications', notifId)).catch(() => {});
        }
      } catch (err) {
        console.warn('Firestore delete error:', err);
      }
    }

    notificationService.playChime('success');
    return {
      success: true,
      deletedTransactions: relatedTxIds.length,
      deletedNotifications: relatedNotifIds.length
    };
  };

  // Dispatch an In-app & System Notification
  const dispatchNotification = async ({ title, message, targetRole, type = 'info', meta = {} }) => {
    const notifId = 'notif_' + Date.now();
    const newNotif = {
      id: notifId,
      storeId: activeStoreId,
      title,
      message,
      targetRole,
      type,
      read: false,
      meta,
      createdAt: new Date().toISOString()
    };

    setNotifications((prev) => [newNotif, ...prev]);

    // Send Browser / Mobile Notification with sound
    notificationService.sendSystemNotification(title, {
      body: message,
      soundType: type === 'alert' ? 'alert' : 'success'
    });

    if (db) {
      try {
        void setDoc(doc(db, 'stores', activeStoreId, 'notifications', notifId), newNotif).catch(() => {});
        void setDoc(doc(db, 'notifications', notifId), newNotif).catch(() => {});
      } catch (e) {}
    }
  };

  // Add Debt Transaction
  const addDebtTransaction = async ({ customerId, amount, details, date, invoicePhoto = '', customerData = null }) => {
    const parsedAmount = parseFloat(amount) || 0;
    if (parsedAmount <= 0) throw new Error('المبلغ يجب أن يكون أكبر من صفر');

    const customer = customerData || customers.find((c) => c.id === customerId);
    if (!customer) throw new Error('الزبون غير موجود');

    const isWorkerRole = currentUser?.role === 'worker';
    const requiresApproval = isWorkerRole && settings.workerRequiresApproval;
    const status = requiresApproval ? 'pending' : 'approved';

    const txId = 'tx_' + Date.now();
    const newTx = {
      id: txId,
      storeId: activeStoreId,
      customerId,
      customerName: customer.name,
      type: 'debt',
      amount: parsedAmount,
      details: details ? details.trim() : 'بضاعة متنوعة',
      date: date || new Date().toISOString().split('T')[0],
      invoicePhoto,
      createdBy: currentUser?.name || 'مستخدم',
      creatorRole: currentUser?.role || 'worker',
      status,
      createdAt: new Date().toISOString()
    };

    if (status === 'approved') {
      const updatedDebt = (customer.currentDebt || 0) + parsedAmount;
      updateCustomer(customerId, {
        currentDebt: updatedDebt,
        lastTransactionDate: newTx.date
      });
    }

    setTransactions((prev) => [newTx, ...prev]);

    if (db) {
      try {
        void setDoc(doc(db, 'stores', activeStoreId, 'transactions', txId), newTx).catch(() => {});
        void setDoc(doc(db, 'transactions', txId), newTx).catch(() => {});
      } catch (e) {}
    }

    if (status === 'pending') {
      try {
        await dispatchNotification({
          title: 'طلب موافقة على دين جديد 🔔',
          message: `قام العامل "${newTx.createdBy}" بإضافة دين للزبون "${customer.name}" بقيمة ${parsedAmount.toLocaleString()} ${settings.currency}. بانتظار موافقتك.`,
          targetRole: 'manager',
          type: 'alert',
          meta: { txId: newTx.id, type: 'debt', customerId }
        });
      } catch (error) {
        console.warn('Approval notification queued locally failed:', error);
      }
    } else {
      notificationService.playChime('success');
    }

    return newTx;
  };

  // Add Payment / Settle Debt Transaction
  const addPaymentTransaction = async ({ customerId, amount, details, date, paymentMethod = 'نقدي' }) => {
    const parsedAmount = parseFloat(amount) || 0;
    if (parsedAmount <= 0) throw new Error('مبلغ التسديد يجب أن يكون أكبر من صفر');

    const customer = customers.find((c) => c.id === customerId);
    if (!customer) throw new Error('الزبون غير موجود');

    const isWorkerRole = currentUser?.role === 'worker';
    const requiresApproval = isWorkerRole && settings.workerRequiresApproval;
    const status = requiresApproval ? 'pending' : 'approved';

    const txId = 'tx_' + Date.now();
    const newTx = {
      id: txId,
      storeId: activeStoreId,
      customerId,
      customerName: customer.name,
      type: 'payment',
      amount: parsedAmount,
      paymentMethod,
      details: details ? details.trim() : 'تسديد دفعة حساب',
      date: date || new Date().toISOString().split('T')[0],
      createdBy: currentUser?.name || 'مستخدم',
      creatorRole: currentUser?.role || 'worker',
      status,
      createdAt: new Date().toISOString()
    };

    if (status === 'approved') {
      const updatedDebt = Math.max(0, (customer.currentDebt || 0) - parsedAmount);
      updateCustomer(customerId, {
        currentDebt: updatedDebt,
        lastTransactionDate: newTx.date
      });
    }

    setTransactions((prev) => [newTx, ...prev]);

    if (db) {
      try {
        void setDoc(doc(db, 'stores', activeStoreId, 'transactions', txId), newTx).catch(() => {});
        void setDoc(doc(db, 'transactions', txId), newTx).catch(() => {});
      } catch (e) {}
    }

    if (status === 'pending') {
      try {
        await dispatchNotification({
          title: 'طلب موافقة على تسديد دفعة 💵',
          message: `قام العامل "${newTx.createdBy}" بتسجيل تسديد من الزبون "${customer.name}" بمبلغ ${parsedAmount.toLocaleString()} ${settings.currency}. بانتظار موافقتك.`,
          targetRole: 'manager',
          type: 'alert',
          meta: { txId: newTx.id, type: 'payment', customerId }
        });
      } catch (error) {
        console.warn('Approval notification queued locally failed:', error);
      }
    } else {
      notificationService.playChime('success');
    }

    return newTx;
  };

  // Approve Pending Transaction
  const approveTransaction = async (txId) => {
    const tx = transactions.find((t) => t.id === txId);
    if (!tx || tx.status !== 'pending') return;

    const customer = customers.find((c) => c.id === tx.customerId);
    let updatedDebt = customer ? (customer.currentDebt || 0) : 0;

    if (customer) {
      if (tx.type === 'debt') {
        updatedDebt = updatedDebt + tx.amount;
      } else if (tx.type === 'payment') {
        updatedDebt = Math.max(0, updatedDebt - tx.amount);
      }
      updateCustomer(customer.id, {
        currentDebt: updatedDebt,
        lastTransactionDate: tx.date
      });
    }

    const updatedTx = {
      ...tx,
      status: 'approved',
      approvedAt: new Date().toISOString(),
      approvedBy: currentUser?.name || 'المدير'
    };

    setTransactions((prev) =>
      prev.map((t) => (t.id === txId ? updatedTx : t))
    );

    if (db) {
      try {
        void updateDoc(doc(db, 'stores', activeStoreId, 'transactions', txId), {
          status: 'approved',
          approvedAt: updatedTx.approvedAt,
          approvedBy: updatedTx.approvedBy
        }).catch(() => {});
        void updateDoc(doc(db, 'transactions', txId), {
          status: 'approved',
          approvedAt: updatedTx.approvedAt,
          approvedBy: updatedTx.approvedBy
        }).catch(() => {});
      } catch (e) {}
    }

    await dispatchNotification({
      title: 'تم اعتماد العملية بنجاح ✅',
      message: `وافق المدير على عملية ${tx.type === 'debt' ? 'إضافة دين' : 'تسديد'} للزبون "${tx.customerName}" بمبلغ ${tx.amount.toLocaleString()} ${settings.currency}.`,
      targetRole: 'worker',
      type: 'success',
      meta: { txId }
    });

    notificationService.playChime('success');
  };

  // Reject Pending Transaction
  const rejectTransaction = async (txId, reason = 'لم يتم التوضيح') => {
    const tx = transactions.find((t) => t.id === txId);
    if (!tx || tx.status !== 'pending') return;

    const updatedTx = {
      ...tx,
      status: 'rejected',
      rejectionReason: reason,
      rejectedAt: new Date().toISOString(),
      rejectedBy: currentUser?.name || 'المدير'
    };

    setTransactions((prev) =>
      prev.map((t) => (t.id === txId ? updatedTx : t))
    );

    if (db) {
      try {
        void updateDoc(doc(db, 'stores', activeStoreId, 'transactions', txId), {
          status: 'rejected',
          rejectionReason: reason,
          rejectedAt: updatedTx.rejectedAt,
          rejectedBy: updatedTx.rejectedBy
        }).catch(() => {});
      } catch (e) {}
    }

    await dispatchNotification({
      title: 'تم رفض العملية ❌',
      message: `تم رفض عملية ${tx.type === 'debt' ? 'الدين' : 'التسديد'} للزبون "${tx.customerName}". السبب: ${reason}`,
      targetRole: 'worker',
      type: 'warning',
      meta: { txId, reason }
    });

    notificationService.playChime('error');
  };

  const markNotificationRead = (notifId) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, read: true } : n))
    );
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    localStorage.removeItem(getNotificationsKey(activeStoreId));
  };

  const STATS_RESET_KEY = `sarmed_${activeStoreId}_stats_reset_timestamp`;
  const [statsResetTimestamp, setStatsResetTimestamp] = useState(() => {
    try {
      return parseInt(localStorage.getItem(STATS_RESET_KEY) || '0', 10);
    } catch {
      return 0;
    }
  });

  const getLocalDateStr = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [currentDateStr, setCurrentDateStr] = useState(getLocalDateStr());

  useEffect(() => {
    const interval = setInterval(() => {
      const today = getLocalDateStr();
      if (today !== currentDateStr) {
        setCurrentDateStr(today);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [currentDateStr]);

  const resetStatisticsOnly = async () => {
    const now = Date.now();
    setStatsResetTimestamp(now);
    try {
      localStorage.setItem(STATS_RESET_KEY, now.toString());
    } catch (e) {}

    let correctedCount = 0;
    const auditedCustomers = customers.map((cust) => {
      const custTxs = transactions.filter(
        (t) => t.customerId === cust.id && t.status === 'approved'
      );
      const totalDebts = custTxs
        .filter((t) => t.type === 'debt')
        .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
      const totalPayments = custTxs
        .filter((t) => t.type === 'payment')
        .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
      const accurateDebt = Math.max(0, totalDebts - totalPayments);

      if (cust.currentDebt !== accurateDebt) {
        correctedCount++;
        if (db) {
          try {
            void updateDoc(doc(db, 'stores', activeStoreId, 'customers', cust.id), {
              currentDebt: accurateDebt,
              updatedAt: new Date().toISOString()
            }).catch(() => {});
          } catch (e) {}
        }
        return { ...cust, currentDebt: accurateDebt };
      }
      return cust;
    });

    if (correctedCount > 0) {
      setCustomers(auditedCustomers);
    }

    notificationService.playChime('success');
    return { correctedCount, totalAudited: customers.length };
  };

  const resetAllData = async () => {
    setCustomers([]);
    setTransactions([]);
    setNotifications([]);
    localStorage.removeItem(getCustomersKey(activeStoreId));
    localStorage.removeItem(getTransactionsKey(activeStoreId));
    localStorage.removeItem(getNotificationsKey(activeStoreId));
    localStorage.removeItem(STATS_RESET_KEY);
  };

  // Full Cloud Push for Active Store (legacy - still used by auto-sync)
  const syncAllDataToCloud = async () => {
    if (!db) throw new Error('خدمة Firebase غير مهيأة');
    setIsSyncing(true);
    let count = 0;
    try {
      // 1. Sync Settings
      if (settings) {
        await setDoc(doc(db, 'stores', activeStoreId, 'config', 'settings'), settings, { merge: true });
        await setDoc(doc(db, 'app', 'settings'), settings, { merge: true });
      }

      // 2. Sync Customers
      for (const cust of customers) {
        await setDoc(doc(db, 'stores', activeStoreId, 'customers', cust.id), cust, { merge: true });
        count++;
      }

      // 3. Sync Transactions
      for (const tx of transactions) {
        await setDoc(doc(db, 'stores', activeStoreId, 'transactions', tx.id), tx, { merge: true });
        count++;
      }

      // 4. Sync Notifications
      for (const notif of notifications) {
        await setDoc(doc(db, 'stores', activeStoreId, 'notifications', notif.id), notif, { merge: true });
      }

      setCloudStatus('connected');
      setCloudError(null);
      setLastCloudSyncTime(new Date().toLocaleTimeString('ar-IQ'));
      const now = Date.now();
      localStorage.setItem(getAutoSyncKey(activeStoreId), now.toString());
      setLastAutoSyncTime(now);
      notificationService.playChime('success');
      return {
        success: true,
        count,
        customersCount: customers.length,
        transactionsCount: transactions.length
      };
    } catch (err) {
      console.warn('Cloud sync error:', err);
      if (
        err.message?.includes('PERMISSION_DENIED') ||
        err.message?.includes('not been used in project') ||
        err.code === 'permission-denied'
      ) {
        setCloudStatus('needs_activation');
        setCloudError('قاعدة بيانات Cloud Firestore بحاجة لإنشاء وتفعيل في لوحة تحكم Firebase');
      } else {
        setCloudStatus('error');
        setCloudError(err.message || 'فشلت المزامنة مع السحابة');
      }
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  // ☁️ Smart Cloud Sync — only uploads NEW records without duplicating existing ones
  const smartSyncToCloud = async () => {
    if (!db) throw new Error('خدمة Firebase غير مهيأة');
    setIsSyncing(true);

    const report = {
      newCustomers: 0,
      skippedCustomers: 0,
      newTransactions: 0,
      skippedTransactions: 0,
      newNotifications: 0,
      skippedNotifications: 0
    };

    try {
      // 1. Sync store settings
      if (settings) {
        await setDoc(doc(db, 'stores', activeStoreId, 'config', 'settings'), settings, { merge: true });
      }

      // 2. Fetch existing customers from Firestore
      const cloudCustSnap = await getDocs(collection(db, 'stores', activeStoreId, 'customers'));
      const cloudCustMapById = new Map();
      const cloudCustMapByName = new Map();

      cloudCustSnap.docs.forEach((d) => {
        const data = d.data();
        cloudCustMapById.set(d.id, data);
        if (data.name) {
          cloudCustMapByName.set(normalizeName(data.name), { id: d.id, ...data });
        }
      });

      // Get tombstones so we NEVER upload deleted customers
      let tombstones = [];
      try {
        tombstones = JSON.parse(localStorage.getItem(getTombstonesKey(activeStoreId)) || '[]');
      } catch (e) {}
      const tombSet = new Set(tombstones);

      // 3. Upload only NEW customers (check by ID AND by normalized name!)
      for (const cust of customers) {
        if (tombSet.has(cust.id)) continue; // Never upload deleted

        const normalizedCustName = normalizeName(cust.name);
        const existingByName = cloudCustMapByName.get(normalizedCustName);
        const existsById = cloudCustMapById.has(cust.id);

        if (!existsById && !existingByName) {
          // Truly new customer!
          await setDoc(doc(db, 'stores', activeStoreId, 'customers', cust.id), cust);
          cloudCustMapById.set(cust.id, cust);
          cloudCustMapByName.set(normalizedCustName, cust);
          report.newCustomers++;
        } else {
          // Already exists in cloud! Do not duplicate! Just merge fields if needed
          const targetId = existsById ? cust.id : existingByName.id;
          await setDoc(doc(db, 'stores', activeStoreId, 'customers', targetId), cust, { merge: true });
          report.skippedCustomers++;
        }
      }

      // 4. Fetch existing transactions from Firestore
      const cloudTxSnap = await getDocs(collection(db, 'stores', activeStoreId, 'transactions'));
      const cloudTxIds = new Set(cloudTxSnap.docs.map((d) => d.id));

      // 5. Upload only NEW transactions
      for (const tx of transactions) {
        if (tombSet.has(tx.id) || tombSet.has(tx.customerId)) continue;

        if (!cloudTxIds.has(tx.id)) {
          await setDoc(doc(db, 'stores', activeStoreId, 'transactions', tx.id), tx);
          cloudTxIds.add(tx.id);
          report.newTransactions++;
        } else {
          report.skippedTransactions++;
        }
      }

      // 6. Fetch and upload only new notifications
      const cloudNotifSnap = await getDocs(collection(db, 'stores', activeStoreId, 'notifications'));
      const cloudNotifIds = new Set(cloudNotifSnap.docs.map((d) => d.id));

      for (const notif of notifications) {
        if (!cloudNotifIds.has(notif.id)) {
          await setDoc(doc(db, 'stores', activeStoreId, 'notifications', notif.id), notif);
          cloudNotifIds.add(notif.id);
          report.newNotifications++;
        } else {
          report.skippedNotifications++;
        }
      }

      setCloudStatus('connected');
      setCloudError(null);
      setLastCloudSyncTime(new Date().toLocaleTimeString('ar-IQ'));
      const now = Date.now();
      localStorage.setItem(getAutoSyncKey(activeStoreId), now.toString());
      setLastAutoSyncTime(now);
      notificationService.playChime('success');

      return { success: true, ...report };
    } catch (err) {
      console.warn('Smart sync error:', err);
      if (
        err.message?.includes('PERMISSION_DENIED') ||
        err.message?.includes('not been used in project') ||
        err.code === 'permission-denied'
      ) {
        setCloudStatus('needs_activation');
        setCloudError('قاعدة بيانات Cloud Firestore بحاجة لإنشاء وتفعيل في لوحة تحكم Firebase');
      } else {
        setCloudStatus('error');
        setCloudError(err.message || 'فشلت المزامنة مع السحابة');
      }
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  // 🔍 Scan and Remove Duplicate Customers
  const scanAndRemoveDuplicates = async () => {
    const nameMap = new Map(); // normalized name -> first/original customer
    const duplicates = [];
    const mergedTransactions = [];

    // Sort by createdAt ascending so oldest customer is original
    const sortedCustomers = [...customers].sort(
      (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
    );

    for (const cust of sortedCustomers) {
      const normalized = normalizeName(cust.name);
      if (!normalized) continue;

      if (nameMap.has(normalized)) {
        // Duplicate found!
        const original = nameMap.get(normalized);
        duplicates.push({ duplicate: cust, originalId: original.id, originalName: original.name });

        // Move transactions of duplicate to original
        const dupTxs = transactions.filter((t) => t.customerId === cust.id);
        for (const tx of dupTxs) {
          mergedTransactions.push({
            ...tx,
            customerId: original.id,
            customerName: original.name,
            _mergedFrom: cust.id
          });
        }
      } else {
        nameMap.set(normalized, cust);
      }
    }

    if (duplicates.length === 0) {
      return {
        duplicatesFound: 0,
        duplicatesRemoved: 0,
        transactionsMerged: 0,
        details: []
      };
    }

    const dupIds = new Set(duplicates.map((d) => d.duplicate.id));

    // 1. Add duplicate IDs to tombstones immediately so they can NEVER be resurrected
    const tombKey = getTombstonesKey(activeStoreId);
    try {
      const existingTombs = JSON.parse(localStorage.getItem(tombKey) || '[]');
      const updatedTombs = Array.from(new Set([...existingTombs, ...Array.from(dupIds)]));
      localStorage.setItem(tombKey, JSON.stringify(updatedTombs));
    } catch (e) {}

    // 2. Update local state
    setTransactions((prev) =>
      prev.map((tx) => {
        const merged = mergedTransactions.find((mt) => mt.id === tx.id);
        return merged || tx;
      })
    );
    setCustomers((prev) => prev.filter((c) => !dupIds.has(c.id)));

    // 3. Update localStorage synchronously
    try {
      const savedCusts = JSON.parse(localStorage.getItem(getCustomersKey(activeStoreId)) || '[]');
      const filtered = savedCusts.filter((c) => !dupIds.has(c.id));
      localStorage.setItem(getCustomersKey(activeStoreId), JSON.stringify(filtered));
      if (activeStoreId === DEFAULT_STORE_ID) {
        localStorage.setItem('sarmed_customers_db', JSON.stringify(filtered));
      }
    } catch (e) {}

    // 4. Process Firestore: Delete duplicates + add tombstones + update merged transactions
    if (db) {
      for (const dup of duplicates) {
        try {
          // Register tombstone in Firestore
          await setDoc(doc(db, 'stores', activeStoreId, 'tombstones', dup.duplicate.id), {
            id: dup.duplicate.id,
            name: dup.duplicate.name,
            mergedInto: dup.originalId,
            type: 'duplicate_customer',
            deletedAt: new Date().toISOString()
          });

          // Delete duplicate customer doc
          await deleteDoc(doc(db, 'stores', activeStoreId, 'customers', dup.duplicate.id)).catch(() => {});
          await deleteDoc(doc(db, 'customers', dup.duplicate.id)).catch(() => {});
        } catch (e) {}
      }

      // Update merged transactions in Firestore
      for (const mt of mergedTransactions) {
        try {
          await setDoc(doc(db, 'stores', activeStoreId, 'transactions', mt.id), mt, { merge: true });
        } catch (e) {}
      }
    }

    // 5. Recalculate accurate balances
    void resetStatisticsOnly().catch(() => {});

    notificationService.playChime('success');

    return {
      duplicatesFound: duplicates.length,
      duplicatesRemoved: duplicates.length,
      transactionsMerged: mergedTransactions.length,
      details: duplicates.map((d) => ({
        removedName: d.duplicate.name,
        removedId: d.duplicate.id,
        mergedInto: d.originalName,
        mergedIntoId: d.originalId
      }))
    };
  };

  // 📥 Download all data then clear database (Mobile + Desktop compatible)
  const downloadAndClearAll = async () => {
    // 1. Prepare full backup data
    const backupData = {
      version: '2.0',
      exportDate: new Date().toISOString(),
      storeName: settings.storeName || 'متجر سرمد',
      storeId: activeStoreId,
      storeSettings: settings,
      customers,
      transactions,
      notifications,
      totalCustomers: customers.length,
      totalTransactions: transactions.length
    };

    const custCount = customers.length;
    const txCount = transactions.length;
    const jsonString = JSON.stringify(backupData, null, 2);
    const fileName = `sarmed_backup_${activeStoreId}_${new Date().toISOString().split('T')[0]}.json`;

    // 2. Download the file using Blob (Mobile + Desktop compatible)
    try {
      const blob = new Blob([jsonString], { type: 'application/json' });

      // Try Web Share API first (on mobile phones this allows saving to files / sharing directly)
      let shared = false;
      if (typeof navigator !== 'undefined' && navigator.canShare) {
        try {
          const file = new File([blob], fileName, { type: 'application/json' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: 'نسخة احتياطية لقاعدة البيانات',
              text: 'نسخة احتياطية لقاعدة بيانات متجر سرمد'
            });
            shared = true;
          }
        } catch (shareErr) {
          // User aborted share or share failed -> continue to direct download
        }
      }

      if (!shared) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          try {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          } catch (e) {}
        }, 3000);
      }
    } catch (downloadErr) {
      console.warn('Backup download warning:', downloadErr);
    }

    // 3. Pause briefly to ensure download has started
    await new Promise((resolve) => setTimeout(resolve, 1200));

    // 4. Set wiping flag so listeners don't re-upload
    isWipingRef.current = true;

    // 5. Clear all local data immediately
    await resetAllData();

    // Clear tombstones key too
    try {
      localStorage.removeItem(getTombstonesKey(activeStoreId));
    } catch (e) {}

    // 6. Wipe everything from Firebase Firestore
    if (db) {
      try {
        const custSnap = await getDocs(collection(db, 'stores', activeStoreId, 'customers'));
        for (const d of custSnap.docs) {
          await deleteDoc(doc(db, 'stores', activeStoreId, 'customers', d.id)).catch(() => {});
          await deleteDoc(doc(db, 'customers', d.id)).catch(() => {});
        }

        const txSnap = await getDocs(collection(db, 'stores', activeStoreId, 'transactions'));
        for (const d of txSnap.docs) {
          await deleteDoc(doc(db, 'stores', activeStoreId, 'transactions', d.id)).catch(() => {});
          await deleteDoc(doc(db, 'transactions', d.id)).catch(() => {});
        }

        const notifSnap = await getDocs(collection(db, 'stores', activeStoreId, 'notifications'));
        for (const d of notifSnap.docs) {
          await deleteDoc(doc(db, 'stores', activeStoreId, 'notifications', d.id)).catch(() => {});
          await deleteDoc(doc(db, 'notifications', d.id)).catch(() => {});
        }

        const tombSnap = await getDocs(collection(db, 'stores', activeStoreId, 'tombstones'));
        for (const d of tombSnap.docs) {
          await deleteDoc(doc(db, 'stores', activeStoreId, 'tombstones', d.id)).catch(() => {});
        }
      } catch (e) {
        console.warn('Firebase clear error:', e);
      }
    }

    // Release wiping flag after 2.5 seconds
    setTimeout(() => {
      isWipingRef.current = false;
    }, 2500);

    notificationService.playChime('success');
    return { customersCleared: custCount, transactionsCleared: txCount };
  };

  // Ten-Hour Automatic Cloud Sync Scheduler
  useEffect(() => {
    if (!activeStoreId || !db) return;

    const TEN_HOURS_MS = 10 * 60 * 60 * 1000;

    const checkAndTriggerAutoSync = async () => {
      try {
        const savedTs = localStorage.getItem(getAutoSyncKey(activeStoreId));
        const lastSync = savedTs ? parseInt(savedTs, 10) : 0;
        const now = Date.now();

        if (!lastSync || now - lastSync >= TEN_HOURS_MS) {
          console.log('⏰ بدء الرفع التلقائي إلى فايربيس (كل 10 ساعات)...');
          await syncAllDataToCloud();
          localStorage.setItem(getAutoSyncKey(activeStoreId), now.toString());
          setLastAutoSyncTime(now);
        }
      } catch (err) {
        console.warn('Auto sync check error:', err);
      }
    };

    checkAndTriggerAutoSync();
    const interval = setInterval(checkAndTriggerAutoSync, 5 * 60 * 1000); // Check every 5 mins
    return () => clearInterval(interval);
  }, [activeStoreId, customers.length, transactions.length]);

  // Force pull all data fresh from Firebase (for manual refresh on new device)
  const forceRefreshFromCloud = async () => {
    if (!db || !activeStoreId) return;
    setIsSyncing(true);
    setIsLoadingCloudData(true);
    try {
      const { getDocs: getDocsOnce, collection: col } = await import('../services/firebase');

      const custSnap = await getDocs(collection(db, 'stores', activeStoreId, 'customers'));
      if (!custSnap.empty) {
        const list = custSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));
        setCustomers(list);
        localStorage.setItem(getCustomersKey(activeStoreId), JSON.stringify(list));
      }

      const txSnap = await getDocs(collection(db, 'stores', activeStoreId, 'transactions'));
      if (!txSnap.empty) {
        const list = txSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        setTransactions(list);
        localStorage.setItem(getTransactionsKey(activeStoreId), JSON.stringify(list));
      }

      setCloudStatus('connected');
      setLastCloudSyncTime(new Date().toLocaleTimeString('ar-IQ'));
      notificationService.playChime('success');
    } catch (err) {
      console.warn('Force refresh error:', err);
    } finally {
      setIsSyncing(false);
      setIsLoadingCloudData(false);
    }
  };

  // Direct Device-to-Device Import / Sync
  const importStoreData = async (incomingData) => {
    if (!incomingData || typeof incomingData !== 'object') {
      throw new Error('صيغة البيانات غير صحيحة');
    }

    const targetStoreId = (incomingData.storeId || activeStoreId || DEFAULT_STORE_ID).trim();
    if (incomingData.storeId && setStoreId) {
      setStoreId(targetStoreId);
    }

    const incomingCustomers = Array.isArray(incomingData.customers) ? incomingData.customers : [];
    const incomingTransactions = Array.isArray(incomingData.transactions) ? incomingData.transactions : [];

    // Merge customers
    setCustomers((prev) => {
      const map = new Map(prev.map((c) => [c.id, c]));
      incomingCustomers.forEach((c) => map.set(c.id, c));
      const merged = Array.from(map.values());
      localStorage.setItem(getCustomersKey(targetStoreId), JSON.stringify(merged));
      if (targetStoreId === DEFAULT_STORE_ID) {
        localStorage.setItem('sarmed_customers_db', JSON.stringify(merged));
      }
      return merged;
    });

    // Merge transactions
    setTransactions((prev) => {
      const map = new Map(prev.map((t) => [t.id, t]));
      incomingTransactions.forEach((t) => map.set(t.id, t));
      const merged = Array.from(map.values());
      localStorage.setItem(getTransactionsKey(targetStoreId), JSON.stringify(merged));
      if (targetStoreId === DEFAULT_STORE_ID) {
        localStorage.setItem('sarmed_transactions_db', JSON.stringify(merged));
      }
      return merged;
    });

    if (incomingData.settings) {
      updateSettings(incomingData.settings);
    }

    // Auto-login session if provided and not currently logged in
    if (!currentUser && incomingData.currentUser) {
      try {
        localStorage.setItem('sarmed_user_session', JSON.stringify(incomingData.currentUser));
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (e) {}
    }

    notificationService.playChime('success');
    void syncAllDataToCloud().catch(() => {});

    return {
      customersCount: incomingCustomers.length,
      transactionsCount: incomingTransactions.length
    };
  };

  // Direct Device-to-Device Export Payload
  const exportStoreData = () => {
    return {
      storeId: activeStoreId,
      version: '2.0',
      exportedAt: new Date().toISOString(),
      storeName: settings.storeName,
      customers,
      transactions,
      settings,
      currentUser: currentUser || {
        role: 'manager',
        name: settings.managerName || 'صاحب المحل',
        username: settings.managerUsername || '1111',
        storeId: activeStoreId,
        loginTime: new Date().toISOString()
      }
    };
  };

  // Handle Magic Sync link from URL (e.g. #sync=BASE64 or #import=BASE64)
  useEffect(() => {
    const handleUrlHashSync = async () => {
      try {
        const hash = window.location.hash || '';
        if (hash.startsWith('#sync=') || hash.startsWith('#import=')) {
          const encoded = hash.replace(/^#(sync|import)=/, '').trim();
          if (!encoded) return;

          let rawJson = '';
          try {
            rawJson = decodeURIComponent(escape(atob(encoded)));
          } catch {
            try {
              rawJson = atob(encoded);
            } catch {
              rawJson = decodeURIComponent(encoded);
            }
          }

          const parsed = JSON.parse(rawJson);
          if (parsed && (parsed.customers || parsed.storeId)) {
            // Clean URL hash smoothly
            window.history.replaceState(null, '', window.location.pathname + window.location.search);

            const res = await importStoreData(parsed);
            alert(`🎉 تم بنجاح نقل ومزامنة بيانات المتجر إلى هذا الجهاز!\n\nتم استيراد ${res.customersCount} زبون و ${res.transactionsCount} حركة مالية بنجاح.`);
          }
        }
      } catch (err) {
        console.warn('Failed to parse URL hash sync data:', err);
      }
    };

    handleUrlHashSync();
    window.addEventListener('hashchange', handleUrlHashSync);
    return () => window.removeEventListener('hashchange', handleUrlHashSync);
  }, []);

  // Computed Financial Metrics & Stats
  const totalDebt = customers.reduce((acc, c) => acc + (parseFloat(c.currentDebt) || 0), 0);
  const totalCustomers = customers.length;
  const customersWithDebt = customers.filter((c) => (parseFloat(c.currentDebt) || 0) > 0).length;

  const todayTransactions = transactions.filter((t) => {
    if (t.status !== 'approved') return false;
    const isToday = t.date === currentDateStr || (t.createdAt && t.createdAt.startsWith(currentDateStr));
    if (!isToday) return false;
    if (statsResetTimestamp > 0) {
      const txTime = t.createdAt ? new Date(t.createdAt).getTime() : 0;
      if (txTime && txTime < statsResetTimestamp) return false;
    }
    return true;
  });

  const todayCollections = todayTransactions
    .filter((t) => t.type === 'payment')
    .reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);

  const todayDebts = todayTransactions
    .filter((t) => t.type === 'debt')
    .reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);

  const pendingApprovals = transactions.filter((t) => t.status === 'pending');
  const pendingApprovalsCount = pendingApprovals.length;

  const userNotifications = notifications.filter(
    (n) => n.targetRole === 'all' || n.targetRole === currentUser?.role
  );
  const unreadNotificationsCount = userNotifications.filter((n) => !n.read).length;

  return (
    <DataContext.Provider
      value={{
        storeId: activeStoreId,
        customers,
        transactions,
        notifications: userNotifications,
        unreadNotificationsCount,
        isSyncing,
        isOnline,
        cloudStatus,
        cloudError,
        lastCloudSyncTime,
        lastAutoSyncTime,
        isLoadingCloudData,
        isCloudConnected: cloudStatus === 'connected',
        syncAllDataToCloud,
        smartSyncToCloud,
        forceRefreshFromCloud,
        importStoreData,
        exportStoreData,
        scanAndRemoveDuplicates,
        downloadAndClearAll,
        totalDebt,
        totalCustomers,
        customersWithDebt,
        todayCollections,
        todayDebts,
        todayTransactionsCount: todayTransactions.length,
        currentDateStr,
        statsResetTimestamp,
        pendingApprovals,
        pendingApprovalsCount,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        addDebtTransaction,
        addPaymentTransaction,
        approveTransaction,
        rejectTransaction,
        markNotificationRead,
        clearAllNotifications,
        dispatchNotification,
        resetStatisticsOnly,
        resetAllData
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
