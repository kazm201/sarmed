import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import {
  PlusCircle,
  UserPlus,
  Search,
  Calendar,
  FileText,
  DollarSign,
  Camera,
  CheckCircle2,
  AlertCircle,
  Receipt,
  UserCheck,
  ChevronDown
} from 'lucide-react';
import { PrintInvoice } from '../components/common/PrintInvoice';

export const AddDebtPage = ({ setActivePage }) => {
  const { currentUser, isManager, isWorker, settings } = useAuth();
  const { customers, addCustomer, addDebtTransaction } = useData();

  // Mode: 'existing' | 'new'
  const [customerMode, setCustomerMode] = useState('existing');
  
  // Existing Customer Search/Select
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');

  // New Customer Fields
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');

  // Transaction Fields
  const [amount, setAmount] = useState('');
  const [details, setDetails] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoicePhoto, setInvoicePhoto] = useState('');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successTx, setSuccessTx] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Filtered Customers List
  const filteredCustomers = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('ar');
    return customers
      .filter((c) => !query || c.name.toLocaleLowerCase('ar').includes(query) || (c.phone && c.phone.includes(query)))
      .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }, [customers, searchQuery]);
  const shownCustomers = searchQuery ? filteredCustomers : filteredCustomers.slice(0, 30);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  // Quick Amount Addition chips (in display units — multiplied by 1000 when saved)
  const quickAmounts = [1, 2, 5, 10, 25, 50];
  const keypadKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0'];
  const addKey = (key) => setAmount((value) => {
    // Prevent multiple decimals
    if (key === '.' && value.includes('.')) return value;
    return `${value}${key}`.replace(/^0+(?=\d)/, '');
  });

  // Computed actual amount (×1000)
  const actualAmount = (parseFloat(amount) || 0) * 1000;

  // The worker gets a clear confirmation, then a fresh, ready-to-use debt screen.
  useEffect(() => {
    if (!isWorker || successTx?.status !== 'pending') return undefined;
    const refreshTimer = window.setTimeout(() => {
      setSuccessTx(null); setSelectedCustomerId(''); setSearchQuery(''); setAmount(''); setDetails(''); setInvoicePhoto('');
      setActivePage('add-debt');
    }, 3500);
    return () => window.clearTimeout(refreshTimer);
  }, [successTx, isWorker, setActivePage]);

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('حجم الصورة كبير، يرجى اختيار صورة أقل من 2 ميغابايت');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setInvoicePhoto(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      let targetCustomerId = selectedCustomerId;
      let targetCustomerData = null;

      // If adding new customer first
      if (customerMode === 'new') {
        if (!newName.trim()) {
          throw new Error('يرجى كتابة اسم الزبون الجديد');
        }
        const createdCustomer = await addCustomer({
          name: newName,
          phone: newPhone,
          address: newAddress,
          initialDebt: 0
        });
        targetCustomerId = createdCustomer.id;
        targetCustomerData = createdCustomer;
      }

      if (!targetCustomerId) {
        throw new Error('يرجى اختيار الزبون أو إضافته أولاً');
      }

      const tx = await addDebtTransaction({
        customerId: targetCustomerId,
        amount: actualAmount,
        details,
        date,
        invoicePhoto,
        customerData: targetCustomerData
      });

      setSuccessTx(tx);
      // Reset form
      setAmount('');
      setDetails('');
      setInvoicePhoto('');
      if (customerMode === 'new') {
        setNewName('');
        setNewPhone('');
        setNewAddress('');
        setCustomerMode('existing');
        setSelectedCustomerId(targetCustomerId);
      }
    } catch (err) {
      setErrorMsg(err.message || 'حدث خطأ أثناء إضافة الدين');
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculatedNewDebt =
    (selectedCustomer?.currentDebt || 0) + actualAmount;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <PlusCircle className="w-6 h-6" />
            </div>
            <span>تسجيل دين جديد على زبون</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            إضافة مبلغ دين مشتريات وتحديث سجل الحساب فورياً
          </p>
        </div>
      </div>

      {/* Success Notification Alert */}
      {successTx && (
        <div className="p-5 rounded-3xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
            <div>
              <h4 className="font-bold text-sm text-white">
                {successTx.status === 'approved'
                  ? 'تم تسجيل الدين واعتماده بنجاح!'
                  : 'تم إرسال طلب الدين للمدير بانتظار الموافقة!'}
              </h4>
              <p className="text-xs text-emerald-300/80 mt-0.5">
                المبلغ: {successTx.amount.toLocaleString()} {settings.currency} للزبون "{successTx.customerName}"
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSuccessTx(null)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition-all"
            >
              إضافة دين آخر
            </button>
            {isManager && <button
              onClick={() => setActivePage('customers')}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-950"
            >
              عرض سجل الزبائن
            </button>}
          </div>
        </div>
      )}

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Form Container */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Customer Selection or Creation */}
        <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span>{isManager ? '1. اختيار أو إضافة الزبون' : '1. اختيار الزبون'}</span>
            </h3>

            {isManager && <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
              <button
                type="button"
                onClick={() => setCustomerMode('existing')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  customerMode === 'existing'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                زبون موجود ({customers.length})
              </button>
              <button
                type="button"
                onClick={() => setCustomerMode('new')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  customerMode === 'new'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                + زبون جديد
              </button>
            </div>}
          </div>

          {customerMode === 'existing' ? (
            <div className="space-y-3">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="اكتب الاسم أو رقم الهاتف للوصول السريع..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-10 pl-4 py-2.5 rounded-2xl glass-input text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                <span>{searchQuery ? `${filteredCustomers.length} نتيجة` : `يعرض أول 30 من أصل ${customers.length} زبون`}</span>
                {isWorker && <span>اختر اسماً واحداً ثم سجّل الدين.</span>}
              </div>

              {/* Compact searchable list: remains fast and readable with hundreds of customers. */}
              <div className="max-h-72 overflow-y-auto space-y-1.5 p-1" role="listbox" aria-label="قائمة الزبائن">
                {shownCustomers.length === 0 ? (
                  <div className="py-6 text-center text-slate-500 text-xs">
                    لم يتم العثور على زبون مطابق.{isManager ? ' يمكنك التبديل إلى "زبون جديد" لإضافته.' : ' تواصل مع صاحب السوبرماركت لإضافة الزبون.'}
                  </div>
                ) : (
                  shownCustomers.map((cust) => {
                    const isSelected = selectedCustomerId === cust.id;
                    return (
                      <button
                        type="button"
                        key={cust.id}
                        onClick={() => { setSelectedCustomerId(cust.id); setSearchQuery(cust.name); }}
                        className={`w-full p-3 rounded-2xl cursor-pointer transition-all flex items-center justify-between text-right ${
                          isSelected
                            ? 'bg-emerald-950/80 border-2 border-emerald-500 text-white shadow-md'
                            : 'bg-slate-900/60 border border-slate-800 hover:bg-slate-800/80 text-slate-300'
                        }`}
                      >
                        <div>
                          <h4 className="text-xs font-bold text-white">{cust.name}</h4>
                          <span className="text-[10px] text-slate-400">{cust.phone || 'بدون هاتف'}</span>
                        </div>

                        <div className="text-left">
                          <span className="text-[11px] font-black text-rose-400">
                            الدين الحالي: {(cust.currentDebt || 0).toLocaleString()} {settings.currency}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          ) : isManager ? (
            /* Add New Customer Inputs */
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">اسم الزبون *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="الاسم الكامل للزبون"
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-semibold"
                  required={customerMode === 'new'}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">رقم الهاتف (اختياري)</label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="07xxxxxxxxx"
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">العنوان / المنطقة</label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="الحي، الزقاق..."
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-semibold"
                />
              </div>
            </div>
          ) : null}
        </div>

        {/* Step 2: Debt Details & Amount */}
        <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span>2. بيانات ومبلغ الدين</span>
          </h3>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2">مبلغ الدين — أدخل العدد (كل 1 = 1,000 {settings.currency}) *</label>
            <div className="relative">
              <input
                type="number"
                step="any"
                min="0.1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full pr-4 pl-16 py-3.5 rounded-2xl glass-input text-xl font-black text-emerald-400 text-center tracking-wider"
                required
              />
              <span className="absolute left-4 top-4 text-xs font-bold text-slate-400">
                ألف
              </span>
            </div>

            {/* Live calculation preview */}
            {amount && parseFloat(amount) > 0 && (
              <div className="mt-2 flex items-center gap-2 text-xs px-3 py-2 rounded-xl bg-emerald-950/40 border border-emerald-900/40">
                <span className="text-slate-400">{parseFloat(amount).toLocaleString('ar')} ألف</span>
                <span className="text-slate-500">×</span>
                <span className="text-slate-400">1,000</span>
                <span className="text-slate-500">=</span>
                <strong className="text-emerald-400 font-black">{actualAmount.toLocaleString()} {settings.currency}</strong>
                <span className="text-slate-500 text-[10px]">المبلغ الفعلي المحفوظ</span>
              </div>
            )}

            {/* Quick Amount Chips */}
            <div className="flex flex-wrap gap-2 mt-2.5">
              {quickAmounts.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setAmount(q.toString())}
                  className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all active:scale-95"
                >
                  {q} ألف
                </button>
              ))}
            </div>
            <div className="mt-4 max-w-sm" aria-label="لوحة أرقام مبلغ الدين">
              <p className="text-[11px] text-slate-400 mb-2">لوحة أرقام سريعة للمس: اختر المبلغ أو اكتبه مباشرة.</p>
              <div className="grid grid-cols-3 gap-2">
                {keypadKeys.map((key) => <button key={key} type="button" onClick={() => addKey(key)} className="py-2.5 rounded-xl bg-slate-800 hover:bg-emerald-700 text-slate-100 text-sm font-black transition-colors">{key}</button>)}
                <button type="button" onClick={() => setAmount((value) => value.slice(0, -1))} className="py-2.5 rounded-xl bg-amber-500/15 text-amber-300 text-xs font-bold">مسح</button>
                <button type="button" onClick={() => setAmount('')} className="py-2.5 rounded-xl bg-rose-500/15 text-rose-300 text-xs font-bold">إلغاء</button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                تفاصيل المشتريات / البضاعة
              </label>
              <textarea
                rows={2}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="مثال: مواد غذائية، حليب، لحم مفروم، منظفات..."
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-semibold resize-none"
              />
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">تاريخ الحركة</label>
                <div className="relative">
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Photo / Invoice Upload */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  إرفاق صورة الفاتورة (اختياري)
                </label>
                <label className="cursor-pointer flex items-center justify-center gap-2 p-2.5 rounded-xl border border-dashed border-slate-700 hover:border-emerald-500 bg-slate-900/50 text-slate-400 hover:text-emerald-400 transition-all text-xs font-bold">
                  <Camera className="w-4 h-4" />
                  <span>{invoicePhoto ? '✓ تم إرفاق الصورة' : 'رفع أو التقاط صورة الفاتورة'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Realtime Balance Simulation Preview */}
          {selectedCustomer && (
            <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-rose-950/20 to-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block">الرصيد السابق للزبون:</span>
                <span className="text-sm font-bold text-slate-200">
                  {(selectedCustomer.currentDebt || 0).toLocaleString()} {settings.currency}
                </span>
              </div>
              <div className="text-center font-bold text-rose-400 text-lg">+</div>
              <div className="text-left">
                <span className="text-xs text-slate-400 block">الرصيد الجديد بعد الإضافة:</span>
                <span className="text-base font-black text-rose-400">
                  {calculatedNewDebt.toLocaleString()} {settings.currency}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Submit Action */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-700 to-rose-800 hover:from-rose-500 hover:to-rose-600 text-white font-black text-base shadow-xl shadow-rose-950/60 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <span>جاري حفظ الدين والمزامنة...</span>
          ) : (
            <>
              <PlusCircle className="w-5 h-5" />
              <span>
                {isWorker && settings.workerRequiresApproval
                  ? 'إرسال طلب تسجيل الدين للمدير'
                  : 'اعتماد وتسجيل الدين فورياً'}
              </span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
