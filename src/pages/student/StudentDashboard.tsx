import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import {
  BookOpen, Award, Clock, TrendingUp, Play,
  ChevronRight, Target, Timer, CheckCircle2, Calendar
} from 'lucide-react';
import { dashboardApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import clsx from 'clsx';

function fmtWatch(mins: number) {
  if (!mins) return '0m';
  const h = Math.floor(mins / 60), m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function StudentDashboard() {
  const { user } = useAuthStore();
  const navigate  = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['student-dash', user?.id],
    queryFn:  () => dashboardApi.student(user!.id).then(r => r.data),
    enabled:  !!user?.id,
  });

  const d = data as any;
  const weekActivity: any[] = d?.weekActivity ?? [];
  const activeEnrollments: any[] = d?.activeEnrollments ?? [];

  const stats = [
    { label: 'Enrolled',    value: d?.enrolledCourses    ?? 0, icon: BookOpen,    color: 'text-blue-600',   bg: 'bg-blue-50'   },
    { label: 'Completed',   value: d?.completedCourses   ?? 0, icon: TrendingUp,  color: 'text-green-600',  bg: 'bg-green-50'  },
    { label: 'Certificates',value: d?.certificatesEarned ?? 0, icon: Award,       color: 'text-amber-600',  bg: 'bg-amber-50'  },
    { label: 'Watch Time',  value: fmtWatch(d?.totalWatchMinutes ?? 0), icon: Timer, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Welcome back, {user?.firstName}! 👋</h1>
        <p className="page-sub">Keep up the great work on your learning journey</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', s.bg)}>
                <s.icon className={clsx('w-5 h-5', s.color)}/>
              </div>
            </div>
            <p className="text-3xl font-black text-gray-900">{isLoading ? '—' : s.value}</p>
            <p className="text-xs text-gray-500 font-medium mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Charts + quick links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Weekly watch time chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">Watch Time This Week</h3>
            <span className="text-xs text-gray-400">minutes per day</span>
          </div>
          {weekActivity.length === 0 || weekActivity.every(d => d.minutes === 0) ? (
            <div className="h-40 flex flex-col items-center justify-center text-gray-400 gap-2">
              <Timer className="w-10 h-10 opacity-20"/>
              <p className="text-sm font-medium">No watch activity yet this week</p>
              <button className="text-xs text-[var(--org-primary)] underline" onClick={() => navigate('/dashboard/my-courses')}>
                Start watching a lesson →
              </button>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={weekActivity} margin={{top:5,right:5,bottom:0,left:-30}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false}/>
                <XAxis dataKey="label" tick={{fontSize:11,fill:'#9ca3af'}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:11,fill:'#9ca3af'}} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{borderRadius:'12px',border:'1px solid #e5e7eb',fontSize:'12px'}}
                  formatter={(v:any) => [`${v} min`,'Watch Time']}/>
                <Bar dataKey="minutes" fill="var(--org-primary)" radius={[6,6,0,0]} maxBarSize={40}/>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-2">
            {[
              { icon: BookOpen, label: 'My Courses',      sub: 'Continue learning',      to: '/dashboard/my-courses',  color: 'bg-blue-50 text-blue-600' },
              { icon: Target,   label: 'Take a Mock Test', sub: 'Practice & improve',     to: '/dashboard/mock-tests',  color: 'bg-amber-50 text-amber-600' },
              { icon: Calendar, label: 'Live Schedule',   sub: 'Upcoming classes',        to: '/dashboard/live-classes',color: 'bg-green-50 text-green-600' },
              { icon: Award,    label: 'Certificates',    sub: `${d?.certificatesEarned ?? 0} earned`, to: '/dashboard/certificates', color: 'bg-purple-50 text-purple-600' },
            ].map(a => (
              <button key={a.label} onClick={() => navigate(a.to)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left group">
                <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', a.color)}>
                  <a.icon className="w-4 h-4"/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{a.label}</p>
                  <p className="text-xs text-gray-400">{a.sub}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors"/>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Active courses */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">Continue Learning</h3>
          <button className="text-xs text-[var(--org-primary)] font-semibold flex items-center gap-1"
            onClick={() => navigate('/dashboard/my-courses')}>
            View all <ChevronRight className="w-3.5 h-3.5"/>
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-3">{[...Array(3)].map((_,i) => <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-xl"/>)}</div>
        ) : activeEnrollments.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-20"/>
            <p className="font-medium text-gray-500">No active courses</p>
            <p className="text-sm mt-1 mb-4">Browse the catalog to start learning</p>
            <button className="btn-primary" onClick={() => navigate('/dashboard/catalog')}>Browse Courses</button>
          </div>
        ) : (
          <div className="space-y-3">
            {activeEnrollments.map((e:any) => (
              <div key={e.id}
                className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 hover:border-[var(--org-primary)]/30 hover:bg-[var(--org-primary)]/5 transition-all cursor-pointer group"
                onClick={() => navigate(`/dashboard/catalog/${e.courseId}`)}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{background:'linear-gradient(135deg,var(--org-primary),var(--org-secondary,var(--org-primary)))'}}>
                  <BookOpen className="w-6 h-6 text-white"/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{e.courseTitle}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <div className="flex-1 max-w-48 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{width:`${e.progressPercent}%`,background:'linear-gradient(90deg,var(--org-primary),var(--org-secondary,var(--org-primary)))'}}/>
                    </div>
                    <span className="text-xs font-bold text-gray-500">{e.progressPercent}%</span>
                  </div>
                </div>
                <button
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                  style={{background:'linear-gradient(135deg,var(--org-primary),var(--org-secondary,var(--org-primary)))'}}
                  onClick={e2 => { e2.stopPropagation(); navigate(`/dashboard/catalog/${e.courseId}`); }}>
                  <Play className="w-3.5 h-3.5"/> Continue
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
