import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users, BookOpen, Award, Clock, ChevronRight,
  CheckCircle2, XCircle, TrendingUp, X, BarChart3,
  ChevronDown, ChevronUp, Search
} from 'lucide-react';
import { dashboardApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import clsx from 'clsx';

// ─── Helpers ──────────────────────────────────────────────────
const fmtDate   = (d: string) => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'2-digit'}) : '—';
const fmtMins   = (s: number) => s >= 3600 ? `${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m` : `${Math.floor(s/60)}m`;
const pct       = (n: number) => `${Math.round(n)}%`;

// ─── Student Detail Modal ──────────────────────────────────────
function StudentReportModal({ orgId, student, onClose }: { orgId: number; student: any; onClose: () => void }) {
  const [expandedCourse, setExpandedCourse] = useState<number | null>(null);

  const { data: report, isLoading } = useQuery({
    queryKey: ['student-report', student.id],
    queryFn:  () => dashboardApi.studentReport(orgId, student.id).then(r => r.data),
  });

  const r   = report as any;
  const enr: any[] = r?.enrollments ?? [];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl my-8">

        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-black"
              style={{ background: 'linear-gradient(135deg,var(--org-primary),var(--org-secondary,var(--org-primary)))' }}>
              {student.name.split(' ').map((n:string) => n[0]).join('').slice(0,2)}
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900">{student.name}</h2>
              <p className="text-sm text-gray-400">{student.email}</p>
              {student.phone && <p className="text-xs text-gray-400">{student.phone}</p>}
            </div>
          </div>
          <button className="btn-ghost p-2 rounded-xl" onClick={onClose}><X className="w-5 h-5"/></button>
        </div>

        {isLoading ? (
          <div className="p-10 text-center text-gray-400">Loading report…</div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4 p-6 border-b border-gray-100">
              {[
                { label: 'Courses Enrolled',  value: r?.summary?.totalEnrollments  ?? 0, icon: BookOpen,   color: 'text-indigo-600',  bg: 'bg-indigo-50' },
                { label: 'Courses Completed', value: r?.summary?.completedCourses  ?? 0, icon: CheckCircle2,color:'text-green-600',   bg: 'bg-green-50'  },
                { label: 'Watch Time',        value: fmtMins((r?.summary?.totalWatchMinutes ?? 0)*60), icon: Clock, color:'text-amber-600', bg: 'bg-amber-50' },
                { label: 'Exams Taken',       value: r?.summary?.totalExamAttempts ?? 0, icon: BarChart3,  color: 'text-purple-600', bg: 'bg-purple-50' },
                { label: 'Exams Passed',      value: r?.summary?.passedExams       ?? 0, icon: Award,      color: 'text-emerald-600', bg: 'bg-emerald-50'},
                { label: 'Avg Exam Score',    value: `${r?.summary?.avgExamScore ?? 0}%`,icon: TrendingUp, color: 'text-blue-600',   bg: 'bg-blue-50'   },
              ].map(s => (
                <div key={s.label} className="bg-gray-50 rounded-2xl p-4 flex items-center gap-3">
                  <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', s.bg)}>
                    <s.icon className={clsx('w-4 h-4', s.color)}/>
                  </div>
                  <div>
                    <p className="text-lg font-black text-gray-900">{s.value}</p>
                    <p className="text-xs text-gray-400">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Course list */}
            <div className="p-6 space-y-3">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-500"/> Course Progress & Exam Scores
              </h3>

              {enr.length === 0 ? (
                <p className="text-center py-8 text-gray-400 text-sm">Not enrolled in any courses yet</p>
              ) : enr.map((e: any) => (
                <div key={e.courseId} className="border border-gray-200 rounded-2xl overflow-hidden">
                  {/* Course row */}
                  <button
                    className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors text-left"
                    onClick={() => setExpandedCourse(expandedCourse === e.courseId ? null : e.courseId)}>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{e.courseTitle}</p>
                      <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-400">
                        <span>Enrolled {fmtDate(e.enrolledAt)}</span>
                        <span>📹 {e.watchedLessons}/{e.totalLessons} lessons</span>
                        <span>⏱ {fmtMins(e.totalWatchSecs)}</span>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="flex items-center gap-2 flex-shrink-0 w-32">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${e.progressPercent}%`, background: 'var(--org-primary)' }}/>
                      </div>
                      <span className="text-xs font-bold text-gray-600 w-8">{pct(e.progressPercent)}</span>
                    </div>

                    {/* Status badge */}
                    <span className={clsx('text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0',
                      e.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')}>
                      {e.status === 'Completed' ? '✅ Done' : '🔄 In Progress'}
                    </span>

                    {/* Exam quick score */}
                    {e.examAttempts?.length > 0 && (
                      <span className={clsx('text-sm font-black flex-shrink-0',
                        e.examAttempts[0].passed ? 'text-green-600' : 'text-red-500')}>
                        {e.examAttempts[0].scorePercent}%
                      </span>
                    )}

                    {expandedCourse === e.courseId
                      ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0"/>
                      : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0"/>}
                  </button>

                  {/* Expanded: Exam attempts */}
                  {expandedCourse === e.courseId && (
                    <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-3">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Exam Attempts</p>
                      {e.examAttempts?.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">No exam attempts yet</p>
                      ) : e.examAttempts.map((a: any, i: number) => (
                        <div key={a.attemptId} className={clsx(
                          'rounded-xl p-4 border',
                          a.passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                        )}>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-bold text-gray-900 text-sm">{a.examTitle}</p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                Attempt #{a.attemptNo} · {fmtDate(a.completedAt)}
                                {a.timeTakenSecs ? ` · ${fmtMins(a.timeTakenSecs)}` : ''}
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className={clsx('text-2xl font-black', a.passed ? 'text-green-700' : 'text-red-600')}>
                                {a.scorePercent}%
                              </p>
                              <p className="text-xs text-gray-500">{a.marksObtained}/{a.totalMarks} marks</p>
                            </div>
                          </div>

                          <div className="mt-3 flex items-center gap-3">
                            <div className="flex-1 h-2 bg-white/70 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${a.scorePercent}%`, background: a.passed ? '#10b981' : '#ef4444' }}/>
                            </div>
                            <span className={clsx('text-xs font-bold px-2 py-0.5 rounded-full',
                              a.passed ? 'bg-green-700 text-white' : 'bg-red-600 text-white')}>
                              {a.passed ? '✅ PASSED' : '❌ FAILED'}
                            </span>
                          </div>

                          {a.readiness && (
                            <p className="text-xs text-gray-500 mt-1">
                              Interview Readiness: <strong>{a.readiness}</strong>
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        <div className="p-4 border-t border-gray-100 flex justify-end">
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────
export default function StudentsReportPage() {
  const { user } = useAuthStore();
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['org-students', user?.organizationId],
    queryFn:  () => dashboardApi.orgStudents(user!.organizationId).then(r => r.data),
    enabled:  !!user?.organizationId,
  });

  const d           = data as any;
  const allStudents: any[] = d?.students ?? [];
  const filtered    = allStudents.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600"/> Students Report
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {d?.totalStudents ?? 0} total students · {d?.activeStudents ?? 0} active
          </p>
        </div>
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input className="input pl-9 w-64" placeholder="Search by name or email…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Students',  value: d?.totalStudents  ?? 0, color: 'text-blue-600',   bg: 'bg-blue-50',   icon: Users },
          { label: 'Active',          value: d?.activeStudents ?? 0, color: 'text-green-600',  bg: 'bg-green-50',  icon: CheckCircle2 },
          { label: 'Total Enrolled',  value: allStudents.reduce((s:number,u:any) => s + (u.enrollmentCount||0), 0), color: 'text-purple-600', bg: 'bg-purple-50', icon: BookOpen },
          { label: 'Avg Progress',    value: allStudents.length ? pct(allStudents.reduce((s:number,u:any) => s + (u.avgProgress||0), 0) / allStudents.length) : '0%', color: 'text-amber-600', bg: 'bg-amber-50', icon: TrendingUp },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center mb-3', s.bg)}>
              <s.icon className={clsx('w-5 h-5', s.color)}/>
            </div>
            <p className="text-2xl font-black text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Student Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 grid grid-cols-12 gap-2 text-xs font-bold text-gray-400 uppercase">
          <span className="col-span-4">Student</span>
          <span className="col-span-2 text-center">Courses</span>
          <span className="col-span-2 text-center">Progress</span>
          <span className="col-span-2 text-center">Last Exam</span>
          <span className="col-span-2 text-right">Action</span>
        </div>

        {isLoading ? (
          <div className="p-10 text-center">
            <div className="w-8 h-8 border-4 border-[var(--org-primary)] border-t-transparent rounded-full animate-spin mx-auto"/>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-2 text-gray-200"/>
            <p>{search ? 'No students match your search' : 'No students yet'}</p>
          </div>
        ) : filtered.map((s: any) => (
          <div key={s.id} className="grid grid-cols-12 gap-2 px-5 py-4 items-center border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
            {/* Student info */}
            <div className="col-span-4 flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-black flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,var(--org-primary),var(--org-secondary,var(--org-primary)))' }}>
                {s.name.split(' ').map((n:string) => n[0]).join('').slice(0,2)}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">{s.name}</p>
                <p className="text-xs text-gray-400 truncate">{s.email}</p>
              </div>
            </div>

            {/* Courses */}
            <div className="col-span-2 text-center">
              <p className="font-black text-gray-900">{s.enrollmentCount}</p>
              <p className="text-xs text-gray-400">{s.completedCount} done</p>
            </div>

            {/* Progress */}
            <div className="col-span-2 flex flex-col items-center gap-1">
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${s.avgProgress}%`, background: 'var(--org-primary)' }}/>
              </div>
              <span className="text-xs font-bold text-gray-600">{pct(s.avgProgress)}</span>
            </div>

            {/* Last exam */}
            <div className="col-span-2 text-center">
              {s.latestExam ? (
                <>
                  <p className={clsx('text-sm font-black', s.latestExam.passed ? 'text-green-600' : 'text-red-500')}>
                    {s.latestExam.scorePercent}%
                  </p>
                  <p className={clsx('text-xs font-bold', s.latestExam.passed ? 'text-green-500' : 'text-red-400')}>
                    {s.latestExam.passed ? '✅ Pass' : '❌ Fail'}
                  </p>
                </>
              ) : (
                <p className="text-xs text-gray-400">No exam yet</p>
              )}
            </div>

            {/* Action */}
            <div className="col-span-2 flex justify-end">
              <button
                className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1"
                onClick={() => setSelectedStudent(s)}>
                View Report <ChevronRight className="w-3 h-3"/>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Student Report Modal */}
      {selectedStudent && (
        <StudentReportModal
          orgId={user!.organizationId}
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </div>
  );
}
