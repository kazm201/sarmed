import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import {
  LayoutDashboard,
  PlusCircle,
  CreditCard,
  Users,
  CheckSquare,
  Settings,
  X,
  Store,
  ShieldCheck,
  UserCheck,
  LogOut,
  Smartphone
  ,BarChart3,
  History
} from 'lucide-react';

export const Sidebar = ({ isOpen, onClose, activePage, setActivePage }) => {
  const { currentUser, isManager, isWorker, logout, settings } = useAuth();
  const { pendingApprovalsCount, customersWithDebt } = useData();

  const navItems = [
    {
      id: 'dashboard',
      label: 'الرئيسية',
      icon: LayoutDashboard,
      roles: ['manager']
    },
    {
      id: 'add-debt',
      label: 'إضافة دين جديد',
      icon: PlusCircle,
      roles: ['manager', 'worker'],
      highlight: true
    },
    {
      id: 'pay-debt',
      label: 'تسديد دين / دفعة',
      icon: CreditCard,
      roles: ['manager', 'worker'],
      highlight: true
    },
    {
      id: 'customers',
      label: 'إدارة وإضافة الزبائن',
      icon: Users,
      badge: customersWithDebt > 0 ? `${customersWithDebt} مدين` : null,
      badgeColor: 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
      roles: ['manager']
    },
    {
      id: 'statistics',
      label: 'الإحصاءات الشاملة',
      icon: BarChart3,
      roles: ['manager']
    },
    {
      id: 'activities',
      label: 'كل التحركات المالية',
      icon: History,
      roles: ['manager']
    },
    {
      id: 'approvals',
      label: 'طلبات المراجعة والموافقة',
      icon: CheckSquare,
      badge: pendingApprovalsCount > 0 ? `${pendingApprovalsCount} جديد` : null,
      badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse',
      roles: ['manager'] // Visible only to manager
    },
    {
      id: 'settings',
      label: 'إعدادات الحساب والنظام',
      icon: Settings,
      roles: ['manager'] // Visible only to manager
    }
  ];

  const handleNavClick = (pageId) => {
    setActivePage(pageId);
    onClose();
  };

  const visibleNavItems = navItems.filter((item) =>
    item.roles.includes(currentUser?.role || 'worker')
  );

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:static top-0 right-0 z-50 h-full w-72 lg:w-64 xl:w-72 glass-panel bg-slate-900/95 lg:bg-slate-900/80 border-l border-slate-800/80 flex flex-col justify-between transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Header & Navigation Links */}
        <div className="flex flex-col h-full overflow-y-auto p-4">
          {/* Header inside drawer */}
          <div className="flex items-center justify-between pb-5 mb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-950 text-white font-bold">
                <Store className="w-5 h-5" />
              </div>
              <div className="text-right">
                <h2 className="text-sm font-extrabold text-white leading-tight line-clamp-1">
                  {settings.storeName || 'السوبرماركت'}
                </h2>
                <span className="text-[11px] text-emerald-400 font-medium">
                  نظام إدارة الديون المتكامل
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Profile Card */}
          <div className="mb-6 p-3 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl ${
                isManager
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
              }`}
            >
              {isManager ? <ShieldCheck className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
            </div>
            <div className="flex-1 text-right overflow-hidden">
              <div className="text-xs font-bold text-white truncate">{currentUser?.name}</div>
              <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>{isManager ? 'مدير المحل (كامل الصلاحيات)' : 'حساب عامل'}</span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5 flex-1">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group text-right ${
                    isActive
                      ? 'bg-gradient-to-r from-emerald-600/90 to-teal-600/90 text-white shadow-lg shadow-emerald-950/50 border border-emerald-500/40 translate-x-1'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-5 h-5 transition-transform group-hover:scale-110 ${
                        isActive ? 'text-white' : 'text-slate-400 group-hover:text-emerald-400'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Mobile Install App / PWA hint */}
          <div className="mt-4 pt-4 border-t border-slate-800/80">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-slate-800/40 to-emerald-950/30 border border-emerald-900/40 flex items-center gap-2.5">
              <Smartphone className="w-5 h-5 text-emerald-400 shrink-0" />
              <div className="text-right text-[11px]">
                <p className="text-slate-200 font-bold">جاهز للتثبيت والموبايل</p>
                <p className="text-slate-400 text-[10px] leading-tight">يعمل بدون إنترنت كـ PWA</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Actions: Logout */}
        <div className="p-4 border-t border-slate-800/80">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-bold transition-all active:scale-95"
          >
            <LogOut className="w-4 h-4" />
            <span>تسجيل الخروج من الحساب</span>
          </button>
        </div>
      </aside>
    </>
  );
};
