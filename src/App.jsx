import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { AddDebtPage } from './pages/AddDebtPage';
import { PayDebtPage } from './pages/PayDebtPage';
import { CustomersPage } from './pages/CustomersPage';
import { ApprovalsPage } from './pages/ApprovalsPage';
import { SettingsPage } from './pages/SettingsPage';
import { CustomerManagementPage } from './pages/CustomerManagementPage';
import { StatisticsPage } from './pages/StatisticsPage';
import { ActivityPage } from './pages/ActivityPage';
import { FirebaseStoragePage } from './pages/FirebaseStoragePage';
import { WorkerDebtLedgerPage } from './pages/WorkerDebtLedgerPage';
import { CloudSyncBanner } from './components/common/CloudSyncBanner';
import {
  LayoutDashboard,
  PlusCircle,
  CreditCard,
  Users,
  CheckSquare
} from 'lucide-react';

const CloudLoadingScreen = ({ storeId, onSkip }) => (
  <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 gap-6 animate-fadeIn">
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
        <div className="relative w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-2xl shadow-emerald-900/60">
          <svg className="w-10 h-10 text-white animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
        </div>
      </div>
      <div>
        <h2 className="text-xl font-black text-white">جاري تحميل بياناتك من السحابة...</h2>
        <p className="text-sm text-slate-400 mt-1">معرّف الحساب: <span className="text-emerald-400 font-bold">{storeId}</span></p>
        <p className="text-xs text-slate-500 mt-2">يتم مزامنة الزبائن والديون تلقائياً من Firebase</p>
      </div>
      <div className="flex gap-1 mt-2">
        {[0,1,2,3,4].map(i => (
          <div key={i} className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{animationDelay: `${i*0.15}s`}} />
        ))}
      </div>
    </div>
    <button
      onClick={onSkip}
      className="text-xs text-slate-500 hover:text-slate-300 transition-colors border border-slate-700 hover:border-slate-500 px-4 py-2 rounded-xl mt-4"
    >
      تخطّي والدخول مباشرةً (إذا أخذت وقتاً طويلاً)
    </button>
  </div>
);

const MainLayout = () => {
  const { currentUser, isManager, isWorker, settings, storeId } = useAuth();
  const { pendingApprovalsCount, isLoadingCloudData, cloudStatus, forceRefreshFromCloud } = useData();
  const [activePage, setActivePage] = useState(isManager ? 'dashboard' : 'add-debt');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [skipLoading, setSkipLoading] = useState(false);

  useEffect(() => {
    if (isWorker && !['add-debt', 'pay-debt', 'worker-ledger'].includes(activePage)) setActivePage('add-debt');
  }, [isWorker, activePage]);

  // If not logged in, show Login Screen
  if (!currentUser) {
    return <LoginPage />;
  }

  // Show cloud loading screen while fetching data on a new device
  // Only show if: loading is active AND cloud is actually connecting (not offline/error)
  const showLoadingScreen =
    isLoadingCloudData &&
    !skipLoading &&
    cloudStatus === 'connecting';

  if (showLoadingScreen) {
    return <CloudLoadingScreen storeId={storeId} onSkip={() => setSkipLoading(true)} />;
  }

  // Handle protected pages for worker
  const getRenderedPage = () => {
    switch (activePage) {
      case 'dashboard':
        return isManager ? <DashboardPage setActivePage={setActivePage} /> : <AddDebtPage setActivePage={setActivePage} />;
      case 'add-debt':
        return <AddDebtPage setActivePage={setActivePage} />;
      case 'pay-debt':
        return <PayDebtPage setActivePage={setActivePage} />;
      case 'customers':
        return isManager ? <CustomersPage setActivePage={setActivePage} /> : <AddDebtPage setActivePage={setActivePage} />;
      case 'statistics':
        return isManager ? <StatisticsPage /> : <AddDebtPage setActivePage={setActivePage} />;
      case 'activities':
        return isManager ? <ActivityPage /> : <AddDebtPage setActivePage={setActivePage} />;
      case 'approvals':
        return isManager ? <ApprovalsPage /> : <AddDebtPage setActivePage={setActivePage} />;
      case 'firebase-storage':
        return isManager ? <FirebaseStoragePage setActivePage={setActivePage} /> : <AddDebtPage setActivePage={setActivePage} />;
      case 'settings':
        return isManager ? <SettingsPage setActivePage={setActivePage} /> : <AddDebtPage setActivePage={setActivePage} />;
      case 'worker-ledger':
        return <WorkerDebtLedgerPage setActivePage={setActivePage} />;
      default:
        return isManager ? <DashboardPage setActivePage={setActivePage} /> : <AddDebtPage setActivePage={setActivePage} />;
    }
  };

  return (
    <div className={`min-h-screen app-theme-${settings.theme || 'dark'} bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white pb-16 lg:pb-0`}>
      {/* Cloud Sync Status Alert Banner */}
      <CloudSyncBanner />

      {/* Top Navbar */}
      <Navbar
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        activePage={activePage}
        setActivePage={setActivePage}
      />

      {/* Main Body with Responsive Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Drawer */}
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          activePage={activePage}
          setActivePage={setActivePage}
        />

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {getRenderedPage()}
        </main>
      </div>

      {/* Mobile Bottom Quick Navigation Bar */}
      <nav className="fixed bottom-0 inset-x-0 z-30 lg:hidden glass-panel bg-slate-900/95 border-t border-slate-800/90 py-2 px-3 flex items-center justify-around">
        {isManager && <button
          onClick={() => setActivePage('dashboard')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold p-1 transition-all ${
            activePage === 'dashboard' ? 'text-emerald-400' : 'text-slate-400'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>الرئيسية</span>
        </button>}

        <button
          onClick={() => setActivePage('add-debt')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold p-1 transition-all ${
            activePage === 'add-debt' ? 'text-rose-400' : 'text-slate-400'
          }`}
        >
          <div className="w-6 h-6 rounded-full bg-rose-500/20 flex items-center justify-center">
            <PlusCircle className="w-4 h-4 text-rose-400" />
          </div>
          <span>دين جديد</span>
        </button>

        <button
          onClick={() => setActivePage('pay-debt')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold p-1 transition-all ${
            activePage === 'pay-debt' ? 'text-emerald-400' : 'text-slate-400'
          }`}
        >
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <CreditCard className="w-4 h-4 text-emerald-400" />
          </div>
          <span>تسديد</span>
        </button>

        {isWorker && (
          <button
            onClick={() => setActivePage('worker-ledger')}
            className={`flex flex-col items-center gap-1 text-[10px] font-bold p-1 transition-all ${
              activePage === 'worker-ledger' ? 'text-teal-400' : 'text-slate-400'
            }`}
          >
            <Users className="w-5 h-5" />
            <span>الزبائن</span>
          </button>
        )}

        {isManager && <button
          onClick={() => setActivePage('customers')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold p-1 transition-all ${
            activePage === 'customers' ? 'text-emerald-400' : 'text-slate-400'
          }`}
        >
          <Users className="w-5 h-5" />
          <span>الزبائن</span>
        </button>}

        {isManager && (
          <button
            onClick={() => setActivePage('approvals')}
            className={`relative flex flex-col items-center gap-1 text-[10px] font-bold p-1 transition-all ${
              activePage === 'approvals' ? 'text-amber-400' : 'text-slate-400'
            }`}
          >
            <CheckSquare className="w-5 h-5" />
            <span>الموافقات</span>
            {pendingApprovalsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-black text-[9px] flex items-center justify-center">
                {pendingApprovalsCount}
              </span>
            )}
          </button>
        )}
      </nav>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <MainLayout />
      </DataProvider>
    </AuthProvider>
  );
}
