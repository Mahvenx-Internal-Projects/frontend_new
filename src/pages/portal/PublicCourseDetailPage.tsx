import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Star, Users, Clock, Globe, Lock, Play, Award,
  CheckCircle2, ChevronLeft, ChevronDown, ChevronRight,
  BookOpen, Video, FileText, ArrowRight, Share2
} from 'lucide-react';
import { useState } from 'react';
import { useOrgStore } from '../../store/orgStore';
import { useAuthStore } from '../../store/authStore';
import { portalApi, type PublicCourse } from '../../services/portalApi';
import clsx from 'clsx';

export default function PublicCourseDetailPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { org } = useOrgStore();
  const { isAuthenticated } = useAuthStore();
  const [expandedMods, setExpandedMods] = useState<Set<number>>(new Set([0]));
  const [copied, setCopied] = useState(false);

  const { data: course, isLoading } = useQuery<PublicCourse>({
    queryKey: ['public-course', courseId],
    queryFn: () => portalApi.getCourse(org!.id, Number(courseId)).then(r => r.data),
    enabled: !!org?.id && !!courseId,
  });

  if (!org) return null;

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) return (
    <div className="min-h-screen bg-gray-50 animate-pulse">
      <div className="h-16 bg-white border-b border-gray-100" />
      <div className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="h-8 bg-gray-200 rounded-xl w-3/4" />
          <div className="h-60 bg-gray-200 rounded-2xl" />
        </div>
        <div className="h-96 bg-gray-200 rounded-2xl" />
      </div>
    </div>
  );

  if (!course) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-6xl mb-4">😕</p>
        <h2 className="text-2xl font-bold text-gray-800">Course not found</h2>
        <button onClick={() => navigate('/')} className="mt-6 px-6 py-2.5 rounded-xl text-white text-sm font-semibold" style={{ background: 'var(--org-primary)' }}>
          Back to Home
        </button>
      </div>
    </div>
  );

  const totalLessons = (course.modules ?? []).reduce((s, m) => s + m.lessons.length, 0);
  const previewLessons = (course.modules ?? []).flatMap(m => m.lessons).filter(l => l.isPreview).length;

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: 'var(--org-font, Poppins, sans-serif)' }}>
      {/* Minimal nav */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors">
            <ChevronLeft className="w-4 h-4" /> Back to {org.name}
          </button>
          <div className="flex items-center gap-3">
            <button onClick={handleShare} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-gray-600">
              <Share2 className="w-3.5 h-3.5" />
              {copied ? 'Copied!' : 'Share'}
            </button>
            {!isAuthenticated && (
              <button onClick={() => navigate('/register')}
                className="text-xs px-4 py-2 rounded-xl font-semibold text-white transition-all hover:opacity-90"
                style={{ background: `linear-gradient(135deg, var(--org-primary), var(--org-secondary))` }}>
                Enroll Free
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero strip */}
      <div className="relative overflow-hidden py-10"
        style={{ background: `linear-gradient(135deg, var(--org-primary)10, var(--org-secondary)15)` }}>
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 mb-3">
            <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: 'var(--org-primary)18', color: 'var(--org-primary)' }}>
              {course.categoryName}
            </span>
            <span className={clsx('text-xs font-medium px-2.5 py-1 rounded-full',
              course.level === 'Beginner' ? 'bg-emerald-100 text-emerald-700' :
              course.level === 'Intermediate' ? 'bg-amber-100 text-amber-700' :
              'bg-red-100 text-red-700')}>
              {course.level}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 max-w-3xl leading-tight mb-4">{course.title}</h1>
          <div className="text-gray-500 max-w-2xl text-base mb-5 leading-relaxed prose prose-sm" dangerouslySetInnerHTML={{ __html: course.description ?? '' }} />
          <div className="flex flex-wrap items-center gap-5 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <strong className="text-gray-800">{course.averageRating.toFixed(1)}</strong>
              <span className="text-gray-400">({course.ratingCount} ratings)</span>
            </span>
            <span className="flex items-center gap-1.5"><Users className="w-4 h-4" />{course.enrollmentCount} students</span>
            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{course.durationMinutes} minutes</span>
            <span className="flex items-center gap-1.5"><Globe className="w-4 h-4" />{course.language}</span>
            <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4" />{totalLessons} lessons</span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* LEFT: Curriculum */}
          <div className="lg:col-span-2 space-y-6">
            {/* What you'll learn */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h2 className="font-black text-gray-900 text-lg mb-4">What you'll learn</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  'Industry-standard best practices',
                  'Hands-on real-world projects',
                  'Certificate upon completion',
                  'Lifetime access to materials',
                  'Expert instructor guidance',
                  'Community Q&A support',
                ].map(item => (
                  <div key={item} className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--org-primary)' }} />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Curriculum */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-black text-gray-900 text-lg">Course Curriculum</h2>
                <p className="text-xs text-gray-400">{totalLessons} lessons · {previewLessons} free previews</p>
              </div>

              <div className="space-y-2">
                {(course.modules ?? []).map((mod, mi) => (
                  <div key={mod.id} className="border border-gray-200 rounded-xl overflow-hidden">
                    <button
                      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left"
                      onClick={() => setExpandedMods(s => { const n = new Set(s); n.has(mi) ? n.delete(mi) : n.add(mi); return n; })}>
                      {expandedMods.has(mi) ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                      <span className="flex-1 font-semibold text-sm text-gray-800">{mod.title}</span>
                      <span className="text-xs text-gray-400">{mod.lessons.length} lessons</span>
                    </button>
                    {expandedMods.has(mi) && (
                      <div className="divide-y divide-gray-100">
                        {mod.lessons.map(lesson => (
                          <div key={lesson.id} className="flex items-center gap-3 px-5 py-3">
                            {lesson.type === 'Video'
                              ? <Video className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--org-primary)' }} />
                              : <FileText className="w-4 h-4 text-green-500 flex-shrink-0" />}
                            <span className="flex-1 text-sm text-gray-600">{lesson.title}</span>
                            {lesson.isPreview ? (
                              <button className="text-xs font-semibold flex items-center gap-1 hover:opacity-70 transition-opacity"
                                style={{ color: 'var(--org-primary)' }}
                                onClick={() => isAuthenticated ? navigate(`/dashboard/catalog/${course.id}`) : navigate('/register')}>
                                <Play className="w-3 h-3" /> Preview
                              </button>
                            ) : (
                              <Lock className="w-3.5 h-3.5 text-gray-300" />
                            )}
                            <span className="text-xs text-gray-400 ml-2">{Math.round(lesson.durationSecs / 60)}m</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: Enroll card (sticky) */}
          <div className="lg:col-span-1">
            <div className="sticky top-20">
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                {/* Thumbnail */}
                <div className="relative h-44 overflow-hidden">
                  {course.thumbnailUrl ? (
                    <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"
                      style={{ background: `linear-gradient(135deg, var(--org-primary)20, var(--org-secondary)30)` }}>
                      <BookOpen className="w-16 h-16 opacity-30" style={{ color: 'var(--org-primary)' }} />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-xl cursor-pointer hover:scale-110 transition-transform">
                      <Play className="w-6 h-6 ml-0.5" style={{ color: 'var(--org-primary)' }} />
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-5">
                  {/* Price */}
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-black" style={{ color: course.isFree ? '#10b981' : 'var(--org-primary)' }}>
                      {course.isFree ? 'Free' : `$${course.price}`}
                    </span>
                    {!course.isFree && (
                      <span className="text-sm text-gray-400 line-through">$99.99</span>
                    )}
                  </div>

                  {/* CTA */}
                  {isAuthenticated ? (
                    <button onClick={() => navigate(`/dashboard/catalog/${course.id}`)}
                      className="w-full py-4 rounded-xl font-bold text-white text-base shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                      style={{ background: `linear-gradient(135deg, var(--org-primary), var(--org-secondary))` }}>
                      <Play className="w-5 h-5" /> Go to Course
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <button onClick={() => navigate('/register')}
                        className="w-full py-4 rounded-xl font-bold text-white text-base shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                        style={{ background: `linear-gradient(135deg, var(--org-primary), var(--org-secondary))` }}>
                        Enroll Now <ArrowRight className="w-4 h-4" />
                      </button>
                      <button onClick={() => navigate('/login')}
                        className="w-full py-3 rounded-xl font-semibold text-sm text-gray-700 border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all">
                        Sign In to Enroll
                      </button>
                    </div>
                  )}

                  {/* Features */}
                  <div className="space-y-2.5 text-sm text-gray-600">
                    {[
                      { icon: '📚', text: `${totalLessons} lessons` },
                      { icon: '⏱️', text: `${course.durationMinutes} minutes total` },
                      { icon: '🌐', text: `${course.language} language` },
                      { icon: '🎓', text: 'Certificate on completion' },
                      { icon: '🔓', text: `${previewLessons} free preview lessons` },
                      { icon: '♾️', text: 'Full lifetime access' },
                    ].map(f => (
                      <div key={f.text} className="flex items-center gap-2.5">
                        <span>{f.icon}</span>
                        <span>{f.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Instructor card */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mt-4">
                <p className="text-xs text-gray-400 uppercase tracking-widest mb-3">Your Instructor</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-lg flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, var(--org-primary), var(--org-secondary))` }}>
                    {course.instructorName.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{course.instructorName}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Award className="w-3 h-3" /> Expert Instructor
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
