import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import {
  CreditCard,
  Search,
  CheckCircle2,
  AlertCircle,
  Receipt,
  UserCheck,
  DollarSign,
  Share2,
  Printer,
  Sparkles,
  Wallet
} from 'lucide-react';
import { PrintInvoice } from '../components/common/PrintInvoice';

export const PayDebtPage = ({ setActivePage }) => {
  const { currentUser, isManager, isWorker, settings } = useAuth();
  const { customers, addPaymentTransaction } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('نقدي');
  const [details, setDetails] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successTx, setSuccessTx] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Filter customers - debtors first
  const filteredCustomers = customers
    .filter(
      (c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.phone && c.phone.includes(searchQuery))
    )
    .sort((a, b) => (b.currentDebt || 0) - (a.currentDebt || 0));

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  // Fill Full Debt amount button (in display units ÷1000)
  const handleFullSettlement = () => {
    if (selectedCustomer) {
      const displayVal = (selectedCustomer.currentDebt || 0) / 1000;
      setAmount(displayVal.toString());
    }
  };

  // Actual amount ×1000
  const actualAmount = (parseFloat(amount) || 0) * 1000;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      if (!selectedCustomerId) {
        throw new Error('يرجى اختيار الزبون المسدد أولاً');
      }

      const parsedAmount = actualAmount;
      if (!parsedAmount || parsedAmount <= 0) {
        throw new Error('يرجى إدخال مبلغ تسديد صحيح أكبر من صفر');
      }

      const tx = await addPaymentTransaction({
        customerId: selectedCustomerId,
        amount: actualAmount,
        paymentMethod,
        details: details || `تسديد دفعة ${paymentMethod}`,
        date
      });

      setSuccessTx(tx);
      setAmount('');
      setDetails('');
    } catch (err) {
      setErrorMsg(err.message || 'حدث خطأ أثناء تسجيل التسديد');
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculatedRemainingDebt = Math.max(
    0,
    (selectedCustomer?.currentDebt || 0) - actualAmount
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CreditCard className="w-6 h-6" />
            </div>
            <span>تسديد دفعة / تصفية دين</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            تسجيل المبالغ الواصلة من الزبائن وتخفيض رصيد الدين فورياً
          </p>
        </div>
      </div>

      {/* Success Modal / Banner */}
      {successTx && (
        <div className="p-6 rounded-3xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xl">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
            <div>
              <h4 className="font-black text-sm text-white">
                {successTx.status === 'approved'
                  ? 'تم تسجيل التسديد وتخفيض الدين بنجاح! 🎉'
                  : 'تم إرسال إشعار التسديد للمدير للاعتماد!'}
              </h4>
              <p className="text-xs text-emerald-300/90 mt-1">
                المبلغ الواصل: <strong className="text-white">{successTx.amount.toLocaleString()} {settings.currency}</strong> للزبون "{successTx.customerName}"
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowPrintModal(true)}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة السند</span>
            </button>
            <button
              onClick={() => setSuccessTx(null)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition-all"
            >
              تسديد آخر
            </button>
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Select */}
        <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span>1. تحديد الزبون المسدد</span>
          </h3>

          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
              <input
                type="text"
                placeholder="ابحث باسم الزبون أو رقم الهاتف..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-10 pl-4 py-2.5 rounded-2xl glass-input text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="max-h-52 overflow-y-auto space-y-1.5 p-1">
              {filteredCustomers.length === 0 ? (
                <div className="py-6 text-center text-slate-500 text-xs">
                  لا يوجد زبائن مسجلين.
                </div>
              ) : (
                filteredCustomers.map((cust) => {
                  const isSelected = selectedCustomerId === cust.id;
                  const hasDebt = (cust.currentDebt || 0) > 0;
                  return (
                    <div
                      key={cust.id}
                      onClick={() => setSelectedCustomerId(cust.id)}
                      className={`p-3 rounded-2xl cursor-pointer transition-all flex items-center justify-between ${
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
                        <span
                          className={`text-xs font-black ${
                            hasDebt ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          الدين: {(cust.currentDebt || 0).toLocaleString()} {settings.currency}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Payment Amount & Method */}
        <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-400" />
              <span>2. تفاصيل ومبلغ التسديد</span>
            </h3>

            {selectedCustomer && (selectedCustomer.currentDebt || 0) > 0 && (
              <button
                type="button"
                onClick={handleFullSettlement}
                className="px-3 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30 transition-all active:scale-95 flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>تسديد كامل الرصيد</span>
              </button>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2">
              المبلغ الواصل — أدخل العدد (كل 1 = 1,000 {settings.currency}) *
            </label>
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

            {/* Live preview */}
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
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">طريقة الدفع</label>
            <div className="grid grid-cols-3 gap-2">
              {['نقدي (كاش)', 'زين كاش / محفظة', 'حوالة / تحويل'].map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                    paymentMethod === method
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                ملاحظات أو رقم الإشعار (اختياري)
              </label>
              <textarea
                rows={2}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="مثال: دفعة الحساب الأسبوعي..."
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-semibold resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">تاريخ التسديد</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-semibold"
              />
            </div>
          </div>

          {/* Simulation Preview */}
          {selectedCustomer && (
            <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-emerald-950/20 to-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block">الدين الحالي المستحق:</span>
                <span className="text-sm font-bold text-rose-400">
                  {(selectedCustomer.currentDebt || 0).toLocaleString()} {settings.currency}
                </span>
              </div>
              <div className="text-center font-bold text-emerald-400 text-lg">-</div>
              <div className="text-left">
                <span className="text-xs text-slate-400 block">المتبقي بعد التسديد:</span>
                <span className="text-base font-black text-emerald-400">
                  {calculatedRemainingDebt.toLocaleString()} {settings.currency}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-base shadow-xl shadow-emerald-950/60 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <span>جاري معالجة وتوثيق التسديد...</span>
          ) : (
            <>
              <CreditCard className="w-5 h-5" />
              <span>
                {isWorker && settings.workerRequiresApproval
                  ? 'إرسال طلب التسديد للمدير'
                  : 'اعتماد وتوثيق التسديد فورياً'}
              </span>
            </>
          )}
        </button>
      </form>

      {/* Print Receipt Modal */}
      {showPrintModal && successTx && (
        <PrintInvoice
          transaction={successTx}
          customer={selectedCustomer || { name: successTx.customerName }}
          mode="receipt"
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </div>
  );
};
