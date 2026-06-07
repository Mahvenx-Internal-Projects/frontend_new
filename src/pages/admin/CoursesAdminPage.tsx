import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Eye, BookOpen, Star, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { coursesApi, categoriesApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import type { Course } from '../../types';
import clsx from 'clsx';

const levelBadge: Record<string, string> = { Beginner: 'badge-green', Intermediate: 'badge-amber', Advanced: 'badge-red' };
const statusBadge: Record<string, string> = { Draft: 'badge-gray', Published: 'badge-blue', Archived: 'badge-red' };

export default function CoursesAdminPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-courses', search, statusFilter, page, user?.organizationId],
    queryFn: () => coursesApi.getAll({
      orgId: user?.role !== 'SuperAdmin' ? user?.organizationId : undefined,
      search: search || undefined,
      status: statusFilter || undefined,
      page, size: 12
    }).then(r => r.data),
    placeholderData: prev => prev,
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => coursesApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-courses'] }); toast.success('Archived'); },
  });

  const courses: Course[] = data?.items ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Courses</h1>
          <p className="page-sub">{data?.totalCount ?? 0} courses total</p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/dashboard/courses/new')}>
          <Plus className="w-4 h-4" /> New Course
        </button>
      </div>

      <div className="card p-4 flex flex-wrap gap-3">
        <input className="input flex-1 min-w-48" placeholder="Search courses…" value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }} />
        <select className="input w-40" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="Draft">Draft</option>
          <option value="Published">Published</option>
          <option value="Archived">Archived</option>
        </select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="card h-64 animate-pulse bg-gray-100" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {courses.map(c => (
            <div key={c.id} className="card overflow-hidden hover:shadow-md transition-shadow">
              <div className="h-36 bg-gradient-to-br from-brand-100 to-purple-100 relative">
                {c.thumbnailUrl && <img src={c.thumbnailUrl} className="w-full h-full object-cover" alt="" />}
                <div className="absolute top-2 left-2 flex gap-1">
                  <span className={statusBadge[c.status]}>{c.status}</span>
                  <span className={levelBadge[c.level]}>{c.level}</span>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 line-clamp-2 text-sm mb-1">{c.title}</h3>
                <p className="text-xs text-gray-500 mb-3">{c.instructorName} · {c.categoryName}</p>
                <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{c.enrollmentCount}</span>
                  <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-amber-400" />{c.averageRating.toFixed(1)}</span>
                  <span className="ml-auto font-semibold text-gray-900">{c.isFree ? 'Free' : `$${c.price}`}</span>
                </div>
                <div className="flex gap-2">
                  <button className="btn-ghost text-xs flex-1 justify-center" onClick={() => navigate(`/dashboard/courses/${c.id}/edit`)}>
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                  <button className="btn-ghost text-xs flex-1 justify-center" onClick={() => navigate(`/dashboard/courses/${c.id}/exam`)}>
                    <BookOpen className="w-3 h-3" /> Exams
                  </button>
                  <button className="btn-ghost text-xs text-red-500 hover:bg-red-50"
                    onClick={() => { if (confirm('Archive?')) deleteMut.mutate(c.id); }}>
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {(data?.totalPages ?? 1) > 1 && (
        <div className="flex justify-center gap-2">
          <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
          <span className="btn-ghost cursor-default">Page {page} of {data?.totalPages}</span>
          <button className="btn-secondary" disabled={page >= (data?.totalPages ?? 1)} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}
