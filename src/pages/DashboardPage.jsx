import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  AlertCircle,
  PlusCircle,
  CreditCard,
  UserPlus,
  Clock,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronLeft,
  Sparkles,
  Receipt,
  FileText,
  FileDown
} from 'lucide-react';
import { PrintInvoice } from '../components/common/PrintInvoice';
import { CustomerDebtPdfModal } from '../components/common/CustomerDebtPdfModal';

export const DashboardPage = ({ setActivePage }) => {
  const { currentUser, isManager, isWorker, settings } = useAuth();
  const {
    customers,
    transactions,
    totalDebt,
    totalCustomers,
    customersWithDebt,
    todayCollections,
    todayDebts,
    pendingApprovalsCount
  } = useData();

  const [selectedTxForReceipt, setSelectedTxForReceipt] = useState(null);
  const [showPdfModal, setShowPdfModal] = useState(false);

  // Recent transactions list (limit to 6)
  const recentTransactions = transactions.slice(0, 8);

  // Top Debtor Customers
  const topDebtors = [...customers]
    .filter((c) => (c.currentDebt || 0) > 0)
    .sort((a, b) => (b.currentDebt || 0) - (a.currentDebt || 0))
    .slice(0, 5);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Welcome Banner */}
      <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-slate-900 via-slate-850 to-emerald-950/70 border border-emerald-900/30 overflow-hidden shadow-2xl">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 text-xs font-bold border border-emerald-500/20 mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>مرحباً بك، {currentUser?.name}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              {isManager ? 'لوحة تحكم وإحصائيات المحل الشاملة' : 'لوحة عمليات ونقاط البيع السريعة'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              {isManager
                ? 'متابعة حية لديون الزبائن، التحصيلات النقدية، وطلبات موافقات العمال'
                : 'تسجيل حركات الديون والتسديدات الفورية للزبائن'}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {isManager && (
              <button
                onClick={() => setShowPdfModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95"
              >
                <FileDown className="w-4 h-4 text-rose-400" />
                <span>كشف الديون (PDF)</span>
              </button>
            )}

            <button
              onClick={() => setActivePage('add-debt')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-xs sm:text-sm shadow-lg shadow-rose-950/50 transition-all active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>تسجيل دين جديد</span>
            </button>

            <button
              onClick={() => setActivePage('pay-debt')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-950/50 transition-all active:scale-95"
            >
              <CreditCard className="w-4 h-4" />
              <span>تسديد دفعة</span>
            </button>
          </div>
        </div>
      </div>

      {/* Pending Approval Alert Banner for Manager */}
      {isManager && pendingApprovalsCount > 0 && (
        <div
          onClick={() => setActivePage('approvals')}
          className="cursor-pointer p-4 rounded-2xl bg-gradient-to-r from-amber-950/60 via-amber-900/30 to-slate-900 border border-amber-500/40 flex items-center justify-between shadow-lg hover:border-amber-400 transition-all animate-pulse"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-200">
                لديك {pendingApprovalsCount} طلبات معلقة مسجلة من العمال بانتظار موافقتك!
              </h4>
              <p className="text-xs text-amber-300/80 mt-0.5">
                انقر هنا لمعاينة الحركات المالية واعتمادها أو رفضها
              </p>
            </div>
          </div>
          <ChevronLeft className="w-5 h-5 text-amber-300" />
        </div>
      )}

      {/* Metrics Grid (Manager sees full financial KPIs, Worker sees operational metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isManager ? (
          <>
            {/* Total Active Debt */}
            <div className="glass-card rounded-3xl p-5 border border-rose-900/30 bg-gradient-to-b from-slate-900 to-rose-950/20 relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">إجمالي الديون بالسوق</span>
                <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 group-hover:scale-110 transition-transform">
                  <TrendingDown className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {totalDebt.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-rose-400 mr-1.5">{settings.currency}</span>
              </div>
              <div className="mt-2 text-xs text-slate-400 flex items-center gap-1.5">
                <span className="text-rose-400 font-bold">{customersWithDebt}</span>
                <span>زبون عليهم ديون حالية</span>
              </div>
            </div>

            {/* Today Collections */}
            <div className="glass-card rounded-3xl p-5 border border-emerald-900/30 bg-gradient-to-b from-slate-900 to-emerald-950/20 group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">تحصيلات اليوم</span>
                <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {todayCollections.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-emerald-400 mr-1.5">{settings.currency}</span>
              </div>
              <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
                <span>المبالغ الواصلة اليوم نقداً</span>
              </div>
            </div>

            {/* Today Recorded Debts */}
            <div className="glass-card rounded-3xl p-5 border border-amber-900/30 bg-gradient-to-b from-slate-900 to-amber-950/20 group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">ديون اليوم المسجلة</span>
                <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:scale-110 transition-transform">
                  <ArrowDownLeft className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {todayDebts.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-amber-400 mr-1.5">{settings.currency}</span>
              </div>
              <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
                <span>بضاعة خرجت بالدين اليوم</span>
              </div>
            </div>

            {/* Total Customers */}
            <div className="glass-card rounded-3xl p-5 border border-slate-700/40 bg-gradient-to-b from-slate-900 to-slate-850 group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">إجمالي الزبائن المسجلين</span>
                <div className="p-2.5 rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/20 group-hover:scale-110 transition-transform">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {totalCustomers}
                </span>
                <span className="text-xs font-bold text-slate-400 mr-1.5">زبون</span>
              </div>
              <div className="mt-2 text-xs text-slate-400">
                <span>سجلات الحسابات المفتوحة</span>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Worker View Metrics */}
            <div className="glass-card rounded-3xl p-5 border border-slate-700/40 bg-slate-900 col-span-1 sm:col-span-2">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">إجمالي الزبائن في النظام</h3>
                  <p className="text-2xl font-black text-emerald-400 mt-1">{totalCustomers} زبون</p>
                </div>
              </div>
            </div>

            <div className="glass-card rounded-3xl p-5 border border-slate-700/40 bg-slate-900 col-span-1 sm:col-span-2">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-teal-500/20 text-teal-400">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">العمليات المنفذة في النظام</h3>
                  <p className="text-2xl font-black text-teal-400 mt-1">{transactions.length} حركة</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Main Two Columns: Recent Transactions & Top Debtors */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions Feed (2 Columns) */}
        <div className="lg:col-span-2 glass-panel rounded-3xl p-6 border border-slate-800">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-400" />
              <span>آخر الحركات والعمليات المالية</span>
            </h3>
            <button
              onClick={() => setActivePage('activities')}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              عرض كل التحركات ←
            </button>
          </div>

          {recentTransactions.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              لا توجد عمليات مسجلة حتى الآن. ابدأ بإضافة دين جديد أو تسديد!
            </div>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map((tx) => {
                const isDebt = tx.type === 'debt';
                return (
                  <div
                    key={tx.id}
                    className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2.5 rounded-xl shrink-0 ${
                          isDebt
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {isDebt ? (
                          <ArrowDownLeft className="w-4 h-4" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">{tx.customerName}</h4>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              tx.status === 'approved'
                                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                                : tx.status === 'pending'
                                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20 animate-pulse'
                                : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                            }`}
                          >
                            {tx.status === 'approved'
                              ? 'معتمد'
                              : tx.status === 'pending'
                              ? 'بانتظار الموافقة'
                              : 'مرفوض'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {tx.details || (isDebt ? 'تسجيل دين بضاعة' : 'تسديد دفعة')} • بواسطة:{' '}
                          <span className="text-slate-300">{tx.createdBy}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                      <div className="text-left sm:text-left">
                        <span
                          className={`text-base font-black ${
                            isDebt ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          {isDebt ? '+' : '-'} {tx.amount.toLocaleString()}{' '}
                          <span className="text-xs font-normal">{settings.currency}</span>
                        </span>
                        <span className="text-[10px] text-slate-500 block">{tx.date}</span>
                      </div>

                      {/* Receipt Button */}
                      <button
                        onClick={() => setSelectedTxForReceipt(tx)}
                        className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-emerald-400 hover:bg-slate-700 transition-all"
                        title="طباعة السند"
                      >
                        <Receipt className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Debtors List (1 Column) */}
        <div className="glass-panel rounded-3xl p-6 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-rose-400" />
                <span>أعلى الزبائن ديوناً</span>
              </h3>
              <button
                onClick={() => setActivePage('customers')}
                className="text-xs font-semibold text-slate-400 hover:text-white"
              >
                الكل
              </button>
            </div>

            {topDebtors.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                لا توجد ديون مستحقة على أي زبون حالياً! 🎉
              </div>
            ) : (
              <div className="space-y-3">
                {topDebtors.map((cust, idx) => (
                  <div
                    key={cust.id}
                    className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div>
                        <h5 className="text-xs font-bold text-white">{cust.name}</h5>
                        <span className="text-[10px] text-slate-400">{cust.phone || 'بدون هاتف'}</span>
                      </div>
                    </div>

                    <div className="text-left">
                      <span className="text-xs font-black text-rose-400">
                        {(cust.currentDebt || 0).toLocaleString()} {settings.currency}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80">
            <button
              onClick={() => setActivePage('add-debt')}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all"
            >
              <PlusCircle className="w-4 h-4 text-emerald-400" />
              <span>تسجيل دين جديد</span>
            </button>
          </div>
        </div>
      </div>

      {/* Invoice/Receipt Modal View */}
      {selectedTxForReceipt && (
        <PrintInvoice
          transaction={selectedTxForReceipt}
          customer={customers.find((c) => c.id === selectedTxForReceipt.customerId) || { name: selectedTxForReceipt.customerName }}
          mode="receipt"
          onClose={() => setSelectedTxForReceipt(null)}
        />
      )}

      {/* Customer Debts PDF Modal */}
      {showPdfModal && (
        <CustomerDebtPdfModal
          customers={customers}
          onClose={() => setShowPdfModal(false)}
        />
      )}
    </div>
  );
};
