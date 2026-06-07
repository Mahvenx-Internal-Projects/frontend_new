import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Star, Users, Clock, BookOpen, ChevronRight, Play, Award, TrendingUp, Globe, ArrowRight, Menu, X, GraduationCap, Sparkles } from 'lucide-react';
import { useOrgStore } from '../../store/orgStore';
import { useAuthStore } from '../../store/authStore';
import { portalApi, type PublicCategory, type PublicCourse, type OrgStats } from '../../services/portalApi';
import clsx from 'clsx';

// ─── Level badge colors ────────────────────────────────────────
const levelColor: Record<string, string> = {
  Beginner: 'bg-emerald-100 text-emerald-700',
  Intermediate: 'bg-amber-100 text-amber-700',
  Advanced: 'bg-red-100 text-red-700',
};

// ─── Animated counter hook ────────────────────────────────────
function useCounter(target: number, duration = 1500) {
  const [count, setCount] = useState(0);
  const started = useRef(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const step = target / (duration / 16);
        let cur = 0;
        const timer = setInterval(() => {
          cur = Math.min(cur + step, target);
          setCount(Math.round(cur));
          if (cur >= target) clearInterval(timer);
        }, 16);
      }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [target, duration]);
  return { count, ref };
}

// ─── Stat card ────────────────────────────────────────────────
function StatCard({ value, label, icon }: { value: number; label: string; icon: string }) {
  const { count, ref } = useCounter(value);
  return (
    <div ref={ref} className="text-center group">
      <div className="text-5xl mb-1">{icon}</div>
      <div className="text-4xl font-black" style={{ color: 'var(--org-primary)' }}>
        {count.toLocaleString()}+
      </div>
      <div className="text-gray-500 text-sm font-medium mt-1 uppercase tracking-widest">{label}</div>
    </div>
  );
}

// ─── Course card ──────────────────────────────────────────────
function CourseCard({ course, orgId, onClick }: { course: PublicCourse; orgId: number; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl border border-gray-100 hover:border-transparent transition-all duration-300 cursor-pointer hover:-translate-y-1"
    >
      {/* Thumbnail */}
      <div className="relative h-44 overflow-hidden">
        {course.thumbnailUrl ? (
          <img src={course.thumbnailUrl} alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, var(--org-primary)22, var(--org-secondary)44)` }}>
            <BookOpen className="w-14 h-14 opacity-30" style={{ color: 'var(--org-primary)' }} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        <div className="absolute top-3 left-3">
          <span className={clsx('text-xs font-semibold px-2.5 py-1 rounded-full', levelColor[course.level])}>
            {course.level}
          </span>
        </div>
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
            <Play className="w-5 h-5 ml-0.5" style={{ color: 'var(--org-primary)' }} />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-5">
        <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--org-primary)' }}>
          {course.categoryName}
        </p>
        <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2 mb-3 group-hover:text-[var(--org-primary)] transition-colors">
          {course.title}
        </h3>

        {/* Instructor */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: 'var(--org-secondary)' }}>
            {course.instructorName.charAt(0)}
          </div>
          <span className="text-xs text-gray-500 truncate">{course.instructorName}</span>
        </div>

        {/* Meta row */}
        <div className="flex items-center justify-between border-t border-gray-100 pt-3">
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              {course.averageRating.toFixed(1)}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {course.enrollmentCount}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {course.durationMinutes}m
            </span>
          </div>
          <span className="font-bold text-sm" style={{ color: course.isFree ? '#10b981' : 'var(--org-primary)' }}>
            {course.isFree ? 'Free' : `$${course.price}`}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────
export default function HomePage() {
  const { org } = useOrgStore();
  const { user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!org) return null;

  const { data: stats } = useQuery<OrgStats>({
    queryKey: ['portal-stats', org.id],
    queryFn: () => portalApi.getStats(org.id).then(r => r.data),
  });

  const { data: categories = [] } = useQuery<PublicCategory[]>({
    queryKey: ['portal-categories', org.id],
    queryFn: () => portalApi.getCategories(org.id).then(r => r.data),
  });

  const { data: featuredData } = useQuery({
    queryKey: ['portal-featured', org.id],
    queryFn: () => portalApi.getFeatured(org.id).then(r => r.data),
  });

  const { data: coursesData, isLoading: coursesLoading } = useQuery({
    queryKey: ['portal-courses', org.id, activeCategory, search],
    queryFn: () => portalApi.getCourses(org.id, {
      categoryId: activeCategory ?? undefined,
      search: search || undefined,
      size: 12
    }).then(r => r.data),
    placeholderData: prev => prev,
  });

  const { data: instructors = [] } = useQuery({
    queryKey: ['portal-instructors', org.id],
    queryFn: () => portalApi.getInstructors(org.id).then(r => r.data),
  });

  const featured: PublicCourse[] = featuredData ?? [];
  const courses: PublicCourse[] = coursesData?.items ?? [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: 'var(--org-font, Poppins, sans-serif)' }}>

      {/* ─── NAVBAR ─────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <a href="/" className="flex items-center gap-3 group">
              {org.logoUrl ? (
                <img src={org.logoUrl} alt={org.name} className="h-9 w-auto" />
              ) : (
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-lg group-hover:scale-105 transition-transform"
                  style={{ background: `linear-gradient(135deg, var(--org-primary), var(--org-secondary))` }}>
                  {org.name.charAt(0)}
                </div>
              )}
              <span className="font-black text-gray-900 text-lg hidden sm:block">{org.name}</span>
            </a>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-6">
              <a href="#categories" className="text-sm text-gray-600 hover:text-[var(--org-primary)] font-medium transition-colors">Browse Courses</a>
              <a href="#instructors" className="text-sm text-gray-600 hover:text-[var(--org-primary)] font-medium transition-colors">Instructors</a>
              {org.website && (
                <a href={org.website} target="_blank" rel="noreferrer"
                  className="text-sm text-gray-600 hover:text-[var(--org-primary)] font-medium transition-colors flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5" /> Website
                </a>
              )}
            </div>

            {/* Auth buttons */}
            <div className="hidden md:flex items-center gap-3">
              {isAuthenticated ? (
                <button
                  onClick={() => navigate(user?.role === 'Student' ? '/dashboard/student' : '/dashboard/admin')}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:scale-105 active:scale-95"
                  style={{ background: `linear-gradient(135deg, var(--org-primary), var(--org-secondary))` }}>
                  <GraduationCap className="w-4 h-4" />
                  My Dashboard
                </button>
              ) : (
                <>
                  <button onClick={() => navigate('/login')}
                    className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors">
                    Sign In
                  </button>
                  <button onClick={() => navigate('/register')}
                    className="px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all"
                    style={{ background: `linear-gradient(135deg, var(--org-primary), var(--org-secondary))` }}>
                    Get Started
                  </button>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <button className="md:hidden p-2 rounded-lg" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-3">
            <a href="#categories" className="block text-sm text-gray-700 py-2">Browse Courses</a>
            <a href="#instructors" className="block text-sm text-gray-700 py-2">Instructors</a>
            <div className="flex gap-3 pt-2">
              <button onClick={() => navigate('/login')} className="flex-1 py-2 rounded-xl border border-gray-300 text-sm font-semibold">Sign In</button>
              <button onClick={() => navigate('/register')}
                className="flex-1 py-2 rounded-xl text-sm font-semibold text-white"
                style={{ background: `var(--org-primary)` }}>Get Started</button>
            </div>
          </div>
        )}
      </nav>

      {/* ─── HERO ───────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0"
          style={{ background: `linear-gradient(135deg, var(--org-primary)08 0%, var(--org-secondary)12 50%, var(--org-accent)08 100%)` }} />
        {/* Decorative blobs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full blur-3xl opacity-20"
          style={{ background: `var(--org-primary)` }} />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full blur-3xl opacity-15"
          style={{ background: `var(--org-secondary)` }} />
        {/* Dot grid */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="max-w-3xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold mb-6 border"
              style={{
                background: `var(--org-primary)12`,
                borderColor: `var(--org-primary)30`,
                color: `var(--org-primary)`
              }}>
              <Sparkles className="w-3.5 h-3.5" />
              {stats?.totalCourses ?? '—'} Courses Available
            </div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-gray-900 leading-[1.05] mb-6 tracking-tight">
              Learn without
              <br />
              <span className="relative inline-block px-2">
                <span className="relative z-10" style={{ color: `var(--org-primary)` }}>limits</span>
                <span className="absolute bottom-2 left-0 right-0 h-3 rounded-full -z-0 opacity-20"
                  style={{ background: `var(--org-accent)` }} />
              </span>
            </h1>

            <p className="text-xl text-gray-500 mb-10 leading-relaxed max-w-xl mx-auto">
              {org.tagline || `Explore ${stats?.totalCourses ?? 'hundreds of'} expert-led courses at ${org.name} and grow your skills today.`}
            </p>

            {/* Search bar */}
            <form onSubmit={handleSearch} className="relative max-w-xl mx-auto mb-8">
              <div className="flex gap-3 bg-white rounded-2xl shadow-xl p-2 border border-gray-200 focus-within:border-[var(--org-primary)] focus-within:shadow-2xl transition-all">
                <Search className="w-5 h-5 text-gray-400 ml-2 flex-shrink-0 self-center" />
                <input
                  type="text"
                  placeholder="Search for courses, skills, instructors…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="flex-1 py-2 text-sm outline-none bg-transparent placeholder-gray-400"
                />
                <button type="submit"
                  className="flex-shrink-0 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95"
                  style={{ background: `linear-gradient(135deg, var(--org-primary), var(--org-secondary))` }}>
                  Search
                </button>
              </div>
            </form>

            {/* CTA row */}
            {!isAuthenticated && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button onClick={() => navigate('/register')}
                  className="flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-bold text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all"
                  style={{ background: `linear-gradient(135deg, var(--org-primary), var(--org-secondary))` }}>
                  Start Learning Free <ArrowRight className="w-4 h-4" />
                </button>
                <button onClick={() => navigate('/login')}
                  className="flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-semibold text-gray-700 bg-white border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all">
                  <Play className="w-4 h-4" /> Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─── STATS BAR ──────────────────────────────────────── */}
      <section className="py-14 bg-white border-y border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatCard value={stats?.totalCourses ?? 0}     label="Expert Courses"  icon="📚" />
            <StatCard value={stats?.totalStudents ?? 0}    label="Students"        icon="🎓" />
            <StatCard value={stats?.totalInstructors ?? 0} label="Instructors"     icon="👨‍🏫" />
            <StatCard value={stats?.totalEnrollments ?? 0} label="Enrollments"     icon="📈" />
          </div>
        </div>
      </section>

      {/* ─── CATEGORIES ─────────────────────────────────────── */}
      <section id="categories" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--org-primary)' }}>
              Browse by Topic
            </p>
            <h2 className="text-4xl font-black text-gray-900">Find your next skill</h2>
            <p className="text-gray-500 mt-3 text-lg">Explore {categories.length} topic areas taught by industry experts</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
            {/* All button */}
            <button
              onClick={() => setActiveCategory(null)}
              className={clsx(
                'group relative flex flex-col items-center justify-center gap-2 rounded-2xl p-6 border-2 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5',
                activeCategory === null
                  ? 'border-[var(--org-primary)] bg-[var(--org-primary)] text-white shadow-lg'
                  : 'border-gray-200 bg-white hover:border-[var(--org-primary)]'
              )}>
              <span className="text-3xl">🔥</span>
              <span className={clsx('font-bold text-sm', activeCategory === null ? 'text-white' : 'text-gray-800')}>All Courses</span>
              <span className={clsx('text-xs', activeCategory === null ? 'text-white/70' : 'text-gray-400')}>
                {coursesData?.totalCount ?? '—'} courses
              </span>
            </button>

            {(categories as PublicCategory[]).map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                className={clsx(
                  'group relative flex flex-col items-center justify-center gap-2 rounded-2xl p-6 border-2 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5',
                  activeCategory === cat.id
                    ? 'border-[var(--org-primary)] bg-[var(--org-primary)] text-white shadow-lg scale-[1.02]'
                    : 'border-gray-200 bg-white hover:border-[var(--org-primary)]'
                )}>
                <span className="text-3xl">{cat.icon || '📁'}</span>
                <span className={clsx('font-bold text-sm text-center leading-tight', activeCategory === cat.id ? 'text-white' : 'text-gray-800')}>
                  {cat.name}
                </span>
                <span className={clsx('text-xs', activeCategory === cat.id ? 'text-white/70' : 'text-gray-400')}>
                  {cat.courseCount} courses
                </span>
                {/* Children preview */}
                {cat.children?.length > 0 && (
                  <div className={clsx('flex flex-wrap gap-1 justify-center mt-1', activeCategory === cat.id ? 'visible' : 'hidden group-hover:flex')}>
                    {cat.children.slice(0, 3).map(ch => (
                      <span key={ch.id} className={clsx('text-xs px-1.5 py-0.5 rounded-full', activeCategory === cat.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500')}>
                        {ch.name}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ─── COURSES GRID ───────────────────────────────────── */}
      <section id="courses" className="pb-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-black text-gray-900">
                {activeCategory
                  ? `${categories.find((c: PublicCategory) => c.id === activeCategory)?.name ?? ''} Courses`
                  : search ? `Results for "${search}"` : 'Popular Courses'}
              </h2>
              <p className="text-gray-500 text-sm mt-1">{coursesData?.totalCount ?? 0} courses found</p>
            </div>
            {!isAuthenticated && (
              <button onClick={() => navigate('/register')}
                className="hidden sm:flex items-center gap-2 text-sm font-semibold hover:opacity-80 transition-opacity"
                style={{ color: 'var(--org-primary)' }}>
                Enroll to learn all <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {coursesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm animate-pulse">
                  <div className="h-44 bg-gray-200" />
                  <div className="p-5 space-y-3">
                    <div className="h-3 bg-gray-200 rounded w-1/3" />
                    <div className="h-4 bg-gray-200 rounded" />
                    <div className="h-4 bg-gray-200 rounded w-4/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="font-semibold text-gray-500">No courses found</p>
              <p className="text-sm text-gray-400 mt-1">Try a different category or search term</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {courses.map(course => (
                <CourseCard
                  key={course.id}
                  course={course}
                  orgId={org.id}
                  onClick={() => navigate(`/course/${course.id}`)}
                />
              ))}
            </div>
          )}

          {/* Load more */}
          {(coursesData?.totalPages ?? 1) > 1 && (
            <div className="text-center mt-10">
              <button
                className="px-8 py-3.5 rounded-2xl font-semibold text-sm border-2 transition-all hover:shadow-md hover:scale-105"
                style={{ borderColor: 'var(--org-primary)', color: 'var(--org-primary)' }}>
                Load more courses <ChevronRight className="w-4 h-4 inline" />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ─── INSTRUCTORS ────────────────────────────────────── */}
      {(instructors as any[]).length > 0 && (
        <section id="instructors" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--org-primary)' }}>
                Meet the Team
              </p>
              <h2 className="text-4xl font-black text-gray-900">Learn from the best</h2>
              <p className="text-gray-500 mt-3 text-lg">Industry professionals sharing real-world expertise</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {(instructors as any[]).map((inst: any) => (
                <div key={inst.id} className="group text-center">
                  <div className="relative mx-auto mb-4 w-20 h-20">
                    {inst.avatarUrl ? (
                      <img src={inst.avatarUrl} alt={`${inst.firstName} ${inst.lastName}`}
                        className="w-20 h-20 rounded-2xl object-cover shadow-md group-hover:shadow-xl transition-shadow" />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-md group-hover:shadow-xl transition-shadow group-hover:scale-105 transition-transform"
                        style={{ background: `linear-gradient(135deg, var(--org-primary), var(--org-secondary))` }}>
                        {inst.firstName.charAt(0)}{inst.lastName.charAt(0)}
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center"
                      style={{ background: 'var(--org-accent)' }}>
                      <Award className="w-3 h-3 text-white" />
                    </div>
                  </div>
                  <p className="font-bold text-gray-900 text-sm">{inst.firstName} {inst.lastName}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--org-primary)' }}>{inst.courseCount} courses</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── CTA BANNER ─────────────────────────────────────── */}
      {!isAuthenticated && (
        <section className="py-20 relative overflow-hidden">
          <div className="absolute inset-0"
            style={{ background: `linear-gradient(135deg, var(--org-primary), var(--org-secondary))` }} />
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
          <div className="relative max-w-3xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
              <TrendingUp className="w-3.5 h-3.5" /> Join {stats?.totalStudents?.toLocaleString() ?? '0'}+ learners
            </div>
            <h2 className="text-4xl sm:text-5xl font-black text-white mb-6 leading-tight">
              Ready to start your learning journey?
            </h2>
            <p className="text-white/80 text-lg mb-10 max-w-xl mx-auto">
              Create a free account today and unlock access to all courses at {org.name}.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button onClick={() => navigate('/register')}
                className="px-8 py-4 rounded-2xl font-bold text-lg bg-white hover:bg-gray-50 shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all"
                style={{ color: 'var(--org-primary)' }}>
                Create Free Account
              </button>
              <button onClick={() => navigate('/login')}
                className="px-8 py-4 rounded-2xl font-bold text-lg text-white border-2 border-white/40 hover:border-white/80 hover:bg-white/10 transition-all">
                Sign In Instead
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ─── FOOTER ─────────────────────────────────────────── */}
      <footer className="bg-gray-950 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black"
                style={{ background: `var(--org-primary)` }}>
                {org.name.charAt(0)}
              </div>
              <div>
                <p className="font-bold text-white">{org.name}</p>
                {org.tagline && <p className="text-xs text-gray-500">{org.tagline}</p>}
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <a href="#categories" className="hover:text-white transition-colors">Courses</a>
              <a href="#instructors" className="hover:text-white transition-colors">Instructors</a>
              <a href="/login" className="hover:text-white transition-colors">Sign In</a>
              <a href="/register" className="hover:text-white transition-colors">Register</a>
            </div>
            <p className="text-xs text-gray-600">© {new Date().getFullYear()} {org.name}. All rights reserved.</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
