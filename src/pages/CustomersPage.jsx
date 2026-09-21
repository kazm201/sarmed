import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import {
  Users,
  Search,
  UserPlus,
  Phone,
  MapPin,
  FileText,
  CreditCard,
  PlusCircle,
  Share2,
  Trash2,
  Edit,
  X,
  AlertCircle,
  Filter,
  ArrowUpDown,
  MessageCircle,
  Clock,
  Printer,
  FileDown
} from 'lucide-react';
import { PrintInvoice } from '../components/common/PrintInvoice';
import { CustomerDebtPdfModal } from '../components/common/CustomerDebtPdfModal';

export const CustomersPage = ({ setActivePage }) => {
  const { isManager, settings } = useAuth();
  const {
    customers,
    transactions,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    scanAndRemoveDuplicates
  } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'debtors' | 'cleared'
  const [sortBy, setSortBy] = useState('highestDebt'); // 'highestDebt' | 'name' | 'recent'

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [statementCustomer, setStatementCustomer] = useState(null);
  const [deletingCustomerId, setDeletingCustomerId] = useState(null);
  const [formError, setFormError] = useState('');
  const [deleteResult, setDeleteResult] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isScanningDuplicates, setIsScanningDuplicates] = useState(false);
  const [dupScanResult, setDupScanResult] = useState(null);

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    notes: '',
    initialDebt: 0
  });

  // Filter & Sort Customers
  const filteredCustomers = customers
    .filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.phone && c.phone.includes(searchQuery)) ||
        (c.address && c.address.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchSearch) return false;

      if (filterMode === 'debtors') return (c.currentDebt || 0) > 0;
      if (filterMode === 'cleared') return (c.currentDebt || 0) === 0;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'highestDebt') return (b.currentDebt || 0) - (a.currentDebt || 0);
      if (sortBy === 'name') return a.name.localeCompare(b.name, 'ar');
      if (sortBy === 'recent') {
        return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
      }
      return 0;
    });

  // Handle Create Customer
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    setFormError('');

    try {
      await addCustomer(formData);
      setFormData({ name: '', phone: '', address: '', notes: '', initialDebt: 0 });
      setShowAddModal(false);
    } catch (err) {
      setFormError(err.message || 'حدث خطأ أثناء إضافة الزبون');
    }
  };

  // Handle Edit Customer
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingCustomer || !formData.name.trim()) return;

    await updateCustomer(editingCustomer.id, {
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      address: formData.address.trim(),
      notes: formData.notes.trim()
    });

    setEditingCustomer(null);
    setFormData({ name: '', phone: '', address: '', notes: '', initialDebt: 0 });
  };

  // Open Edit Modal
  const openEditModal = (cust) => {
    setEditingCustomer(cust);
    setFormData({
      name: cust.name,
      phone: cust.phone || '',
      address: cust.address || '',
      notes: cust.notes || '',
      initialDebt: 0
    });
  };

  // Direct WhatsApp Debt Reminder
  const sendWhatsAppReminder = (cust) => {
    if (!cust.phone) {
      alert('لا يوجد رقم هاتف مسجل لهذا الزبون');
      return;
    }
    const cleanPhone = cust.phone.replace(/[^0-9]/g, '');
    const debt = (cust.currentDebt || 0).toLocaleString();
    const text =
      `السلام عليكم أخي الكريم *${cust.name}*،\n` +
      `نود تذكيركم بأن الرصيد المتبقي لحسابكم لدى *${settings.storeName}* هو: *${debt} ${settings.currency}*.\n` +
      `شاكرين لكم حسن تعاونكم الدائم 🙏.`;
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleScanDuplicates = async () => {
    setIsScanningDuplicates(true);
    setDupScanResult(null);
    try {
      const res = await scanAndRemoveDuplicates();
      setDupScanResult(res);
      setTimeout(() => setDupScanResult(null), 10000);
    } catch (e) {
      setDupScanResult({ error: e.message || 'حدث خطأ أثناء فحص المكررات' });
    } finally {
      setIsScanningDuplicates(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <Users className="w-6 h-6" />
            </div>
            <span>سجل الزبائن وتفاصيل الحسابات</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            دليل الزبائن الشامل، كشوفات الحسابات التفصيلية، وإرسال المطالبات عبر واتساب
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleScanDuplicates}
            disabled={isScanningDuplicates}
            className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-2xl bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/40 font-bold text-xs sm:text-sm shadow-lg transition-all active:scale-95 disabled:opacity-50"
          >
            <Search className={`w-4 h-4 ${isScanningDuplicates ? 'animate-spin' : ''}`} />
            <span>{isScanningDuplicates ? 'جاري الفحص...' : 'فحص وحذف المكررات'}</span>
          </button>

          <button
            onClick={() => setShowPdfModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-xs sm:text-sm shadow-lg shadow-rose-950/60 transition-all active:scale-95"
          >
            <FileDown className="w-4 h-4" />
            <span>تحميل كشف ديون الزبائن (PDF)</span>
          </button>

          <button
            onClick={() => {
              setFormData({ name: '', phone: '', address: '', notes: '', initialDebt: 0 });
              setShowAddModal(true);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-950/60 transition-all active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>إضافة زبون جديد</span>
          </button>
        </div>
      </div>

      {/* Duplicate Scan Feedback Banner */}
      {dupScanResult && !dupScanResult.error && (
        <div className={`p-4 rounded-2xl border animate-in fade-in ${
          dupScanResult.duplicatesFound > 0 ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' : 'bg-slate-900 border-slate-700 text-slate-300'
        }`}>
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs sm:text-sm">
              {dupScanResult.duplicatesFound > 0
                ? `✅ تم العثور على ${dupScanResult.duplicatesFound} اسم مكرر وحذفهم ودمج حركاتهم بنجاح!`
                : '✅ قاعدة البيانات نظيفة تماماً! لا توجد أي أسماء مكررة.'}
            </span>
            <button onClick={() => setDupScanResult(null)} className="text-xs text-slate-400 hover:text-white">✕</button>
          </div>
        </div>
      )}

      {dupScanResult?.error && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-300 font-bold text-xs">
          ❌ {dupScanResult.error}
        </div>
      )}

      {/* Filters, Search & Sorters Bar */}
      <div className="glass-panel rounded-3xl p-4 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
          <input
            type="text"
            placeholder="بحث بالاسم، الهاتف أو المنطقة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-2.5 rounded-2xl glass-input text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Filter Buttons & Sort */}
        <div className="w-full md:w-auto flex flex-wrap items-center justify-between md:justify-end gap-2.5">
          {/* Filter Status Chips */}
          <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                filterMode === 'all'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              الكل ({customers.length})
            </button>
            <button
              onClick={() => setFilterMode('debtors')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                filterMode === 'debtors'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              عليهم ديون
            </button>
            <button
              onClick={() => setFilterMode('cleared')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                filterMode === 'cleared'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              مسددين ({customers.filter(c => (c.currentDebt || 0) === 0).length})
            </button>
          </div>

          {/* Sorter Selector */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-200 outline-none cursor-pointer"
            >
              <option value="highestDebt" className="bg-slate-900">الأعلى ديناً</option>
              <option value="name" className="bg-slate-900">أبجدياً (أ-ي)</option>
              <option value="recent" className="bg-slate-900">آخر تحديث</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customers Cards Grid */}
      {filteredCustomers.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center text-slate-500 text-xs border border-slate-800">
          لا يوجد زبائن مطابقين لمعايير البحث الحالية.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredCustomers.map((cust) => {
            const hasDebt = (cust.currentDebt || 0) > 0;
            return (
              <div
                key={cust.id}
                className="glass-card rounded-3xl p-5 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col justify-between group"
              >
                {/* Card Top: Customer info */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors">
                        {cust.name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                        {cust.phone ? (
                          <span className="flex items-center gap-1 text-slate-300">
                            <Phone className="w-3 h-3 text-emerald-400" />
                            <span dir="ltr">{cust.phone}</span>
                          </span>
                        ) : (
                          <span className="text-slate-500">لا يوجد هاتف</span>
                        )}
                        {cust.address && (
                          <span className="flex items-center gap-1 text-slate-400 truncate max-w-[140px]">
                            <MapPin className="w-3 h-3 text-slate-500" />
                            <span>{cust.address}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Debt Badge */}
                    <div className="text-left">
                      <span
                        className={`inline-block px-3 py-1 rounded-2xl text-xs font-black ${
                          hasDebt
                            ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                            : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {hasDebt
                          ? `${(cust.currentDebt || 0).toLocaleString()} ${settings.currency}`
                          : 'خالص الحساب'}
                      </span>
                    </div>
                  </div>

                  {/* Customer Notes if available */}
                  {cust.notes && (
                    <p className="text-[11px] text-slate-400 mt-3 p-2 rounded-xl bg-slate-900/60 border border-slate-800 line-clamp-2">
                      {cust.notes}
                    </p>
                  )}
                </div>

                {/* Card Actions Bottom */}
                <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between gap-2">
                  {/* View Statement Button */}
                  <button
                    onClick={() => setStatementCustomer(cust)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all active:scale-95"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    <span>كشف حساب</span>
                  </button>

                  {/* WhatsApp Reminder Button if customer has debt */}
                  {hasDebt && cust.phone && (
                    <button
                      onClick={() => sendWhatsAppReminder(cust)}
                      className="p-2 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 transition-all active:scale-95"
                      title="إرسال تذكير عبر واتساب"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  )}

                  {/* Edit Button */}
                  <button
                    onClick={() => openEditModal(cust)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all active:scale-95"
                    title="تعديل بيانات الزبون"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  {/* Delete Button (Manager Only) */}
                  {isManager && (
                    <button
                      onClick={() => setDeletingCustomerId(cust.id)}
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all active:scale-95"
                      title="حذف الزبون"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl glass-panel bg-slate-900 border border-slate-700 p-6 shadow-modal">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-400" />
                <span>إضافة زبون جديد للنظام</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">اسم الزبون *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    setFormError('');
                  }}
                  placeholder="الاسم الكامل للزبون"
                  className={`w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-semibold ${formError ? 'border-rose-500 ring-1 ring-rose-500' : ''}`}
                />
                {formError && (
                  <p className="text-[11px] text-rose-400 font-bold mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {formError}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">رقم الهاتف</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="07xxxxxxxxx"
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">العنوان / المنطقة</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="الشارع، الحي..."
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  رصيد دين سابق (إن وجد)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.initialDebt}
                    onChange={(e) => setFormData({ ...formData, initialDebt: e.target.value })}
                    placeholder="0"
                    className="w-full pr-3.5 pl-12 py-2.5 rounded-xl glass-input text-xs font-bold text-rose-400"
                  />
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400">
                    {settings.currency}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">ملاحظات إضافية</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="أي تفاصيل خاصة بالزبون..."
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-semibold resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg"
                >
                  حفظ الزبون
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl glass-panel bg-slate-900 border border-slate-700 p-6 shadow-modal">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit className="w-5 h-5 text-emerald-400" />
                <span>تعديل بيانات الزبون</span>
              </h3>
              <button
                onClick={() => setEditingCustomer(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">اسم الزبون *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">رقم الهاتف</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">العنوان / المنطقة</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">ملاحظات</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-semibold resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg"
                >
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingCustomerId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl glass-panel bg-slate-900 border border-rose-900/50 p-6 shadow-modal text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">حذف الزبون من جميع الأجهزة؟</h3>
            <p className="text-xs text-slate-400 mt-1.5">
              سيتم حذف سجل الزبون وجميع الحركات المالية والإشعارات المرتبطة به نهائياً من <strong className="text-rose-300">هذا الجهاز وجميع الأجهزة الأخرى</strong> ومن قاعدة بيانات Firebase.
            </p>

            {deleteResult && (
              <div className="mt-3 p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-[11px] text-emerald-300 font-bold">
                ✅ تم الحذف بنجاح! تم حذف {deleteResult.deletedTransactions} حركة مالية و {deleteResult.deletedNotifications} إشعار مرتبط.
              </div>
            )}

            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => { setDeletingCustomerId(null); setDeleteResult(null); }}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    const result = await deleteCustomer(deletingCustomerId);
                    setDeleteResult(result);
                    setTimeout(() => {
                      setDeletingCustomerId(null);
                      setDeleteResult(null);
                    }, 1800);
                  } catch (err) {
                    alert('حدث خطأ أثناء الحذف: ' + err.message);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg flex items-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>جاري الحذف...</span>
                  </>
                ) : (
                  <span>تأكيد الحذف من الكل</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Statement of Account Modal */}
      {statementCustomer && (
        <PrintInvoice
          customer={statementCustomer}
          customerTransactions={transactions.filter((t) => t.customerId === statementCustomer.id)}
          mode="statement"
          onClose={() => setStatementCustomer(null)}
        />
      )}

      {/* Customer Debts PDF Export Modal */}
      {showPdfModal && (
        <CustomerDebtPdfModal
          customers={customers}
          onClose={() => setShowPdfModal(false)}
        />
      )}
    </div>
  );
};
