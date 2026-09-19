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

export const DeviceSyncModal = ({ isOpen, onClose, initialTab = 'send' }) => {
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

  const [activeTab, setActiveTab] = useState(initialTab || 'send'); // 'send' | 'receive'
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [importCode, setImportCode] = useState('');
  const [importResult, setImportResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  // Generate payload
  const exportData = exportStoreData ? exportStoreData() : { storeId, customers, transactions };
  let encodedPayload = '';
  try {
    encodedPayload = btoa(unescape(encodeURIComponent(JSON.stringify(exportData))));
  } catch (e) {
    try {
      encodedPayload = btoa(JSON.stringify(exportData));
    } catch {}
  }

  const fullSyncUrl = `${window.location.origin}${window.location.pathname}#sync=${encodedPayload}`;
  
  // Only use QR if URL length is reasonable for QR generator
  const isQrSafe = fullSyncUrl.length < 1900;
  const qrUrl = isQrSafe
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(fullSyncUrl)}`
    : `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
        window.location.origin + window.location.pathname + '#sync=' + encodedPayload.substring(0, 1500)
      )}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(encodedPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(fullSyncUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleWhatsAppShare = () => {
    const text = `رابط مزامنة ونقل بيانات السوبرماركت (المعرف: ${storeId}):\nاضغط على هذا الرابط من هاتفك الآخر لتفتح لك كل الديون والزبائن مباشرة وبنقرة واحدة:\n\n${fullSyncUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setImportCode(text);
      }
    } catch (e) {
      // Clipboard permissions not granted
    }
  };

  const handleApplyImport = async () => {
    let rawInput = importCode.trim();
    if (!rawInput) {
      setImportResult({ success: false, message: 'يرجى لصق كود أو رابط المزامنة المستلم من الجهاز الأول' });
      return;
    }

    // Auto-extract payload if full URL was pasted
    if (rawInput.includes('#sync=')) {
      rawInput = rawInput.split('#sync=')[1];
    } else if (rawInput.includes('#import=')) {
      rawInput = rawInput.split('#import=')[1];
    }

    setIsProcessing(true);
    setImportResult(null);

    try {
      let rawJson = '';
      try {
        rawJson = decodeURIComponent(escape(atob(rawInput)));
      } catch {
        try {
          rawJson = atob(rawInput);
        } catch {
          rawJson = decodeURIComponent(rawInput);
        }
      }

      const parsed = JSON.parse(rawJson);
      const res = await importStoreData(parsed);

      setImportResult({
        success: true,
        message: `تم بنجاح نقل ومزامنة ${res.customersCount} زبون و ${res.transactionsCount} حركة مالية إلى هذا الجهاز!`
      });
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setImportResult({
        success: false,
        message: 'كود أو رابط المزامنة غير صالح. يرجى التأكد من نسخه بالكامل من الجهاز الأول.'
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

            {/* Main Action: Send via WhatsApp */}
            <div className="p-4 rounded-2xl bg-gradient-to-tr from-emerald-950/80 to-slate-900 border border-emerald-500/40 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>أسرع طريقة لنقل البيانات إلى هاتفك الآخر:</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                اضغط على الزر الأخضر لإرسال الرابط إلى هاتفك الآخر عبر <strong>واتساب</strong>. وبمجرد فتح الرابط من هناك، ستظهر كل البيانات فوراً وبدون أي كتابة!
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  onClick={handleWhatsAppShare}
                  className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/40 transition-all active:scale-95"
                >
                  <Send className="w-4 h-4" />
                  <span>إرسال الرابط عبر واتساب</span>
                </button>

                <button
                  onClick={handleCopyLink}
                  className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  {copiedLink ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? 'تم نسخ الرابط!' : 'نسخ رابط المزامنة'}</span>
                </button>
              </div>
            </div>

            {/* QR Code display */}
            <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="p-2 rounded-xl bg-white shadow-md">
                <img
                  src={qrUrl}
                  alt="QR Code للمزامنة"
                  className="w-36 h-36 object-contain rounded"
                  loading="lazy"
                />
              </div>
              <p className="text-[11px] text-slate-400 text-center">
                أو امسح الرمز بكاميرا الهاتف الآخر لنقل البيانات مباشرة
              </p>
            </div>

            {/* Fast Transfer Code */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>أو كود النقل المباشر:</span>
                <button
                  onClick={handleCopyCode}
                  className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copied ? 'تم النسخ!' : 'نسخ الكود'}</span>
                </button>
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
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-300">
                  كود أو رابط المزامنة المستلم:
                </label>
                <button
                  type="button"
                  onClick={handlePasteFromClipboard}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 bg-emerald-950/60 px-2 py-1 rounded-lg border border-emerald-800/60"
                >
                  <Copy className="w-3 h-3" />
                  <span>لصق من الحافظة</span>
                </button>
              </div>
              <textarea
                value={importCode}
                onChange={(e) => setImportCode(e.target.value)}
                placeholder="الصق كود النقل أو الرابط هنا..."
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
