import React, { useState } from 'react';
import { useAuth, getSavedStoreId } from '../context/AuthContext';
import { Store, User, Lock, ArrowRight, AlertCircle, ShieldCheck, KeyRound, Sparkles, Smartphone, ArrowRightLeft } from 'lucide-react';
import { DeviceSyncModal } from '../components/common/DeviceSyncModal';

export const LoginPage = () => {
  const { login, settings, storeId: activeStoreId } = useAuth();
  const [storeId, setStoreId] = useState(() => activeStoreId || getSavedStoreId() || '1111');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    const result = login(storeId, username, password);
    if (!result.success) {
      setErrorMsg(result.error);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/40">
      <div className="w-full max-w-md glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-700/60 animate-fadeIn">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white mb-3 shadow-lg shadow-emerald-900/40">
            <Store className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-white">{settings.storeName || 'نظام إدارة الديون'}</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5">
            تسجيل دخول آمن ومزامنة تلقائية بين جميع الأجهزة
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Field 1: Store ID / Account ID */}
          <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-black text-emerald-300 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                معرّف الحساب أو رمز المتجر (ID)
              </label>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                مزامنة لايف
              </span>
            </div>
            <div className="relative">
              <input
                type="text"
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
                placeholder="مثال: 1111 أو sarmed"
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm font-bold text-white bg-slate-900/80 border-emerald-500/40 focus:border-emerald-400"
                required
              />
            </div>
            <p className="text-[10px] text-emerald-400/80 flex items-center gap-1 pt-0.5">
              <Sparkles className="w-3 h-3 shrink-0" />
              أدخل نفس هذا الـ ID في أي جهاز أو هاتف لتظهر لك نفس الديون والزبائن تلقائياً.
            </p>
          </div>

          {/* Field 2: Username or Number */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              اسم المستخدم أو الرقم
            </label>
            <div className="relative">
              <User className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="أدخل الاسم أو الرقم (مثال: 1111 أو عامل)"
                autoComplete="username"
                className="w-full pr-10 pl-4 py-3 rounded-2xl glass-input text-sm font-semibold text-white"
                required
                autoFocus
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              صاحب المحل يدخل بالرمز المخصص، والعامل يدخل باسمه أو رقمه.
            </p>
          </div>

          {/* Field 3: Password */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              كلمة المرور
            </label>
            <div className="relative">
              <Lock className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="أدخل كلمة المرور"
                autoComplete="current-password"
                className="w-full pr-10 pl-4 py-3 rounded-2xl glass-input text-sm font-semibold text-white"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm shadow-xl shadow-emerald-950/60 transition-all active:scale-[0.98] disabled:opacity-50 mt-2"
          >
            {isLoading ? (
              'جاري التحقق والاتصال...'
            ) : (
              <>
                <span>تسجيل الدخول وفتح الحساب</span>
                <ArrowRight className="w-4 h-4 rotate-180" />
              </>
            )}
          </button>
        </form>

        {/* Instant Sync / Import from another device */}
        <div className="mt-5 p-3.5 rounded-2xl bg-slate-900/90 border border-emerald-500/30 text-center space-y-2">
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-300">
            <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
            <span>هل تفتح الموقع على جهاز جديد؟</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            يمكنك استيراد كافة بياناتك والزبائن المسجلين على هاتفك الأول بنقرة واحدة عبر الرابط أو كود النقل:
          </p>
          <button
            type="button"
            onClick={() => setShowSyncModal(true)}
            className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Smartphone className="w-4 h-4 text-emerald-400" />
            <span>استيراد ونقل البيانات من هاتفي القديم</span>
          </button>
        </div>

        <div className="mt-5 pt-4 border-t border-slate-800 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>نظام مشفر ومحمي — جميع السجلات محفوظة تلقائياً تحت معرف حسابك.</span>
        </div>

        {/* Device Sync Modal on Login */}
        <DeviceSyncModal
          isOpen={showSyncModal}
          onClose={() => setShowSyncModal(false)}
          initialTab="receive"
        />
      </div>
    </div>
  );
};
