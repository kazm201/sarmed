import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  db,
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from '../services/firebase';
import { useAuth } from './AuthContext';
import { notificationService } from '../services/notificationService';

const DataContext = createContext();

const LOCAL_CUSTOMERS_KEY = 'sarmed_customers_db';
const LOCAL_TRANSACTIONS_KEY = 'sarmed_transactions_db';
const LOCAL_NOTIFICATIONS_KEY = 'sarmed_notifications_db';

export const DataProvider = ({ children }) => {
  const { currentUser, isManager, settings } = useAuth();

  const [customers, setCustomers] = useState(() => {
    try {
      const saved = localStorage.getItem(LOCAL_CUSTOMERS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [transactions, setTransactions] = useState(() => {
    try {
      const saved = localStorage.getItem(LOCAL_TRANSACTIONS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem(LOCAL_NOTIFICATIONS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [cloudStatus, setCloudStatus] = useState('connecting'); // 'connecting' | 'connected' | 'needs_activation' | 'error' | 'offline'
  const [cloudError, setCloudError] = useState(null);
  const [lastCloudSyncTime, setLastCloudSyncTime] = useState(null);

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
      localStorage.setItem(LOCAL_CUSTOMERS_KEY, JSON.stringify(customers));
    } catch (e) {
      console.warn('Failed to save customers locally', e);
    }
  }, [customers]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_TRANSACTIONS_KEY, JSON.stringify(transactions));
    } catch (e) {
      console.warn('Failed to save transactions locally', e);
    }
  }, [transactions]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_NOTIFICATIONS_KEY, JSON.stringify(notifications));
    } catch (e) {
      console.warn('Failed to save notifications locally', e);
    }
  }, [notifications]);

  // Firestore Realtime Synchronization (When db is initialized and live)
  useEffect(() => {
    if (!db) {
      setCloudStatus('offline');
      return;
    }

    let unsubCustomers = () => {};
    let unsubTransactions = () => {};
    let unsubNotifications = () => {};

    try {
      setIsSyncing(true);

      // 1. Listen to Customers Collection (No hardcoded orderBy to avoid missing records or index requirements)
      const custCollection = collection(db, 'customers');
      unsubCustomers = onSnapshot(
        custCollection,
        (snapshot) => {
          setCloudStatus('connected');
          setCloudError(null);
          setLastCloudSyncTime(new Date().toLocaleTimeString('ar-IQ'));
          setIsSyncing(false);

          if (!snapshot.empty) {
            const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));

            // Push any customers existing in local buffer that are missing in cloud
            try {
              const localSaved = JSON.parse(localStorage.getItem(LOCAL_CUSTOMERS_KEY) || '[]');
              const missingOnRemote = localSaved.filter((lc) => !list.some((rc) => rc.id === lc.id));
              if (missingOnRemote.length > 0) {
                console.log('🔄 رفع زبائن محليين إلى السحابة:', missingOnRemote.length);
                missingOnRemote.forEach((c) => {
                  void setDoc(doc(db, 'customers', c.id), c).catch(() => {});
                });
              }
            } catch (e) {}

            setCustomers(list);
          } else {
            // Snapshot is empty: If local storage has customers, upload them all to cloud!
            try {
              const localSaved = JSON.parse(localStorage.getItem(LOCAL_CUSTOMERS_KEY) || '[]');
              if (localSaved.length > 0) {
                console.log('🔄 رفع جميع الزبائن إلى السحابة لأول مرة:', localSaved.length);
                localSaved.forEach((c) => {
                  void setDoc(doc(db, 'customers', c.id), c).catch(() => {});
                });
              }
            } catch (e) {}
          }
        },
        (error) => {
          console.warn('Firestore customers listener error:', error.code, error.message);
          setIsSyncing(false);
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

      // 2. Listen to Transactions Collection
      const transCollection = collection(db, 'transactions');
      unsubTransactions = onSnapshot(
        transCollection,
        (snapshot) => {
          if (!snapshot.empty) {
            const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            list.sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0));

            // Sync any local transactions not yet in cloud
            try {
              const localSaved = JSON.parse(localStorage.getItem(LOCAL_TRANSACTIONS_KEY) || '[]');
              const missingOnRemote = localSaved.filter((lt) => !list.some((rt) => rt.id === lt.id));
              if (missingOnRemote.length > 0) {
                console.log('🔄 رفع حركات مالية محلية إلى السحابة:', missingOnRemote.length);
                missingOnRemote.forEach((t) => {
                  void setDoc(doc(db, 'transactions', t.id), t).catch(() => {});
                });
              }
            } catch (e) {}

            setTransactions(list);
          } else {
            try {
              const localSaved = JSON.parse(localStorage.getItem(LOCAL_TRANSACTIONS_KEY) || '[]');
              if (localSaved.length > 0) {
                console.log('🔄 رفع الحركات المالية إلى السحابة لأول مرة:', localSaved.length);
                localSaved.forEach((t) => {
                  void setDoc(doc(db, 'transactions', t.id), t).catch(() => {});
                });
              }
            } catch (e) {}
          }
        },
        (error) => {
          console.warn('Firestore transactions listener notice:', error.message);
        }
      );

      // 3. Listen to Notifications Collection
      const notifCollection = collection(db, 'notifications');
      unsubNotifications = onSnapshot(
        notifCollection,
        (snapshot) => {
          if (!snapshot.empty) {
            const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
            setNotifications(list);
          }
        },
        (error) => {
          console.info('Firestore notifications offline/fallback mode');
        }
      );
    } catch (err) {
      console.warn('Firebase snapshot listener initialization notice:', err);
      setIsSyncing(false);
    }

    return () => {
      unsubCustomers();
      unsubTransactions();
      unsubNotifications();
    };
  }, []);

  // --- ACTIONS ---

  // Add a Customer
  const addCustomer = async ({ name, phone = '', address = '', notes = '', initialDebt = 0 }) => {
    if (!isManager) throw new Error('إضافة زبون جديد متاحة لصاحب السوبرماركت فقط');
    if (!name?.trim()) throw new Error('يرجى إدخال اسم الزبون');
    const parsedInitialDebt = parseFloat(initialDebt) || 0;
    const customerId = 'cust_' + Date.now();
    const newCustomer = {
      id: customerId,
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
        customerId: customerId,
        customerName: newCustomer.name,
        type: 'debt', // 'debt' or 'payment'
        amount: parsedInitialDebt,
        details: 'رصيد دين سابق عند إنشاء الحساب',
        date: new Date().toISOString(),
        createdBy: currentUser?.name || 'المدير',
        creatorRole: currentUser?.role || 'manager',
        status: 'approved',
        createdAt: new Date().toISOString()
      };
      setTransactions((prev) => [initialTx, ...prev]);

      if (db) {
        try {
          void setDoc(doc(db, 'transactions', initialTx.id), initialTx).catch(() => {});
        } catch (e) {}
      }
    }

    // Sync to Firestore
    if (db) {
      try {
        void setDoc(doc(db, 'customers', customerId), newCustomer).catch(() => {});
      } catch (err) {
        console.warn('Firestore add customer synced to local buffer');
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
      title,
      message,
      targetRole, // 'manager' | 'worker' | 'all'
      type, // 'alert' | 'success' | 'warning' | 'info'
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
        void setDoc(doc(db, 'notifications', notifId), newNotif).catch(() => {});
      } catch (e) {}
    }
  };

  // Add Debt Transaction
  const addDebtTransaction = async ({ customerId, amount, details, date, invoicePhoto = '', customerData = null }) => {
    const parsedAmount = parseFloat(amount) || 0;
    if (parsedAmount <= 0) throw new Error('المبلغ يجب أن يكون أكبر من صفر');

    // customerData supports the just-created customer before React state has re-rendered.
    const customer = customerData || customers.find((c) => c.id === customerId);
    if (!customer) throw new Error('الزبون غير موجود');

    const isWorkerRole = currentUser?.role === 'worker';
    const requiresApproval = isWorkerRole && settings.workerRequiresApproval;
    const status = requiresApproval ? 'pending' : 'approved';

    const txId = 'tx_' + Date.now();
    const newTx = {
      id: txId,
      customerId,
      customerName: customer.name,
      type: 'debt',
      amount: parsedAmount,
      details: details ? details.trim() : 'بضاعة متنوعة',
      date: date || new Date().toISOString().split('T')[0],
      invoicePhoto,
      createdBy: currentUser?.name || 'مستخدم',
      creatorRole: currentUser?.role || 'worker',
      status, // 'approved' | 'pending' | 'rejected'
      createdAt: new Date().toISOString()
    };

    // If auto-approved (manager or worker without approval lock)
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
        void setDoc(doc(db, 'transactions', txId), newTx).catch(() => {});
      } catch (e) {}
    }

    // Trigger notification if worker created pending debt
    if (status === 'pending') {
      // A notification failure must never prevent a successfully saved debt.
      try { await dispatchNotification({
        title: 'طلب موافقة على دين جديد 🔔',
        message: `قام العامل "${newTx.createdBy}" بإضافة دين للزبون "${customer.name}" بقيمة ${parsedAmount.toLocaleString()} ${settings.currency}. بانتظار موافقتك.`,
        targetRole: 'manager',
        type: 'alert',
        meta: { txId: newTx.id, type: 'debt', customerId }
      }); } catch (error) { console.warn('Approval notification queued locally failed:', error); }
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

    // If auto-approved
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
        void setDoc(doc(db, 'transactions', txId), newTx).catch(() => {});
      } catch (e) {}
    }

    // Trigger notification if worker created pending settlement
    if (status === 'pending') {
      try { await dispatchNotification({
        title: 'طلب موافقة على تسديد دفعة 💵',
        message: `قام العامل "${newTx.createdBy}" بتسجيل تسديد من الزبون "${customer.name}" بمبلغ ${parsedAmount.toLocaleString()} ${settings.currency}. بانتظار موافقتك.`,
        targetRole: 'manager',
        type: 'alert',
        meta: { txId: newTx.id, type: 'payment', customerId }
      }); } catch (error) { console.warn('Approval notification queued locally failed:', error); }
    } else {
      notificationService.playChime('success');
    }

    return newTx;
  };

  // Approve Pending Transaction (Manager Only)
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
        void updateDoc(doc(db, 'transactions', txId), {
          status: 'approved',
          approvedAt: updatedTx.approvedAt,
          approvedBy: updatedTx.approvedBy
        }).catch(() => {});
      } catch (e) {}
    }

    // Notify worker of approval
    await dispatchNotification({
      title: 'تم اعتماد العملية بنجاح ✅',
      message: `وافق المدير على عملية ${tx.type === 'debt' ? 'إضافة دين' : 'تسديد'} للزبون "${tx.customerName}" بمبلغ ${tx.amount.toLocaleString()} ${settings.currency}.`,
      targetRole: 'worker',
      type: 'success',
      meta: { txId }
    });

    notificationService.playChime('success');
  };

  // Reject Pending Transaction (Manager Only)
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
        void updateDoc(doc(db, 'transactions', txId), {
          status: 'rejected',
          rejectionReason: reason,
          rejectedAt: updatedTx.rejectedAt,
          rejectedBy: updatedTx.rejectedBy
        }).catch(() => {});
      } catch (e) {}
    }

    // Notify worker of rejection
    await dispatchNotification({
      title: 'تم رفض العملية ❌',
      message: `تم رفض عملية ${tx.type === 'debt' ? 'الدين' : 'التسديد'} للزبون "${tx.customerName}". السبب: ${reason}`,
      targetRole: 'worker',
      type: 'warning',
      meta: { txId, reason }
    });

    notificationService.playChime('error');
  };

  // Mark notification as read
  const markNotificationRead = (notifId) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, read: true } : n))
    );
  };

  // Clear all notifications
  const clearAllNotifications = () => {
    setNotifications([]);
    localStorage.removeItem(LOCAL_NOTIFICATIONS_KEY);
  };

  const STATS_RESET_KEY = 'sarmed_stats_reset_timestamp';
  const [statsResetTimestamp, setStatsResetTimestamp] = useState(() => {
    try {
      return parseInt(localStorage.getItem(STATS_RESET_KEY) || '0', 10);
    } catch {
      return 0;
    }
  });

  // Local calendar date helper (prevents UTC timezone offset issues in Iraq GMT+3)
  const getLocalDateStr = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [currentDateStr, setCurrentDateStr] = useState(getLocalDateStr());

  // Automatic 24-hour Daily Statistics Cycle
  // Runs every 60 seconds to ensure stats reset automatically when a new day arrives
  useEffect(() => {
    const interval = setInterval(() => {
      const today = getLocalDateStr();
      if (today !== currentDateStr) {
        setCurrentDateStr(today);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [currentDateStr]);

  // Safe Statistics Reset & Audit (Only resets stats and repairs calculation errors; NEVER deletes customers)
  const resetStatisticsOnly = async () => {
    const now = Date.now();
    setStatsResetTimestamp(now);
    try {
      localStorage.setItem(STATS_RESET_KEY, now.toString());
    } catch (e) {}

    // Audit and heal customer balances based strictly on approved ledger transactions
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
            void updateDoc(doc(db, 'customers', cust.id), {
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

  // ⚠️ Full Data Wipe (kept for master administrative fallback only)
  const resetAllData = async () => {
    setCustomers([]);
    setTransactions([]);
    setNotifications([]);
    localStorage.removeItem(LOCAL_CUSTOMERS_KEY);
    localStorage.removeItem(LOCAL_TRANSACTIONS_KEY);
    localStorage.removeItem(LOCAL_NOTIFICATIONS_KEY);
    localStorage.removeItem(STATS_RESET_KEY);

    if (db) {
      try {
        const { getDocs, writeBatch, collection: col } = await import('../services/firebase');
        const batch = writeBatch(db);
        const customerSnap = await getDocs(col(db, 'customers'));
        customerSnap.forEach((d) => batch.delete(d.ref));
        const txSnap = await getDocs(col(db, 'transactions'));
        txSnap.forEach((d) => batch.delete(d.ref));
        const notifSnap = await getDocs(col(db, 'notifications'));
        notifSnap.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      } catch (e) {
        console.warn('Firestore reset notice:', e);
      }
    }
  };

  // Full Manual or Automatic Cloud Synchronization
  const syncAllDataToCloud = async () => {
    if (!db) throw new Error('خدمة Firebase غير مهيأة');
    setIsSyncing(true);
    let count = 0;
    try {
      // 1. Sync Settings
      if (settings) {
        await setDoc(doc(db, 'app', 'settings'), settings, { merge: true });
      }

      // 2. Sync Customers
      for (const cust of customers) {
        await setDoc(doc(db, 'customers', cust.id), cust, { merge: true });
        count++;
      }

      // 3. Sync Transactions
      for (const tx of transactions) {
        await setDoc(doc(db, 'transactions', tx.id), tx, { merge: true });
        count++;
      }

      // 4. Sync Notifications
      for (const notif of notifications) {
        await setDoc(doc(db, 'notifications', notif.id), notif, { merge: true });
      }

      setCloudStatus('connected');
      setCloudError(null);
      setLastCloudSyncTime(new Date().toLocaleTimeString('ar-IQ'));
      notificationService.playChime('success');
      return { success: true, count };
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

  // Computed Financial Metrics & Stats
  const totalDebt = customers.reduce((acc, c) => acc + (parseFloat(c.currentDebt) || 0), 0);
  const totalCustomers = customers.length;
  const customersWithDebt = customers.filter((c) => (parseFloat(c.currentDebt) || 0) > 0).length;

  // 24-Hour Cycle Transactions: transactions created today in local time, AND after any manual stats reset
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
        customers,
        transactions,
        notifications: userNotifications,
        unreadNotificationsCount,
        isSyncing,
        isOnline,
        cloudStatus,
        cloudError,
        lastCloudSyncTime,
        isCloudConnected: cloudStatus === 'connected',
        syncAllDataToCloud,
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
