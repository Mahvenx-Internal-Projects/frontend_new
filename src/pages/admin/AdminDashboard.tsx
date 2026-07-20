import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, AreaChart, Area
} from 'recharts';
import {
  Users, BookOpen, TrendingUp, Award, CreditCard,
  Activity, ChevronRight, UserPlus, Clock, Building2, Globe
} from 'lucide-react';
import SuperAdminDashboard from './SuperAdminDashboard';
import api, { dashboardApi } from '../../services/api';
import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import clsx from 'clsx';

const API_BASE = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? '' : 'https://api.worksupport360.com';

// ════════════════════════════════════════════════════════════════════════════
// SuperAdmin view — platform-wide stats across ALL organizations
// ════════════════════════════════════════════════════════════════════════════

// OrgAdmin / Instructor view — with total students + course-wise enrollment
// ════════════════════════════════════════════════════════════════════════════
function OrgDashboard() {
  const { user } = useAuthStore();
  const navigate  = useNavigate();
  const [selectedCourse, setSelectedCourse] = useState<any>(null);

  const orgId = user?.organizationId ?? 0;

  const { data, isLoading } = useQuery({
    queryKey: ['org-dash', orgId],
    queryFn: () => dashboardApi.org(orgId).then(r => r.data),
    enabled: !!orgId,
  });

  // Fetch students for selected course
  const { data: courseStudents, isLoading: studentsLoading } = useQuery({
    queryKey: ['course-students', selectedCourse?.id],
    queryFn: () => api.get(`/dashboard/org/${orgId}/course/${selectedCourse.id}/students`).then(r => r.data),
    enabled: !!selectedCourse && !!orgId,
  });

  const d = data as any;
  const topCourses: any[] = d?.topCourses ?? [];
  const monthly: any[]    = d?.monthlyActivity ?? [];
  const recent: any[]     = d?.recentStudents ?? [];

  const stats = [
    { label: 'Total Students',    value: d?.students      ?? 0, icon: Users,       color: 'text-blue-600',   bg: 'bg-blue-50'   },
    { label: 'Active Courses',    value: d?.courses       ?? 0, icon: BookOpen,    color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Total Enrollments', value: d?.enrollments   ?? 0, icon: TrendingUp,  color: 'text-green-600',  bg: 'bg-green-50'  },
    { label: 'Active This Week',  value: d?.activeStudents?? 0, icon: Activity,    color: 'text-amber-600',  bg: 'bg-amber-50'  },
    { label: 'Revenue',           value: d?.revenue ? `₹${Math.round(d.revenue).toLocaleString('en-IN')}` : '₹0', icon: CreditCard, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  if (isLoading) return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">{[...Array(5)].map((_,i) => <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-2xl"/>)}</div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">{[...Array(2)].map((_,i) => <div key={i} className="h-64 bg-gray-100 animate-pulse rounded-2xl"/>)}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-sub">
          Real-time overview of your organisation
          <span className="ml-3 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
            Org ID: {orgId} · User: {user?.email}
          </span>
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', s.bg)}>
                <s.icon className={clsx('w-5 h-5', s.color)}/>
              </div>
            </div>
            <p className="text-2xl font-black text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500 font-medium mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Course-wise Enrollment Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-500"/>
            Course-wise Enrollments
          </h3>
          <button className="text-xs text-[var(--org-primary)] font-semibold flex items-center gap-1"
            onClick={() => navigate('/dashboard/courses')}>View all <ChevronRight className="w-3.5 h-3.5"/></button>
        </div>
        {topCourses.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">No courses yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 text-xs font-bold text-gray-400 uppercase">#</th>
                  <th className="text-left py-2 px-3 text-xs font-bold text-gray-400 uppercase">Course</th>
                  <th className="text-center py-2 px-3 text-xs font-bold text-gray-400 uppercase">Enrolled</th>
                  <th className="text-center py-2 px-3 text-xs font-bold text-gray-400 uppercase">Completed</th>
                  <th className="text-left py-2 px-3 text-xs font-bold text-gray-400 uppercase">Progress</th>
                  <th className="text-right py-2 px-3 text-xs font-bold text-gray-400 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {topCourses.map((c:any, i:number) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-3">
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-black"
                        style={{background:'var(--org-primary)',display:'inline-flex'}}>{i+1}</span>
                    </td>
                    <td className="py-3 px-3">
                      <p className="font-semibold text-gray-800">{c.title}</p>
                      <p className="text-xs text-gray-400">⭐ {(c.averageRating??0).toFixed(1)}</p>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="font-black text-blue-600 text-lg">{c.enrollments}</span>
                      <p className="text-xs text-gray-400">students</p>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="font-bold text-green-600">{Math.round((c.completionRate??0) * c.enrollments / 100)}</span>
                      <p className="text-xs text-gray-400">{Math.round(c.completionRate??0)}%</p>
                    </td>
                    <td className="py-3 px-3">
                      <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{width:`${c.completionRate??0}%`,background:'var(--org-primary)'}}/>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        className="btn-primary text-xs px-3 py-1.5"
                        onClick={() => setSelectedCourse(c)}>
                        👥 View Students
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
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

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">Recent Students</h3>
            <button className="text-xs text-[var(--org-primary)] font-semibold flex items-center gap-1"
              onClick={() => navigate('/dashboard/users')}>View all <ChevronRight className="w-3.5 h-3.5"/></button>
          </div>
          {recent.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No students yet</div>
          ) : (
            <div className="space-y-2">
              {recent.map((u:any) => (
                <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                    style={{background:'linear-gradient(135deg,var(--org-primary),var(--org-secondary,var(--org-primary)))'}}>
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

      {/* ── Course Students Modal ───────────────────────────────── */}
      {selectedCourse && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="font-black text-gray-900">{selectedCourse.title}</h2>
                <p className="text-sm text-gray-400 mt-0.5">
                  {courseStudents?.totalEnrolled ?? '—'} enrolled ·{' '}
                  {courseStudents?.passed ?? '—'} passed exam ·{' '}
                  {courseStudents?.completed ?? '—'} completed
                </p>
              </div>
              <button className="btn-ghost p-2 rounded-xl" onClick={() => setSelectedCourse(null)}>✕</button>
            </div>

            {/* Student list */}
            <div className="overflow-y-auto flex-1 p-2">
              {studentsLoading ? (
                <div className="p-10 text-center text-gray-400">Loading students…</div>
              ) : (courseStudents?.students ?? []).length === 0 ? (
                <div className="p-10 text-center text-gray-400">No students enrolled yet</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-bold text-gray-400 uppercase">Student</th>
                      <th className="text-center py-3 px-4 text-xs font-bold text-gray-400 uppercase">Progress</th>
                      <th className="text-center py-3 px-4 text-xs font-bold text-gray-400 uppercase">Exam</th>
                      <th className="text-center py-3 px-4 text-xs font-bold text-gray-400 uppercase">Score</th>
                      <th className="text-left py-3 px-4 text-xs font-bold text-gray-400 uppercase">Enrolled</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(courseStudents.students as any[]).map((s:any) => (
                      <tr key={s.userId} className="hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                              style={{background:'linear-gradient(135deg,var(--org-primary),var(--org-secondary,var(--org-primary)))'}}>
                              {s.name.split(' ').map((n:string)=>n[0]).join('')}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-800">{s.name}</p>
                              <p className="text-xs text-gray-400">{s.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center gap-2 justify-center">
                            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{width:`${s.progressPercent}%`,background:'var(--org-primary)'}}/>
                            </div>
                            <span className="text-xs font-bold text-gray-600">{s.progressPercent}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {s.examAttempt ? (
                            <span className={clsx('text-xs font-bold px-2 py-0.5 rounded-full',
                              s.examAttempt.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                              {s.examAttempt.passed ? '✅ Passed' : '❌ Failed'}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">Not taken</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="font-black text-lg" style={{color:'var(--org-primary)'}}>
                            {s.examAttempt ? `${s.examAttempt.scorePercent}%` : '—'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-400">
                          {new Date(s.enrolledAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'2-digit'})}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {s.examAttempt ? (
                            <button
                              className="btn-primary text-xs px-3 py-1.5"
                              onClick={() => {
                                setSelectedCourse(null);
                                navigate(`/dashboard/exam-attempts/${s.examAttempt.examId}`);
                              }}>
                              View Marks
                            </button>
                          ) : <span className="text-xs text-gray-300">No exam</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => setSelectedCourse(null)}>Close</button>
              <button className="btn-primary"
                onClick={() => {
                  const examId = courseStudents?.linkedExamId ?? selectedCourse?.linkedExamId;
                  setSelectedCourse(null);
                  if (examId) navigate(`/dashboard/exam-attempts/${examId}`);
                  else navigate('/dashboard/mock-tests');
                }}>
                View All Exam Results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Entry point — route to the right dashboard based on role
// ════════════════════════════════════════════════════════════════════════════
export default function AdminDashboard() {
  const { user } = useAuthStore();
  if (user?.role === 'SuperAdmin') return <SuperAdminDashboard/>;
  return <OrgDashboard/>;
}
