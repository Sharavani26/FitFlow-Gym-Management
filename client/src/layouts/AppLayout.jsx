import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  CalendarCheck,
  CreditCard,
  Dumbbell,
  LayoutDashboard,
  LogOut,
  Menu,
  Tag,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Add one entry here as each module is built, so there are no dead links.
const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/plans', label: 'Plans', icon: Tag },
  { to: '/members', label: 'Members', icon: Users, roles: ['admin'] },
  { to: '/trainers', label: 'Trainers', icon: UserCheck, roles: ['admin'] },
  { to: '/attendance', label: 'Attendance', icon: CalendarCheck, roles: ['admin', 'member'] },
  { to: '/payments', label: 'Payments', icon: CreditCard, roles: ['admin'] },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const items = NAV.filter((item) => !item.roles || item.roles.includes(user?.role));

  const sidebar = (
    <div className="flex h-full flex-col bg-charcoal-900 text-slate-300">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="rounded-lg bg-lime-400 p-1.5 text-charcoal-900">
          <Dumbbell size={20} />
        </div>
        <span className="text-lg font-bold text-white">FitFlow</span>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive ? 'bg-lime-400 text-charcoal-900' : 'hover:bg-charcoal-700 hover:text-white'
              }`
            }
          >
            <Icon size={18} /> {label}
          </NavLink>
        ))}
      </nav>
      <button
        onClick={handleLogout}
        className="m-3 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-charcoal-700 hover:text-white"
      >
        <LogOut size={18} /> Log out
      </button>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="no-print hidden w-64 shrink-0 lg:block">{sidebar}</aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="relative h-full w-64">{sidebar}</aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <button className="rounded-lg p-2 hover:bg-slate-100 lg:hidden" onClick={() => setOpen((v) => !v)} aria-label="Menu">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="ml-auto text-right">
            <p className="text-sm font-semibold text-slate-900">{user?.name}</p>
            <p className="text-xs capitalize text-slate-500">{user?.role}</p>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}