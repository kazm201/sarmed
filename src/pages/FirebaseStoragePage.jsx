import React, { useState, useMemo } from 'react';
import {
  HardDrive,
  Database,
  Cloud,
  Layers,
  ShieldCheck,
  RefreshCw,
  Trash2,
  FileImage,
  Users,
  CreditCard,
  Bell,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Server
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

export const FirebaseStoragePage = ({ setActivePage }) => {
  const { isManager, settings } = useAuth();
  const { customers, transactions, notifications } = useData();

  const [refreshKey, setRefreshKey] = useState(0);
  const [cleanedNotice, setCleanedNotice] = useState('');

  // Accurately calculate byte size of strings/objects
  const calculateBytes = (data) => {
    try {
      const str = typeof data === 'string' ? data : JSON.stringify(data);
      return new TextEncoder().encode(str).length;
    } catch {
      return 0;
    }
  };

  // Detailed Storage Metrics
  const storageMetrics = useMemo(() => {
    // 1. Customers Collection Size
    const customersBytes = calculateBytes(customers);
    const avgCustSize = customers.length ? Math.round(customersBytes / customers.length) : 0;

    // 2. Transactions Collection Size
    const transactionsBytes = calculateBytes(transactions);
    const avgTxSize = transactions.length ? Math.round(transactionsBytes / transactions.length) : 0;

    // 2.1 Calculate image/photo attachments size specifically
    const photosBytes = transactions.reduce((acc, tx) => {
      if (tx.invoicePhoto) {
        return acc + calculateBytes(tx.invoicePhoto);
      }
      return acc;
    }, 0);
    const photosCount = transactions.filter((t) => Boolean(t.invoicePhoto)).length;

    // 3. Notifications Collection Size
    const notificationsBytes = calculateBytes(notifications);

    // 4. LocalStorage Cache Size
    let localCacheBytes = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sarmed_')) {
          localCacheBytes += calculateBytes(localStorage.getItem(key) || '');
        }
      }
    } catch (e) {}

    // 5. Total Database Size (with estimated Firestore internal indexing/metadata ~32 bytes/doc)
    const docOverhead = (customers.length + transactions.length + notifications.length) * 32;
    const totalDatabaseBytes = customersBytes + transactionsBytes + notificationsBytes + docOverhead;

    const totalKB = totalDatabaseBytes / 1024;
    const totalMB = totalKB / 1024;

    // Firebase Spark Plan Free Quota is 1,024 MB (1 GB)
    const quotaMB = 1024;
    const usagePercent = ((totalMB / quotaMB) * 100);
    const remainingMB = Math.max(0, quotaMB - totalMB);

    // Estimate how many more transactions can be saved before reaching 1 GB
    const avgFullTx = avgTxSize || 450;
    const estimatedMoreTransactions = Math.floor((remainingMB * 1024 * 1024) / avgFullTx);

    return {
      customersBytes,
      customersKB: (customersBytes / 1024).toFixed(2),
      avgCustSize,
      transactionsBytes,
      transactionsKB: (transactionsBytes / 1024).toFixed(2),
      avgTxSize,
      photosBytes,
      photosKB: (photosBytes / 1024).toFixed(2),
      photosCount,
      notificationsBytes,
      notificationsKB: (notificationsBytes / 1024).toFixed(2),
      localCacheBytes,
      localCacheKB: (localCacheBytes / 1024).toFixed(2),
      totalDatabaseBytes,
      totalKB: totalKB.toFixed(2),
      totalMB: totalMB.toFixed(3),
      quotaMB,
      usagePercent: usagePercent < 0.01 ? '< 0.01%' : `${usagePercent.toFixed(2)}%`,
      numericPercent: Math.max(0.2, Math.min(100, usagePercent)),
      remainingMB: remainingMB.toFixed(2),
      estimatedMoreTransactions
    };
  }, [customers, transactions, notifications, refreshKey]);

  // Handle Cache Cleaning
  const handleClearLocalCache = () => {
    try {
      localStorage.removeItem('sarmed_notifications_db');
      setCleanedNotice('تم تنظيف الذاكرة المؤقتة للإشعارات بنجاح!');
      setRefreshKey((prev) => prev + 1);
      setTimeout(() => setCleanedNotice(''), 4000);
    } catch (e) {
      alert('تعذر تنظيف الذاكرة المؤقتة');
    }
  };

  if (!isManager) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 rounded-3xl glass-panel text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto" />
        <h3 className="text-lg font-black text-white">صفحة خاصة بصاحب السوبرماركت</h3>
        <p className="text-xs text-slate-400">عذراً، هذه الصفحة وسجلات تخزين الخادم مخصصة للمدير فقط.</p>
        <button
          onClick={() => setActivePage('add-debt')}
          className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs"
        >
          العودة للرئيسية
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 text-xs font-bold border border-amber-500/20 mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>خاص بصاحب السوبرماركت فقط</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Database className="w-6 h-6" />
            </div>
            <span>حجم وسعة تخزين Firebase السحابية</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            متابعة حية ودقيقة لاستهلاك قاعدة بيانات Firestore ومساحة الصور والذاكرة المؤقتة
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRefreshKey((prev) => prev + 1)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all active:scale-95"
          >
            <RefreshCw className="w-4 h-4 text-emerald-400" />
            <span>تحديث القياس</span>
          </button>
        </div>
      </div>

      {cleanedNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{cleanedNotice}</span>
        </div>
      )}

      {/* Main Quota Overview Card */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-emerald-900/40 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/30 relative overflow-hidden shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-400 block">إجمالي استهلاك قاعدة البيانات السحابية</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                {storageMetrics.totalKB}
              </span>
              <span className="text-sm font-bold text-emerald-400">كيلوبايت (KB)</span>
              <span className="text-xs text-slate-500 mr-2">
                ≈ {storageMetrics.totalMB} ميغابايت (MB)
              </span>
            </div>
            <p className="text-xs text-slate-400">
              الحجم الفعلي لجميع وثائق الزبائن والعمليات المسجلة والإشعارات.
            </p>
          </div>

          <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 text-center sm:text-right min-w-[200px]">
            <span className="text-[11px] text-slate-400 block font-bold">حد الباقة المجانية لـ Firebase Spark</span>
            <strong className="text-lg font-black text-white block mt-0.5">
              1,024 MB <small className="text-xs text-slate-400">(1 جيجابايت)</small>
            </strong>
            <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
              المستخدم: {storageMetrics.usagePercent}
            </span>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-bold">نسبة الامتلاء من السعة المجانية</span>
            <span className="text-emerald-400 font-bold">{storageMetrics.usagePercent} مستخدم</span>
          </div>
          <div className="w-full h-3 rounded-full bg-slate-950 border border-slate-800 overflow-hidden p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
              style={{ width: `${storageMetrics.numericPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>0 MB</span>
            <span className="text-emerald-300/80 font-bold">
              المتبقي المتاح مجاناً: {storageMetrics.remainingMB} ميغابايت
            </span>
            <span>1,024 MB</span>
          </div>
        </div>
      </div>

      {/* Breakdown per Collection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Customers Collection */}
        <div className="glass-card rounded-3xl p-5 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">سجلات الزبائن</h3>
            </div>
            <span className="text-xs text-slate-500">customers</span>
          </div>

          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">عدد الزبائن المسجلين:</span>
              <strong className="text-white">{customers.length} زبون</strong>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">الحجم الإجمالي:</span>
              <strong className="text-teal-400">{storageMetrics.customersKB} KB</strong>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">متوسط حجم الزبون:</span>
              <span className="text-slate-300 font-mono text-[11px]">{storageMetrics.avgCustSize} بايت</span>
            </div>
          </div>
        </div>

        {/* Transactions Collection */}
        <div className="glass-card rounded-3xl p-5 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                <CreditCard className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">الحركات المالية</h3>
            </div>
            <span className="text-xs text-slate-500">transactions</span>
          </div>

          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">عدد العمليات المسجلة:</span>
              <strong className="text-white">{transactions.length} حركة</strong>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">الحجم الإجمالي:</span>
              <strong className="text-rose-400">{storageMetrics.transactionsKB} KB</strong>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">صور الفواتير المرفقة:</span>
              <span className="text-slate-300 font-mono text-[11px]">
                {storageMetrics.photosCount} صورة ({storageMetrics.photosKB} KB)
              </span>
            </div>
          </div>
        </div>

        {/* Notifications & Local Storage */}
        <div className="glass-card rounded-3xl p-5 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                <Bell className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">الإشعارات والكاش</h3>
            </div>
            <span className="text-xs text-slate-500">notifications & cache</span>
          </div>

          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">عدد الإشعارات:</span>
              <strong className="text-white">{notifications.length} إشعار</strong>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">حجم الإشعارات السحابية:</span>
              <strong className="text-amber-400">{storageMetrics.notificationsKB} KB</strong>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">تخزين المتصفح المؤقت:</span>
              <span className="text-slate-300 font-mono text-[11px]">{storageMetrics.localCacheKB} KB</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cloud Health & Future Capacity Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* System Health */}
        <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">حالة وموثوقية قاعدة البيانات</h3>
          </div>
          <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
            <p>
              • <strong className="text-emerald-400">الاستهلاك الحالي ممتاز جداً:</strong> استخدامك يمثل جزءاً صغيراً جداً من الباقة المجانية، ولن تتحمل أي تكاليف إضافية.
            </p>
            <p>
              • <strong className="text-white">السعة المتبقية تتسع لحوالي:</strong>{' '}
              <span className="text-emerald-400 font-bold">
                +{storageMetrics.estimatedMoreTransactions.toLocaleString()} حركة مالية جديدة
              </span>{' '}
              قبل الحاجة لأي ترقية.
            </p>
            <p>
              • <strong className="text-white">المزامنة الفورية:</strong> جميع البيانات والعمليات مشفرة ومحفوظة سحابياً على خوادم Google Firebase مباشرة.
            </p>
          </div>
        </div>

        {/* Maintenance Actions */}
        <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Server className="w-5 h-5 text-teal-400" />
            <h3 className="text-sm font-bold text-white">إجراءات الصيانة والتنظيف</h3>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div>
                <h4 className="text-xs font-bold text-white">تنظيف كاش الإشعارات القديمة</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">تحرير الذاكرة المحلية للجهاز بدون التأثير على الحسابات</p>
              </div>
              <button
                type="button"
                onClick={handleClearLocalCache}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5 text-amber-400" />
                <span>تنظيف</span>
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div>
                <h4 className="text-xs font-bold text-white">النسخ الاحتياطي اليدوي</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">تحميل نسخة JSON من الإعدادات للكمبيوتر</p>
              </div>
              <button
                type="button"
                onClick={() => setActivePage('settings')}
                className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all"
              >
                فتح الإعدادات
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
