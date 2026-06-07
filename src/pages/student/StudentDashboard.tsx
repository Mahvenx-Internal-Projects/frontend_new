import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Award, Clock, TrendingUp, Play, ChevronRight } from 'lucide-react';
import { dashboardApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import type { StudentDashboard as SDash } from '../../types';

export default function StudentDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery<SDash>({
    queryKey: ['student-dash', user?.id],
    queryFn: () => dashboardApi.student(user!.id).then(r => r.data),
    enabled: !!user?.id,
  });

  const stats = [
    { label: 'Enrolled Courses',   value: data?.enrolledCourses ?? 0,    icon: BookOpen,   color: 'text-brand-600', bg: 'bg-brand-50' },
    { label: 'Completed',          value: data?.completedCourses ?? 0,   icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Certificates',       value: data?.certificatesEarned ?? 0, icon: Award,      color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Watch Time (min)',   value: data?.totalWatchMinutes ?? 0,  icon: Clock,      color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Welcome back, {user?.firstName}! 👋</h1>
        <p className="page-sub">Continue your learning journey</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="stat-card">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-gray-500">{s.label}</p>
              <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center`}>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-2">{isLoading ? '—' : s.value}</p>
          </div>
        ))}
      </div>

      {/* Active courses */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Continue Learning</h2>
          <button className="btn-ghost text-sm" onClick={() => navigate('/dashboard/my-courses')}>
            View all <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-lg" />)}
          </div>
        ) : !data?.activeEnrollments?.length ? (
          <div className="text-center py-10 text-gray-400">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No active courses</p>
            <p className="text-sm mt-1">Browse the catalog to start learning</p>
            <button className="btn-primary mt-4" onClick={() => navigate('/dashboard/catalog')}>
              Browse Courses
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {data.activeEnrollments.map(e => (
              <div key={e.id} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-brand-200 hover:bg-brand-50/30 transition-all cursor-pointer group"
                onClick={() => navigate(`/dashboard/catalog/${e.courseId}`)}>
                <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-5 h-5 text-brand-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{e.courseTitle}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="progress-bar flex-1 max-w-32">
                      <div className="progress-bar-fill" style={{ width: `${e.progressPercent}%` }} />
                    </div>
                    <span className="text-xs text-gray-500">{e.progressPercent}% complete</span>
                  </div>
                </div>
                <button className="btn-primary text-xs opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <Play className="w-3 h-3" /> Resume
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Browse Catalog', desc: 'Find new courses', to: '/dashboard/catalog', icon: BookOpen, color: 'bg-brand-600' },
          { label: 'My Enrollments', desc: 'Track your progress', to: '/dashboard/my-courses', icon: TrendingUp, color: 'bg-green-600' },
          { label: 'Certificates', desc: 'View your achievements', to: '/dashboard/certificates', icon: Award, color: 'bg-amber-500' },
        ].map(a => (
          <button key={a.to} className="card p-5 flex items-center gap-4 hover:shadow-md transition-shadow text-left"
            onClick={() => navigate(a.to)}>
            <div className={`w-10 h-10 rounded-xl ${a.color} flex items-center justify-center flex-shrink-0`}>
              <a.icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">{a.label}</p>
              <p className="text-xs text-gray-500">{a.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
