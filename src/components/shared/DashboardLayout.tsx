import { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Users, BookOpen, FolderTree,
  GraduationCap, Award, ListChecks, LogOut, Menu, X,
  Bell, ChevronDown, ShoppingCart, Settings,
  Home, BarChart3, Repeat, CreditCard, Layout, Calendar,
  Video, FileText, UserCheck, ClipboardList, Target,
  PlusCircle, BarChart2, Briefcase, CheckSquare
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useOrgStore } from '../../store/orgStore';
import clsx from 'clsx';

// ─── Navigation definitions ────────────────────────────────────
type NavItem = { label: string; to: string; icon: any; badge?: string };

const adminNav: NavItem[] = [
  { label: 'Dashboard',       to: '/dashboard/admin',           icon: LayoutDashboard },
  { label: 'Organizations',   to: '/dashboard/organizations',   icon: Building2 },
  { label: 'Users',           to: '/dashboard/users',           icon: Users },
  { label: 'Courses',         to: '/dashboard/courses',         icon: BookOpen },
  { label: 'Categories',      to: '/dashboard/categories',      icon: FolderTree },
  { label: 'Departments',     to: '/dashboard/departments',     icon: Briefcase },
  { label: 'Mock Tests',      to: '/dashboard/mock-tests',      icon: ClipboardList },
  { label: 'Analytics',       to: '/dashboard/analytics',       icon: BarChart3 },
  { label: 'Payments',        to: '/dashboard/payments',        icon: CreditCard },
  { label: 'Homepage',        to: '/dashboard/homepage-editor', icon: Layout },
  { label: 'Org Settings',    to: '/dashboard/org-settings',    icon: Settings },
];

const instructorNav: NavItem[] = [
  { label: 'My Dashboard',      to: '/dashboard/trainer',                     icon: LayoutDashboard },
  { label: 'My Courses',        to: '/dashboard/courses',                     icon: BookOpen },
  { label: 'Mock Tests',        to: '/dashboard/mock-tests',                  icon: ClipboardList },
  { label: 'Assignments',       to: '/dashboard/assignments',                 icon: CheckSquare },
  { label: 'Live Classes',      to: '/dashboard/trainer?tab=liveclasses',     icon: Video },
  { label: 'Interview Schedule',to: '/dashboard/trainer?tab=interviews',      icon: UserCheck },
  { label: 'Attendance',        to: '/dashboard/trainer?tab=attendance',      icon: BarChart2 },
  { label: 'Students',          to: '/dashboard/users',                       icon: GraduationCap },
];

const studentNav: NavItem[] = [
  { label: 'Dashboard',          to: '/dashboard/student',       icon: LayoutDashboard },
  { label: 'My Courses',         to: '/dashboard/my-courses',    icon: ListChecks },
  { label: 'Course Catalog',     to: '/dashboard/catalog',       icon: BookOpen },
  { label: 'Training Schedule',  to: '/dashboard/live-classes',  icon: Calendar },
  { label: 'Mock Tests',         to: '/dashboard/mock-tests',    icon: Target },
  { label: 'Scores & Analysis',  to: '/dashboard/mock-tests',    icon: BarChart2 },
  { label: 'Assignments',        to: '/dashboard/assignments',   icon: FileText },
  { label: 'Interview Schedule',  to: '/dashboard/interviews',    icon: UserCheck },
  { label: 'Certificates',       to: '/dashboard/certificates',  icon: Award },
  { label: 'Cart',               to: '/dashboard/cart',          icon: ShoppingCart },
  { label: 'Orders',             to: '/dashboard/orders',        icon: CreditCard },
];

// Role → nav map
const navByRole: Record<string, NavItem[]> = {
  SuperAdmin:  adminNav,
  OrgAdmin:    adminNav,
  Instructor:  instructorNav,
  Student:     studentNav,
};

// Which roles a user can switch to (view-as)
const canViewAs: Record<string, string[]> = {
  SuperAdmin:  ['SuperAdmin', 'OrgAdmin', 'Instructor', 'Student'],
  OrgAdmin:    ['OrgAdmin', 'Instructor', 'Student'],
  Instructor:  ['Instructor', 'Student'],
  Student:     ['Student'],
};

const roleColors: Record<string, string> = {
  SuperAdmin:  '#dc2626',
  OrgAdmin:    '#7c3aed',
  Instructor:  '#0891b2',
  Student:     '#059669',
};

const roleIcons: Record<string, string> = {
  SuperAdmin:  '👑',
  OrgAdmin:    '🏢',
  Instructor:  '🎓',
  Student:     '📚',
};

const homePath: Record<string, string> = {
  SuperAdmin:  '/dashboard/admin',
  OrgAdmin:    '/dashboard/admin',
  Instructor:  '/dashboard/trainer',
  Student:     '/dashboard/student',
};

// ─── COMPONENT ─────────────────────────────────────────────────
export default function DashboardLayout() {
  const { user, logout } = useAuthStore();
  const { org } = useOrgStore();
  const navigate  = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen,   setNotifOpen]   = useState(false);

  // Active view role (can differ from user.role when SuperAdmin views as Student etc.)
  const [viewRole, setViewRole] = useState<string>(user?.role ?? 'Student');

  const profileRef = useRef<HTMLDivElement>(null);

  const primary   = org?.primaryColor   ?? '#6366f1';
  const secondary = org?.secondaryColor ?? '#8b5cf6';

  // Sync viewRole when user changes
  useEffect(() => {
    if (user?.role) setViewRole(user.role);
  }, [user?.role]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const navItems = navByRole[viewRole] ?? studentNav;
  const switchRoles = canViewAs[user?.role ?? 'Student'] ?? ['Student'];

  const switchToRole = (role: string) => {
    setViewRole(role);
    setProfileOpen(false);
    navigate(homePath[role] ?? '/dashboard/student');
  };

  const getInitials = () =>
    `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* ─── SIDEBAR ─────────────────────────────────────── */}
      <aside className={clsx(
        'flex flex-col bg-white border-r border-gray-200 transition-all duration-300 flex-shrink-0 shadow-sm',
        sidebarOpen ? 'w-64' : 'w-16'
      )}>
        {/* Org logo + name */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100"
          style={{ borderBottomColor: `${primary}30` }}>
          {/* Logo */}
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm"
            style={{ background: `linear-gradient(135deg,${primary},${secondary})` }}>
            {org?.logoUrl
              ? <img src={org.logoUrl} alt={org?.name} className="w-full h-full object-cover"/>
              : <span className="text-white font-black text-base">{org?.name?.[0] ?? 'E'}</span>
            }
          </div>
          {sidebarOpen && (
            <div className="flex-1 min-w-0">
              <p className="font-black text-gray-900 text-sm truncate leading-tight">{org?.name ?? 'EKSHA TECHNOLOGIES'}</p>
              <p className="text-xs text-gray-400 truncate">{viewRole}</p>
            </div>
          )}
        </div>

        {/* Active role badge */}
        {sidebarOpen && (
          <div className="px-4 py-2.5 border-b border-gray-100">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold"
              style={{ background: `${roleColors[viewRole]}15`, color: roleColors[viewRole] }}>
              <span>{roleIcons[viewRole]}</span>
              <span>{viewRole} View</span>
              {viewRole !== user?.role && (
                <span className="ml-auto bg-white rounded-full px-1.5 py-0.5 text-xs opacity-70">Viewing as</span>
              )}
            </div>
          </div>
        )}

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {navItems.map(item => (
            <NavLink key={`${item.label}-${item.to}`} to={item.to}
              className={({ isActive }) => clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-0.5 group',
                isActive
                  ? 'text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
              style={({ isActive }) => isActive
                ? { background: `linear-gradient(135deg,${primary},${secondary})` }
                : {}
              }>
              <item.icon className={clsx('flex-shrink-0 transition-all', sidebarOpen ? 'w-4 h-4' : 'w-5 h-5')}/>
              {sidebarOpen && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Collapse toggle */}
        <div className="p-2 border-t border-gray-100">
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <Menu className="w-4 h-4"/>
            {sidebarOpen && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* ─── MAIN ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 flex-shrink-0 shadow-sm">
          {/* Left: breadcrumb / greeting */}
          <div>
            <h1 className="text-sm font-bold text-gray-800">
              {viewRole === 'Student'
                ? `Welcome, ${user?.firstName}! 👋`
                : viewRole === 'Instructor'
                ? `Instructor Panel`
                : `${viewRole} Panel`}
            </h1>
            {viewRole !== user?.role && (
              <p className="text-xs text-amber-600 font-semibold">
                ⚠️ Viewing as {viewRole} — your actual role is {user?.role}
              </p>
            )}
          </div>

          {/* Right: role switcher + notifications + profile */}
          <div className="flex items-center gap-3" ref={profileRef}>

            {/* Role switcher (quick pills) */}
            {switchRoles.length > 1 && (
              <div className="hidden md:flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                {switchRoles.map(role => (
                  <button key={role} onClick={() => switchToRole(role)}
                    className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                      viewRole === role ? 'text-white shadow-sm' : 'text-gray-500 hover:text-gray-700')}
                    style={viewRole === role ? { background: `linear-gradient(135deg,${roleColors[role]},${roleColors[role]}cc)` } : {}}>
                    <span>{roleIcons[role]}</span>
                    <span>{role}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Notifications */}
            <button onClick={() => setNotifOpen(!notifOpen)}
              className="relative p-2 rounded-xl hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
              <Bell className="w-5 h-5"/>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500"/>
            </button>

            {/* Profile dropdown */}
            <div className="relative">
              <button onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-xl hover:bg-gray-100 transition-colors">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black shadow-sm flex-shrink-0"
                  style={{ background: `linear-gradient(135deg,${primary},${secondary})` }}>
                  {user?.avatarUrl
                    ? <img src={user.avatarUrl} alt="" className="w-full h-full rounded-full object-cover"/>
                    : getInitials()}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-semibold text-gray-800 leading-tight">{user?.firstName} {user?.lastName}</p>
                  <p className="text-xs text-gray-400 leading-tight">{user?.role}</p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 hidden md:block"/>
              </button>

              {/* Dropdown */}
              {profileOpen && (
                <div className="absolute right-0 top-12 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                  {/* User details card */}
                  <div className="px-4 py-4 border-b border-gray-100"
                    style={{ background: `linear-gradient(135deg,${primary}15,${secondary}10)` }}>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-sm font-black shadow-sm flex-shrink-0"
                        style={{ background: `linear-gradient(135deg,${primary},${secondary})` }}>
                        {getInitials()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-gray-900 text-sm truncate">{user?.firstName} {user?.lastName}</p>
                        <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full mt-1"
                          style={{ background: `${roleColors[user?.role ?? 'Student']}20`, color: roleColors[user?.role ?? 'Student'] }}>
                          {roleIcons[user?.role ?? 'Student']} {user?.role}
                        </span>
                      </div>
                    </div>
                    {org && (
                      <div className="flex items-center gap-2 mt-3 px-2 py-1.5 bg-white/60 rounded-xl">
                        {org.logoUrl
                          ? <img src={org.logoUrl} alt={org.name} className="w-5 h-5 rounded object-cover"/>
                          : <div className="w-5 h-5 rounded flex items-center justify-center text-white text-xs font-black" style={{background:primary}}>{org.name?.[0]}</div>
                        }
                        <span className="text-xs font-semibold text-gray-700 truncate">{org.name}</span>
                      </div>
                    )}
                  </div>

                  {/* Role switcher in dropdown (for mobile) */}
                  {switchRoles.length > 1 && (
                    <div className="px-3 py-3 border-b border-gray-100">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Switch View</p>
                      <div className="space-y-1">
                        {switchRoles.map(role => (
                          <button key={role} onClick={() => switchToRole(role)}
                            className={clsx('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all',
                              viewRole === role ? 'text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50')}
                            style={viewRole === role ? { background: `linear-gradient(135deg,${roleColors[role]},${roleColors[role]}bb)` } : {}}>
                            <span className="text-base">{roleIcons[role]}</span>
                            <div className="flex-1 text-left">
                              <p className={clsx('font-bold', viewRole === role ? 'text-white' : 'text-gray-800')}>{role}</p>
                              <p className={clsx('text-xs', viewRole === role ? 'text-white/70' : 'text-gray-400')}>
                                {role === 'SuperAdmin' ? 'Full system access' :
                                 role === 'OrgAdmin'   ? 'Organization admin' :
                                 role === 'Instructor' ? 'Create & manage courses' :
                                 'Student learning view'}
                              </p>
                            </div>
                            {viewRole === role && <span className="text-white/80 text-xs">Active</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Links */}
                  <div className="p-2">
                    <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                      onClick={() => { navigate('/dashboard/org-settings'); setProfileOpen(false); }}>
                      <Settings className="w-4 h-4"/> Settings
                    </button>
                    <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-colors font-semibold"
                      onClick={() => { logout(); navigate('/login'); }}>
                      <LogOut className="w-4 h-4"/> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet/>
        </main>
      </div>
    </div>
  );
}
