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
  Phone,
  Download
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const CustomerDebtPdfModal = ({ customers = [], onClose }) => {
  const { settings } = useAuth();
  const [filterMode, setFilterMode] = useState('debtorsOnly'); // 'debtorsOnly' | 'all'
  const [isPrinting, setIsPrinting] = useState(false);

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

  const storeName = settings.storeName || 'سوبرماركت سرمد';
  const currency = settings.currency || 'د.ع';

  // ─── Build full print HTML in dedicated window ──────────────────────────────
  const handlePrintPdf = () => {
    setIsPrinting(true);

    const tableRows = displayedCustomers
      .map(
        (cust, idx) => {
          const hasDebt = (cust.currentDebt || 0) > 0;
          const debtColor = hasDebt ? '#dc2626' : '#16a34a';
          const statusBg = hasDebt ? '#fef2f2' : '#f0fdf4';
          const statusColor = hasDebt ? '#b91c1c' : '#15803d';
          const statusText = hasDebt ? 'مدين' : 'خالص';
          return `
            <tr style="border-bottom:1px solid #e5e7eb;">
              <td style="padding:10px 8px;text-align:center;color:#6b7280;font-weight:bold;">${idx + 1}</td>
              <td style="padding:10px 8px;font-weight:bold;color:#111827;">${cust.name || '—'}</td>
              <td style="padding:10px 8px;color:#6b7280;direction:ltr;text-align:right;">${cust.phone || '—'}</td>
              <td style="padding:10px 8px;color:#6b7280;max-width:130px;overflow:hidden;">${cust.address || '—'}</td>
              <td style="padding:10px 8px;text-align:left;">
                <strong style="font-size:15px;color:${debtColor};">${(cust.currentDebt || 0).toLocaleString()}</strong>
                <small style="font-size:10px;color:#9ca3af;margin-right:3px;">${currency}</small>
              </td>
              <td style="padding:10px 8px;text-align:center;">
                <span style="display:inline-block;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:bold;background:${statusBg};color:${statusColor};">
                  ${statusText}
                </span>
              </td>
            </tr>`;
        }
      )
      .join('');

    const displayedTotal = displayedCustomers
      .reduce((sum, c) => sum + (parseFloat(c.currentDebt) || 0), 0);

    const printHtml = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>كشف ديون الزبائن — ${storeName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Cairo', 'Segoe UI', Arial, sans-serif;
      direction: rtl;
      background: #ffffff;
      color: #111827;
      padding: 28px 32px;
    }
    .header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding-bottom: 18px;
      border-bottom: 2px solid #e5e7eb;
      margin-bottom: 22px;
    }
    .store-name {
      font-size: 22px;
      font-weight: 900;
      color: #111827;
      margin-bottom: 4px;
    }
    .store-sub { font-size: 12px; color: #6b7280; }
    .badge {
      display: inline-block;
      background: #fee2e2;
      color: #991b1b;
      border: 1px solid #fca5a5;
      border-radius: 20px;
      padding: 3px 12px;
      font-size: 12px;
      font-weight: 700;
      margin-bottom: 6px;
    }
    .date-info { font-size: 12px; color: #6b7280; line-height: 1.8; text-align: left; }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 22px;
    }
    .kpi-card {
      border-radius: 12px;
      padding: 12px 14px;
      text-align: center;
      border: 1px solid #e5e7eb;
    }
    .kpi-label { font-size: 11px; color: #6b7280; font-weight: 600; margin-bottom: 4px; }
    .kpi-value { font-size: 20px; font-weight: 900; }
    .kpi-unit { font-size: 10px; color: #9ca3af; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    thead th {
      background: #1e293b;
      color: #f8fafc;
      font-weight: 700;
      padding: 10px 8px;
      text-align: right;
    }
    thead th:first-child { text-align: center; }
    thead th:last-child { text-align: center; }
    tbody tr:nth-child(even) { background: #f9fafb; }
    tfoot td {
      background: #f1f5f9;
      font-weight: 700;
      padding: 10px 8px;
      border-top: 2px solid #cbd5e1;
    }
    .footer {
      margin-top: 28px;
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 11px;
      color: #9ca3af;
    }
    .signature-area { text-align: center; }
    .signature-line {
      width: 130px;
      border-bottom: 1px dashed #9ca3af;
      margin-top: 24px;
    }
    @media print {
      body { padding: 16px 20px; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="store-name">${storeName}</div>
      <div class="store-sub">
        ${settings.phone ? `هاتف: ${settings.phone}` : 'نظام إدارة الحسابات والديون'}
        ${settings.address ? ` • ${settings.address}` : ''}
      </div>
    </div>
    <div style="text-align:left;">
      <div class="badge">كشف ديون ومستحقات الزبائن</div>
      <div class="date-info">
        <div>التاريخ: <strong style="color:#111827;">${printDate}</strong></div>
        <div>الوقت: <strong style="color:#111827;">${printTime}</strong></div>
      </div>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi-card" style="background:#fff5f5;border-color:#fca5a5;">
      <div class="kpi-label">إجمالي ديون السوق</div>
      <div class="kpi-value" style="color:#dc2626;">${totalDebt.toLocaleString()}</div>
      <div class="kpi-unit">${currency}</div>
    </div>
    <div class="kpi-card" style="background:#f8fafc;border-color:#e2e8f0;">
      <div class="kpi-label">عدد الزبائن الكلي</div>
      <div class="kpi-value" style="color:#111827;">${customers.length}</div>
      <div class="kpi-unit">زبون مسجل</div>
    </div>
    <div class="kpi-card" style="background:#fffbeb;border-color:#fde68a;">
      <div class="kpi-label">زبائن عليهم ديون</div>
      <div class="kpi-value" style="color:#d97706;">${debtorCount}</div>
      <div class="kpi-unit">زبون مدين</div>
    </div>
    <div class="kpi-card" style="background:#f0fdf4;border-color:#86efac;">
      <div class="kpi-label">حسابات خالصة</div>
      <div class="kpi-value" style="color:#16a34a;">${clearedCount}</div>
      <div class="kpi-unit">مسدد بالكامل</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:40px;text-align:center;">#</th>
        <th>اسم الزبون</th>
        <th>رقم الهاتف</th>
        <th>العنوان / المنطقة</th>
        <th style="text-align:left;">مبلغ الدين المطلوب</th>
        <th style="text-align:center;">حالة الحساب</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows || `<tr><td colspan="6" style="padding:24px;text-align:center;color:#9ca3af;">لا يوجد زبائن مطابقين</td></tr>`}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="4" style="text-align:right;color:#374151;">المجموع الكلي للديون المعروضة (${displayedCustomers.length} زبون):</td>
        <td style="text-align:left;color:#dc2626;font-size:16px;">${displayedTotal.toLocaleString()} <small style="font-size:11px;color:#6b7280;">${currency}</small></td>
        <td></td>
      </tr>
    </tfoot>
  </table>

  <div class="footer">
    <div>تم استخراج هذا التقرير تلقائياً من نظام ديون ${storeName}.</div>
    <div class="signature-area">
      <div style="font-size:11px;color:#9ca3af;">توقيع / ختم صاحب السوبرماركت</div>
      <div class="signature-line"></div>
    </div>
  </div>

  <script>
    window.onload = function() {
      window.print();
      setTimeout(function() { window.close(); }, 1000);
    };
  </script>
</body>
</html>`;

    const printWin = window.open('', '_blank', 'width=900,height=700,scrollbars=yes');
    if (printWin) {
      printWin.document.write(printHtml);
      printWin.document.close();
    } else {
      alert('يرجى السماح بالنوافذ المنبثقة لهذا الموقع لتشغيل تحميل PDF');
    }
    setIsPrinting(false);
  };

  const handleWhatsAppShare = () => {
    const debtorsList = customers
      .filter((c) => (c.currentDebt || 0) > 0)
      .sort((a, b) => (b.currentDebt || 0) - (a.currentDebt || 0))
      .slice(0, 30)
      .map((c, i) => `${i + 1}. ${c.name}: ${(c.currentDebt || 0).toLocaleString()} ${currency}`)
      .join('\n');

    const text = `📊 *كشف ديون الزبائن — ${storeName}*\n` +
      `📅 التاريخ: ${printDate}\n` +
      `💰 إجمالي الديون بالسوق: ${totalDebt.toLocaleString()} ${currency}\n` +
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
        {/* Modal Controls Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <FileDown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">
                تصدير وتحميل كشف ديون الزبائن (PDF)
              </h3>
              <p className="text-xs text-slate-400">
                تقرير شامل جاهز للحفظ بصيغة PDF — يفتح في نافذة مستقلة للطباعة والحفظ
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

            {/* Download / Print PDF Button */}
            <button
              type="button"
              onClick={handlePrintPdf}
              disabled={isPrinting}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-black shadow-lg shadow-rose-950/60 transition-all active:scale-95 disabled:opacity-60"
            >
              <Download className="w-4 h-4" />
              <span>تحميل PDF</span>
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

        {/* Preview Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950">
          <div className="max-w-3xl mx-auto space-y-4">

            {/* Info Banner */}
            <div className="p-3.5 rounded-2xl bg-blue-950/50 border border-blue-800/50 text-blue-300 text-xs flex items-start gap-2.5">
              <Printer className="w-4 h-4 shrink-0 mt-0.5 text-blue-400" />
              <span>
                اضغط <strong>"تحميل PDF"</strong> أعلاه ليفتح التقرير في نافذة طباعة مستقلة — اختر <strong>"حفظ كـ PDF"</strong> من قائمة الطابعات لحفظه كملف.
              </span>
            </div>

            {/* Summary KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-2xl bg-rose-950/30 border border-rose-900/50">
                <span className="text-[10px] sm:text-xs text-slate-400 block font-bold">إجمالي ديون السوق</span>
                <strong className="text-sm sm:text-lg font-black text-rose-400 block mt-0.5">
                  {totalDebt.toLocaleString()}
                </strong>
                <span className="text-[9px] text-rose-300/80">{currency}</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700">
                <span className="text-[10px] sm:text-xs text-slate-400 block font-bold">عدد الزبائن الكلي</span>
                <strong className="text-sm sm:text-lg font-black text-white block mt-0.5">
                  {customers.length}
                </strong>
                <span className="text-[9px] text-slate-400">زبون مسجل</span>
              </div>
              <div className="p-3 rounded-2xl bg-amber-950/30 border border-amber-900/50">
                <span className="text-[10px] sm:text-xs text-slate-400 block font-bold">زبائن مدينون</span>
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

            {/* Customers List Preview */}
            <div className="overflow-x-auto rounded-2xl border border-slate-700/80">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-800 text-slate-200 font-black border-b border-slate-700">
                  <tr>
                    <th className="p-3 w-10 text-center">#</th>
                    <th className="p-3">اسم الزبون</th>
                    <th className="p-3">رقم الهاتف</th>
                    <th className="p-3 hidden md:table-cell">العنوان</th>
                    <th className="p-3 text-left">مبلغ الدين</th>
                    <th className="p-3 text-center">الحالة</th>
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
                            {cust.phone || '—'}
                          </td>
                          <td className="p-3 text-slate-400 truncate max-w-[120px] hidden md:table-cell">
                            {cust.address || '—'}
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
                              {currency}
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
                    <td colSpan={4} className="p-3 font-black text-right hidden md:table-cell">
                      المجموع الكلي للديون المعروضة ({displayedCustomers.length} زبون):
                    </td>
                    <td colSpan={3} className="p-3 font-black text-right md:hidden">
                      الإجمالي ({displayedCustomers.length} زبون):
                    </td>
                    <td className="p-3 text-left hidden md:table-cell">
                      <strong className="text-base font-black text-rose-400">
                        {displayedCustomers
                          .reduce((sum, c) => sum + (parseFloat(c.currentDebt) || 0), 0)
                          .toLocaleString()}
                      </strong>{' '}
                      <small className="text-xs text-slate-300">{currency}</small>
                    </td>
                    <td className="p-3 text-center hidden md:table-cell text-slate-400">
                      {displayedCustomers.length} زبون
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
