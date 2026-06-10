import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, AreaChart, Area
} from 'recharts';
import {
  Users, BookOpen, TrendingUp, Award, CreditCard,
  Activity, ChevronRight, UserPlus, Clock
} from 'lucide-react';
import { dashboardApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import clsx from 'clsx';

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['org-dash', user?.organizationId],
queryFn: async () => {
      const orgId = user!.organizationId;
      if (!orgId) return {};
      return dashboardApi.org(orgId).then(r => r.data);
    },
    enabled: !!user,
  });

  const d = data as any;
  const primary = 'var(--org-primary)';

  const stats = [
    { label: 'Total Students',    value: d?.students      ?? 0, icon: Users,       color: 'text-blue-600',   bg: 'bg-blue-50',   change: '+12%' },
    { label: 'Active Courses',    value: d?.courses       ?? 0, icon: BookOpen,    color: 'text-purple-600', bg: 'bg-purple-50', change: `${d?.courses ?? 0} total` },
    { label: 'Total Enrollments', value: d?.enrollments   ?? 0, icon: TrendingUp,  color: 'text-green-600',  bg: 'bg-green-50',  change: `${Math.round(d?.completionRate ?? 0)}% done` },
    { label: 'Active This Week',  value: d?.activeStudents?? 0, icon: Activity,    color: 'text-amber-600',  bg: 'bg-amber-50',  change: 'last 7 days' },
    { label: 'Revenue (₹)',       value: d?.revenue ? `₹${Math.round(d.revenue).toLocaleString('en-IN')}` : '₹0', icon: CreditCard, color: 'text-emerald-600', bg: 'bg-emerald-50', change: 'all time' },
  ];

  const topCourses: any[] = d?.topCourses ?? [];
  const monthly: any[]    = d?.monthlyActivity ?? [];
  const recent: any[]     = d?.recentStudents ?? [];

  if (isLoading) return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">{[...Array(5)].map((_,i) => <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-2xl"/>)}</div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">{[...Array(2)].map((_,i) => <div key={i} className="h-64 bg-gray-100 animate-pulse rounded-2xl"/>)}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">Real-time overview of your organisation</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', s.bg)}>
                <s.icon className={clsx('w-5 h-5', s.color)}/>
              </div>
              <span className="text-xs text-gray-400">{s.change}</span>
            </div>
            <p className="text-2xl font-black text-gray-900">{isLoading ? '—' : s.value}</p>
            <p className="text-xs text-gray-500 font-medium mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Monthly enrollments */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">Monthly Enrollments</h3>
            <span className="text-xs text-gray-400">Last 6 months</span>
          </div>
          {monthly.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No enrollment data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={monthly} margin={{top:5,right:10,bottom:0,left:-20}}>
                <defs>
                  <linearGradient id="enGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--org-primary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--org-primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/>
                <XAxis dataKey="label" tick={{fontSize:11,fill:'#9ca3af'}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:11,fill:'#9ca3af'}} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{borderRadius:'12px',border:'1px solid #e5e7eb',fontSize:'12px'}}
                  formatter={(v:any) => [`${v} enrollments`,'Count']}/>
                <Area type="monotone" dataKey="enrollments" stroke="var(--org-primary)" strokeWidth={2} fill="url(#enGrad)"/>
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Monthly revenue */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">Monthly Revenue</h3>
            <span className="text-xs text-gray-400">₹ Last 6 months</span>
          </div>
          {monthly.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No revenue data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={monthly} margin={{top:5,right:10,bottom:0,left:-10}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false}/>
                <XAxis dataKey="label" tick={{fontSize:11,fill:'#9ca3af'}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:11,fill:'#9ca3af'}} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{borderRadius:'12px',border:'1px solid #e5e7eb',fontSize:'12px'}}
                  formatter={(v:any) => [`₹${Number(v).toLocaleString('en-IN')}`,'Revenue']}/>
                <Bar dataKey="revenue" fill="var(--org-primary)" radius={[6,6,0,0]} maxBarSize={40}/>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top courses */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">Top Courses</h3>
            <button className="text-xs text-[var(--org-primary)] font-semibold flex items-center gap-1"
              onClick={() => navigate('/dashboard/courses')}>View all <ChevronRight className="w-3.5 h-3.5"/></button>
          </div>
          {topCourses.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No courses yet. <button className="text-[var(--org-primary)] underline" onClick={() => navigate('/dashboard/courses/new')}>Create one →</button></div>
          ) : (
            <div className="space-y-3">
              {topCourses.map((c:any, i:number) => (
                <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/dashboard/courses/${c.id}/edit`)}>
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                    style={{background:`linear-gradient(135deg,var(--org-primary),var(--org-secondary,var(--org-primary)))`}}>{i+1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{c.title}</p>
                    <p className="text-xs text-gray-400">{c.enrollments} enrolled · {Math.round(c.completionRate)}% done</p>
                  </div>
                  <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
                    <div className="h-full rounded-full" style={{width:`${c.completionRate}%`,background:'var(--org-primary)'}}/>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent students */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">Recent Students</h3>
            <button className="text-xs text-[var(--org-primary)] font-semibold flex items-center gap-1"
              onClick={() => navigate('/dashboard/users')}>View all <ChevronRight className="w-3.5 h-3.5"/></button>
          </div>
          {recent.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No students yet</div>
          ) : (
            <div className="space-y-3">
              {recent.map((u:any) => (
                <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                    style={{background:`linear-gradient(135deg,var(--org-primary),var(--org-secondary,var(--org-primary)))`}}>
                    {u.firstName?.[0]}{u.lastName?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{u.firstName} {u.lastName}</p>
                    <p className="text-xs text-gray-400 truncate">{u.email}</p>
                  </div>
                  <span className="text-xs text-gray-400">{new Date(u.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
