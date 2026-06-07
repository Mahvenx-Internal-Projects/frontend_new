import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, Star, Users, Clock, BookOpen, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { coursesApi, categoriesApi, enrollmentsApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import type { Course, Category } from '../../types';
import clsx from 'clsx';

const levelColor: Record<string, string> = {
  Beginner: 'badge-green', Intermediate: 'badge-amber', Advanced: 'badge-red'
};

export default function CourseCatalog() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['catalog', search, level, categoryId, page],
    queryFn: () => coursesApi.getAll({
      status: 'Published',
      orgId: user?.organizationId,
      search: search || undefined,
      level: level || undefined,
      categoryId: categoryId || undefined,
      page, size: 12
    }).then(r => r.data),
    placeholderData: prev => prev,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', user?.organizationId],
    queryFn: () => categoriesApi.getAll(user?.organizationId).then(r => r.data),
  });

  const { data: myEnrollments = [] } = useQuery({
    queryKey: ['my-enrollments', user?.id],
    queryFn: () => enrollmentsApi.getByUser(user!.id).then(r => r.data),
    enabled: !!user?.id,
  });

  const enrollMut = useMutation({
    mutationFn: (courseId: number) => enrollmentsApi.enroll({ userId: user!.id, courseId }),
    onSuccess: (_, courseId) => {
      qc.invalidateQueries({ queryKey: ['my-enrollments'] });
      toast.success('Enrolled successfully!');
      navigate(`/dashboard/catalog/${courseId}`);
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Enrollment failed'),
  });

  const enrolledIds = new Set((myEnrollments as any[]).map((e: any) => e.courseId));
  const courses: Course[] = data?.items ?? [];

  const flatCats = (cats: Category[]): Category[] =>
    cats.flatMap(c => [c, ...flatCats(c.children ?? [])]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Course Catalog</h1>
        <p className="page-sub">Explore and enroll in available courses</p>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input pl-9" placeholder="Search courses…" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="input w-36" value={level} onChange={e => { setLevel(e.target.value); setPage(1); }}>
          <option value="">All levels</option>
          <option value="Beginner">Beginner</option>
          <option value="Intermediate">Intermediate</option>
          <option value="Advanced">Advanced</option>
        </select>
        <select className="input w-44" value={categoryId} onChange={e => { setCategoryId(e.target.value); setPage(1); }}>
          <option value="">All categories</option>
          {flatCats(categories).map((c: Category) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <span className="text-sm text-gray-500 ml-auto">{data?.totalCount ?? 0} courses</span>
      </div>

      {/* Course grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => <div key={i} className="card h-72 animate-pulse bg-gray-100" />)}
        </div>
      ) : courses.length === 0 ? (
        <div className="card p-16 text-center text-gray-400">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No courses found</p>
          <p className="text-sm mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {courses.map(c => {
            const enrolled = enrolledIds.has(c.id);
            return (
              <div key={c.id} className="card overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
                {/* Thumbnail */}
                <div className="h-40 bg-gradient-to-br from-brand-100 to-purple-100 relative cursor-pointer"
                  onClick={() => navigate(`/dashboard/catalog/${c.id}`)}>
                  {c.thumbnailUrl
                    ? <img src={c.thumbnailUrl} className="w-full h-full object-cover" alt={c.title} />
                    : <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="w-12 h-12 text-brand-300" />
                      </div>
                  }
                  <div className="absolute top-2 left-2">
                    <span className={levelColor[c.level]}>{c.level}</span>
                  </div>
                  {enrolled && (
                    <div className="absolute top-2 right-2 badge-green">Enrolled</div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4 flex flex-col flex-1">
                  <p className="text-xs text-gray-400 mb-1">{c.categoryName}</p>
                  <h3 className="font-semibold text-gray-900 line-clamp-2 text-sm leading-snug mb-2 cursor-pointer hover:text-brand-600"
                    onClick={() => navigate(`/dashboard/catalog/${c.id}`)}>
                    {c.title}
                  </h3>
                  <p className="text-xs text-gray-500 mb-3">by {c.instructorName}</p>

                  <div className="flex items-center gap-3 text-xs text-gray-500 mb-4 mt-auto">
                    <span className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      {c.averageRating.toFixed(1)}
                    </span>
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{c.enrollmentCount}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{c.durationMinutes}m</span>
                    <span className="ml-auto font-bold text-gray-900 text-sm">
                      {c.isFree ? <span className="text-green-600">Free</span> : `$${c.price}`}
                    </span>
                  </div>

                  {enrolled ? (
                    <button className="btn-secondary w-full justify-center text-sm"
                      onClick={() => navigate(`/dashboard/catalog/${c.id}`)}>
                      Continue Learning
                    </button>
                  ) : (
                    <button className="btn-primary w-full justify-center text-sm"
                      onClick={() => enrollMut.mutate(c.id)}
                      disabled={enrollMut.isPending && enrollMut.variables === c.id}>
                      {enrollMut.isPending && enrollMut.variables === c.id ? 'Enrolling…' : 'Enroll Now'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
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
