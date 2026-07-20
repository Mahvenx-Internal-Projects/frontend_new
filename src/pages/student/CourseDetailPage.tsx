import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft, ChevronDown, ChevronRight, Play, Lock,
  Star, Users, Globe, BookOpen, Award,
  CheckCircle2, AlertTriangle, Maximize2, ClipboardList, Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { coursesApi, enrollmentsApi, mockTestApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import clsx from 'clsx';

// ─── THIS IS THE STUDENT COURSE DETAIL PAGE ───────────────────
// Route: /dashboard/catalog/:courseId
// Shows: course info, modules/lessons list, linked exam
// Does NOT contain any lesson editor, block editor, or admin UI
// ─────────────────────────────────────────────────────────────

export default function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const numId = parseInt(courseId ?? '0', 10);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const [expandedMods, setExpandedMods] = useState<Set<number>>(new Set());
  const [tabWarning, setTabWarning] = useState(false);
  const violationsRef = useRef(0);
  const examActiveRef = useRef(false);

  // ── Fetch course ──────────────────────────────────────────
  const { data: course, isLoading } = useQuery({
    queryKey: ['student-course', numId],
    queryFn: () => coursesApi.get(numId).then(r => r.data),
    enabled: numId > 0,
  });

  // ── Fetch modules + lessons separately ───────────────────
  const { data: modules = [] } = useQuery({
    queryKey: ['student-course-modules', numId],
    queryFn: () => coursesApi.getModules(numId).then((r: any) => r.data ?? []),
    enabled: numId > 0,
  });

  // ── Fetch enrollment ──────────────────────────────────────
  const { data: myEnrollments = [] } = useQuery({
    queryKey: ['my-enrollments', user?.id],
    queryFn: () => enrollmentsApi.getByUser(user!.id).then(r => r.data),
    enabled: !!user?.id,
  });

  // ── Fetch linked exam ─────────────────────────────────────
  const { data: linkedExams = [] } = useQuery({
    queryKey: ['student-course-exam', numId],
    queryFn: () => mockTestApi.getAll({ courseId: numId }).then((r: any) => r.data?.items ?? r.data ?? []),
    enabled: numId > 0,
  });

  const enrollment = (myEnrollments as any[]).find((e: any) => e.courseId === numId);
  const linkedExam = (linkedExams as any[])[0] ?? null;
  const allLessons = (modules as any[]).flatMap((m: any) => m.lessons ?? []);
  const firstLesson = allLessons[0];

  // Auto-expand all modules
  useEffect(() => {
    if ((modules as any[]).length > 0)
      setExpandedMods(new Set((modules as any[]).map((_: any, i: number) => i)));
  }, [(modules as any[]).length]);

  // ── Enroll ────────────────────────────────────────────────
  const enrollMut = useMutation({
    mutationFn: () => enrollmentsApi.enroll({ userId: user!.id, courseId: numId }),
    onSuccess: () => { toast.success('Enrolled!'); qc.invalidateQueries({ queryKey: ['my-enrollments'] }); },
    onError: () => toast.error('Enrolment failed'),
  });

  // ── Tab-switch protection for exam ────────────────────────
  useEffect(() => {
    const handle = () => {
      if (!examActiveRef.current || !document.hidden) return;
      const next = ++violationsRef.current;
      if (next >= 2) {
        toast.error('Second tab switch — exam auto-submitted!', { duration: 5000 });
        examActiveRef.current = false;
        try { document.exitFullscreen?.(); } catch {}
        if (linkedExam) navigate(`/dashboard/mock-test/${linkedExam.id}?autoSubmit=true`);
      } else {
        setTabWarning(true);
      }
    };
    document.addEventListener('visibilitychange', handle);
    return () => document.removeEventListener('visibilitychange', handle);
  }, [linkedExam, navigate]);

  const launchExam = () => {
    if (!linkedExam) return;
    try { document.documentElement.requestFullscreen?.(); } catch {}
    examActiveRef.current = true;
    violationsRef.current = 0;
    setTabWarning(false);
    navigate(`/dashboard/mock-test/${linkedExam.id}`);
  };

  function fmtDuration(s: number) {
    if (!s) return '';
    if (s >= 3600) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
    return `${Math.floor(s / 60)} min`;
  }

  // ── Loading ───────────────────────────────────────────────
  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-[var(--org-primary)] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!course) return (
    <div className="text-center py-20 text-gray-400">
      <p className="text-lg font-bold mb-2">Course not found</p>
      <button className="btn-primary" onClick={() => navigate('/dashboard/catalog')}>Back to Catalog</button>
    </div>
  );

  return (
    <div className="max-w-4xl space-y-5">

      {/* Tab-switch warning overlay */}
      {tabWarning && (
        <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
            <h2 className="text-xl font-black mb-2">Tab Switch Detected!</h2>
            <p className="text-red-600 font-bold text-sm mb-6">⚠️ One more switch will auto-submit your exam!</p>
            <button className="btn-primary w-full justify-center py-3 font-black"
              onClick={() => { setTabWarning(false); try { document.documentElement.requestFullscreen?.(); } catch {} launchExam(); }}>
              <Maximize2 className="w-4 h-4" /> Return to Exam
            </button>
          </div>
        </div>
      )}

      <button className="btn-ghost" onClick={() => navigate('/dashboard/catalog')}>
        <ChevronLeft className="w-4 h-4" /> Back to Catalog
      </button>

      {/* ── Hero ──────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="h-48 relative bg-gradient-to-br from-indigo-600 to-purple-700">
          {course.thumbnailUrl && (
            <img src={course.thumbnailUrl} className="w-full h-full object-cover opacity-60" alt="" />
          )}
          <div className="absolute inset-0 p-6 flex flex-col justify-end bg-gradient-to-t from-black/60">
            <div className="flex gap-2 mb-2 flex-wrap">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/20 text-white">{course.level}</span>
              {linkedExam && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-500/80 text-white flex items-center gap-1">
                  <ClipboardList className="w-3 h-3" /> Has Assessment
                </span>
              )}
            </div>
            <h1 className="text-2xl font-black text-white leading-tight">{course.title}</h1>
          </div>
        </div>

        <div className="p-6">
          <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
            <span className="flex items-center gap-1"><Star className="w-4 h-4 text-amber-400 fill-amber-400" />{(course.averageRating ?? 0).toFixed(1)}</span>
            <span className="flex items-center gap-1"><Users className="w-4 h-4" />{course.enrollmentCount ?? 0} students</span>
            <span className="flex items-center gap-1"><Globe className="w-4 h-4" />{course.language}</span>
            <span className="flex items-center gap-1"><BookOpen className="w-4 h-4" />{allLessons.length} lessons</span>
          </div>

          {course.description && (
            <div className="text-gray-600 text-sm leading-relaxed mb-5 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: course.description }} />
          )}

          <div className="flex items-center justify-between flex-wrap gap-4">
            <p className="text-2xl font-black text-gray-900">
              {course.isFree ? <span className="text-green-600">Free</span> : `₹${course.price}`}
            </p>
            {enrollment ? (
              <button className="btn-primary px-6 py-2.5 font-bold"
                onClick={() => firstLesson && navigate(`/learn/${course.id}/lesson/${firstLesson.id}`)}>
                <Play className="w-4 h-4" /> {enrollment.progressPercent > 0 ? 'Continue Learning' : 'Start Learning'}
              </button>
            ) : (
              <button className="btn-primary px-6 py-2.5 font-bold"
                onClick={() => enrollMut.mutate()} disabled={enrollMut.isPending}>
                {enrollMut.isPending ? 'Enrolling…' : course.isFree ? '🎓 Enroll Free' : 'Enroll Now'}
              </button>
            )}
          </div>

          {enrollment && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Progress</span>
                <span className="font-bold" style={{ color: 'var(--org-primary)' }}>{enrollment.progressPercent ?? 0}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${enrollment.progressPercent ?? 0}%`, background: 'var(--org-primary)' }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Curriculum ────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-500" /> Course Curriculum
          </h2>
          <span className="text-xs text-gray-400">{allLessons.length} lessons</span>
        </div>

        {(modules as any[]).length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center mb-4">
              <Play className="w-7 h-7 text-gray-200" />
            </div>
            <p className="font-bold text-gray-400">No lessons yet</p>
            <p className="text-sm text-gray-400 mt-1">Content will appear here once the instructor adds lessons.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {(modules as any[]).map((mod: any, mi: number) => (
              <div key={mod.id}>
                <button
                  className="w-full flex items-center gap-3 px-5 py-3.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                  onClick={() => setExpandedMods(s => { const n = new Set(s); n.has(mi) ? n.delete(mi) : n.add(mi); return n; })}>
                  {expandedMods.has(mi) ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                  <span className="flex-1 font-semibold text-sm text-gray-800">{mod.title}</span>
                  <span className="text-xs text-gray-400">{(mod.lessons ?? []).length} lessons</span>
                </button>

                {expandedMods.has(mi) && (
                  <div className="divide-y divide-gray-50">
                    {(mod.lessons ?? []).map((lesson: any) => {
                      const canPlay = lesson.isPreview || !!enrollment;
                      return (
                        <div key={lesson.id}
                          className={clsx('flex items-center gap-3 px-5 py-3 transition-colors',
                            canPlay ? 'cursor-pointer hover:bg-indigo-50' : 'opacity-50 cursor-not-allowed')}
                          onClick={() => {
                            if (!canPlay) { toast('Enroll to access this lesson'); return; }
                            navigate(`/learn/${course.id}/lesson/${lesson.id}`);
                          }}>
                          <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                            {lesson.progress?.isCompleted
                              ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                              : canPlay
                                ? <Play className="w-3.5 h-3.5 text-indigo-500" />
                                : <Lock className="w-3.5 h-3.5 text-gray-400" />}
                          </div>
                          <span className="flex-1 text-sm text-gray-700">{lesson.title}</span>
                          {lesson.isPreview && !enrollment && (
                            <span className="text-xs bg-blue-100 text-blue-600 font-semibold px-2 py-0.5 rounded-full">Preview</span>
                          )}
                          {(lesson.durationSecs ?? 0) > 0 && (
                            <span className="text-xs text-gray-400">{fmtDuration(lesson.durationSecs)}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Exam (enrolled students only) ─────────────────── */}
      {linkedExam && enrollment && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" /> Course Assessment
          </h2>
          <div className="rounded-2xl border-2 border-purple-100 bg-gradient-to-br from-purple-50 to-indigo-50 p-5">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="font-bold text-gray-900">{linkedExam.title}</p>
                <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{linkedExam.timeLimitMins} min</span>
                  <span>📝 {linkedExam.totalQuestions || 20} questions</span>
                  <span>🔄 {linkedExam.maxAttempts} attempt{linkedExam.maxAttempts !== 1 ? 's' : ''}</span>
                </div>
              </div>
              <ClipboardList className="w-7 h-7 text-purple-400 flex-shrink-0" />
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700 space-y-1 mb-4">
              <p className="font-bold">⚠️ Exam Rules</p>
              <p>• Opens in fullscreen — do not exit</p>
              <p>• 1st tab switch = warning &nbsp;|&nbsp; 2nd tab switch = auto-submit</p>
              <p>• Results will be shared by the organization after evaluation</p>
            </div>
            <button onClick={launchExam} className="w-full btn-primary justify-center py-3 text-base font-black">
              <Maximize2 className="w-5 h-5" /> Start Exam (Fullscreen)
            </button>
          </div>
        </div>
      )}

      {/* Prompt to enroll if exam exists but not enrolled */}
      {linkedExam && !enrollment && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-center">
          <ClipboardList className="w-8 h-8 text-purple-300 mx-auto mb-2" />
          <p className="font-bold text-gray-700">This course has an assessment</p>
          <p className="text-sm text-gray-400 mt-1 mb-4">Enroll to unlock the exam.</p>
          <button className="btn-primary" onClick={() => enrollMut.mutate()} disabled={enrollMut.isPending}>
            {enrollMut.isPending ? 'Enrolling…' : 'Enroll to Take Exam'}
          </button>
        </div>
      )}
    </div>
  );
}
