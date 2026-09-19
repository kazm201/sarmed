import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import {
  Cloud,
  CloudOff,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  X,
  ChevronDown,
  ChevronUp,
  Smartphone,
  ShieldAlert,
  ArrowRightLeft
} from 'lucide-react';
import { DeviceSyncModal } from './DeviceSyncModal';

export const CloudSyncBanner = () => {
  const { isManager, storeId } = useAuth();
  const {
    cloudStatus,
    cloudError,
    syncAllDataToCloud,
    isSyncing,
    lastCloudSyncTime,
    customers,
    transactions
  } = useData();

  const [dismissed, setDismissed] = useState(false);
  const [showSteps, setShowSteps] = useState(true);
  const [syncFeedback, setSyncFeedback] = useState(null);

  // If connected and no error, or user dismissed for this session
  if (dismissed && cloudStatus !== 'needs_activation') {
    return null;
  }

  // Handle manual sync button
  const handleManualSync = async () => {
    try {
      setSyncFeedback(null);
      const res = await syncAllDataToCloud();
      setSyncFeedback({ type: 'success', message: `تمت مزامنة ${res.count} سجل مع السحابة بنجاح!` });
      setTimeout(() => setSyncFeedback(null), 4000);
    } catch (err) {
      setSyncFeedback({
        type: 'error',
        message: err.message?.includes('PERMISSION_DENIED')
          ? 'قاعدة بيانات Firestore غير مفعلة بعد في مشروع Firebase'
          : (err.message || 'فشلت المزامنة')
      });
    }
  };

  // 1. Firebase Needs Activation (The exact reason cross-device sync failed)
  if (cloudStatus === 'needs_activation') {
    return (
      <aside aria-label="تنبيه تفعيل المزامنة السحابية" className="w-full bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 border-b-2 border-amber-500/80 px-4 py-3 text-slate-100 shadow-xl relative z-40 animate-fadeIn">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0 mt-0.5 border border-amber-500/40 animate-pulse">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-amber-300">
                  تنبيه هام لمزامنة البيانات بين جميع الأجهزة والهواتف
                </h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-900/60 text-amber-300 border border-amber-700/60">
                  خطوة واحدة متبقية
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                البيانات مسجلة ومحفوظة حالياً على هذا الجهاز فقط، ولتظهر وتتزامن تلقائياً وبشكل مباشر على جميع أجهزة العمال والمدير، يرجى تفعيل قاعدة بيانات <strong>Firestore</strong> في لوحة تحكم <strong>sarmed-fef02</strong> بنقرة واحدة.
              </p>

              {showSteps && (
                <div className="mt-2.5 p-3 rounded-xl bg-slate-950/80 border border-amber-500/30 text-xs text-slate-200 space-y-1.5">
                  <div className="font-semibold text-amber-400 mb-1 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4" />
                    خطوات التفعيل السريعة (تستغرق دقيقة واحدة):
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500/30 text-amber-300 flex items-center justify-center font-bold text-[11px]">1</span>
                    <span>اضغط على زر <strong>"فتح لوحة تحكم Firebase"</strong> أدناه.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500/30 text-amber-300 flex items-center justify-center font-bold text-[11px]">2</span>
                    <span>اضغط زر <strong>إنشاء قاعدة بيانات (Create database)</strong>.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500/30 text-amber-300 flex items-center justify-center font-bold text-[11px]">3</span>
                    <span>اختر <strong>وضع الاختبار (Start in test mode)</strong> ثم اضغط تم.</span>
                  </div>
                  <div className="text-emerald-400 text-[11px] pt-1 font-medium">
                    ⚡ بمجرد تفعيلها، سيقوم الموقع تلقائياً برفع بياناتك المسجلة هنا ({customers.length} زبون و {transactions.length} حركة) لتظهر فوراً على كافة الهواتف!
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 w-full md:w-auto shrink-0 flex-wrap justify-end">
            <a
              href="https://console.firebase.google.com/project/sarmed-fef02/firestore"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95"
            >
              <ExternalLink className="w-4 h-4" />
              تفعيل قاعدة البيانات الآن
            </a>

            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs sm:text-sm transition-all"
              title="فحص الاتصال والمزامنة الآن"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : ''}`} />
              فحص الاتصال
            </button>

            <button
              onClick={() => setShowSteps(!showSteps)}
              className="p-2 rounded-xl bg-slate-800/80 text-slate-300 hover:text-white transition-all text-xs"
              title={showSteps ? 'إخفاء الشرح' : 'عرض الشرح'}
            >
              {showSteps ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setDismissed(true)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-200 transition-all"
              title="إغلاق التنبيه مؤقتاً"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {syncFeedback && (
          <div className={`mt-2 p-2 rounded-lg text-xs flex items-center gap-2 ${
            syncFeedback.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-800'
              : 'bg-rose-950/90 text-rose-300 border border-rose-800'
          }`}>
            {syncFeedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {syncFeedback.message}
          </div>
        )}
      </aside>
    );
  }

  // 2. Offline Mode Banner
  if (cloudStatus === 'offline') {
    return (
      <aside aria-label="تنبيه وضع العمل بدون إنترنت" className="w-full bg-slate-900 border-b border-slate-800 px-4 py-2 text-slate-300 text-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CloudOff className="w-4 h-4 text-slate-400" />
          <span>وضع عدم الاتصال بالإنترنت — التطبيق يعمل محلياً ويحفظ كل البيانات بأمان في هذا الجهاز.</span>
        </div>
      </aside>
    );
  }

  return null;
};
