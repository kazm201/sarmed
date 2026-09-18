import React from 'react';
import { Printer, Share2, X, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const PrintInvoice = ({ transaction, customer, customerTransactions = [], mode = 'receipt', onClose }) => {
  const { settings } = useAuth();

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    if (!customer?.phone) {
      alert('لا يوجد رقم هاتف مسجل لهذا الزبون');
      return;
    }

    let text = '';
    if (mode === 'receipt' && transaction) {
      text = `*سند ${transaction.type === 'debt' ? 'تسجيل دين' : 'تسديد دفعة'}*\n` +
        `🏬 *${settings.storeName}*\n` +
        `👤 الزبون: ${customer.name}\n` +
        `💵 المبلغ: ${transaction.amount.toLocaleString()} ${settings.currency}\n` +
        `📅 التاريخ: ${transaction.date}\n` +
        `📝 التفاصيل: ${transaction.details || '-'}\n` +
        `💰 الرصيد الحالي المتبقي: ${(customer.currentDebt || 0).toLocaleString()} ${settings.currency}\n` +
        `_شكراً لتعاملكم معنا!_`;
    } else {
      text = `*كشف حساب ديون*\n` +
        `🏬 *${settings.storeName}*\n` +
        `👤 الزبون: ${customer.name}\n` +
        `📞 الهاتف: ${customer.phone || '-'}\n` +
        `💰 إجمالي الرصيد المتبقي: ${(customer.currentDebt || 0).toLocaleString()} ${settings.currency}\n` +
        `📅 تاريخ الكشف: ${new Date().toLocaleDateString('ar-EG')}\n` +
        `_يرجى مراجعة الكشف وتسديد المتبقي في أقرب وقت._`;
    }

    const cleanPhone = customer.phone.replace(/[^0-9]/g, '');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-3xl glass-panel bg-slate-900 border border-slate-700 p-6 shadow-modal">
        {/* Controls Bar */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800 no-print">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Printer className="w-5 h-5 text-emerald-400" />
            <span>{mode === 'receipt' ? 'معاينة سند العملية' : 'معاينة كشف الحساب التفصيلي'}</span>
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleWhatsAppShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all"
            >
              <Share2 className="w-4 h-4" />
              <span>إرسال واتساب</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/40 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة فورية</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Area (Styled cleanly in black & white when printed, modern dark on screen) */}
        <div id="printable-area" className="bg-slate-950 p-6 rounded-2xl border border-slate-800 text-slate-100 text-right print:text-black print:bg-white print:border-none">
          {/* Header */}
          <div className="text-center pb-4 mb-4 border-b border-slate-800 print:border-black">
            <h2 className="text-xl font-black text-emerald-400 print:text-black">
              {settings.storeName || 'سوبرماركت البركة'}
            </h2>
            <p className="text-xs text-slate-400 print:text-gray-600 mt-1">
              {settings.storeAddress} - هاتف: {settings.storePhone}
            </p>
            <div className="inline-block mt-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 print:bg-transparent print:text-black text-xs font-bold border border-emerald-500/30 print:border-black">
              {mode === 'receipt'
                ? transaction?.type === 'debt'
                  ? 'سند تسجيل دين'
                  : 'سند تسديد دفعة'
                : 'كشف حساب زبون تفصيلي'}
            </div>
          </div>

          {/* Customer Meta */}
          <div className="grid grid-cols-2 gap-3 text-xs mb-4 bg-slate-900/60 print:bg-gray-100 p-3 rounded-xl">
            <div>
              <span className="text-slate-400 print:text-gray-600">اسم الزبون: </span>
              <strong className="text-white print:text-black">{customer?.name}</strong>
            </div>
            <div>
              <span className="text-slate-400 print:text-gray-600">رقم الهاتف: </span>
              <strong className="text-white print:text-black">{customer?.phone || 'غير مسجل'}</strong>
            </div>
            <div>
              <span className="text-slate-400 print:text-gray-600">تاريخ السند: </span>
              <span className="text-slate-200 print:text-black">
                {transaction?.date || new Date().toLocaleDateString('ar-EG')}
              </span>
            </div>
            <div>
              <span className="text-slate-400 print:text-gray-600">منفذ الحركة: </span>
              <span className="text-slate-200 print:text-black">{transaction?.createdBy || 'المدير'}</span>
            </div>
          </div>

          {/* Single Transaction Receipt Mode */}
          {mode === 'receipt' && transaction && (
            <div className="space-y-3 py-2 border-b border-slate-800 print:border-black">
              <div className="flex justify-between items-center py-2 px-3 rounded-xl bg-slate-900 print:bg-gray-200">
                <span className="text-xs font-bold text-slate-300 print:text-black">
                  {transaction.type === 'debt' ? 'مبلغ الدين الجديد:' : 'المبلغ المسدد:'}
                </span>
                <span className="text-lg font-black text-emerald-400 print:text-black">
                  {transaction.amount.toLocaleString()} {settings.currency}
                </span>
              </div>
              <div className="text-xs text-slate-300 print:text-black">
                <span className="text-slate-400 print:text-gray-600">البيان والتفاصيل: </span>
                <span>{transaction.details || 'بضاعة متنوعة'}</span>
              </div>
              <div className="flex justify-between items-center pt-2 text-xs font-bold">
                <span className="text-slate-400 print:text-gray-600">الرصيد المتبقي على الزبون:</span>
                <span className="text-sm font-black text-rose-400 print:text-black">
                  {(customer?.currentDebt || 0).toLocaleString()} {settings.currency}
                </span>
              </div>
            </div>
          )}

          {/* Detailed Statement Mode */}
          {mode === 'statement' && (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 print:border-black bg-slate-900/80 print:bg-gray-200">
                      <th className="py-2 px-2">التاريخ</th>
                      <th className="py-2 px-2">نوع الحركة</th>
                      <th className="py-2 px-2">التفاصيل</th>
                      <th className="py-2 px-2 text-left">المبلغ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 print:divide-black">
                    {customerTransactions.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="py-4 text-center text-slate-500">
                          لا توجد حركات مسجلة لهذا الحساب
                        </td>
                      </tr>
                    ) : (
                      customerTransactions.map((tx) => (
                        <tr key={tx.id} className="text-[11px]">
                          <td className="py-2 px-2">{tx.date}</td>
                          <td className="py-2 px-2 font-bold">
                            <span
                              className={
                                tx.type === 'debt' ? 'text-rose-400 print:text-black' : 'text-emerald-400 print:text-black'
                              }
                            >
                              {tx.type === 'debt' ? 'دين (+)' : 'تسديد (-)'}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-slate-300 print:text-black">{tx.details || '-'}</td>
                          <td className="py-2 px-2 text-left font-black">
                            {tx.amount.toLocaleString()} {settings.currency}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Total Balance Summary Box */}
              <div className="p-3.5 rounded-xl bg-slate-900 print:bg-gray-200 flex justify-between items-center border border-slate-800 print:border-black">
                <span className="text-xs font-bold text-slate-200 print:text-black">
                  إجمالي الرصيد المستحق الحالي:
                </span>
                <span className="text-base font-black text-rose-400 print:text-black">
                  {(customer?.currentDebt || 0).toLocaleString()} {settings.currency}
                </span>
              </div>
            </div>
          )}

          {/* Footer & Signature */}
          <div className="mt-8 pt-4 border-t border-slate-800 print:border-black flex justify-between items-center text-[10px] text-slate-500 print:text-gray-700">
            <div>توقيع الزبون: ........................</div>
            <div>ختم وإدارة السوبرماركت: ........................</div>
          </div>
        </div>
      </div>
    </div>
  );
};
