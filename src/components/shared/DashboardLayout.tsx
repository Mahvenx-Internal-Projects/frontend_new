import { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Users, BookOpen, FolderTree,
  GraduationCap, Award, ListChecks, LogOut, Menu, X,
  ChevronRight, Bell, ChevronDown, ShoppingCart, Settings,
  Home, BarChart3, Repeat, CreditCard, Layout
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useOrgStore } from '../../store/orgStore';
import clsx from 'clsx';

const trainerNav = [
  { label: 'My Dashboard',  to: '/dashboard/trainer',       icon: LayoutDashboard },
  { label: 'My Courses',    to: '/dashboard/courses',       icon: BookOpen },
  { label: 'Mock Tests',    to: '/dashboard/mock-tests',    icon: Award },
];

const adminNav = [
  { label: 'Dashboard',     to: '/dashboard/admin',         icon: LayoutDashboard },
  { label: 'Organizations', to: '/dashboard/organizations', icon: Building2,  roles: ['SuperAdmin'] },
  { label: 'Users',         to: '/dashboard/users',         icon: Users,      roles: ['SuperAdmin','OrgAdmin'] },
  { label: 'Categories',    to: '/dashboard/categories',    icon: FolderTree, roles: ['SuperAdmin','OrgAdmin'] },
  { label: 'Courses',       to: '/dashboard/courses',       icon: BookOpen },
  { label: 'Analytics',     to: '/dashboard/analytics',     icon: BarChart3,  roles: ['SuperAdmin','OrgAdmin'] },
  { label: 'Org Settings',  to: '/dashboard/org-settings',  icon: Settings,   roles: ['SuperAdmin','OrgAdmin'] },
  { label: 'Departments',    to: '/dashboard/departments',    icon: Building2,  roles: ['SuperAdmin','OrgAdmin'] },
  { label: 'Homepage',       to: '/dashboard/homepage-editor', icon: Layout,     roles: ['SuperAdmin','OrgAdmin'] },
  { label: 'Payments',       to: '/dashboard/payments',        icon: CreditCard, roles: ['SuperAdmin','OrgAdmin'] },
];

const studentNav = [
  { label: 'Dashboard',    to: '/dashboard/student',      icon: LayoutDashboard },
  { label: 'My Courses',   to: '/dashboard/my-courses',   icon: ListChecks },
  { label: 'Catalog',      to: '/dashboard/catalog',      icon: BookOpen },
  { label: 'Cart',         to: '/dashboard/cart',         icon: ShoppingCart },
  { label: 'Orders',       to: '/dashboard/orders',       icon: CreditCard },
  { label: 'Mock Tests',   to: '/dashboard/mock-tests',   icon: Award },
  { label: 'Certificates', to: '/dashboard/certificates', icon: Award },
];

// Roles user can switch to (for demo/admin convenience)
const switchableRoles: Record<string, string[]> = {
  SuperAdmin: ['SuperAdmin','OrgAdmin','Instructor','Student'],
  OrgAdmin:   ['OrgAdmin','Instructor','Student'],
  Instructor: ['Instructor','Student'],
  Student:    ['Student'],
};

export default function DashboardLayout() {
  const { user, logout } = useAuthStore();
  const { org } = useOrgStore();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isStudent   = user?.role === 'Student';
  const isInstructor = user?.role === 'Instructor';
  const navItems = isStudent ? studentNav : isInstructor ? trainerNav : adminNav;

  const handleLogout = () => { logout(); navigate('/'); };

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();

  const primary = org?.primaryColor || '#f97316';

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={clsx(
        'flex flex-col bg-white border-r border-gray-200 z-30 transition-all duration-200',
        'fixed inset-y-0 left-0 lg:relative lg:translate-x-0',
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        collapsed ? 'w-16' : 'w-64'
      )}>
        {/* Logo */}
        <div className={clsx('flex items-center gap-3 px-4 h-16 border-b border-gray-100', collapsed && 'justify-center')}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0 shadow-sm"
            style={{ background: `linear-gradient(135deg, ${primary}, ${org?.secondaryColor || '#ea580c'})` }}>
            {org?.name?.charAt(0) ?? 'L'}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="font-bold text-gray-900 text-sm truncate">{org?.name ?? 'LMS Portal'}</div>
              <div className="text-xs text-gray-400">{user?.role}</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {/* Home link */}
          <a href="/"
            className={clsx('flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors', collapsed && 'justify-center px-2')}>
            <Home className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>Portal Home</span>}
          </a>
          <div className="my-2 border-t border-gray-100" />

          {navItems.filter(item => {
            const roles = (item as any).roles as string[] | undefined;
            if (!roles) return true;
            return roles.includes(user?.role ?? '');
          }).map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => clsx(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
                collapsed && 'justify-center px-2'
              )}
              style={({ isActive }) => isActive ? { background: `linear-gradient(135deg, ${primary}, ${org?.secondaryColor || '#ea580c'})` } : {}}
              title={collapsed ? item.label : undefined}>
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="border-t border-gray-100 p-3">
          {!collapsed ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ background: `linear-gradient(135deg, ${primary}, ${org?.secondaryColor || '#ea580c'})` }}>
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-gray-900 truncate">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-gray-400 truncate">{user?.email}</p>
              </div>
              <button onClick={handleLogout} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-red-500 transition-colors" title="Logout">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button onClick={handleLogout} className="w-full flex justify-center p-2 rounded hover:bg-gray-100 text-gray-400 hover:text-red-500">
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-4 gap-4 flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors hidden lg:flex"
              onClick={() => setCollapsed(!collapsed)}>
              {collapsed ? <ChevronRight className="w-4 h-4 text-gray-600" /> : <Menu className="w-4 h-4 text-gray-600" />}
            </button>
            <button className="p-1.5 rounded-lg hover:bg-gray-100 lg:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="w-4 h-4 text-gray-600" /> : <Menu className="w-4 h-4 text-gray-600" />}
            </button>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-gray-800">
                {isStudent ? `Welcome, ${user?.firstName}! 👋` : `${user?.role} Panel`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2" ref={profileRef}>
            {/* Notifications */}
            <div className="relative">
              <button onClick={() => setNotifOpen(!notifOpen)}
                className="p-2 rounded-lg hover:bg-gray-100 relative transition-colors">
                <Bell className="w-4 h-4 text-gray-600" />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500" />
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-10 w-72 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-800">Notifications</p>
                  </div>
                  {[
                    { icon: '🎓', text: 'New course available: React 19 Masterclass', time: '2h ago' },
                    { icon: '🏆', text: 'You earned a certificate!', time: '1d ago' },
                    { icon: '📢', text: 'New announcement from admin', time: '3d ago' },
                  ].map((n, i) => (
                    <div key={i} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50">
                      <span className="text-lg flex-shrink-0">{n.icon}</span>
                      <div className="min-w-0">
                        <p className="text-xs text-gray-700">{n.text}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{n.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Profile + Role switcher */}
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: `linear-gradient(135deg, ${primary}, ${org?.secondaryColor || '#ea580c'})` }}>
                  {initials}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-semibold text-gray-800 leading-tight">{user?.firstName} {user?.lastName}</p>
                  <p className="text-xs text-gray-400 leading-tight">{user?.role}</p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-11 w-64 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                  {/* User info */}
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900">{user?.firstName} {user?.lastName}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>

                  {/* Switch Role section */}
                  {(switchableRoles[user?.role ?? '']?.length ?? 0) > 1 && (
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Switch View</p>
                      {switchableRoles[user?.role ?? ''].map(role => (
                        <button key={role}
                          onClick={() => {
                            setProfileOpen(false);
                            // Navigate to appropriate dashboard for that role
                            if (role === 'Student') navigate('/dashboard/student');
                            else navigate('/dashboard/admin');
                          }}
                          className={clsx(
                            'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors mb-0.5',
                            user?.role === role
                              ? 'text-white'
                              : 'text-gray-600 hover:bg-gray-100'
                          )}
                          style={user?.role === role ? { background: `linear-gradient(135deg, ${primary}, ${org?.secondaryColor || '#ea580c'})` } : {}}>
                          <span className="w-2 h-2 rounded-full" style={{ background: user?.role === role ? 'white' : '#d1d5db' }} />
                          {role} Dashboard
                          {user?.role === role && <span className="ml-auto text-white/70">Active</span>}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="p-2">
                    <button onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors">
                      <LogOut className="w-3.5 h-3.5" /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
