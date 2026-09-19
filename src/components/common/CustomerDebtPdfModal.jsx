import React, { useState } from 'react';
import {
  Printer,
  FileDown,
  Share2,
  X,
  Users,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  Filter,
  Building2,
  Calendar,
  Phone
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const CustomerDebtPdfModal = ({ customers = [], onClose }) => {
  const { settings } = useAuth();
  const [filterMode, setFilterMode] = useState('debtorsOnly'); // 'debtorsOnly' | 'all'

  // Prepared data
  const displayedCustomers = customers
    .filter((c) => {
      if (filterMode === 'debtorsOnly') return (c.currentDebt || 0) > 0;
      return true;
    })
    .sort((a, b) => (b.currentDebt || 0) - (a.currentDebt || 0));

  const totalDebt = customers.reduce((sum, c) => sum + (parseFloat(c.currentDebt) || 0), 0);
  const debtorCount = customers.filter((c) => (parseFloat(c.currentDebt) || 0) > 0).length;
  const clearedCount = customers.length - debtorCount;
  const printDate = new Date().toLocaleDateString('ar-IQ', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const printTime = new Date().toLocaleTimeString('ar-IQ', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    const debtorsList = customers
      .filter((c) => (c.currentDebt || 0) > 0)
      .sort((a, b) => (b.currentDebt || 0) - (a.currentDebt || 0))
      .slice(0, 30)
      .map((c, i) => `${i + 1}. ${c.name}: ${(c.currentDebt || 0).toLocaleString()} ${settings.currency}`)
      .join('\n');

    const text = `📊 *كشف ديون الزبائن — ${settings.storeName || 'السوبرماركت'}*\n` +
      `📅 التاريخ: ${printDate}\n` +
      `💰 إجمالي الديون بالسوق: ${totalDebt.toLocaleString()} ${settings.currency}\n` +
      `👥 عدد الزبائن المدينين: ${debtorCount} زبون\n` +
      `━━━━━━━━━━━━━━━\n` +
      `*أبرز ديون الزبائن:*\n` +
      debtorsList +
      (debtorCount > 30 ? `\n...والمزيد (${debtorCount - 30} زبون آخرين)` : '');

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-3xl glass-panel bg-slate-900 border border-slate-700 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Controls Header (no-print) */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950/80 no-print">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <FileDown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">
                تصدير وتحميل كشف ديون الزبائن (PDF)
              </h3>
              <p className="text-xs text-slate-400">
                تقرير شامل وجاهز للطباعة والحفظ بصيغة PDF
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Toggle */}
            <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setFilterMode('debtorsOnly')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  filterMode === 'debtorsOnly'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                المدينين فقط ({debtorCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  filterMode === 'all'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                جميع الزبائن ({customers.length})
              </button>
            </div>

            {/* WhatsApp Summary Share */}
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all"
              title="مشاركة الملخص عبر واتساب"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">واتساب</span>
            </button>

            {/* Print / Save as PDF Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-black shadow-lg shadow-rose-950/60 transition-all active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة / حفظ PDF</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Area Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-950 text-slate-100">
          <div
            id="printable-area"
            className="max-w-3xl mx-auto p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 text-slate-100 space-y-6 shadow-xl"
          >
            {/* Report Header */}
            <div className="flex flex-col sm:flex-row items-center justify-between pb-6 border-b-2 border-slate-700/80 gap-4 text-center sm:text-right">
              <div>
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                  <Building2 className="w-6 h-6 text-emerald-400" />
                  <h1 className="text-xl sm:text-2xl font-black text-white">
                    {settings.storeName || 'سوبرماركت سرمد'}
                  </h1>
                </div>
                <p className="text-xs text-slate-400">
                  {settings.phone ? `هاتف المتجر: ${settings.phone}` : 'نظام إدارة الحسابات والديون'}
                  {settings.address ? ` • ${settings.address}` : ''}
                </p>
              </div>

              <div className="text-center sm:text-left bg-slate-950/60 sm:bg-transparent p-3 rounded-2xl sm:p-0 border sm:border-0 border-slate-800">
                <span className="inline-block px-3 py-1 rounded-xl bg-rose-500/15 text-rose-300 border border-rose-500/30 text-xs font-black mb-1.5">
                  كشف ديون ومستحقات الزبائن
                </span>
                <div className="text-[11px] text-slate-400 space-y-0.5">
                  <div>التاريخ: <strong className="text-slate-200">{printDate}</strong></div>
                  <div>الوقت: <strong className="text-slate-200">{printTime}</strong></div>
                </div>
              </div>
            </div>

            {/* Financial KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-2xl bg-rose-950/30 border border-rose-900/50">
                <span className="text-[10px] sm:text-xs text-slate-400 block font-bold">إجمالي ديون السوق</span>
                <strong className="text-sm sm:text-lg font-black text-rose-400 block mt-0.5">
                  {totalDebt.toLocaleString()}
                </strong>
                <span className="text-[9px] text-rose-300/80">{settings.currency}</span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700">
                <span className="text-[10px] sm:text-xs text-slate-400 block font-bold">عدد الزبائن الكلي</span>
                <strong className="text-sm sm:text-lg font-black text-white block mt-0.5">
                  {customers.length}
                </strong>
                <span className="text-[9px] text-slate-400">زبون مسجل</span>
              </div>

              <div className="p-3 rounded-2xl bg-amber-950/30 border border-amber-900/50">
                <span className="text-[10px] sm:text-xs text-slate-400 block font-bold">زبائن عليهم ديون</span>
                <strong className="text-sm sm:text-lg font-black text-amber-400 block mt-0.5">
                  {debtorCount}
                </strong>
                <span className="text-[9px] text-amber-300/80">زبون مدين</span>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-900/50">
                <span className="text-[10px] sm:text-xs text-slate-400 block font-bold">حسابات خالصة</span>
                <strong className="text-sm sm:text-lg font-black text-emerald-400 block mt-0.5">
                  {clearedCount}
                </strong>
                <span className="text-[9px] text-emerald-300/80">مسدد بالكامل</span>
              </div>
            </div>

            {/* Customers Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-700/80">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-800 text-slate-200 font-black border-b border-slate-700">
                  <tr>
                    <th className="p-3 w-10 text-center">#</th>
                    <th className="p-3">اسم الزبون</th>
                    <th className="p-3">رقم الهاتف</th>
                    <th className="p-3">العنوان / المنطقة</th>
                    <th className="p-3 text-left">مبلغ الدين المطلوب</th>
                    <th className="p-3 text-center">حالة الحساب</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-medium text-slate-300">
                  {displayedCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        لا يوجد زبائن مطابقين لمعيار العرض المختار.
                      </td>
                    </tr>
                  ) : (
                    displayedCustomers.map((cust, idx) => {
                      const hasDebt = (cust.currentDebt || 0) > 0;
                      return (
                        <tr
                          key={cust.id}
                          className={hasDebt ? 'hover:bg-rose-950/10' : 'hover:bg-slate-800/40'}
                        >
                          <td className="p-3 text-center font-bold text-slate-500">{idx + 1}</td>
                          <td className="p-3 font-bold text-white">{cust.name}</td>
                          <td className="p-3 text-slate-400 dir-ltr text-right">
                            {cust.phone || '-'}
                          </td>
                          <td className="p-3 text-slate-400 truncate max-w-[120px]">
                            {cust.address || '-'}
                          </td>
                          <td className="p-3 text-left">
                            <strong
                              className={`font-black text-sm ${
                                hasDebt ? 'text-rose-400' : 'text-emerald-400'
                              }`}
                            >
                              {(cust.currentDebt || 0).toLocaleString()}
                            </strong>
                            <small className="text-[10px] text-slate-400 mr-1">
                              {settings.currency}
                            </small>
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                                hasDebt
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              }`}
                            >
                              {hasDebt ? 'مدين' : 'خالص'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot className="bg-slate-800/90 font-bold border-t-2 border-slate-700 text-slate-200">
                  <tr>
                    <td colSpan={4} className="p-3 text-left font-black">
                      المجموع الكلي للديون المعروضة:
                    </td>
                    <td className="p-3 text-left">
                      <strong className="text-base font-black text-rose-400">
                        {displayedCustomers
                          .reduce((sum, c) => sum + (parseFloat(c.currentDebt) || 0), 0)
                          .toLocaleString()}
                      </strong>{' '}
                      <small className="text-xs text-slate-300">{settings.currency}</small>
                    </td>
                    <td className="p-3 text-center text-slate-400">
                      {displayedCustomers.length} زبون
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Document Footer */}
            <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
              <div>
                <span>تم استخراج هذا التقرير تلقائياً من نظام ديون {settings.storeName || 'سوبرماركت سرمد'}.</span>
              </div>
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <span className="block text-[11px] text-slate-400">توقيع / ختم صاحب السوبرماركت</span>
                  <div className="w-32 h-10 border-b border-dashed border-slate-600 mt-2"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
