import { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Users, BookOpen, FolderTree,
  GraduationCap, Award, ListChecks, LogOut, Menu, X,
  Bell, ChevronDown, ShoppingCart, Settings,
  BarChart3, CreditCard, Layout, Calendar,
  Video, ClipboardList, Target, CheckSquare,
  BarChart2, Briefcase, UserCheck, FileText,
  ChevronRight, Search, Home
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useOrgStore } from '../../store/orgStore';
import clsx from 'clsx';

type NavItem = { label: string; to: string; icon: any; badge?: string };

const adminNav: NavItem[] = [
  { label: 'Dashboard',       to: '/dashboard/admin',           icon: LayoutDashboard },
  { label: 'Organizations',   to: '/dashboard/organizations',   icon: Building2 },
  { label: 'Users',           to: '/dashboard/users',           icon: Users },
  { label: 'Courses',         to: '/dashboard/courses',         icon: BookOpen },
  { label: 'Categories',      to: '/dashboard/categories',      icon: FolderTree },
  { label: 'Departments',     to: '/dashboard/departments',     icon: Briefcase },
  { label: 'Mock Tests',      to: '/dashboard/mock-tests',      icon: ClipboardList },
  { label: 'Assignments',     to: '/dashboard/assignments',     icon: CheckSquare },
  { label: 'Training Batches',to: '/dashboard/training-batches',icon: Calendar },
  { label: 'Analytics',       to: '/dashboard/analytics',       icon: BarChart3 },
  { label: 'Payments',        to: '/dashboard/payments',        icon: CreditCard },
  { label: 'Homepage',        to: '/dashboard/homepage-editor', icon: Layout },
  { label: 'Org Settings',    to: '/dashboard/org-settings',    icon: Settings },
];

const instructorNav: NavItem[] = [
  { label: 'Dashboard',         to: '/dashboard/trainer',                   icon: LayoutDashboard },
  { label: 'My Courses',        to: '/dashboard/courses',                   icon: BookOpen },
  { label: 'Assignments',       to: '/dashboard/assignments',               icon: CheckSquare },
  { label: 'Mock Tests',        to: '/dashboard/mock-tests',                icon: Target },
  { label: 'Training Batches',  to: '/dashboard/training-batches',           icon: Calendar },
  { label: 'Live Classes',      to: '/dashboard/trainer?tab=liveclasses',   icon: Video },
  { label: 'Interview Schedule',to: '/dashboard/trainer?tab=interviews',    icon: UserCheck },
  { label: 'Attendance',        to: '/dashboard/trainer?tab=attendance',    icon: BarChart2 },
  { label: 'Students',          to: '/dashboard/users',                     icon: GraduationCap },
];

const studentNav: NavItem[] = [
  { label: 'Dashboard',          to: '/dashboard/student',       icon: LayoutDashboard },
  { label: 'My Courses',         to: '/dashboard/my-courses',    icon: ListChecks },
  { label: 'Course Catalog',     to: '/dashboard/catalog',       icon: BookOpen },
  { label: 'Training Schedule',  to: '/dashboard/live-classes',  icon: Calendar },
  { label: 'Assignments',        to: '/dashboard/assignments',   icon: FileText },
  { label: 'Mock Tests',         to: '/dashboard/mock-tests',    icon: Target },
  { label: 'Interview Schedule', to: '/dashboard/interviews',    icon: UserCheck },
  { label: 'Certificates',       to: '/dashboard/certificates',  icon: Award },
  { label: 'Orders',             to: '/dashboard/orders',        icon: CreditCard },
];

const navByRole: Record<string, NavItem[]> = {
  SuperAdmin: adminNav, OrgAdmin: adminNav,
  Instructor: instructorNav, Student: studentNav,
};

const canViewAs: Record<string, string[]> = {
  SuperAdmin: ['SuperAdmin','OrgAdmin','Instructor','Student'],
  OrgAdmin:   ['OrgAdmin','Instructor','Student'],
  Instructor: ['Instructor','Student'],
  Student:    ['Student'],
};

const roleColors: Record<string,string> = {
  SuperAdmin:'#ef4444', OrgAdmin:'#7c3aed', Instructor:'#0891b2', Student:'#059669',
};
const roleIcons: Record<string,string> = {
  SuperAdmin:'👑', OrgAdmin:'🏢', Instructor:'🎓', Student:'📚',
};
const homePath: Record<string,string> = {
  SuperAdmin:'/dashboard/admin', OrgAdmin:'/dashboard/admin',
  Instructor:'/dashboard/trainer', Student:'/dashboard/student',
};

export default function DashboardLayout() {
  const { user, logout } = useAuthStore();
  const { org }          = useOrgStore();
  const navigate         = useNavigate();
  const location         = useLocation();

  const [collapsed,    setCollapsed]    = useState(false);
  const [profileOpen,  setProfileOpen]  = useState(false);
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [viewRole,     setViewRole]     = useState<string>(user?.role ?? 'Student');
  const profileRef = useRef<HTMLDivElement>(null);

  const primary   = org?.primaryColor   ?? '#6366f1';
  const secondary = org?.secondaryColor ?? '#8b5cf6';

  useEffect(() => { if (user?.role) setViewRole(user.role); }, [user?.role]);
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node))
        setProfileOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const switchToRole = (role: string) => {
    setViewRole(role); setProfileOpen(false); setMobileOpen(false);
    navigate(homePath[role] ?? '/dashboard/student');
  };

  const navItems     = navByRole[viewRole] ?? studentNav;
  const switchRoles  = canViewAs[user?.role ?? 'Student'] ?? ['Student'];
  const initials     = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 py-5 flex-shrink-0">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden shadow-md"
          style={{ background: `linear-gradient(135deg,${primary},${secondary})` }}>
          {org?.logoUrl
            ? <img src={org.logoUrl} alt="" className="w-full h-full object-cover"/>
            : <span className="text-white font-black text-sm">{org?.name?.[0] ?? 'L'}</span>
          }
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 text-sm truncate leading-tight">{org?.name ?? 'LMS Portal'}</p>
            <p className="text-xs text-gray-400 truncate">{viewRole} View</p>
          </div>
        )}
      </div>

      {/* Role badge */}
      {!collapsed && (
        <div className="px-3 mb-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
            style={{ background: `${roleColors[viewRole]}12`, color: roleColors[viewRole] }}>
            <span className="text-sm">{roleIcons[viewRole]}</span>
            <span>{viewRole}</span>
            {viewRole !== user?.role && (
              <span className="ml-auto text-[10px] opacity-60 bg-white px-1.5 py-0.5 rounded-full">
                Viewing as
              </span>
            )}
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 space-y-0.5 pb-4">
        {navItems.map(item => (
          <NavLink key={`${item.label}-${item.to}`} to={item.to}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group',
              collapsed && 'justify-center',
              isActive
                ? 'text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            )}
            style={({ isActive }) => isActive
              ? { background: `linear-gradient(135deg,${primary},${secondary})` }
              : {}
            }
            title={collapsed ? item.label : undefined}>
            <item.icon className={clsx('flex-shrink-0 transition-all', collapsed ? 'w-5 h-5' : 'w-4 h-4')}/>
            {!collapsed && <span className="truncate">{item.label}</span>}
            {!collapsed && item.badge && (
              <span className="ml-auto text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Portal link */}
      {!collapsed && (
        <div className="px-3 pb-3">
          <button onClick={() => navigate('/')}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold
                       text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors">
            <Home className="w-4 h-4"/> Visit Portal
          </button>
        </div>
      )}

      {/* Collapse toggle */}
      <div className="px-3 pb-4 border-t border-gray-100 pt-3">
        <button onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2
                     rounded-xl text-xs text-gray-400 hover:bg-gray-100
                     hover:text-gray-600 transition-colors">
          <Menu className="w-4 h-4"/>
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Desktop sidebar */}
      <aside className={clsx(
        'hidden lg:flex flex-col bg-white border-r border-gray-100 transition-all duration-300 flex-shrink-0',
        collapsed ? 'w-[68px]' : 'w-60'
      )} style={{ boxShadow: '1px 0 0 #f3f4f6' }}>
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)}/>
          <aside className="relative w-72 bg-white flex flex-col shadow-xl">
            <div className="absolute top-4 right-4">
              <button onClick={() => setMobileOpen(false)} className="p-2 rounded-xl hover:bg-gray-100">
                <X className="w-4 h-4 text-gray-500"/>
              </button>
            </div>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="flex items-center justify-between px-4 lg:px-6 py-3 bg-white border-b border-gray-100 flex-shrink-0"
          style={{ boxShadow: '0 1px 0 #f3f4f6' }}>
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden p-2 rounded-xl hover:bg-gray-100">
              <Menu className="w-5 h-5 text-gray-600"/>
            </button>
            <div>
              <p className="text-sm font-semibold text-gray-800 leading-tight">
                {viewRole === 'Student'
                  ? `Welcome back, ${user?.firstName}! 👋`
                  : viewRole === 'Instructor' ? 'Instructor Panel'
                  : `${viewRole} Panel`}
              </p>
              {viewRole !== user?.role && (
                <p className="text-xs text-amber-500 font-medium">
                  Viewing as {viewRole} — actual role: {user?.role}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2" ref={profileRef}>
            {/* Role switcher pills */}
            {switchRoles.length > 1 && (
              <div className="hidden md:flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                {switchRoles.map(role => (
                  <button key={role} onClick={() => switchToRole(role)}
                    className={clsx('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
                      viewRole === role ? 'text-white shadow-sm' : 'text-gray-500 hover:text-gray-700')}
                    style={viewRole === role ? { background: `linear-gradient(135deg,${roleColors[role]},${roleColors[role]}cc)` } : {}}>
                    <span className="text-sm">{roleIcons[role]}</span>
                    <span className="hidden xl:inline">{role}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Notifications */}
            <button className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors">
              <Bell className="w-5 h-5 text-gray-500"/>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white"/>
            </button>

            {/* Profile */}
            <div className="relative">
              <button onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2.5 pl-1 pr-3 py-1.5 rounded-xl
                           hover:bg-gray-100 transition-colors group">
                <div className="avatar w-8 h-8 text-xs font-black flex-shrink-0">
                  {user?.avatarUrl
                    ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover rounded-full"/>
                    : initials}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-semibold text-gray-800 leading-none">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{user?.role}</p>
                </div>
                <ChevronDown className={clsx('w-3.5 h-3.5 text-gray-400 hidden md:block transition-transform',
                  profileOpen && 'rotate-180')}/>
              </button>

              {/* Profile dropdown */}
              {profileOpen && (
                <div className="absolute right-0 top-12 w-72 bg-white rounded-2xl shadow-xl
                                border border-gray-100 z-50 overflow-hidden animate-scale-in">
                  {/* User card */}
                  <div className="p-4 border-b border-gray-100"
                    style={{ background: `linear-gradient(135deg,${primary}10,${secondary}08)` }}>
                    <div className="flex items-center gap-3">
                      <div className="avatar w-12 h-12 text-sm font-black flex-shrink-0">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 text-sm truncate">
                          {user?.firstName} {user?.lastName}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold
                                         px-2 py-0.5 rounded-full mt-1"
                          style={{ background:`${roleColors[user?.role??'Student']}15`, color:roleColors[user?.role??'Student'] }}>
                          {roleIcons[user?.role ?? 'Student']} {user?.role}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Mobile role switcher */}
                  {switchRoles.length > 1 && (
                    <div className="p-2 border-b border-gray-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 mb-1.5">
                        Switch View
                      </p>
                      {switchRoles.map(role => (
                        <button key={role} onClick={() => switchToRole(role)}
                          className={clsx('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                            viewRole === role ? 'text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50')}
                          style={viewRole === role ? { background:`linear-gradient(135deg,${roleColors[role]},${roleColors[role]}bb)` } : {}}>
                          <span className="text-base">{roleIcons[role]}</span>
                          <div className="flex-1 text-left">
                            <p className="font-semibold text-sm">{role}</p>
                            <p className={clsx('text-xs', viewRole===role ? 'opacity-70' : 'text-gray-400')}>
                              {role==='SuperAdmin'?'Full system access':role==='OrgAdmin'?'Organisation admin':role==='Instructor'?'Create & manage courses':'Learning dashboard'}
                            </p>
                          </div>
                          {viewRole === role && <span className="text-xs opacity-60">Active</span>}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="p-2">
                    <button onClick={() => { navigate('/dashboard/org-settings'); setProfileOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                                 text-sm text-gray-600 hover:bg-gray-50 transition-colors font-medium">
                      <Settings className="w-4 h-4"/> Settings
                    </button>
                    <button onClick={() => { logout(); navigate('/login'); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                                 text-sm text-red-500 hover:bg-red-50 transition-colors font-semibold">
                      <LogOut className="w-4 h-4"/> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
