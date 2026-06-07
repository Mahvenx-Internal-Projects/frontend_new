import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Clock, CheckCircle2, Play, Award, Filter } from 'lucide-react';
import { useState } from 'react';
import { enrollmentsApi, examsApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import type { Enrollment } from '../../types';
import clsx from 'clsx';

const statusColors: Record<string, string> = {
  Active: 'badge-blue', Completed: 'badge-green', Cancelled: 'badge-gray'
};

export default function MyEnrollments() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'All' | 'Active' | 'Completed'>('All');

  const { data: enrollments = [], isLoading } = useQuery<Enrollment[]>({
    queryKey: ['enrollments', user?.id],
    queryFn: () => enrollmentsApi.getByUser(user!.id).then(r => r.data),
    enabled: !!user?.id,
  });

  const filtered = (enrollments as Enrollment[]).filter(e =>
    filter === 'All' || e.status === filter
  );

  const totalMinutes = 0; // would need lesson data

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">My Courses</h1>
          <p className="page-sub">{enrollments.length} total enrollments</p>
        </div>
        <div className="flex gap-2">
          {(['All', 'Active', 'Completed'] as const).map(s => (
            <button key={s}
              className={clsx('btn text-sm px-4 py-1.5 rounded-lg', filter === s ? 'btn-primary' : 'btn-secondary')}
              onClick={() => setFilter(s)}>{s}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="card h-28 animate-pulse bg-gray-100" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-16 text-center text-gray-400">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium text-gray-500">No {filter === 'All' ? '' : filter.toLowerCase()} enrollments</p>
          <button className="btn-primary mt-4" onClick={() => navigate('/dashboard/catalog')}>
            Browse Catalog
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(e => (
            <div key={e.id} className="card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
                  {e.status === 'Completed'
                    ? <CheckCircle2 className="w-7 h-7 text-green-500" />
                    : <BookOpen className="w-7 h-7 text-brand-600" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm">{e.courseTitle}</h3>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Enrolled {new Date(e.enrolledAt).toLocaleDateString()}
                        </span>
                        {e.completedAt && (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="w-3 h-3" />
                            Completed {new Date(e.completedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={statusColors[e.status]}>{e.status}</span>
                  </div>

                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Progress</span>
                      <span className="font-medium">{e.progressPercent}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-bar-fill" style={{ width: `${e.progressPercent}%` }} />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 flex-shrink-0">
                  {e.status !== 'Cancelled' && (
                    <button className={clsx('btn text-xs', e.status === 'Completed' ? 'btn-secondary' : 'btn-primary')}
                      onClick={() => navigate(`/dashboard/catalog/${e.courseId}`)}>
                      <Play className="w-3.5 h-3.5" />
                      {e.status === 'Completed' ? 'Review' : 'Continue'}
                    </button>
                  )}
                  {e.status === 'Completed' && (
                    <button className="btn btn-ghost text-xs text-amber-600 hover:bg-amber-50"
                      onClick={() => navigate('/dashboard/certificates')}>
                      <Award className="w-3.5 h-3.5" /> Certificate
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
