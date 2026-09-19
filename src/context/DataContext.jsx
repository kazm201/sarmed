import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  db,
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

const DataContext = createContext();

// Local Storage Key Builders by Store ID
const getCustomersKey = (sId) => `sarmed_${sId || DEFAULT_STORE_ID}_customers_db`;
const getTransactionsKey = (sId) => `sarmed_${sId || DEFAULT_STORE_ID}_transactions_db`;
const getNotificationsKey = (sId) => `sarmed_${sId || DEFAULT_STORE_ID}_notifications_db`;

const loadInitialScopedData = (key, legacyKey) => {
  try {
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved);
    if (legacyKey) {
      const legacy = localStorage.getItem(legacyKey);
      if (legacy) {
        const parsed = JSON.parse(legacy);
        localStorage.setItem(key, legacy);
        return parsed;
      }
    }
  } catch {}
  return [];
};

export const DataProvider = ({ children }) => {
  const { currentUser, isManager, settings, storeId: authStoreId, updateSettings, setStoreId } = useAuth();
  const activeStoreId = authStoreId || currentUser?.storeId || getSavedStoreId() || DEFAULT_STORE_ID;

  const [customers, setCustomers] = useState(() =>
    loadInitialScopedData(getCustomersKey(activeStoreId), 'sarmed_customers_db')
  );

  const [transactions, setTransactions] = useState(() =>
    loadInitialScopedData(getTransactionsKey(activeStoreId), 'sarmed_transactions_db')
  );

  const [notifications, setNotifications] = useState(() =>
    loadInitialScopedData(getNotificationsKey(activeStoreId), 'sarmed_notifications_db')
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
    setCustomers(loadInitialScopedData(getCustomersKey(activeStoreId), 'sarmed_customers_db'));
    setTransactions(loadInitialScopedData(getTransactionsKey(activeStoreId), 'sarmed_transactions_db'));
    setNotifications(loadInitialScopedData(getNotificationsKey(activeStoreId), 'sarmed_notifications_db'));
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
    try {
      localStorage.setItem(getCustomersKey(activeStoreId), JSON.stringify(customers));
      // Keep legacy key updated if default store
      if (activeStoreId === DEFAULT_STORE_ID) {
        localStorage.setItem('sarmed_customers_db', JSON.stringify(customers));
      }
    } catch (e) {
      console.warn('Failed to save customers locally', e);
    }
  }, [customers, activeStoreId]);

  useEffect(() => {
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

      // 1. Listen to store-scoped Customers Collection
      const storeCustCollection = collection(db, 'stores', activeStoreId, 'customers');
      unsubCustomers = onSnapshot(
        storeCustCollection,
        (snapshot) => {
          setCloudStatus('connected');
          setCloudError(null);
          setLastCloudSyncTime(new Date().toLocaleTimeString('ar-IQ'));
          setIsSyncing(false);

          if (!snapshot.empty) {
            // ✅ Cloud has data — use it directly on this device
            const cloudList = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
            cloudList.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));

            // Also push any local-only customers that are missing in cloud
            try {
              const localSaved = JSON.parse(localStorage.getItem(getCustomersKey(activeStoreId)) || '[]');
              const missingOnRemote = localSaved.filter((lc) => !cloudList.some((rc) => rc.id === lc.id));
              if (missingOnRemote.length > 0) {
                missingOnRemote.forEach((c) => {
                  void setDoc(doc(db, 'stores', activeStoreId, 'customers', c.id), c).catch(() => {});
                });
              }
            } catch (e) {}

            // ✅ Set state from cloud data
            setCustomers(cloudList);
            localStorage.setItem(getCustomersKey(activeStoreId), JSON.stringify(cloudList));
          } else {
            // Cloud is empty for this store ID -> Push local data to cloud if any
            try {
              const localSaved = JSON.parse(localStorage.getItem(getCustomersKey(activeStoreId)) || '[]');
              if (localSaved.length > 0) {
                localSaved.forEach((c) => {
                  void setDoc(doc(db, 'stores', activeStoreId, 'customers', c.id), c).catch(() => {});
                });
              }
            } catch (e) {}
          }

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

      // 2. Listen to store-scoped Transactions Collection
      const storeTransCollection = collection(db, 'stores', activeStoreId, 'transactions');
      unsubTransactions = onSnapshot(
        storeTransCollection,
        (snapshot) => {
          if (!snapshot.empty) {
            const cloudList = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
            cloudList.sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0));

            // Push any local-only transactions not in cloud
            try {
              const localSaved = JSON.parse(localStorage.getItem(getTransactionsKey(activeStoreId)) || '[]');
              const missingOnRemote = localSaved.filter((lt) => !cloudList.some((rt) => rt.id === lt.id));
              if (missingOnRemote.length > 0) {
                missingOnRemote.forEach((t) => {
                  void setDoc(doc(db, 'stores', activeStoreId, 'transactions', t.id), t).catch(() => {});
                });
              }
            } catch (e) {}

            // ✅ Set state from cloud data
            setTransactions(cloudList);
            localStorage.setItem(getTransactionsKey(activeStoreId), JSON.stringify(cloudList));
          } else {
            try {
              const localSaved = JSON.parse(localStorage.getItem(getTransactionsKey(activeStoreId)) || '[]');
              if (localSaved.length > 0) {
                localSaved.forEach((t) => {
                  void setDoc(doc(db, 'stores', activeStoreId, 'transactions', t.id), t).catch(() => {});
                });
              }
            } catch (e) {}
          }

          transactionsLoaded = true;
          checkAllLoaded();
        },
        (error) => {
          console.warn('Firestore transactions listener notice:', error.message);
          transactionsLoaded = true;
          checkAllLoaded();
        }
      );

      // 3. Listen to store-scoped Notifications Collection
      const storeNotifCollection = collection(db, 'stores', activeStoreId, 'notifications');
      unsubNotifications = onSnapshot(
        storeNotifCollection,
        (snapshot) => {
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
    };
  }, [activeStoreId]);

  // --- ACTIONS ---

  // Add a Customer
  const addCustomer = async ({ name, phone = '', address = '', notes = '', initialDebt = 0 }) => {
    if (!isManager) throw new Error('إضافة زبون جديد متاحة لصاحب السوبرماركت فقط');
    if (!name?.trim()) throw new Error('يرجى إدخال اسم الزبون');
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

  // Delete Customer
  const deleteCustomer = async (id) => {
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    setTransactions((prev) => prev.filter((t) => t.customerId !== id));

    if (db) {
      try {
        void deleteDoc(doc(db, 'stores', activeStoreId, 'customers', id)).catch(() => {});
        void deleteDoc(doc(db, 'customers', id)).catch(() => {});
      } catch (err) {
        console.warn('Firestore delete customer notice', err);
      }
    }
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

  // Full Cloud Push for Active Store
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
        forceRefreshFromCloud,
        importStoreData,
        exportStoreData,
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
