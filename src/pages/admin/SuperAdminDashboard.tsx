import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Building2, Users, BookOpen, TrendingUp, Award,
  CheckCircle2, X, ChevronDown, ChevronUp,
  Search, Mail, Phone, BarChart3, Target
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import api from '../../services/api';
import clsx from 'clsx';

const fmt    = (d: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';
const fmtNum = (n: number) => (n ?? 0).toLocaleString('en-IN');
const round  = (n: number) => Math.round(n ?? 0);

// ─── Org Detail Modal ──────────────────────────────────────────
function OrgDetailModal({ org, onClose }: { org: any; onClose: () => void }) {
  const [tab, setTab]       = useState<'users' | 'exams'>('users');
  const [search, setSearch] = useState('');
  const [expandExam, setExpandExam] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['superadmin-org', org.id],
    queryFn: () => api.get(`/dashboard/superadmin/org/${org.id}`).then(r => r.data),
  });

  const d = data as any;
  const users: any[]  = d?.users  ?? [];
  const exams: any[]  = d?.exams  ?? [];
  const summary       = d?.summary ?? {};
  const filtered      = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl my-8">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between"
          style={{ background: `linear-gradient(135deg,${org.primaryColor ?? '#6366f1'}18,white)` }}>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl font-black flex-shrink-0"
              style={{ background: org.primaryColor ?? '#6366f1' }}>
              {org.name?.[0]}
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900">{org.name}</h2>
              <div className="flex flex-wrap gap-3 mt-1 text-sm text-gray-500">
                <span>👥 {fmtNum(org.studentCount)} students</span>
                <span>📚 {org.courseCount} courses</span>
                <span>📋 {fmtNum(org.enrollmentCount)} enrolled</span>
                <span>📝 {org.examAttempts} attempts</span>
                {org.examAttempts > 0 && (
                  <span className={clsx('font-bold', (org.examPassed/org.examAttempts*100) >= 80 ? 'text-green-600' : 'text-amber-600')}>
                    ✅ {Math.round(org.examPassed/org.examAttempts*100)}% pass rate
                  </span>
                )}
              </div>
            </div>
          </div>
          <button className="btn-ghost p-2 rounded-xl" onClick={onClose}><X className="w-5 h-5"/></button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 p-5 border-b border-gray-100">
          {[
            { label: 'Students',    value: fmtNum(summary.students),        bg: 'bg-blue-50',    color: 'text-blue-700' },
            { label: 'Instructors', value: summary.instructors,              bg: 'bg-purple-50',  color: 'text-purple-700' },
            { label: 'Exams',       value: summary.totalExams,               bg: 'bg-indigo-50',  color: 'text-indigo-700' },
            { label: 'Attempts',    value: fmtNum(summary.totalAttempts),    bg: 'bg-amber-50',   color: 'text-amber-700' },
            { label: 'Passed',      value: exams.reduce((s:number,e:any)=>s+e.passed,0), bg: 'bg-green-50', color: 'text-green-700' },
            { label: 'Pass Rate',   value: `${round(summary.overallPassRate)}%`, bg: 'bg-emerald-50', color: 'text-emerald-700' },
          ].map(s => (
            <div key={s.label} className={clsx('rounded-xl p-3 text-center', s.bg)}>
              <p className={clsx('text-2xl font-black', s.color)}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 items-center">
          {(['users','exams'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={clsx('px-6 py-3 text-sm font-bold transition-colors',
                tab === t ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-400 hover:text-gray-600')}>
              {t === 'users' ? `👥 Members (${users.length})` : `📝 Exams (${exams.length})`}
            </button>
          ))}
          {tab === 'users' && (
            <div className="ml-auto px-4">
              <input className="input py-1.5 text-xs w-48" placeholder="Search…"
                value={search} onChange={e => setSearch(e.target.value)}/>
            </div>
          )}
        </div>

        <div className="max-h-[55vh] overflow-y-auto">
          {isLoading ? (
            <div className="p-10 text-center text-gray-400">Loading…</div>
          ) : tab === 'users' ? (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left py-3 px-5 text-xs font-bold text-gray-400 uppercase">Member</th>
                  <th className="text-center py-3 px-3 text-xs font-bold text-gray-400 uppercase">Role</th>
                  <th className="text-center py-3 px-3 text-xs font-bold text-gray-400 uppercase">Courses</th>
                  <th className="text-center py-3 px-3 text-xs font-bold text-gray-400 uppercase">Exams</th>
                  <th className="text-center py-3 px-3 text-xs font-bold text-gray-400 uppercase">Passed</th>
                  <th className="text-center py-3 px-3 text-xs font-bold text-gray-400 uppercase">Avg Score</th>
                  <th className="text-left py-3 px-3 text-xs font-bold text-gray-400 uppercase">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((u: any) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                          style={{ background: org.primaryColor ?? '#6366f1' }}>
                          {u.name.split(' ').map((n:string)=>n[0]).join('').slice(0,2)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">{u.name}</p>
                          <div className="flex items-center gap-2">
                            <a href={`mailto:${u.email}`} className="text-xs text-gray-400 hover:text-indigo-500 flex items-center gap-0.5">
                              <Mail className="w-3 h-3"/>{u.email}
                            </a>
                            {u.phone && (
                              <a href={`tel:${u.phone}`} className="text-xs text-gray-400 hover:text-green-500 flex items-center gap-0.5">
                                <Phone className="w-3 h-3"/>{u.phone}
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={clsx('text-xs font-bold px-2 py-0.5 rounded-full',
                        u.role==='Student'?'bg-blue-100 text-blue-700':u.role==='Instructor'?'bg-purple-100 text-purple-700':'bg-red-100 text-red-700')}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-gray-700">{u.enrollmentCount}</td>
                    <td className="py-3 px-3 text-center font-bold text-amber-600">{u.examAttempts}</td>
                    <td className="py-3 px-3 text-center font-bold text-green-600">{u.examPassed}</td>
                    <td className="py-3 px-3 text-center">
                      {u.examAttempts > 0
                        ? <span className={clsx('font-black text-base', round(u.avgScore)>=80?'text-green-600':'text-red-500')}>{round(u.avgScore)}%</span>
                        : <span className="text-gray-400 text-xs">—</span>}
                    </td>
                    <td className="py-3 px-3 text-xs text-gray-400">{fmt(u.joinedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="divide-y divide-gray-50">
              {exams.map((e: any) => (
                <div key={e.id}>
                  <button className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 text-left"
                    onClick={() => setExpandExam(expandExam===e.id ? null : e.id)}>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">{e.title}</p>
                      {e.linkedCourse && <p className="text-xs text-gray-400">📚 {e.linkedCourse}</p>}
                    </div>
                    <div className="flex items-center gap-6 flex-shrink-0 text-center">
                      <div><p className="text-lg font-black text-amber-600">{e.attempts}</p><p className="text-xs text-gray-400">attempts</p></div>
                      <div><p className="text-lg font-black text-green-600">{e.passed}</p><p className="text-xs text-gray-400">passed</p></div>
                      <div><p className={clsx('text-xl font-black',round(e.passRate)>=80?'text-green-600':round(e.passRate)>=50?'text-amber-600':'text-red-500')}>{round(e.passRate)}%</p><p className="text-xs text-gray-400">pass rate</p></div>
                      <div><p className="text-lg font-black text-indigo-600">{round(e.avgScore)}%</p><p className="text-xs text-gray-400">avg</p></div>
                      {expandExam===e.id?<ChevronUp className="w-4 h-4 text-gray-400"/>:<ChevronDown className="w-4 h-4 text-gray-400"/>}
                    </div>
                  </button>
                  {expandExam===e.id && (
                    <div className="px-5 pb-4 bg-gray-50">
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-1">
                        <div className="h-full rounded-full" style={{width:`${round(e.passRate)}%`,background:round(e.passRate)>=80?'#10b981':'#f59e0b'}}/>
                      </div>
                      <p className="text-xs text-gray-500">{e.passed}/{e.attempts} passed · {e.totalQ} questions</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-4 border-t border-gray-100 flex justify-end">
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main SuperAdmin Dashboard ─────────────────────────────────
export default function SuperAdminDashboard() {
  const [selectedOrg, setSelectedOrg] = useState<any>(null);
  const [search, setSearch]           = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['superadmin-dash'],
    queryFn:  () => api.get('/dashboard/superadmin').then(r => r.data),
    refetchInterval: 60000,
  });

  const d    = data as any;
  const orgs: any[] = (d?.orgBreakdown ?? []).filter((o: any) =>
    o.name?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = [
    { label: 'Total Organisations', value: d?.totalOrgs        ?? 0, icon: Building2,  color: 'text-indigo-600',  bg: 'bg-indigo-50'  },
    { label: 'Total Students',      value: fmtNum(d?.totalStudents  ?? 0), icon: Users,   color: 'text-blue-600',    bg: 'bg-blue-50'    },
    { label: 'Total Courses',       value: d?.totalCourses      ?? 0, icon: BookOpen,  color: 'text-purple-600',  bg: 'bg-purple-50'  },
    { label: 'Total Enrollments',   value: fmtNum(d?.totalEnrollments??0), icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Total Revenue',       value: `₹${fmtNum(Math.round(d?.revenue ?? 0))}`, icon: Award, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900">SuperAdmin Dashboard</h1>
        <p className="text-sm text-gray-400 mt-0.5">Platform-wide overview across all organisations</p>
      </div>

      {/* Platform Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
            <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center mb-3', s.bg)}>
              <s.icon className={clsx('w-5 h-5', s.color)}/>
            </div>
            <p className="text-2xl font-black text-gray-900">{isLoading ? '—' : s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Monthly Chart */}
      {(d?.monthlyActivity ?? []).length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-gray-900 mb-4">Platform Monthly Enrollments</h3>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={d.monthlyActivity} margin={{top:5,right:10,bottom:0,left:-20}}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/>
              <XAxis dataKey="label" tick={{fontSize:11,fill:'#9ca3af'}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fontSize:11,fill:'#9ca3af'}} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{borderRadius:'12px',border:'1px solid #e5e7eb',fontSize:'12px'}}/>
              <Area type="monotone" dataKey="enrollments" stroke="#6366f1" strokeWidth={2} fill="url(#grad)"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Org Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600"/>
            Organisations ({orgs.length})
          </h2>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input className="input pl-9 text-sm w-52" placeholder="Search org…"
              value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_,i) => <div key={i} className="h-64 bg-gray-100 animate-pulse rounded-2xl"/>)}
          </div>
        ) : orgs.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No organisations found</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {orgs.map((o: any) => (
              <div key={o.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">

                {/* Org header */}
                <div className="p-4 border-b border-gray-100"
                  style={{ background: `linear-gradient(135deg,${o.primaryColor??'#6366f1'}15,white)` }}>
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-black text-lg flex-shrink-0"
                      style={{ background: o.primaryColor ?? '#6366f1' }}>
                      {o.name?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate">{o.name}</p>
                      <span className={clsx('text-xs font-bold px-1.5 py-0.5 rounded',
                        o.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                        {o.isActive ? '● Active' : '○ Inactive'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Key stats — Students, Courses, Enrollments */}
                <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
                  <div className="p-3 text-center">
                    <p className="text-2xl font-black text-blue-600">{fmtNum(o.studentCount)}</p>
                    <p className="text-xs text-gray-400">Students</p>
                  </div>
                  <div className="p-3 text-center">
                    <p className="text-2xl font-black text-purple-600">{o.courseCount}</p>
                    <p className="text-xs text-gray-400">Courses</p>
                  </div>
                  <div className="p-3 text-center">
                    <p className="text-2xl font-black text-green-600">{fmtNum(o.enrollmentCount)}</p>
                    <p className="text-xs text-gray-400">Enrolled</p>
                  </div>
                </div>

                {/* Exam stats */}
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 flex items-center gap-1">
                      <BarChart3 className="w-3.5 h-3.5"/> {o.examCount} exams
                    </span>
                    <span className="text-gray-500">{fmtNum(o.examAttempts)} attempts</span>
                  </div>
                  {o.examAttempts > 0 ? (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5"/> Pass rate
                        </span>
                        <span className={clsx('font-bold', (o.examPassed/o.examAttempts*100)>=80?'text-green-600':'text-amber-600')}>
                          {Math.round(o.examPassed/o.examAttempts*100)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500 flex items-center gap-1">
                          <Target className="w-3.5 h-3.5"/> Avg score
                        </span>
                        <span className={clsx('font-bold', round(o.avgExamScore)>=80?'text-green-600':'text-red-500')}>
                          {round(o.avgExamScore)}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{ width:`${round(o.avgExamScore)}%`, background: o.primaryColor??'#6366f1' }}/>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-gray-400 text-center py-1">No exam attempts yet</p>
                  )}
                  {o.revenue > 0 && (
                    <div className="flex items-center justify-between text-sm pt-1 border-t border-gray-100">
                      <span className="text-gray-500">Revenue</span>
                      <span className="font-bold text-emerald-600">₹{fmtNum(Math.round(o.revenue))}</span>
                    </div>
                  )}
                </div>

                {/* Action */}
                <div className="px-4 pb-4">
                  <button
                    className="w-full py-2 text-sm font-bold text-white rounded-xl transition-opacity hover:opacity-90"
                    style={{ background: o.primaryColor ?? '#6366f1' }}
                    onClick={() => setSelectedOrg(o)}>
                    👥 View All Members & Results
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Org Detail Modal */}
      {selectedOrg && (
        <OrgDetailModal org={selectedOrg} onClose={() => setSelectedOrg(null)}/>
      )}
    </div>
  );
}