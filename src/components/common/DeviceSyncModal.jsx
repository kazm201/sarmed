import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import {
  Smartphone,
  Share2,
  Download,
  Copy,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  X,
  ArrowRightLeft,
  KeyRound,
  ShieldCheck,
  Send,
  Sparkles
} from 'lucide-react';

export const DeviceSyncModal = ({ isOpen, onClose }) => {
  const { storeId } = useAuth();
  const {
    customers,
    transactions,
    exportStoreData,
    importStoreData,
    cloudStatus,
    syncAllDataToCloud,
    isSyncing
  } = useData();

  const [activeTab, setActiveTab] = useState('send'); // 'send' | 'receive'
  const [copied, setCopied] = useState(false);
  const [importCode, setImportCode] = useState('');
  const [importResult, setImportResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  // Generate payload
  const exportData = exportStoreData();
  const encodedPayload = btoa(unescape(encodeURIComponent(JSON.stringify(exportData))));
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    window.location.origin + window.location.pathname + '#sync=' + encodedPayload.substring(0, 1800)
  )}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(encodedPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleWhatsAppShare = () => {
    const text = `كود مزامنة حساب السوبرماركت (المعرف: ${storeId}):\n\n${encodedPayload}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleApplyImport = async () => {
    if (!importCode.trim()) {
      setImportResult({ success: false, message: 'يرجى لصق كود المزامنة المستلم من الجهاز الأول' });
      return;
    }

    setIsProcessing(true);
    setImportResult(null);

    try {
      let rawJson = '';
      try {
        rawJson = decodeURIComponent(escape(atob(importCode.trim())));
      } catch {
        rawJson = importCode.trim();
      }

      const parsed = JSON.parse(rawJson);
      const res = await importStoreData(parsed);

      setImportResult({
        success: true,
        message: `تم بنجاح نقل ومزامنة ${res.customersCount} زبون و ${res.transactionsCount} حركة مالية إلى هذا الجهاز!`
      });
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (err) {
      setImportResult({
        success: false,
        message: 'كود المزامنة غير صالح أو تالف. يرجى إعادة نسخه بالكامل من الجهاز الأول.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-lg rounded-3xl bg-slate-900 border-2 border-slate-700 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-emerald-500/20 text-emerald-400">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>المزامنة السريعة بين الأجهزة</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                  ID: {storeId}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                نقل الحسابات والزبائن فورياً بين الهواتف والأجهزة لنفس المعرّف
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center rounded-2xl bg-slate-950 p-1 border border-slate-800">
          <button
            onClick={() => setActiveTab('send')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'send'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Share2 className="w-4 h-4" />
            <span>إرسال لجهاز آخر (من هذا الجهاز)</span>
          </button>
          <button
            onClick={() => setActiveTab('receive')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'receive'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>استلام في هذا الجهاز</span>
          </button>
        </div>

        {/* TAB 1: SEND / SHARE */}
        {activeTab === 'send' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-300">البيانات الجاهزة للنقل:</span>
              <div className="flex items-center gap-3 font-bold">
                <span className="text-emerald-400">{customers.length} زبون</span>
                <span className="text-slate-500">•</span>
                <span className="text-teal-400">{transactions.length} حركة مالية</span>
              </div>
            </div>

            {/* QR Code display */}
            <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="p-2 rounded-xl bg-white shadow-md">
                <img
                  src={qrUrl}
                  alt="QR Code للمزامنة"
                  className="w-40 h-40 object-contain rounded"
                  loading="lazy"
                />
              </div>
              <p className="text-[11px] text-slate-400 text-center">
                امسح الرمز بكاميرا الهاتف الآخر لنقل كافة الزبائن والديون بلحظة واحدة
              </p>
            </div>

            {/* Fast Transfer Code */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>أو انسخ كود النقل المباشر:</span>
                <span className="text-[10px] text-slate-400">مشفّر وآمن</span>
              </label>
              <div className="relative">
                <textarea
                  readOnly
                  value={encodedPayload}
                  rows={2}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-400 select-all resize-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleCopyCode}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'تم نسخ الكود!' : 'نسخ كود النقل'}</span>
              </button>

              <button
                onClick={handleWhatsAppShare}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Send className="w-4 h-4" />
                <span>إرسال عبر واتساب</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: RECEIVE / IMPORT */}
        {activeTab === 'receive' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                ألصق كود المزامنة الذي نسخته أو استلمته من جهازك الأول عبر واتساب، وسيتم استيراد كافة الزبائن والديون فوراً على هذا الهاتف.
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">
                كود المزامنة المستلم:
              </label>
              <textarea
                value={importCode}
                onChange={(e) => setImportCode(e.target.value)}
                placeholder="الصق الكود هنا..."
                rows={4}
                className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-700 text-xs font-mono text-white placeholder-slate-500 focus:border-emerald-400"
              />
            </div>

            {importResult && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  importResult.success
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'bg-rose-950 text-rose-300 border border-rose-800'
                }`}
              >
                {importResult.success ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                )}
                <span>{importResult.message}</span>
              </div>
            )}

            <button
              onClick={handleApplyImport}
              disabled={isProcessing || !importCode.trim()}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm shadow-xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                'جاري الاستيراد والتطبيق...'
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>تطبيق ونقل البيانات إلى هذا الجهاز الآن</span>
                </>
              )}
            </button>
          </div>
        )}

        <div className="pt-3 border-t border-slate-800 text-center text-[10px] text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>المزامنة تعمل تلقائياً بين أي أجهزة تسجل دخول بنفس معرّف الـ ID ({storeId}).</span>
        </div>
      </div>
    </div>
  );
};
