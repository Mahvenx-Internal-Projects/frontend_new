import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Award, Clock, BarChart3, Play, Target, CheckCircle2 } from 'lucide-react';
import { mockTestApi } from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';
import clsx from 'clsx';

const diffColor: Record<string, string> = {
  Easy: 'bg-green-100 text-green-700', Medium: 'bg-amber-100 text-amber-700',
  Hard: 'bg-red-100 text-red-700', Mixed: 'bg-blue-100 text-blue-700'
};

export default function MockTestsListPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const { data: tests = [], isLoading } = useQuery({
    queryKey: ['mock-tests', user?.organizationId],
    queryFn: () => mockTestApi.getAll({ orgId: user?.organizationId }).then(r => r.data),
    enabled: !!user?.organizationId,
  });

  const { data: analysis } = useQuery({
    queryKey: ['mock-analysis-quick', user?.id],
    queryFn: () => mockTestApi.getAnalysis(user!.id).then(r => r.data).catch(() => null),
    enabled: !!user?.id,
  });

  const testsList = tests as any[];
  const a = analysis as any;

  return (
    <div className="space-y-6">
      {/* Header with readiness */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Mock Tests</h1>
          <p className="text-sm text-gray-500 mt-1">Practice tests with instant evaluation and detailed analysis</p>
        </div>
        {a && !a.message && (
          <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate(`/dashboard/mock-analysis/${user?.id}`)}>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Your Readiness</p>
              <p className="font-black text-lg" style={{
                color: a.interviewReadiness === 'Ready' ? '#10b981' : a.interviewReadiness === 'NeedsPractice' ? '#f59e0b' : '#ef4444'
              }}>
                {a.interviewReadiness === 'Ready' ? '✅ Interview Ready' : a.interviewReadiness === 'NeedsPractice' ? '⚡ Needs Practice' : '📚 Keep Studying'}
              </p>
            </div>
            <BarChart3 className="w-8 h-8 text-gray-300" />
          </div>
        )}
      </div>

      {/* Stats row */}
      {a && !a.message && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-2xl font-black text-gray-900">{a.totalAttempts}</p>
            <p className="text-xs text-gray-400 mt-1">Total Attempts</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-2xl font-black text-gray-900">{a.bestScore}%</p>
            <p className="text-xs text-gray-400 mt-1">Best Score</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-2xl font-black text-gray-900">{Math.round(a.averageScore)}%</p>
            <p className="text-xs text-gray-400 mt-1">Avg Score</p>
          </div>
        </div>
      )}

      {/* Tests grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-52 bg-gray-100 animate-pulse rounded-2xl" />)}
        </div>
      ) : testsList.length === 0 ? (
        <div className="text-center py-20">
          <Award className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-xl font-bold text-gray-500">No mock tests available yet</p>
          <p className="text-gray-400 mt-2">Your trainer will publish tests here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {testsList.map((t: any) => (
            <div key={t.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
              <div className="p-5 pb-0">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-xl shadow-sm flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg,var(--org-primary),var(--org-secondary))' }}>
                    🎯
                  </div>
                  <span className={clsx('text-xs font-semibold px-2.5 py-1 rounded-full', diffColor[t.difficulty] || 'bg-gray-100 text-gray-600')}>
                    {t.difficulty}
                  </span>
                </div>
                <h3 className="font-black text-gray-900 text-sm leading-snug mb-2">{t.title}</h3>
                {t.description && <div className="text-xs text-gray-500 line-clamp-2 mb-3 prose prose-sm" dangerouslySetInnerHTML={{ __html: t.description }} />}
                <div className="grid grid-cols-3 gap-2 text-center mb-4">
                  <div className="bg-gray-50 rounded-xl p-2">
                    <p className="font-black text-gray-900 text-sm">{t.totalQuestions}</p>
                    <p className="text-xs text-gray-400">Questions</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-2">
                    <p className="font-black text-gray-900 text-sm flex items-center justify-center gap-0.5"><Clock className="w-3 h-3" />{t.timeLimitMins}m</p>
                    <p className="text-xs text-gray-400">Time</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-2">
                    <p className="font-black text-gray-900 text-sm">{t.passMarkPercent}%</p>
                    <p className="text-xs text-gray-400">Pass</p>
                  </div>
                </div>
              </div>
              <div className="px-5 pb-5">
                <button className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                  style={{ background: 'linear-gradient(135deg,var(--org-primary),var(--org-secondary))' }}
                  onClick={() => navigate(`/dashboard/mock-test/${t.id}`)}>
                  <Play className="w-4 h-4" /> Start Test
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
