import { useQuery } from '@tanstack/react-query';
import { Building2, Users, BookOpen, GraduationCap, TrendingUp, Award } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { dashboardApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import type { StudentDashboard as SDash, CourseStats } from '../../types';

const mockActivity = [
  { month: 'Jan', enrollments: 65 }, { month: 'Feb', enrollments: 80 },
  { month: 'Mar', enrollments: 72 }, { month: 'Apr', enrollments: 95 },
  { month: 'May', enrollments: 110 }, { month: 'Jun', enrollments: 130 },
];

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'SuperAdmin';

  const { data: adminData } = useQuery({
    queryKey: ['dashboard', 'admin'],
    queryFn: () => dashboardApi.admin().then(r => r.data),
    enabled: isSuperAdmin,
  });

  const { data: orgData } = useQuery({
    queryKey: ['dashboard', 'org', user?.organizationId],
    queryFn: () => dashboardApi.org(user!.organizationId).then(r => r.data),
    enabled: !isSuperAdmin && !!user?.organizationId,
  });

  const stats = isSuperAdmin ? [
    { label: 'Organizations', value: adminData?.totalOrgs ?? 0, icon: Building2, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Total Users',   value: adminData?.totalUsers ?? 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total Courses', value: adminData?.totalCourses ?? 0, icon: BookOpen, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Enrollments',   value: adminData?.totalEnrollments ?? 0, icon: GraduationCap, color: 'text-amber-600', bg: 'bg-amber-50' },
  ] : [
    { label: 'Total Users',   value: orgData?.totalUsers ?? 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Courses',       value: orgData?.totalCourses ?? 0, icon: BookOpen, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Enrollments',   value: orgData?.totalEnrollments ?? 0, icon: GraduationCap, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Completion %',  value: `${(orgData?.completionRate ?? 0).toFixed(0)}%`, icon: TrendingUp, color: 'text-brand-600', bg: 'bg-brand-50' },
  ];

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">
          {isSuperAdmin ? 'Super Admin Dashboard' : `${user?.role} Dashboard`}
        </h1>
        <p className="page-sub">{user?.organizationName} — Welcome back, {user?.firstName}!</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="stat-card">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">{s.label}</p>
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 mt-2">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Monthly Enrollments</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={mockActivity}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '13px' }} />
              <Bar dataKey="enrollments" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Enrollment Trend</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={mockActivity}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '13px' }} />
              <Line type="monotone" dataKey="enrollments" stroke="#6366f1" strokeWidth={2} dot={{ r: 4, fill: '#6366f1' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top courses */}
      {orgData?.topCourses && orgData.topCourses.length > 0 && (
        <div className="card p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Top Courses</h2>
          <div className="overflow-x-auto">
            <table className="table-auto">
              <thead><tr>
                <th>Course</th><th>Enrollments</th><th>Completion</th><th>Rating</th>
              </tr></thead>
              <tbody>
                {orgData.topCourses.map((c: CourseStats) => (
                  <tr key={c.courseId}>
                    <td className="font-medium text-gray-900">{c.title}</td>
                    <td>{c.enrollments}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="progress-bar w-24">
                          <div className="progress-bar-fill" style={{ width: `${c.completionRate}%` }} />
                        </div>
                        <span className="text-xs text-gray-500">{c.completionRate.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge-amber">⭐ {c.averageRating.toFixed(1)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
