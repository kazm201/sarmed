import React, { useMemo } from 'react';
import {
  BarChart3,
  Users,
  WalletCards,
  TrendingDown,
  TrendingUp,
  Clock3,
  CircleCheck,
  RefreshCw,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

export const StatisticsPage = () => {
  const { settings } = useAuth();
  const {
    customers,
    transactions,
    totalDebt,
    pendingApprovalsCount,
    todayCollections,
    todayDebts,
    todayTransactionsCount,
    currentDateStr,
    statsResetTimestamp
  } = useData();

  const stats = useMemo(() => {
    const approved = transactions.filter((t) => t.status === 'approved');
    const debts = approved.filter((t) => t.type === 'debt');
    const payments = approved.filter((t) => t.type === 'payment');
    const sum = (list) => list.reduce((total, item) => total + (Number(item.amount) || 0), 0);

    return {
      approved: approved.length,
      debtValue: sum(debts),
      paymentValue: sum(payments),
      average: customers.length ? Math.round(totalDebt / customers.length) : 0,
      paidCustomers: customers.filter((c) => !c.currentDebt).length,
      pendingValue: sum(transactions.filter((t) => t.status === 'pending'))
    };
  }, [customers, transactions, totalDebt]);

  const cards = [
    ['إجمالي الديون القائمة', totalDebt, TrendingDown, 'text-rose-400', 'bg-rose-500/10 border-rose-500/20'],
    ['إجمالي الديون المعتمدة', stats.debtValue, WalletCards, 'text-amber-400', 'bg-amber-500/10 border-amber-500/20'],
    ['إجمالي التسديدات المعتمدة', stats.paymentValue, TrendingUp, 'text-emerald-400', 'bg-emerald-500/10 border-emerald-500/20'],
    ['متوسط دين الزبون', stats.average, BarChart3, 'text-teal-400', 'bg-teal-500/10 border-teal-500/20']
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <header className="pb-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-teal-400" />
            <span>الإحصاءات والتقارير الشاملة</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            ملخص دقيق مبني على الحركات المعتمدة فقط، ويتحدث تلقائياً عند اعتماد أي طلب.
          </p>
        </div>

        {/* 24-Hour Cycle Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-teal-950/60 border border-teal-500/30 text-teal-300 text-xs font-bold shadow-sm">
          <Clock3 className="w-4 h-4 text-teal-400" />
          <span>تتجدد إحصائيات اليوم كل 24 ساعة تلقائياً</span>
        </div>
      </header>

      {/* Main KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map(([label, value, Icon, color, iconBg]) => (
          <div key={label} className="glass-card rounded-3xl p-5 border border-slate-800 flex flex-col justify-between">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400">{label}</span>
              <div className={`p-2 rounded-xl ${iconBg}`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
            </div>
            <strong className="block mt-4 text-2xl font-black text-white">
              {Number(value).toLocaleString()}{' '}
              <small className="text-xs text-slate-400 font-bold">{settings.currency}</small>
            </strong>
          </div>
        ))}
      </div>

      {/* Today 24-Hour Summary vs Total Log Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Today 24-Hour Metrics */}
        <section className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Clock3 className="w-4 h-4 text-emerald-400" />
              <span>ملخص اليوم (دورة الـ 24 ساعة الحالية)</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">{currentDateStr}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Metric label="ديون اليوم المسجلة" value={todayDebts} currency={settings.currency} color="text-rose-400" />
            <Metric label="تسديدات اليوم الواصلة" value={todayCollections} currency={settings.currency} color="text-emerald-400" />
            <Metric label="حركات اليوم المعتمدة" value={todayTransactionsCount} suffix="حركة" color="text-teal-400" />
            <Metric label="طلبات معلقة بانتظار الموافقة" value={pendingApprovalsCount} suffix="طلب" color="text-amber-400" />
          </div>

          <p className="text-[11px] text-slate-500 pt-1">
            * يتم تصفير مؤشرات اليوم تلقائياً عند انتهاء الـ 24 ساعة وبدء يوم جديد، دون التأثير على ديون الزبائن التاريخية.
          </p>
        </section>

        {/* Ledger Indicators */}
        <section className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-3">
          <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-teal-400" />
            <span>مؤشرات السجل الكلي</span>
          </h3>
          <Line icon={Users} label="إجمالي الزبائن المسجلين" value={`${customers.length} زبون`} />
          <Line icon={CircleCheck} label="زبائن بلا ديون (خالصين)" value={`${stats.paidCustomers} زبون`} />
          <Line icon={TrendingDown} label="زبائن لديهم رصيد دين مستحق" value={`${customers.filter((c) => c.currentDebt > 0).length} زبون`} />
          <Line icon={Clock3} label="إجمالي الحركات المعتمدة بالسجل" value={`${stats.approved} حركة`} />
        </section>
      </div>
    </div>
  );
};

const Metric = ({ label, value, currency, suffix, color = 'text-white' }) => (
  <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
    <span className="text-[11px] text-slate-400 block font-bold">{label}</span>
    <strong className={`text-lg block mt-1 font-black ${color}`}>
      {Number(value).toLocaleString()}{' '}
      {currency && <small className="text-[10px] text-slate-400">{currency}</small>}
      {suffix && <small className="text-[10px] text-slate-400">{suffix}</small>}
    </strong>
  </div>
);

const Line = ({ icon: Icon, label, value }) => (
  <div className="flex justify-between items-center p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80">
    <span className="flex items-center gap-2 text-xs text-slate-300 font-bold">
      <Icon className="w-4 h-4 text-emerald-400" />
      {label}
    </span>
    <strong className="text-xs text-white font-black">{value}</strong>
  </div>
);
