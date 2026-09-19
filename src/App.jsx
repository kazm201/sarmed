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
import {
  LayoutDashboard,
  PlusCircle,
  CreditCard,
  Users,
  CheckSquare
} from 'lucide-react';

const MainLayout = () => {
  const { currentUser, isManager, isWorker, settings } = useAuth();
  const { pendingApprovalsCount } = useData();
  const [activePage, setActivePage] = useState(isManager ? 'dashboard' : 'add-debt');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (isWorker && !['add-debt', 'pay-debt', 'worker-ledger'].includes(activePage)) setActivePage('add-debt');
  }, [isWorker, activePage]);

  // If not logged in, show Login Screen
  if (!currentUser) {
    return <LoginPage />;
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
