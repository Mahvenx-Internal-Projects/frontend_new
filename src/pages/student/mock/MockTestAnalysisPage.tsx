import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authStore';
import { mockTestApi } from '../../../services/api';
import {
  TrendingUp, TrendingDown, Award, Target, BarChart3,
  ChevronLeft, CheckCircle2, XCircle, Clock, Trophy
} from 'lucide-react';
import clsx from 'clsx';

function ReadinessBadge({ readiness }: { readiness: string }) {
  const cfg = {
    Ready:         { label: '✅ Interview Ready', color: '#10b981', bg: '#d1fae5', desc: 'You are ready for technical interviews! Score 80%+' },
    NeedsPractice: { label: '⚡ Needs Practice', color: '#f59e0b', bg: '#fef3c7', desc: 'Good progress! Score 60-80%. Practice more to reach interview readiness.' },
    Weak:          { label: '📚 Keep Studying',  color: '#ef4444', bg: '#fee2e2', desc: 'Score below 60%. Focus on weak topics before interviews.' },
  }[readiness] ?? { label: '—', color: '#6b7280', bg: '#f3f4f6', desc: '' };

  return (
    <div className="rounded-2xl p-5 flex items-center gap-4" style={{ background: cfg.bg }}>
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-md" style={{ background: cfg.color }}>
        {readiness === 'Ready' ? '🏆' : readiness === 'NeedsPractice' ? '⚡' : '📚'}
      </div>
      <div>
        <p className="font-black text-xl" style={{ color: cfg.color }}>{cfg.label}</p>
        <p className="text-sm mt-0.5 text-gray-600">{cfg.desc}</p>
      </div>
    </div>
  );
}

function TopicBar({ topic, score, correct, total }: { topic: string; score: number; correct: number; total: number }) {
  const color = score >= 75 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-semibold text-gray-700 capitalize">{topic}</span>
        <span className="text-sm font-bold" style={{ color }}>{score}% ({correct}/{total})</span>
      </div>
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, background: color }} />
      </div>
    </div>
  );
}

export default function MockTestAnalysisPage() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const id = Number(studentId) || user?.id;

  const { data: analysis, isLoading } = useQuery({
    queryKey: ['mock-analysis', id],
    queryFn: () => mockTestApi.getAnalysis(id!).then(r => r.data),
    enabled: !!id,
  });

  if (isLoading) return (
    <div className="max-w-4xl animate-pulse space-y-4">
      {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-2xl" />)}
    </div>
  );

  if (!analysis || (analysis as any).message) return (
    <div className="max-w-xl mx-auto text-center py-20">
      <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
      <h2 className="text-xl font-bold text-gray-600">No Attempts Yet</h2>
      <p className="text-gray-400 mt-2 mb-6">Take a mock test to see your analysis and performance report.</p>
      <button className="btn-primary mx-auto" onClick={() => navigate('/dashboard/mock-tests')}>Browse Mock Tests →</button>
    </div>
  );

  const a = analysis as any;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <button className="btn-ghost" onClick={() => navigate(-1)}><ChevronLeft className="w-4 h-4" /> Back</button>
        <div>
          <h1 className="text-2xl font-black text-gray-900">Mock Test Analysis</h1>
          <p className="text-sm text-gray-500">{a.studentName} · {a.totalAttempts} attempt{a.totalAttempts !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Readiness banner */}
      <ReadinessBadge readiness={a.interviewReadiness} />

      {/* Overall stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Avg Score', value: `${a.averageScore}%`, icon: Target, color: 'text-brand-600', bg: 'bg-brand-50' },
          { label: 'Best Score', value: `${a.bestScore}%`, icon: Trophy, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Total Attempts', value: a.totalAttempts, icon: BarChart3, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Weak Topics', value: a.weakTopics?.length ?? 0, icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{s.label}</p>
              <div className={`w-8 h-8 rounded-xl ${s.bg} flex items-center justify-center`}><s.icon className={`w-4 h-4 ${s.color}`} /></div>
            </div>
            <p className="text-3xl font-black text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Weak topics */}
        {a.weakTopics?.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-black text-gray-900 mb-4 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-500" /> Weak Areas
              <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium ml-auto">Needs Focus</span>
            </h3>
            <div className="space-y-3">
              {a.weakTopics.map((t: any) => <TopicBar key={t.topic} topic={t.topic} score={t.scorePercent} correct={t.correct} total={t.totalQuestions} />)}
            </div>
          </div>
        )}

        {/* Strong topics */}
        {a.strongTopics?.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-black text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" /> Strong Areas
              <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-medium ml-auto">Keep it up!</span>
            </h3>
            <div className="space-y-3">
              {a.strongTopics.map((t: any) => <TopicBar key={t.topic} topic={t.topic} score={t.scorePercent} correct={t.correct} total={t.totalQuestions} />)}
            </div>
          </div>
        )}
      </div>

      {/* Recent attempts */}
      {a.recentAttempts?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-black text-gray-900 mb-4">Recent Attempts</h3>
          <div className="space-y-3">
            {a.recentAttempts.map((att: any) => {
              const rc = att.interviewReadiness === 'Ready' ? '#10b981' : att.interviewReadiness === 'NeedsPractice' ? '#f59e0b' : '#ef4444';
              return (
                <div key={att.id} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors cursor-pointer"
                  onClick={() => navigate(`/dashboard/mock-result/${att.id}`)}>
                  <div className={clsx('w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0', att.passed ? 'bg-green-100' : 'bg-red-100')}>
                    {att.passed ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-red-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">{att.mockTestTitle}</p>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                      <span>Attempt #{att.attemptNumber}</span>
                      <span>Rank #{att.rank}</span>
                      {att.completedAt && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(att.completedAt).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-2xl font-black" style={{ color: 'var(--org-primary)' }}>{att.scorePercent}%</p>
                    <p className="text-xs font-semibold" style={{ color: rc }}>{att.interviewReadiness}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <button className="btn-primary" onClick={() => navigate('/dashboard/mock-tests')}>
        Take Another Test →
      </button>
    </div>
  );
}
