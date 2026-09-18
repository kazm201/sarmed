import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import {
  Menu,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Info,
  LogOut,
  Wifi,
  WifiOff,
  RefreshCw,
  Store,
  UserCheck,
  ShieldCheck,
  X,
  Volume2,
  Sun,
  Moon
} from 'lucide-react';
import { notificationService } from '../../services/notificationService';

export const Navbar = ({ onToggleSidebar, activePage, setActivePage }) => {
  const { currentUser, isManager, isWorker, logout, settings, updateSettings } = useAuth();
  const {
    notifications,
    unreadNotificationsCount,
    markNotificationRead,
    clearAllNotifications,
    isSyncing,
    isOnline,
    pendingApprovalsCount
  } = useData();

  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const notifRef = useRef(null);

  // Close notifications dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const requestNotifPermission = async () => {
    await notificationService.requestPermission();
    notificationService.playChime('success');
  };

  return (
    <header className="sticky top-0 z-30 w-full glass-panel border-b border-slate-800/80 px-4 lg:px-6 py-3 transition-all">
      <div className="flex items-center justify-between gap-4">
        {/* Left Side: Mobile Toggle & Store Identity */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-xl bg-slate-800/80 text-slate-200 hover:text-emerald-400 hover:bg-slate-700/80 transition-all active:scale-95"
            aria-label="القائمة الجانبية"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-md shadow-emerald-900/30 text-white font-bold">
              <Store className="w-5 h-5" />
              {/* Online pulse indicator */}
              <span
                className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-950 ${
                  isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                }`}
                title={isOnline ? 'متصل بالشبكة وقاعدة البيانات' : 'وضع غير متصل (يعمل محلياً)'}
              />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-white tracking-wide leading-tight flex items-center gap-2">
                {settings.storeName || 'نظام إدارة الديون'}
                <span className="hidden sm:inline-block text-xs font-normal px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                  PWA ⚡
                </span>
              </h1>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  {isOnline ? (
                    <Wifi className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <WifiOff className="w-3 h-3 text-rose-400" />
                  )}
                  {isOnline ? 'متزامن لايف' : 'محفوظ محلياً'}
                </span>
                {isSyncing && (
                  <span className="flex items-center gap-1 text-teal-400">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    مزامنة...
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Role Badge, Notifications & Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Approvals Badge for Manager */}
          {isManager && pendingApprovalsCount > 0 && (
            <button
              onClick={() => setActivePage('approvals')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold animate-pulse hover:bg-amber-500/20 transition-all"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{pendingApprovalsCount} طلبات موافقة</span>
            </button>
          )}

          {/* User Role Badge */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs">
            {isManager ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            ) : (
              <UserCheck className="w-4 h-4 text-teal-400" />
            )}
            <div className="flex flex-col text-right">
              <span className="text-slate-300 font-bold">{currentUser?.name}</span>
              <span className="text-[10px] text-slate-400">
                {isManager ? 'مدير النظام (صلاحيات كاملة)' : 'حساب عامل'}
              </span>
            </div>
          </div>

          {/* Notifications Trigger */}
          <button
            onClick={() => updateSettings({ theme: settings.theme === 'light' ? 'dark' : 'light' })}
            className="p-2.5 rounded-xl bg-slate-800/70 hover:bg-slate-700/70 text-slate-300 transition-all border border-slate-700/50"
            title={settings.theme === 'light' ? 'تفعيل الوضع الداكن' : 'تفعيل الوضع النهاري'}
            aria-label="تبديل الوضع النهاري"
          >
            {settings.theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5 text-amber-300" />}
          </button>
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifMenu(!showNotifMenu)}
              className="relative p-2.5 rounded-xl bg-slate-800/70 hover:bg-slate-700/70 text-slate-300 hover:text-white transition-all active:scale-95 border border-slate-700/50"
              title="التنبيهات والإشعارات"
              aria-label="الإشعارات"
            >
              <Bell className="w-5 h-5" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-5 h-5 px-1 text-[11px] font-black text-white bg-rose-500 rounded-full shadow-lg shadow-rose-900/40 animate-bounce">
                  {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown Panel */}
            {showNotifMenu && (
              <div className="absolute left-0 mt-2 w-80 sm:w-96 rounded-2xl glass-panel bg-slate-900/95 border border-slate-700/80 shadow-modal shadow-black/80 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between p-3.5 border-b border-slate-800 bg-slate-850/90">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-sm text-white">مركز الإشعارات</span>
                    {unreadNotificationsCount > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {unreadNotificationsCount} جديد
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={requestNotifPermission}
                      className="p-1 rounded-lg text-slate-400 hover:text-teal-300 hover:bg-slate-800 transition-all text-xs flex items-center gap-1"
                      title="تفعيل إشعارات المتصفح والنغمة"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span className="text-[10px]">تفعيل الصوت</span>
                    </button>
                    {notifications.length > 0 && (
                      <button
                        onClick={clearAllNotifications}
                        className="text-[11px] text-rose-400 hover:text-rose-300 font-medium px-1.5 py-0.5 rounded hover:bg-rose-950/40 transition-all"
                      >
                        مسح الكل
                      </button>
                    )}
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60 p-1">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                      <Bell className="w-8 h-8 text-slate-600 opacity-50" />
                      <span>لا توجد إشعارات حالياً</span>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => {
                          markNotificationRead(notif.id);
                          if (notif.meta?.txId && isManager) {
                            setActivePage('approvals');
                            setShowNotifMenu(false);
                          }
                        }}
                        className={`p-3 rounded-xl transition-all cursor-pointer flex gap-3 items-start ${
                          notif.read ? 'bg-transparent opacity-75' : 'bg-slate-800/60 hover:bg-slate-800'
                        }`}
                      >
                        <div className="mt-0.5 p-1.5 rounded-lg shrink-0 bg-slate-700/60">
                          {notif.type === 'alert' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                          {notif.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                          {notif.type === 'warning' && <AlertTriangle className="w-4 h-4 text-rose-400" />}
                          {notif.type === 'info' && <Info className="w-4 h-4 text-teal-400" />}
                        </div>
                        <div className="flex-1 text-right">
                          <h4 className="text-xs font-bold text-slate-100 leading-snug">{notif.title}</h4>
                          <p className="text-xs text-slate-300 mt-1 leading-relaxed">{notif.message}</p>
                          <span className="text-[10px] text-slate-500 mt-1.5 block">
                            {new Date(notif.createdAt).toLocaleTimeString('ar-EG', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Logout Action */}
          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 hover:border-rose-500/40 text-xs font-semibold transition-all active:scale-95"
            title="تسجيل الخروج"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">خروج</span>
          </button>
        </div>
      </div>
    </header>
  );
};
