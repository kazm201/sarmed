import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import {
  Settings,
  ShieldCheck,
  KeyRound,
  Store,
  Database,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  Save,
  Lock,
  User,
  Sliders,
  RefreshCw,
  Server
} from 'lucide-react';
import { getActiveFirebaseConfig, saveFirebaseConfig } from '../services/firebase';

export const SettingsPage = ({ setActivePage }) => {
  const { settings, updateSettings, currentUser } = useAuth();
  const { customers, transactions, notifications, resetStatisticsOnly, resetAllData } = useData();
  const [auditResult, setAuditResult] = useState(null);

  // Manager Credentials Form
  const [managerName, setManagerName] = useState(settings.managerName || 'سرمد مؤيد');
  const [managerUsername, setManagerUsername] = useState(settings.managerUsername || '1111');
  const [managerPassword, setManagerPassword] = useState(settings.managerPassword || '1111');
  const [workers, setWorkers] = useState(settings.workers || []);
  const [workerRequiresApproval, setWorkerRequiresApproval] = useState(
    settings.workerRequiresApproval !== undefined ? settings.workerRequiresApproval : true
  );

  // Store Profile Form
  const [storeName, setStoreName] = useState(settings.storeName || '');
  const [storePhone, setStorePhone] = useState(settings.storePhone || '');
  const [storeAddress, setStoreAddress] = useState(settings.storeAddress || '');
  const [currency, setCurrency] = useState(settings.currency || 'د.ع');

  // Firebase Config Form
  const activeFbConfig = getActiveFirebaseConfig();
  const [fbApiKey, setFbApiKey] = useState(activeFbConfig.apiKey || '');
  const [fbProjectId, setFbProjectId] = useState(activeFbConfig.projectId || '');
  const [fbAuthDomain, setFbAuthDomain] = useState(activeFbConfig.authDomain || '');
  const [fbAppId, setFbAppId] = useState(activeFbConfig.appId || '');

  // Status Message
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [backupSuccess, setBackupSuccess] = useState(false);

  // Reset confirmation modal
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  // Handle Save Main Settings
  const handleSaveSettings = (e) => {
    e.preventDefault();
    updateSettings({
      managerName,
      managerUsername,
      managerPassword,
      workers,
      workerRequiresApproval,
      storeName,
      storePhone,
      storeAddress,
      currency
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  const updateWorker = (id, field, value) => setWorkers((items) => items.map((worker) => worker.id === id ? { ...worker, [field]: value } : worker));
  const addWorker = () => setWorkers((items) => [...items, { id: `worker-${Date.now()}`, name: '', username: '', password: '' }]);
  const removeWorker = (id) => setWorkers((items) => items.filter((worker) => worker.id !== id));

  // Handle Save Custom Firebase
  const handleSaveFirebase = (e) => {
    e.preventDefault();
    const config = {
      apiKey: fbApiKey.trim(),
      projectId: fbProjectId.trim(),
      authDomain: fbAuthDomain.trim(),
      appId: fbAppId.trim(),
      storageBucket: `${fbProjectId.trim()}.appspot.com`,
      messagingSenderId: "1029384756"
    };
    saveFirebaseConfig(config);
  };

  // Export JSON Backup
  const handleExportBackup = () => {
    const backupData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      storeSettings: settings,
      customers,
      transactions,
      notifications
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `backup_sarmed_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setBackupSuccess(true);
    setTimeout(() => setBackupSuccess(false), 3000);
  };

  // Import JSON Backup
  const handleImportBackup = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (parsed.customers && parsed.transactions) {
            localStorage.setItem('sarmed_customers_db', JSON.stringify(parsed.customers));
            localStorage.setItem('sarmed_transactions_db', JSON.stringify(parsed.transactions));
            if (parsed.storeSettings) {
              localStorage.setItem('sarmed_app_settings', JSON.stringify(parsed.storeSettings));
            }
            alert('تم استرجاع النسخة الاحتياطية بنجاح! سيتم تحديث الصفحة.');
            window.location.reload();
          } else {
            alert('الملف غير صالح أو لا يحتوي على بنية بيانات صحيحة');
          }
        } catch (err) {
          alert('فشل قراءة ملف النسخة الاحتياطية');
        }
      };
      reader.readAsText(file);
    }
  };

  // Handle Safe Statistics Reset & Balances Audit
  const handleConfirmedReset = async () => {
    if (resetConfirmText !== 'تصفير') return;
    setIsResetting(true);
    try {
      const res = await resetStatisticsOnly();
      setAuditResult(res);
      setResetDone(true);
    } catch (e) {
      console.warn('Reset error:', e);
    } finally {
      setIsResetting(false);
      setShowResetModal(false);
      setResetConfirmText('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Settings className="w-6 h-6" />
            </div>
            <span>إعدادات الحساب والمتجر والنظام</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            إدارة كلمة السر، الرموز السرية، بيانات المتجر، وقاعدة بيانات Firebase
          </p>
        </div>

        {savedSuccess && (
          <div className="px-4 py-2 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 shadow-lg animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>تم حفظ التغييرات بنجاح!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Section 1: Security & PIN Management */}
        <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>1. أمان الحساب والرموز السرية (PIN Codes)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                اسم المستخدم للمدير
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-semibold"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                اسم مستخدم صاحب الماركت
              </label>
              <input
                type="text"
                value={managerUsername}
                onChange={(e) => setManagerUsername(e.target.value)}
                placeholder="1111"
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-bold text-center"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                كلمة مرور صاحب الماركت
              </label>
              <input
                type="password"
                value={managerPassword}
                onChange={(e) => setManagerPassword(e.target.value)}
                placeholder="1111"
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-bold text-center"
                required
              />
              <p className="text-[10px] text-slate-400 mt-1">لا تظهر كلمة المرور أثناء الكتابة.</p>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div>
                <label className="text-xs font-bold text-slate-200 block">
                  اشتراط موافقة المدير على حركات العامل
                </label>
                <span className="text-[10px] text-slate-400">
                  عند التفعيل، تتطلب ديون وتسديدات العامل موافقة المدير
                </span>
              </div>
              <input
                type="checkbox"
                checked={workerRequiresApproval}
                onChange={(e) => setWorkerRequiresApproval(e.target.checked)}
                className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
              />
            </div>
          </div>
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between"><div><h4 className="text-xs font-bold text-white">حسابات العمال</h4><p className="text-[10px] text-slate-400 mt-1">لكل عامل اسم مستخدم وكلمة مرور وصلاحية إضافة دين أو تسديد فقط.</p></div><button type="button" onClick={addWorker} className="px-3 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold">+ إضافة عامل</button></div>
            {workers.map((worker) => <div key={worker.id} className="grid grid-cols-1 sm:grid-cols-4 gap-2 p-3 rounded-xl bg-slate-900/60 border border-slate-800"><input value={worker.name} onChange={(e) => updateWorker(worker.id, 'name', e.target.value)} placeholder="اسم العامل" className="px-3 py-2 rounded-lg glass-input text-xs" required /><input value={worker.username} onChange={(e) => updateWorker(worker.id, 'username', e.target.value)} placeholder="اسم المستخدم" className="px-3 py-2 rounded-lg glass-input text-xs" required /><input type="password" value={worker.password} onChange={(e) => updateWorker(worker.id, 'password', e.target.value)} placeholder="كلمة المرور" className="px-3 py-2 rounded-lg glass-input text-xs" required /><button type="button" onClick={() => removeWorker(worker.id)} className="rounded-lg bg-rose-500/10 text-rose-300 text-xs font-bold">حذف</button></div>)}
          </div>
        </div>

        {/* Section 2: Store Identity & Receipt Customization */}
        <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
            <Store className="w-4 h-4 text-emerald-400" />
            <span>2. بيانات المتجر وتخصيص السندات والفواتير</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                اسم المحل / السوبرماركت *
              </label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="سوبرماركت البركة"
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-semibold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                رمز العملة المستخدمة
              </label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                placeholder="د.ع أو $ أو ر.س"
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-bold text-center"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                رقم هاتف المتجر (يظهر في السندات وواتساب)
              </label>
              <input
                type="tel"
                value={storePhone}
                onChange={(e) => setStorePhone(e.target.value)}
                placeholder="07700000000"
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                عنوان وموقع المتجر
              </label>
              <input
                type="text"
                value={storeAddress}
                onChange={(e) => setStoreAddress(e.target.value)}
                placeholder="الفرع الرئيسي، الشارع العام..."
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-semibold"
              />
            </div>
          </div>
        </div>

        {/* Submit Save Button */}
        <button
          type="submit"
          className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm shadow-xl shadow-emerald-950/60 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          <span>حفظ إعدادات الحساب والمتجر</span>
        </button>
      </form>

      {/* Section 3: Firebase Configuration */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Server className="w-4 h-4 text-teal-400" />
            <span>3. إعدادات وقاعدة بيانات Firebase المباشرة</span>
          </h3>
          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            تخزين سحابي ومحلي متزامن
          </span>
        </div>

        <p className="text-xs text-slate-400">
          يمكنك ربط تطبيقك بمشروع Firebase الخاص بك مباشرة عن طريق تعبئة المفاتيح أدناه (أو تركها لتعمل مع التخزين المحلي التلقائي):
        </p>

        <form onSubmit={handleSaveFirebase} className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Firebase API Key</label>
            <input
              type="text"
              value={fbApiKey}
              onChange={(e) => setFbApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-3 py-2 rounded-xl glass-input text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Project ID</label>
            <input
              type="text"
              value={fbProjectId}
              onChange={(e) => setFbProjectId(e.target.value)}
              placeholder="sarmed-supermarket"
              className="w-full px-3 py-2 rounded-xl glass-input text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Auth Domain</label>
            <input
              type="text"
              value={fbAuthDomain}
              onChange={(e) => setFbAuthDomain(e.target.value)}
              placeholder="sarmed-supermarket.firebaseapp.com"
              className="w-full px-3 py-2 rounded-xl glass-input text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">App ID</label>
            <input
              type="text"
              value={fbAppId}
              onChange={(e) => setFbAppId(e.target.value)}
              placeholder="1:1029384756:web:..."
              className="w-full px-3 py-2 rounded-xl glass-input text-xs font-mono"
            />
          </div>

          <div className="sm:col-span-2 pt-2">
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 font-bold text-xs border border-teal-500/30 flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>تحديث وحفظ مفاتيح Firebase</span>
            </button>
          </div>
        </form>
      </div>

      {/* Section 4: Data Backup & Restore */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
          <Database className="w-4 h-4 text-emerald-400" />
          <span>4. النسخ الاحتياطي واسترجاع البيانات (Backup & Restore)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <h4 className="text-xs font-bold text-white">تصدير نسخة احتياطية كاملة</h4>
              <p className="text-[11px] text-slate-400 mt-1">
                تنزيل ملف JSON يحتوي على سجل الزبائن، الحركات المالية، وكافة إعدادات النظام.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportBackup}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>{backupSuccess ? 'تم التحميل بنجاح!' : 'تصدير النسخة الاحتياطية'}</span>
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <h4 className="text-xs font-bold text-white">استرجاع نسخة احتياطية سابقة</h4>
              <p className="text-[11px] text-slate-400 mt-1">
                رفع ملف JSON محفوظ مسبقاً لاستعادة كافة الزبائن والبيانات.
              </p>
            </div>
            <label className="cursor-pointer w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95">
              <Upload className="w-4 h-4" />
              <span>اختيار ملف النسخة الاحتياطية</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>
      {/* Section 5: Safe Statistics Reset & Audit (No customer deletion) */}
      <div className="glass-panel rounded-3xl p-6 border-2 border-amber-800/60 space-y-4 bg-gradient-to-br from-amber-950/20 to-slate-900">
        <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2 pb-3 border-b border-amber-900/40">
          <RefreshCw className="w-4 h-4" />
          <span>5. تصفير وإعادة ضبط الإحصائيات فقط (إصلاح وتدقيق الأخطاء)</span>
        </h3>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs text-slate-200 font-semibold">
              إعادة ترسيت إحصائيات اليوم وتدقيق الحسابات تلقائياً عند حدوث أي خطأ
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              هذا الإجراء آمن تماماً: يقوم بتصفير مؤشرات اليوم وتصحيح أي تفاوت حسابي <strong className="text-emerald-400">دون حذف أي زبون أو حركة مالية</strong>.
            </p>
            {auditResult && (
              <p className="text-[11px] text-emerald-300 font-bold mt-1.5">
                تم تدقيق {auditResult.totalAudited} زبون بنجاح (تم تصحيح {auditResult.correctedCount} حسابات).
              </p>
            )}
          </div>

          {resetDone ? (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>تم تصفير وتدقيق الإحصاءات بنجاح!</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowResetModal(true)}
              className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 border border-amber-500/50 font-black text-xs transition-all active:scale-95 shadow-lg"
            >
              <RefreshCw className="w-4 h-4" />
              <span>تصفير وإعادة ضبط الإحصائيات فقط</span>
            </button>
          )}
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border-2 border-amber-600/60 p-6 shadow-2xl space-y-4">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <RefreshCw className="w-7 h-7" />
              </div>
              <h3 className="text-base font-black text-white">تأكيد تصفير الإحصائيات فقط</h3>
              <p className="text-xs text-slate-300">
                سيتم إعادة ضبط إحصائيات اليوم وتدقيق حسابات <strong className="text-emerald-400">{customers.length} زبون</strong> من الحركات المعتمدة.
                <br />
                <span className="text-emerald-300 font-bold mt-1 block">✓ لن يتم حذف أي زبائن أو سجلات ديون نهائياً.</span>
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300">
                اكتب كلمة <span className="text-amber-400 font-black">تصفير</span> للتأكيد:
              </label>
              <input
                type="text"
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                placeholder="اكتب: تصفير"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-bold text-center focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => { setShowResetModal(false); setResetConfirmText(''); }}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition-all"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={resetConfirmText !== 'تصفير' || isResetting}
                onClick={handleConfirmedReset}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black text-xs transition-all active:scale-95"
              >
                {isResetting ? 'جاري الضبط...' : 'تأكيد التصفير'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
