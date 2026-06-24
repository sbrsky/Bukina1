import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  FileText,
  Settings,
  ListChecks,
  Calendar,
  Clock,
  Menu,
  LogOut,
  ExternalLink,
  Image,
} from 'lucide-react';
import DuckAssistant from './DuckAssistant';

const navItems = [
  { to: '/admin', label: 'Дашборд', icon: LayoutDashboard, end: true },
  { to: '/admin/content', label: 'Контент сайта', icon: FileText },
  { to: '/admin/works', label: 'Наши работы', icon: Image },
  { to: '/admin/services', label: 'Услуги', icon: ListChecks },
  { to: '/admin/bookings', label: 'Бронирования', icon: Calendar },
  { to: '/admin/slots', label: 'Слоты', icon: Clock },
  { to: '/admin/settings', label: 'Настройки', icon: Settings },
];

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/admin/login');
  };

  const Sidebar = () => (
    <aside className="flex flex-col h-full w-[260px] bg-gradient-to-b from-slate-900 to-slate-950 border-r border-white/[0.06]">
      {/* Logo with breathing glow */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/[0.06]">
        <div className="relative">
          {/* Glow pulse layer */}
          <div className="absolute inset-0 rounded-2xl bg-primary/20 animate-[glow-pulse_3s_ease-in-out_infinite] blur-md" />
          <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/5 border border-primary/25 flex items-center justify-center shadow-lg shadow-primary/15">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-primary">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor" opacity="0.9"/>
            </svg>
          </div>
        </div>
        <div>
          <div className="text-white font-bold text-sm tracking-wide">SKINLAB</div>
          <div className="text-slate-600 text-[10px] uppercase tracking-widest font-medium">Admin Panel</div>
        </div>
      </div>

      {/* Nav with staggered entrance */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
        {navItems.map((item, i) => (
          <motion.div
            key={item.to}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 * i, duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          >
            <NavLink
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 group relative ${
                  isActive
                    ? 'bg-primary/15 text-primary shadow-sm'
                    : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.04]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="nav-active"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-primary"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  <item.icon size={16} className={isActive ? 'text-primary' : ''} />
                  {item.label}
                </>
              )}
            </NavLink>
          </motion.div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/[0.06] flex flex-col gap-0.5">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-slate-600 hover:text-slate-200 hover:bg-white/[0.04] transition-all"
        >
          <ExternalLink size={15} />
          Открыть сайт
        </a>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-slate-600 hover:text-red-400 hover:bg-red-500/[0.06] transition-all w-full text-left"
        >
          <LogOut size={15} />
          Выйти
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="lg:hidden fixed inset-y-0 left-0 z-50"
            >
              <Sidebar />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-slate-900/80 border-b border-white/[0.06] backdrop-blur-xl sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white"
              aria-label="Открыть меню"
            >
              <Menu size={16} />
            </button>
            <span className="text-white font-bold text-sm">SKINLAB</span>
          </div>
        </header>

        {/* Page content with entrance */}
        <motion.main
          className="flex-1 overflow-auto p-5 lg:p-8"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
        >
          <Outlet />
        </motion.main>
      </div>

      {/* Global Admin Assistant */}
      <DuckAssistant />
    </div>
  );
}
