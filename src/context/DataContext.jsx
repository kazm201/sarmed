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

  // Monitor Network Online/Offline Status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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
    if (!db) return;

    let unsubCustomers = () => {};
    let unsubTransactions = () => {};
    let unsubNotifications = () => {};

    try {
      setIsSyncing(true);

      // Listen to Customers Collection
      const custQuery = query(collection(db, 'customers'), orderBy('name', 'asc'));
      unsubCustomers = onSnapshot(
        custQuery,
        (snapshot) => {
          if (!snapshot.empty) {
            const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            setCustomers(list);
          }
          setIsSyncing(false);
        },
        (error) => {
          console.info('Firestore offline/fallback mode for customers:', error.message);
          setIsSyncing(false);
        }
      );

      // Listen to Transactions Collection
      const transQuery = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'));
      unsubTransactions = onSnapshot(
        transQuery,
        (snapshot) => {
          if (!snapshot.empty) {
            const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            setTransactions(list);
          }
        },
        (error) => {
          console.info('Firestore offline/fallback mode for transactions:', error.message);
        }
      );

      // Listen to Notifications Collection
      const notifQuery = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
      unsubNotifications = onSnapshot(
        notifQuery,
        (snapshot) => {
          if (!snapshot.empty) {
            const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            setNotifications(list);
          }
        },
        (error) => {
          console.info('Firestore offline/fallback mode for notifications:', error.message);
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

  // ⚠️ Reset ALL data (customers, transactions, notifications)
  const resetAllData = async () => {
    // Clear local state
    setCustomers([]);
    setTransactions([]);
    setNotifications([]);

    // Clear localStorage
    localStorage.removeItem(LOCAL_CUSTOMERS_KEY);
    localStorage.removeItem(LOCAL_TRANSACTIONS_KEY);
    localStorage.removeItem(LOCAL_NOTIFICATIONS_KEY);

    // Clear Firestore if available
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

  // Computed Financial Metrics & Stats
  const totalDebt = customers.reduce((acc, c) => acc + (parseFloat(c.currentDebt) || 0), 0);
  const totalCustomers = customers.length;
  const customersWithDebt = customers.filter((c) => (parseFloat(c.currentDebt) || 0) > 0).length;

  const todayStr = new Date().toISOString().split('T')[0];
  const todayTransactions = transactions.filter(
    (t) => t.status === 'approved' && t.date === todayStr
  );

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
        totalDebt,
        totalCustomers,
        customersWithDebt,
        todayCollections,
        todayDebts,
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
