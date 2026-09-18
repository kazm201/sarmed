import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import {
  CheckSquare,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  User,
  Image as ImageIcon,
  Check,
  X,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

export const ApprovalsPage = () => {
  const { isManager, settings } = useAuth();
  const {
    transactions,
    pendingApprovals,
    approveTransaction,
    rejectTransaction
  } = useData();

  const [rejectingTxId, setRejectingTxId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [viewingPhoto, setViewingPhoto] = useState(null);

  // History of completed review decisions
  const reviewHistory = transactions
    .filter((t) => t.status === 'approved' || t.status === 'rejected')
    .slice(0, 15);

  const handleApprove = async (txId) => {
    await approveTransaction(txId);
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectingTxId) return;

    await rejectTransaction(rejectingTxId, rejectReason || 'لم يتم التوضيح');
    setRejectingTxId(null);
    setRejectReason('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <CheckSquare className="w-6 h-6" />
            </div>
            <span>طلبات المراجعة والموافقة للمدير</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            معاينة العمليات والحركات المالية التي سجلها العمال واعتمادها أو رفضها
          </p>
        </div>

        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>صلاحية حصرية للمدير</span>
        </div>
      </div>

      {/* Pending Approvals Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" />
            <span>الحركات بانتظار المراجعة ({pendingApprovals.length})</span>
          </h3>
          {pendingApprovals.length > 0 && (
            <span className="text-xs text-amber-300 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 animate-pulse">
              يتطلب إجراء سريع
            </span>
          )}
        </div>

        {pendingApprovals.length === 0 ? (
          <div className="glass-panel rounded-3xl p-10 text-center text-slate-400 border border-slate-800 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">لا توجد طلبات معلقة حالياً!</h4>
              <p className="text-xs text-slate-500 mt-1">
                جميع العمليات المسجلة من العمال معتمدة ومحدثة في سجلات الزبائن.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingApprovals.map((tx) => {
              const isDebt = tx.type === 'debt';
              return (
                <div
                  key={tx.id}
                  className="glass-card rounded-3xl p-5 border border-amber-500/40 bg-gradient-to-br from-slate-900 via-slate-850 to-amber-950/20 shadow-xl flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header: Customer & Type Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`p-2.5 rounded-xl ${
                            isDebt
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {isDebt ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">{tx.customerName}</h4>
                          <span className="text-[11px] text-slate-400">
                            {isDebt ? 'طلب إضافة دين جديد' : 'طلب توثيق تسديد دفعة'}
                          </span>
                        </div>
                      </div>

                      <div className="text-left">
                        <span
                          className={`text-lg font-black ${
                            isDebt ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          {tx.amount.toLocaleString()}{' '}
                          <span className="text-xs font-normal">{settings.currency}</span>
                        </span>
                      </div>
                    </div>

                    {/* Details and Worker info */}
                    <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs space-y-1.5">
                      <div className="flex justify-between text-slate-400">
                        <span>المرسل (العامل):</span>
                        <strong className="text-slate-200">{tx.createdBy}</strong>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>تاريخ الحركة:</span>
                        <span className="text-slate-200">{tx.date}</span>
                      </div>
                      <div className="text-slate-300 pt-1 border-t border-slate-800/60">
                        <span className="text-slate-500">التفاصيل: </span>
                        <span>{tx.details || 'بضاعة مشتريات'}</span>
                      </div>

                      {/* Photo Attachment if available */}
                      {tx.invoicePhoto && (
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => setViewingPhoto(tx.invoicePhoto)}
                            className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-bold"
                          >
                            <ImageIcon className="w-4 h-4" />
                            <span>معاينة صورة الفاتورة المرفقة</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions: Approve / Reject */}
                  <div className="mt-5 pt-3 border-t border-slate-800 flex items-center gap-2">
                    <button
                      onClick={() => handleApprove(tx.id)}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950 transition-all active:scale-95"
                    >
                      <Check className="w-4 h-4" />
                      <span>اعتماد وتحديث الرصيد</span>
                    </button>

                    <button
                      onClick={() => {
                        setRejectingTxId(tx.id);
                        setRejectReason('');
                      }}
                      className="py-2.5 px-4 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
                    >
                      <X className="w-4 h-4" />
                      <span>رفض</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Audit Review History */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 mt-8">
        <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-slate-400" />
          <span>سجل قرارات المراجعة السابقة</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2.5 px-3">الزبون</th>
                <th className="py-2.5 px-3">نوع العملية</th>
                <th className="py-2.5 px-3">المبلغ</th>
                <th className="py-2.5 px-3">العامل</th>
                <th className="py-2.5 px-3">القرار</th>
                <th className="py-2.5 px-3">التاريخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {reviewHistory.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-6 text-center text-slate-500">
                    لا يوجد سجل قرارات سابقة
                  </td>
                </tr>
              ) : (
                reviewHistory.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-850/40">
                    <td className="py-2.5 px-3 font-bold text-white">{h.customerName}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={h.type === 'debt' ? 'text-rose-400' : 'text-emerald-400'}
                      >
                        {h.type === 'debt' ? 'دين' : 'تسديد'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold">
                      {h.amount.toLocaleString()} {settings.currency}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">{h.createdBy}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          h.status === 'approved'
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {h.status === 'approved' ? 'معتمد' : 'مرفوض'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">{h.date}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject Reason Modal */}
      {rejectingTxId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl glass-panel bg-slate-900 border border-rose-900/50 p-6 shadow-modal">
            <h3 className="text-base font-bold text-white mb-2">رفض العملية المالية</h3>
            <p className="text-xs text-slate-400 mb-4">
              يرجى كتابة سبب الرفض ليتم إشعار العامل به:
            </p>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <textarea
                rows={3}
                required
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="مثال: المبلغ غير مطابق للفاتورة، تكرار بالخطأ..."
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-semibold resize-none"
              />

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejectingTxId(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg"
                >
                  تأكيد الرفض
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Photo Attachment Modal */}
      {viewingPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="relative max-w-xl w-full p-2 bg-slate-900 rounded-3xl border border-slate-700">
            <button
              onClick={() => setViewingPhoto(null)}
              className="absolute top-4 left-4 p-2 rounded-full bg-black/60 text-white hover:bg-black"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={viewingPhoto}
              alt="صورة الفاتورة المرفقة"
              className="w-full h-auto max-h-[80vh] object-contain rounded-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
