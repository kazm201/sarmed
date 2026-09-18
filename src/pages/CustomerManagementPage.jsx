import React, { useMemo, useState } from 'react';
import { Search, UserPlus, Users, Phone, MapPin, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

export const CustomerManagementPage = () => {
  const { settings } = useAuth();
  const { customers, addCustomer } = useData();
  const [form, setForm] = useState({ name: '', phone: '', address: '', notes: '' });
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const matches = useMemo(() => customers.filter((customer) => {
    const term = query.trim().toLocaleLowerCase('ar');
    return !term || customer.name.toLocaleLowerCase('ar').includes(term) || customer.phone?.includes(term);
  }).sort((a, b) => a.name.localeCompare(b.name, 'ar')), [customers, query]);

  const saveCustomer = async (event) => {
    event.preventDefault(); setError(''); setNotice('');
    try {
      await addCustomer(form);
      setForm({ name: '', phone: '', address: '', notes: '' });
      setNotice('تمت إضافة الزبون بنجاح. أصبح متاحاً فوراً لتسجيل الديون والتسديدات.');
    } catch (err) { setError(err.message || 'تعذر إضافة الزبون.'); }
  };

  return <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200">
    <header className="pb-4 border-b border-slate-800"><h2 className="text-xl sm:text-2xl font-black text-white flex gap-2 items-center"><Users className="w-6 h-6 text-teal-400" />إدارة الزبائن</h2><p className="text-xs sm:text-sm text-slate-400 mt-1">هذه الصفحة مخصصة لصاحب السوبرماركت لإضافة الزبائن ومراجعة بياناتهم.</p></header>
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <form onSubmit={saveCustomer} className="lg:col-span-2 glass-panel rounded-3xl p-5 sm:p-6 border border-slate-800 space-y-4 h-fit">
        <h3 className="text-sm font-bold text-white flex gap-2 items-center"><UserPlus className="w-5 h-5 text-emerald-400" />إضافة زبون جديد</h3>
        <p className="text-[11px] text-slate-400">أدخل الاسم أولاً؛ الهاتف والعنوان اختياريان لتسهيل البحث لاحقاً.</p>
        {notice && <p className="p-3 rounded-xl text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex gap-2"><CheckCircle2 className="w-4 h-4" />{notice}</p>}
        {error && <p className="p-3 rounded-xl text-xs bg-rose-500/10 border border-rose-500/30 text-rose-300 flex gap-2"><AlertCircle className="w-4 h-4" />{error}</p>}
        {[['name', 'اسم الزبون *', 'مثال: أحمد محمد'], ['phone', 'رقم الهاتف', '07xxxxxxxxx'], ['address', 'العنوان / المنطقة', 'الحي أو المنطقة']].map(([key, label, placeholder]) => <label key={key} className="block text-xs font-bold text-slate-300">{label}<input value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} placeholder={placeholder} required={key === 'name'} type={key === 'phone' ? 'tel' : 'text'} className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl glass-input text-xs" /></label>)}
        <label className="block text-xs font-bold text-slate-300">ملاحظات داخلية<textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="ملاحظة اختيارية" className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl glass-input text-xs resize-none" /></label>
        <button className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold flex justify-center gap-2"><UserPlus className="w-4 h-4" />حفظ الزبون</button>
      </form>
      <section className="lg:col-span-3 glass-panel rounded-3xl p-5 sm:p-6 border border-slate-800"><div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-4"><div><h3 className="text-sm font-bold text-white">قائمة الزبائن ({customers.length})</h3><p className="text-[11px] text-slate-400 mt-1">ابحث بالاسم أو الهاتف للوصول السريع.</p></div><div className="relative w-full sm:w-64"><Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="بحث عن زبون..." className="w-full pr-9 pl-3 py-2 rounded-xl glass-input text-xs" /></div></div>
        <div className="max-h-[520px] overflow-y-auto space-y-2 pr-1">{matches.length ? matches.map((customer) => <article key={customer.id} className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2"><div><h4 className="text-sm font-bold text-white">{customer.name}</h4><div className="flex flex-wrap gap-3 mt-1 text-[11px] text-slate-400">{customer.phone && <span className="flex gap-1 items-center"><Phone className="w-3 h-3" />{customer.phone}</span>}{customer.address && <span className="flex gap-1 items-center"><MapPin className="w-3 h-3" />{customer.address}</span>}</div></div><div className="text-left"><span className="text-[10px] text-slate-400 block">الرصيد الحالي</span><strong className="text-sm text-rose-400">{(customer.currentDebt || 0).toLocaleString()} {settings.currency}</strong></div></article>) : <p className="py-12 text-center text-xs text-slate-500">لا يوجد زبون مطابق للبحث.</p>}</div>
      </section>
    </div>
  </div>;
};
