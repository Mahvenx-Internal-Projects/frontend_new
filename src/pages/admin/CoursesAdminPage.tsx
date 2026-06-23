import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Eye, BookOpen, Star, Users, Search, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { coursesApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import clsx from 'clsx';

const levelColors: Record<string,string> = {
  Beginner:     'bg-green-100 text-green-700',
  Intermediate: 'bg-amber-100 text-amber-700',
  Advanced:     'bg-red-100 text-red-700',
};
const statusColors: Record<string,string> = {
  Draft:     'bg-gray-100 text-gray-600',
  Published: 'bg-blue-100 text-blue-700',
  Archived:  'bg-red-100 text-red-600',
};

export default function CoursesAdminPage() {
  const { user }  = useAuthStore();
  const qc        = useQueryClient();
  const navigate  = useNavigate();
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState('');
  const [page, setPage]           = useState(1);

  const isInstructor = user?.role === 'Instructor';

  const { data, isLoading } = useQuery({
    queryKey: ['admin-courses', search, statusFilter, page, user?.organizationId, isInstructor ? user?.id : null],
    queryFn: () => coursesApi.getAll({
      // SuperAdmin (orgId=null) sees all; OrgAdmin filtered to their org;
      // Instructor further filtered to ONLY their own courses, not the
      // whole organization's catalog.
      orgId:        user?.organizationId || undefined,
      instructorId: isInstructor ? user?.id : undefined,
      search: search   || undefined,
      status: statusFilter || undefined,
      page, size: 12,
    }).then(r => r.data),
    placeholderData: (prev: any) => prev,
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => coursesApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-courses'] }); toast.success('Course archived'); },
  });

  const courses: any[] = (data as any)?.items ?? [];
  const total: number  = (data as any)?.totalCount ?? 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Courses</h1>
          <p className="page-sub">{total} course{total !== 1 ? 's' : ''} total</p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/dashboard/courses/new')}>
          <Plus className="w-4 h-4"/> New Course
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
          <input className="input pl-9" placeholder="Search courses…"
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}/>
        </div>
        <select className="input w-40" value={statusFilter} onChange={e => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option value="Draft">Draft</option>
          <option value="Published">Published</option>
          <option value="Archived">Archived</option>
        </select>
      </div>

      {/* Course grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {[...Array(8)].map((_,i) => <div key={i} className="h-64 bg-gray-100 animate-pulse rounded-2xl"/>)}
        </div>
      ) : courses.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center">
          <BookOpen className="w-14 h-14 mx-auto mb-4 text-gray-200"/>
          <p className="font-bold text-gray-500 text-lg">No courses found</p>
          <button className="btn-primary mt-4" onClick={() => navigate('/dashboard/courses/new')}>
            <Plus className="w-4 h-4"/> Create First Course
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {courses.map((c: any) => (
              <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all flex flex-col overflow-hidden group">
                {/* Thumbnail */}
                <div className="relative h-36 bg-gradient-to-br from-gray-100 to-gray-50 flex-shrink-0 overflow-hidden">
                  {c.thumbnailUrl
                    ? <img src={c.thumbnailUrl} alt={c.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
                    : <div className="w-full h-full flex items-center justify-center"><BookOpen className="w-10 h-10 text-gray-300"/></div>
                  }
                  <div className="absolute top-2 left-2 flex gap-1.5">
                    <span className={clsx('text-xs font-bold px-2 py-0.5 rounded-full', statusColors[c.status ?? 'Draft'])}>
                      {c.status ?? 'Draft'}
                    </span>
                  </div>
                  <div className="absolute top-2 right-2">
                    <span className={clsx('text-xs font-bold px-2 py-0.5 rounded-full', levelColors[c.level ?? 'Beginner'])}>
                      {c.level}
                    </span>
                  </div>
                </div>

                {/* Body */}
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2 mb-1">{c.title}</h3>
                  <p className="text-xs text-gray-400 mb-2 truncate">{c.instructorName} · {c.categoryName}</p>

                  <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3"/> {c.enrollmentCount ?? 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-400"/> {(c.averageRating ?? 0).toFixed(1)}
                    </span>
                    <span className="ml-auto font-bold text-gray-700">
                      {c.isFree ? '🆓 Free' : `₹${c.price}`}
                    </span>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-1.5 mt-auto">
                    {/* Edit — full width primary */}
                    <button
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-white hover:opacity-90 transition-all"
                      style={{background:'linear-gradient(135deg,var(--org-primary),var(--org-secondary,var(--org-primary)))'}}
                      onClick={() => navigate(`/dashboard/courses/${c.id}/edit`)}>
                      <Pencil className="w-3.5 h-3.5"/> Edit
                    </button>

                    {/* Preview */}
                    <button
                      className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-all"
                      title="Preview course"
                      onClick={() => navigate(`/dashboard/catalog/${c.id}`)}>
                      <Eye className="w-3.5 h-3.5"/>
                    </button>

                    {/* Delete */}
                    <button
                      className="flex items-center justify-center px-3 py-2 rounded-xl text-xs font-bold text-red-400 bg-red-50 hover:bg-red-100 border border-red-200 transition-all"
                      title="Archive course"
                      onClick={() => { if (confirm(`Archive "${c.title}"?`)) deleteMut.mutate(c.id); }}>
                      <Trash2 className="w-3.5 h-3.5"/>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {total > 12 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button className="btn-secondary px-4" disabled={page === 1} onClick={() => setPage(p => p-1)}>← Prev</button>
              <span className="text-sm text-gray-500">Page {page} of {Math.ceil(total/12)}</span>
              <button className="btn-secondary px-4" disabled={page >= Math.ceil(total/12)} onClick={() => setPage(p => p+1)}>Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
