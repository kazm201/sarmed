import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Store, User, Lock, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';

export const LoginPage = () => {
  const { login, settings } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const handleSubmit = (event) => {
    event.preventDefault(); setErrorMsg(''); setIsLoading(true);
    const result = login(username, password);
    if (!result.success) { setErrorMsg(result.error); setIsLoading(false); }
  };
  return <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/40">
    <div className="w-full max-w-md glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-700/60">
      <div className="text-center mb-8"><div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white mb-4"><Store className="w-8 h-8" /></div><h1 className="text-2xl font-black text-white">{settings.storeName}</h1><p className="text-sm text-slate-400 mt-2">تسجيل دخول آمن لإدارة الديون</p></div>
      {errorMsg && <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2"><AlertCircle className="w-4 h-4" />{errorMsg}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><label className="block text-xs font-bold text-slate-300 mb-2">اسم المستخدم أو الرقم</label><div className="relative"><User className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-400" /><input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="أدخل الاسم أو الرقم" autoComplete="username" className="w-full pr-10 pl-4 py-3 rounded-2xl glass-input text-sm font-semibold" required autoFocus /></div><p className="text-[11px] text-slate-500 mt-1.5">يمكنك الدخول باسمك أو برقمك كما حدده صاحب الماركت.</p></div>
        <div><label className="block text-xs font-bold text-slate-300 mb-2">كلمة المرور</label><div className="relative"><Lock className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-400" /><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="أدخل كلمة المرور" autoComplete="current-password" className="w-full pr-10 pl-4 py-3 rounded-2xl glass-input text-sm font-semibold" required /></div><p className="text-[11px] text-slate-500 mt-1.5">كلمة المرور مخفية لحماية بياناتك.</p></div>
        <button type="submit" disabled={isLoading} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold text-sm disabled:opacity-50">{isLoading ? 'جاري التحقق...' : <>تسجيل الدخول <ArrowRight className="w-4 h-4 rotate-180" /></>}</button>
      </form>
      <p className="mt-7 pt-4 border-t border-slate-800 text-center text-[11px] text-slate-500 flex justify-center gap-1"><ShieldCheck className="w-4 h-4 text-emerald-500" />يُدار الحساب والعمال من إعدادات صاحب الماركت.</p>
    </div>
  </div>;
};
