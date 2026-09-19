import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import {
  Search,
  Users,
  TrendingDown,
  TrendingUp,
  Clock,
  Calendar,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  CreditCard,
  PlusCircle,
  ReceiptText,
  UserCheck,
  X,
  Banknote,
  FileText,
  Info,
  History
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (raw) => {
  if (!raw) return '—';
  // raw can be ISO string or YYYY-MM-DD
  const d = new Date(raw.includes('T') ? raw : raw + 'T00:00:00');
  if (isNaN(d)) return raw;
  return d.toLocaleDateString('ar-IQ', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const formatDateTime = (raw) => {
  if (!raw) return '—';
  const d = new Date(raw);
  if (isNaN(d)) return raw;
  return d.toLocaleString('ar-IQ', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const timeAgo = (raw) => {
  if (!raw) return '';
  const ms = Date.now() - new Date(raw).getTime();
  const mins = Math.floor(ms / 60000);
  const hours = Math.floor(ms / 3600000);
  const days = Math.floor(ms / 86400000);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  if (mins < 1) return 'الآن';
  if (mins < 60) return `منذ ${mins} دقيقة`;
  if (hours < 24) return `منذ ${hours} ساعة`;
  if (days < 30) return `منذ ${days} يوم`;
  if (months < 12) return `منذ ${months} شهر`;
  return `منذ ${years} سنة`;
};

// ─── Customer Detail Drawer ────────────────────────────────────────────────────
const CustomerDetailDrawer = ({ customer, transactions, currency, onClose }) => {
  const custTxs = transactions
    .filter((t) => t.customerId === customer.id && t.status === 'approved')
    .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));

  const totalDebts = custTxs
    .filter((t) => t.type === 'debt')
    .reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
  const totalPayments = custTxs
    .filter((t) => t.type === 'payment')
    .reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
  const currentDebt = Math.max(0, totalDebts - totalPayments);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl glass-panel bg-slate-900 border border-slate-700 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-start justify-between gap-3 bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500/20 to-emerald-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 font-black text-xl">
              {customer.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-lg font-black text-white">{customer.name}</h3>
              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                {customer.phone && (
                  <span className="text-xs text-slate-400 dir-ltr">{customer.phone}</span>
                )}
                {customer.address && (
                  <span className="text-xs text-slate-400">📍 {customer.address}</span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Balance Summary */}
        <div className="px-5 py-4 bg-slate-950/50 border-b border-slate-800 shrink-0">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-2xl bg-rose-950/30 border border-rose-900/50">
              <span className="text-[10px] text-slate-400 block font-bold">إجمالي الديون</span>
              <strong className="text-base font-black text-rose-400 block mt-0.5">
                {totalDebts.toLocaleString()}
              </strong>
              <span className="text-[9px] text-rose-300/70">{currency}</span>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-900/50">
              <span className="text-[10px] text-slate-400 block font-bold">مجموع التسديدات</span>
              <strong className="text-base font-black text-emerald-400 block mt-0.5">
                {totalPayments.toLocaleString()}
              </strong>
              <span className="text-[9px] text-emerald-300/70">{currency}</span>
            </div>
            <div
              className={`p-3 rounded-2xl border ${
                currentDebt > 0
                  ? 'bg-amber-950/30 border-amber-900/50'
                  : 'bg-emerald-950/30 border-emerald-900/50'
              }`}
            >
              <span className="text-[10px] text-slate-400 block font-bold">الرصيد المستحق</span>
              <strong
                className={`text-base font-black block mt-0.5 ${
                  currentDebt > 0 ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                {currentDebt.toLocaleString()}
              </strong>
              <span className="text-[9px] text-slate-400">{currency}</span>
            </div>
          </div>
        </div>

        {/* Transaction Timeline */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <h4 className="text-xs font-black text-slate-300 flex items-center gap-2 mb-4">
            <History className="w-4 h-4 text-teal-400" />
            سجل الحركات المالية الكاملة ({custTxs.length} حركة)
          </h4>

          {custTxs.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-sm">
              لا توجد حركات مالية مسجلة لهذا الزبون.
            </div>
          ) : (
            custTxs.map((tx, idx) => {
              const isDebt = tx.type === 'debt';
              return (
                <div
                  key={tx.id || idx}
                  className={`rounded-2xl border p-4 space-y-2.5 ${
                    isDebt
                      ? 'bg-rose-950/15 border-rose-900/40'
                      : 'bg-emerald-950/15 border-emerald-900/40'
                  }`}
                >
                  {/* TX Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`p-1.5 rounded-xl ${
                          isDebt
                            ? 'bg-rose-500/15 text-rose-400'
                            : 'bg-emerald-500/15 text-emerald-400'
                        }`}
                      >
                        {isDebt ? (
                          <TrendingDown className="w-4 h-4" />
                        ) : (
                          <TrendingUp className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <span
                          className={`text-xs font-black ${
                            isDebt ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          {isDebt ? 'دين مضاف' : 'تسديد دفعة'}
                        </span>
                        {tx.paymentMethod && (
                          <span className="text-[10px] text-slate-500 mr-1.5">
                            ({tx.paymentMethod})
                          </span>
                        )}
                      </div>
                    </div>
                    <strong
                      className={`text-base font-black shrink-0 ${
                        isDebt ? 'text-rose-300' : 'text-emerald-300'
                      }`}
                    >
                      {isDebt ? '+' : '-'}{(tx.amount || 0).toLocaleString()}
                      <small className="text-[10px] text-slate-400 font-normal mr-1">
                        {currency}
                      </small>
                    </strong>
                  </div>

                  {/* TX Details Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    {/* Description */}
                    {tx.details && (
                      <div className="flex items-start gap-1.5 col-span-full">
                        <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                        <span className="text-slate-300">{tx.details}</span>
                      </div>
                    )}

                    {/* Transaction Date (user-entered) */}
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="text-slate-400">تاريخ الحركة:</span>
                      <span className="text-slate-200 font-semibold">{formatDate(tx.date)}</span>
                    </div>

                    {/* Exact saved timestamp */}
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="text-slate-400">وقت التسجيل:</span>
                      <span className="text-slate-200 font-semibold">
                        {formatDateTime(tx.createdAt)}
                      </span>
                    </div>

                    {/* Time ago */}
                    <div className="flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="text-teal-400/80 font-semibold">
                        {timeAgo(tx.createdAt || tx.date)}
                      </span>
                    </div>

                    {/* Created by */}
                    {tx.createdBy && (
                      <div className="flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="text-slate-400">سجله:</span>
                        <span className="text-slate-200 font-semibold">{tx.createdBy}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ─────────────────────────────────────────────────────────────────
export const WorkerDebtLedgerPage = ({ setActivePage }) => {
  const { settings } = useAuth();
  const { customers, transactions } = useData();
  const currency = settings.currency || 'د.ع';

  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('debtors'); // 'debtors' | 'all' | 'cleared'
  const [sortBy, setSortBy] = useState('highestDebt'); // 'highestDebt' | 'name' | 'recent'
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Build enriched customer list
  const enrichedCustomers = useMemo(() => {
    return customers.map((c) => {
      const custTxs = transactions.filter(
        (t) => t.customerId === c.id && t.status === 'approved'
      );
      const lastTx = custTxs
        .slice()
        .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date))[0];
      return {
        ...c,
        txCount: custTxs.length,
        lastTxDate: lastTx?.createdAt || lastTx?.date || null,
        lastTxType: lastTx?.type || null
      };
    });
  }, [customers, transactions]);

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLocaleLowerCase('ar');
    return enrichedCustomers
      .filter((c) => {
        // Text search
        const matchSearch =
          !q ||
          c.name.toLocaleLowerCase('ar').includes(q) ||
          (c.phone && c.phone.includes(q)) ||
          (c.address && c.address.toLocaleLowerCase('ar').includes(q));
        if (!matchSearch) return false;

        // Filter
        if (filterMode === 'debtors') return (c.currentDebt || 0) > 0;
        if (filterMode === 'cleared') return (c.currentDebt || 0) === 0;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'highestDebt') return (b.currentDebt || 0) - (a.currentDebt || 0);
        if (sortBy === 'name') return a.name.localeCompare(b.name, 'ar');
        if (sortBy === 'recent')
          return new Date(b.lastTxDate || 0) - new Date(a.lastTxDate || 0);
        return 0;
      });
  }, [enrichedCustomers, searchQuery, filterMode, sortBy]);

  const totalDebtShown = filteredCustomers.reduce(
    (s, c) => s + (parseFloat(c.currentDebt) || 0),
    0
  );
  const debtorCount = customers.filter((c) => (c.currentDebt || 0) > 0).length;

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <ReceiptText className="w-6 h-6" />
            </div>
            <span>سجل ديون الزبائن</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            قائمة شاملة بجميع الزبائن وديونهم — ابحث وتحقق من تفاصيل أي دين أو تسديد بدقة كاملة
          </p>
        </div>

        {/* Quick action */}
        <button
          onClick={() => setActivePage('add-debt')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-xs shadow-lg shadow-rose-950/60 transition-all active:scale-95 shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>تسجيل دين جديد</span>
        </button>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card rounded-2xl p-3 border border-slate-800 text-center">
          <span className="text-[10px] text-slate-400 font-bold block">جميع الزبائن</span>
          <strong className="text-xl font-black text-white">{customers.length}</strong>
        </div>
        <div className="glass-card rounded-2xl p-3 border border-rose-900/40 text-center">
          <span className="text-[10px] text-slate-400 font-bold block">عليهم ديون</span>
          <strong className="text-xl font-black text-rose-400">{debtorCount}</strong>
        </div>
        <div className="glass-card rounded-2xl p-3 border border-amber-900/40 text-center">
          <span className="text-[10px] text-slate-400 font-bold block">مجموع الديون</span>
          <strong className="text-base font-black text-amber-400">
            {transactions
              .filter((t) => t.status === 'approved' && t.type === 'debt')
              .reduce((s, t) => s + (parseFloat(t.amount) || 0), 0) -
              transactions
                .filter((t) => t.status === 'approved' && t.type === 'payment')
                .reduce((s, t) => s + (parseFloat(t.amount) || 0), 0) > 0
              ? (
                  transactions
                    .filter((t) => t.status === 'approved' && t.type === 'debt')
                    .reduce((s, t) => s + (parseFloat(t.amount) || 0), 0) -
                  transactions
                    .filter((t) => t.status === 'approved' && t.type === 'payment')
                    .reduce((s, t) => s + (parseFloat(t.amount) || 0), 0)
                ).toLocaleString()
              : '0'}
          </strong>
          <span className="text-[9px] text-amber-300/70 block">{currency}</span>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="glass-panel rounded-3xl p-4 border border-slate-800 space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-3 text-slate-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <input
            type="text"
            placeholder="ابحث بالاسم أو الهاتف أو المنطقة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-9 py-3 rounded-2xl glass-input text-sm font-semibold focus:ring-2 focus:ring-teal-500"
            autoComplete="off"
          />
        </div>

        {/* Filter + Sort Row */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Filter Chips */}
          <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs">
            {[
              { id: 'debtors', label: `عليهم ديون (${debtorCount})`, color: 'bg-rose-600 text-white' },
              { id: 'all', label: `الكل (${customers.length})`, color: 'bg-slate-700 text-white' },
              {
                id: 'cleared',
                label: `خالصين (${customers.length - debtorCount})`,
                color: 'bg-emerald-600/80 text-white'
              }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterMode(f.id)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  filterMode === f.id ? f.color : 'text-slate-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 outline-none cursor-pointer"
          >
            <option value="highestDebt" className="bg-slate-900">الأعلى ديناً</option>
            <option value="name" className="bg-slate-900">أبجدياً</option>
            <option value="recent" className="bg-slate-900">آخر نشاط</option>
          </select>
        </div>
      </div>

      {/* Results Count */}
      {searchQuery && (
        <p className="text-xs text-slate-400 px-1">
          نتائج البحث:{' '}
          <strong className="text-white">{filteredCustomers.length}</strong> زبون
          {filteredCustomers.length > 0 && (
            <span className="mr-1">
              — إجمالي الديون: <strong className="text-rose-400">{totalDebtShown.toLocaleString()} {currency}</strong>
            </span>
          )}
        </p>
      )}

      {/* Customer Cards */}
      {filteredCustomers.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center text-slate-500 text-sm border border-slate-800">
          {searchQuery
            ? `لا يوجد زبائن يطابقون "${searchQuery}"`
            : 'لا يوجد زبائن في هذه الفئة'}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCustomers.map((cust) => {
            const hasDebt = (cust.currentDebt || 0) > 0;
            return (
              <button
                key={cust.id}
                onClick={() => setSelectedCustomer(cust)}
                className={`w-full text-right rounded-2xl border p-4 transition-all active:scale-[0.99] hover:scale-[1.005] group ${
                  hasDebt
                    ? 'glass-card border-rose-900/30 hover:border-rose-500/40'
                    : 'glass-card border-slate-800 hover:border-emerald-500/30'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  {/* Avatar + Info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-lg shrink-0 ${
                        hasDebt
                          ? 'bg-rose-500/15 text-rose-400 border border-rose-500/25'
                          : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                      }`}
                    >
                      {cust.name.charAt(0)}
                    </div>
                    <div className="min-w-0 text-right">
                      <div className="text-sm font-black text-white truncate">{cust.name}</div>
                      <div className="flex items-center gap-2 flex-wrap mt-0.5">
                        {cust.phone && (
                          <span className="text-[11px] text-slate-400 dir-ltr">{cust.phone}</span>
                        )}
                        {cust.address && (
                          <span className="text-[11px] text-slate-500">📍 {cust.address}</span>
                        )}
                      </div>
                      {cust.lastTxDate && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-600" />
                          <span className="text-[10px] text-slate-500">
                            {timeAgo(cust.lastTxDate)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Debt + Tx Count */}
                  <div className="text-left shrink-0">
                    {hasDebt ? (
                      <>
                        <div className="text-lg font-black text-rose-400 leading-tight">
                          {(cust.currentDebt || 0).toLocaleString()}
                        </div>
                        <div className="text-[10px] text-rose-300/70 text-left">{currency}</div>
                      </>
                    ) : (
                      <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>خالص</span>
                      </div>
                    )}
                    <div className="text-[10px] text-slate-500 text-left mt-0.5">
                      {cust.txCount} حركة
                    </div>
                  </div>

                  {/* Arrow */}
                  <ChevronDown className="w-4 h-4 text-slate-600 shrink-0 group-hover:text-teal-400 transition-colors -rotate-90" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Customer Detail Drawer */}
      {selectedCustomer && (
        <CustomerDetailDrawer
          customer={selectedCustomer}
          transactions={transactions}
          currency={currency}
          onClose={() => setSelectedCustomer(null)}
        />
      )}
    </div>
  );
};
