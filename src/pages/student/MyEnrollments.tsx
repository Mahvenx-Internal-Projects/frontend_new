import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, Clock, CheckCircle2, Play, Award,
  BarChart3, Calendar, FileText, Video,
  Target, ChevronRight, TrendingUp, Timer
} from 'lucide-react';
import { useState } from 'react';
import { enrollmentsApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import type { Enrollment } from '../../types';
import clsx from 'clsx';

function fmtWatch(secs: number) {
  if (!secs) return '0m';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function fmtDuration(secs: number) {
  if (!secs) return '—';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m} min`;
  return `${secs}s`;
}

export default function MyEnrollments() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'All'|'Active'|'Completed'>('All');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: enrollments = [], isLoading } = useQuery<Enrollment[]>({
    queryKey: ['enrollments', user?.id],
    queryFn: () => enrollmentsApi.getByUser(user!.id).then(r => r.data),
    enabled: !!user?.id,
  });

  const enList = enrollments as any[];
  const filtered = enList.filter(e => filter === 'All' || e.status === filter);

  // Totals
  const totalWatchSecs  = enList.reduce((s, e) => s + (e.totalWatchSeconds ?? 0), 0);
  const completedCount  = enList.filter(e => e.status === 'Completed').length;
  const activeCount     = enList.filter(e => e.status === 'Active').length;

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────── */}
      <div>
        <h1 className="page-title">My Courses</h1>
        <p className="page-sub">{enList.length} total enrollment{enList.length !== 1 ? 's' : ''}</p>
      </div>

      {/* ── Summary stats ──────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Enrolled',  value: enList.length,   icon: BookOpen,   color: 'text-blue-600',   bg: 'bg-blue-50'   },
          { label: 'Active',          value: activeCount,     icon: TrendingUp, color: 'text-amber-600',  bg: 'bg-amber-50'  },
          { label: 'Completed',       value: completedCount,  icon: CheckCircle2,color:'text-green-600',  bg: 'bg-green-50'  },
          { label: 'Total Watch Time',value: fmtWatch(totalWatchSecs), icon: Timer, color:'text-purple-600', bg:'bg-purple-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{s.label}</p>
              <div className={clsx('w-8 h-8 rounded-xl flex items-center justify-center', s.bg)}>
                <s.icon className={clsx('w-4 h-4', s.color)} />
              </div>
            </div>
            <p className="text-2xl font-black text-gray-900">{isLoading ? '—' : s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Quick links ────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Calendar,  label: 'Training Schedule', desc: 'Live classes & sessions',  action: () => navigate('/dashboard/live-classes'), color: 'text-blue-600 bg-blue-50 border-blue-200' },
          { icon: Video,     label: 'Recordings',         desc: 'Past class recordings',    action: () => navigate('/dashboard/recordings'),   color: 'text-purple-600 bg-purple-50 border-purple-200' },
          { icon: Target,    label: 'Mock Tests',         desc: 'Practice & assessments',   action: () => navigate('/dashboard/mock-tests'),   color: 'text-amber-600 bg-amber-50 border-amber-200' },
          { icon: BarChart3, label: 'My Scores',          desc: 'Test results & analysis',  action: () => navigate('/dashboard/mock-tests'),   color: 'text-green-600 bg-green-50 border-green-200' },
        ].map(item => (
          <button key={item.label} onClick={item.action}
            className={clsx('flex items-center gap-3 p-4 rounded-2xl border-2 text-left hover:shadow-md transition-all hover:scale-[1.01]', item.color)}>
            <item.icon className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold">{item.label}</p>
              <p className="text-xs opacity-70">{item.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* ── Filter ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-900">Enrolled Courses</h2>
        <div className="flex gap-2">
          {(['All','Active','Completed'] as const).map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={clsx('px-4 py-1.5 rounded-xl text-sm font-semibold border-2 transition-all',
                filter === s ? 'border-[var(--org-primary)] bg-[var(--org-primary)]/10 text-[var(--org-primary)]' : 'border-gray-200 text-gray-500 hover:border-gray-300')}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* ── Course list ────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_,i) => <div key={i} className="h-28 bg-gray-100 animate-pulse rounded-2xl"/>)}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center">
          <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300"/>
          <p className="font-bold text-gray-500">No {filter === 'All' ? '' : filter.toLowerCase()} courses</p>
          <button className="btn-primary mt-4" onClick={() => navigate('/dashboard/catalog')}>Browse Catalog</button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((e: any) => {
            const watchH   = Math.floor((e.totalWatchSeconds ?? 0) / 3600);
            const watchM   = Math.floor(((e.totalWatchSeconds ?? 0) % 3600) / 60);
            const watchStr = e.totalWatchSeconds > 0
              ? (watchH > 0 ? `${watchH}h ${watchM}m` : `${watchM}m`)
              : '0m';

            return (
              <div key={e.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={clsx('w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0',
                      e.status === 'Completed' ? 'bg-green-100' : 'bg-[var(--org-primary)]/10')}>
                      {e.status === 'Completed'
                        ? <CheckCircle2 className="w-7 h-7 text-green-500"/>
                        : <BookOpen className="w-7 h-7" style={{color:'var(--org-primary)'}}/>}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <h3 className="font-bold text-gray-900">{e.courseTitle}</h3>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-1">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3"/>
                              Enrolled {new Date(e.enrolledAt).toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'})}
                            </span>
                            {e.completedAt && (
                              <span className="flex items-center gap-1 text-green-600 font-semibold">
                                <CheckCircle2 className="w-3 h-3"/>
                                Completed {new Date(e.completedAt).toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'})}
                              </span>
                            )}
                            {/* ── WATCH TIME ── */}
                            <span className="flex items-center gap-1 text-purple-600 font-semibold">
                              <Timer className="w-3 h-3"/>
                              {watchStr} watched
                            </span>
                          </div>
                        </div>
                        <span className={clsx('text-xs font-bold px-2.5 py-1 rounded-full',
                          e.status === 'Completed' ? 'bg-green-100 text-green-700' :
                          e.status === 'Active'    ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500')}>
                          {e.status}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                          <span>Progress</span>
                          <span className="font-bold" style={{color:'var(--org-primary)'}}>{e.progressPercent ?? 0}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${e.progressPercent ?? 0}%`,
                              background: e.status === 'Completed'
                                ? '#10b981'
                                : 'linear-gradient(90deg,var(--org-primary),var(--org-secondary,var(--org-primary)))'
                            }}/>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <button
                        className={clsx('flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all',
                          e.status === 'Completed' ? 'bg-gray-500 hover:bg-gray-600' : 'hover:opacity-90')}
                        style={e.status !== 'Completed' ? {background:'linear-gradient(135deg,var(--org-primary),var(--org-secondary,var(--org-primary)))'} : {}}
                        onClick={() => navigate(`/dashboard/catalog/${e.courseId}`)}>
                        <Play className="w-3.5 h-3.5"/>
                        {e.status === 'Completed' ? 'Review' : 'Continue'}
                      </button>
                      {e.status === 'Completed' && (
                        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-all"
                          onClick={() => navigate('/dashboard/certificates')}>
                          <Award className="w-3.5 h-3.5"/> Certificate
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expand toggle */}
                  <button
                    className="flex items-center gap-1.5 mt-3 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                    onClick={() => setExpandedId(expandedId === e.id ? null : e.id)}>
                    <ChevronRight className={clsx('w-3.5 h-3.5 transition-transform', expandedId === e.id && 'rotate-90')}/>
                    {expandedId === e.id ? 'Hide details' : 'Show watch details'}
                  </button>
                </div>

                {/* Expanded: per-lesson watch report */}
                {expandedId === e.id && (
                  <WatchReport courseId={e.courseId} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Per-lesson watch report ───────────────────────────────────
function WatchReport({ courseId }: { courseId: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ['watch-report', courseId],
    queryFn: () => fetch(`/api/lessons/watch-report/course/${courseId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('lms_token')}` }
    }).then(r => r.json()),
  });

  if (isLoading) return (
    <div className="border-t border-gray-100 p-4 space-y-2">
      {[...Array(3)].map((_,i) => <div key={i} className="h-8 bg-gray-100 animate-pulse rounded-lg"/>)}
    </div>
  );

  const lessons: any[] = data?.lessons ?? [];
  const totalDuration = data?.totalDurationSecs ?? 0;
  const totalWatched  = data?.totalWatchedSecs ?? 0;

  return (
    <div className="border-t border-gray-100 bg-gray-50">
      {/* Summary row */}
      <div className="flex items-center justify-between px-5 py-3 bg-gray-100">
        <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Watch Report</p>
        <div className="flex items-center gap-4 text-xs text-gray-600">
          <span className="flex items-center gap-1">
            <Timer className="w-3 h-3 text-purple-500"/>
            Total watched: <strong className="text-purple-600 ml-1">{fmtWatch(totalWatched)}</strong>
          </span>
          {totalDuration > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-gray-400"/>
              Course length: <strong className="ml-1">{fmtDuration(totalDuration)}</strong>
            </span>
          )}
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-green-500"/>
            {data?.completedLessons ?? 0}/{data?.totalLessons ?? 0} lessons completed
          </span>
        </div>
      </div>

      {/* Per-lesson rows */}
      <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
        {lessons.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">No lessons watched yet</p>
        ) : lessons.map((l: any) => (
          <div key={l.id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-white transition-colors">
            {/* Complete indicator */}
            <div className={clsx('w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0',
              l.isCompleted ? 'bg-green-100' : 'bg-gray-100')}>
              {l.isCompleted
                ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500"/>
                : <div className="w-2 h-2 rounded-full bg-gray-300"/>}
            </div>

            {/* Lesson name */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-700 truncate">{l.title}</p>
              <p className="text-xs text-gray-400">{l.moduleTitle}</p>
            </div>

            {/* Progress bar */}
            <div className="w-24 hidden sm:block">
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all"
                  style={{
                    width: `${l.progressPercent}%`,
                    background: l.isCompleted ? '#10b981' : 'var(--org-primary)'
                  }}/>
              </div>
            </div>

            {/* Duration */}
            <div className="text-right flex-shrink-0 w-28">
              <p className="text-xs font-bold text-purple-600">
                {fmtWatch(l.watchedSeconds)}
              </p>
              {l.durationSecs > 0 && (
                <p className="text-xs text-gray-400">of {fmtDuration(l.durationSecs)}</p>
              )}
            </div>

            {/* % */}
            <div className="w-10 text-right flex-shrink-0">
              <span className={clsx('text-xs font-black',
                l.progressPercent >= 100 ? 'text-green-600' :
                l.progressPercent > 0    ? 'text-[var(--org-primary)]' : 'text-gray-300')}>
                {l.progressPercent}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
