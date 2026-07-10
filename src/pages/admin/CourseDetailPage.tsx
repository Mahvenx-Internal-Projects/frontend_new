import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft, Star, Users, Clock, Globe, BookOpen, Play,
  CheckCircle2, Lock, Award, ChevronDown, ChevronRight,
  AlertTriangle, Maximize2, ClipboardList, XCircle
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { coursesApi, enrollmentsApi, examsApi, mockTestApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import type { Module, Lesson } from '../../types';
import clsx from 'clsx';

export default function CourseDetailPage() {
  // Route is catalog/:courseId  — param name is courseId
  const params = useParams();
  const rawId = params.courseId || params.id || '';
  const numId = parseInt(rawId, 10);

  const navigate = useNavigate();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [expandedMods, setExpandedMods] = useState<Set<number>>(new Set([0]));

  // Exam launch state
  const [examLaunched, setExamLaunched] = useState(false);
  const [tabWarning, setTabWarning] = useState(false);
  const [violations, setViolations] = useState(0);
  const violationsRef = useRef(0);
  const examLaunchedRef = useRef(false);

  // Fetch exam linked to this course via mockTestApi (more accurate than examsApi)
  const { data: linkedExams = [] } = useQuery({
    queryKey: ['course-linked-exam', numId],
    queryFn: () => mockTestApi.getAll({ courseId: numId }).then((r: any) => r.data?.items ?? r.data ?? []),
    enabled: !isNaN(numId) && numId > 0,
  });
  const linkedExam = (linkedExams as any[])[0] ?? null;

  // Tab-switch detection — only active when exam is launched
  useEffect(() => {
    const handle = () => {
      if (!examLaunchedRef.current) return;
      if (document.hidden) {
        const next = violationsRef.current + 1;
        violationsRef.current = next;
        setViolations(next);
        if (next >= 2) {
          toast.error('Second tab switch detected — exam auto-submitted!', { duration: 5000 });
          setExamLaunched(false);
          examLaunchedRef.current = false;
          try { document.exitFullscreen?.(); } catch {}
          // Navigate to exam page which will auto-submit on load
          if (linkedExam) {
            const route = linkedExam.questionTypes?.includes('Coding')
              ? `/dashboard/coding-exam/${linkedExam.id}`
              : `/dashboard/mock-test/${linkedExam.id}`;
            navigate(route + '?autoSubmit=true');
          }
        } else {
          setTabWarning(true);
        }
      }
    };
    document.addEventListener('visibilitychange', handle);
    return () => document.removeEventListener('visibilitychange', handle);
  }, [linkedExam, navigate]);

  const launchExam = () => {
    if (!linkedExam) return;
    // Request fullscreen first
    try { document.documentElement.requestFullscreen?.(); } catch {}
    setExamLaunched(true);
    examLaunchedRef.current = true;
    violationsRef.current = 0;
    setViolations(0);
    setTabWarning(false);
    // Navigate to exam
    const hasCoding = linkedExam.hasCodingQuestions || linkedExam.questionTypes?.includes('Coding');
    const route = hasCoding
      ? `/dashboard/coding-exam/${linkedExam.id}`
      : `/dashboard/mock-test/${linkedExam.id}`;
    navigate(route);
  };

  const { data: course, isLoading } = useQuery({
    queryKey: ['course-detail', rawId],
    queryFn:  () => coursesApi.get(numId).then(r => r.data),
    enabled:  !isNaN(numId) && numId > 0,
  });

  const { data: exams = [] } = useQuery({
    queryKey: ['course-exams', rawId],
    queryFn:  () => examsApi.getByCourse(numId).then(r => r.data),
    enabled:  !isNaN(numId) && numId > 0,
  });

  const { data: myEnrollments = [] } = useQuery({
    queryKey: ['my-enrollments', user?.id],
    queryFn:  () => enrollmentsApi.getByUser(user!.id).then(r => r.data),
    enabled:  !!user?.id,
  });

  const enrollment = (myEnrollments as any[]).find((e: any) => e.courseId === numId);

  const enrollMut = useMutation({
    mutationFn: () => enrollmentsApi.enroll({ userId: user!.id, courseId: numId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-enrollments'] });
      toast.success('Enrolled! Start learning now.');
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Enrollment failed'),
  });

  if (isNaN(numId) || numId <= 0) return (
    <div className="text-center py-20 text-gray-400">
      <p className="text-lg font-bold mb-2">Invalid course ID</p>
      <button className="btn-primary" onClick={() => navigate('/dashboard/catalog')}>Back to Catalog</button>
    </div>
  );

  if (isLoading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-gray-100 rounded w-1/3" />
      <div className="h-64 bg-gray-100 rounded-xl" />
    </div>
  );

  if (!course) return (
    <div className="text-center py-20 text-gray-400">
      <p className="text-lg font-bold mb-2">Course not found</p>
      <button className="btn-primary" onClick={() => navigate('/dashboard/catalog')}>Back to Catalog</button>
    </div>
  );

  const totalLessons = (course.modules ?? []).reduce((s: number, m: Module) => s + (m.lessons?.length ?? 0), 0);
  const firstLesson  = (course.modules ?? [])[0]?.lessons?.[0];

  return (
    <div className="max-w-4xl space-y-5">
      <button className="btn-ghost" onClick={() => navigate('/dashboard/catalog')}>
        <ChevronLeft className="w-4 h-4" /> Back to Catalog
      </button>

      {/* Hero */}
      <div className="card overflow-hidden">
        <div className="h-48 bg-gradient-to-br from-blue-600 to-purple-700 relative">
          {course.thumbnailUrl && (
            <img src={course.thumbnailUrl} className="w-full h-full object-cover opacity-60" alt="" />
          )}
          <div className="absolute inset-0 p-6 flex flex-col justify-end bg-gradient-to-t from-black/60">
            <div className="flex gap-2 mb-2">
              <span className="badge badge-blue text-xs">{course.level}</span>
              {course.categoryName && (
                <span className="badge bg-white/20 text-white text-xs">{course.categoryName}</span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-white leading-tight">{course.title}</h1>
          </div>
        </div>

        <div className="p-6">
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-4">
            <span className="flex items-center gap-1">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              {(course.averageRating ?? 0).toFixed(1)} ({course.ratingCount ?? 0} ratings)
            </span>
            <span className="flex items-center gap-1"><Users className="w-4 h-4" />{course.enrollmentCount ?? 0} students</span>
            <span className="flex items-center gap-1"><Globe className="w-4 h-4" />{course.language}</span>
            <span className="flex items-center gap-1"><BookOpen className="w-4 h-4" />{totalLessons} lessons</span>
          </div>

          {course.description && (
            <div className="text-gray-600 text-sm leading-relaxed mb-4 prose prose-sm"
              dangerouslySetInnerHTML={{ __html: course.description }} />
          )}

          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs text-gray-400">Instructor</p>
              <p className="font-semibold text-gray-800">{course.instructorName}</p>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-2xl font-bold text-gray-900">
                {course.isFree
                  ? <span className="text-green-600">Free</span>
                  : `₹${course.price}`}
              </p>
              {enrollment ? (
                <button className="btn-primary"
                  onClick={() => firstLesson && navigate(`/learn/${course.id}/lesson/${firstLesson.id}`)}>
                  <Play className="w-4 h-4" /> Continue Learning
                </button>
              ) : (
                <button className="btn-primary" onClick={() => enrollMut.mutate()} disabled={enrollMut.isPending}>
                  {enrollMut.isPending ? 'Enrolling…' : course.isFree ? 'Enroll Free' : 'Enroll Now'}
                </button>
              )}
            </div>
          </div>

          {enrollment && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Your Progress</span>
                <span className="font-bold">{enrollment.progressPercent ?? 0}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: `${enrollment.progressPercent ?? 0}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Curriculum */}
      {(course.modules ?? []).length > 0 && (
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Course Curriculum</h2>
          <div className="space-y-2">
            {(course.modules ?? []).map((mod: Module, mi: number) => (
              <div key={mod.id} className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                  onClick={() => setExpandedMods(s => {
                    const n = new Set(s);
                    n.has(mi) ? n.delete(mi) : n.add(mi);
                    return n;
                  })}>
                  {expandedMods.has(mi)
                    ? <ChevronDown className="w-4 h-4 text-gray-400" />
                    : <ChevronRight className="w-4 h-4 text-gray-400" />}
                  <span className="flex-1 font-medium text-sm text-gray-800">{mod.title}</span>
                  <span className="text-xs text-gray-400">{mod.lessons?.length ?? 0} lessons</span>
                </button>
                {expandedMods.has(mi) && (
                  <div className="divide-y divide-gray-100">
                    {(mod.lessons ?? []).map((lesson: Lesson) => {
                      const canPlay = lesson.isPreview || !!enrollment;
                      return (
                        <div key={lesson.id}
                          className={clsx('flex items-center gap-3 px-4 py-2.5',
                            canPlay ? 'cursor-pointer hover:bg-gray-50' : 'opacity-60')}
                          onClick={() => {
                            if (canPlay && enrollment)
                              navigate(`/learn/${course.id}/lesson/${lesson.id}`);
                          }}>
                          {canPlay
                            ? <Play className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                            : <Lock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
                          <span className="flex-1 text-sm text-gray-700">{lesson.title}</span>
                          {lesson.isPreview && (
                            <span className="text-xs badge badge-blue">Preview</span>
                          )}
                          {(lesson.durationSecs ?? 0) > 0 && (
                            <span className="text-xs text-gray-400">
                              {lesson.durationSecs >= 3600
                                ? `${Math.floor(lesson.durationSecs/3600)}h ${Math.floor((lesson.durationSecs%3600)/60)}m`
                                : `${Math.floor(lesson.durationSecs/60)} min`}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Linked Assessment ─────────────────────────────── */}
      {linkedExam && enrollment && (
        <div className="card p-5">
          {/* Tab switch warning overlay */}
          {tabWarning && (
            <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
                <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                <h2 className="text-xl font-black text-gray-900 mb-2">Tab Switch Detected!</h2>
                <p className="text-gray-600 text-sm mb-2">You switched away from the exam page.</p>
                <p className="text-red-600 font-bold text-sm mb-6">
                  ⚠️ One more switch will <strong>auto-submit your exam!</strong>
                </p>
                <button className="btn-primary w-full justify-center py-3 font-black"
                  onClick={() => {
                    setTabWarning(false);
                    try { document.documentElement.requestFullscreen?.(); } catch {}
                    launchExam();
                  }}>
                  <Maximize2 className="w-4 h-4" /> Return to Exam (Fullscreen)
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 mb-4">
            <ClipboardList className="w-5 h-5 text-purple-500" />
            <h2 className="font-bold text-gray-900">Course Assessment</h2>
          </div>

          <div className="rounded-2xl border-2 border-purple-100 bg-purple-50 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-bold text-gray-900 text-base">{linkedExam.title}</p>
                <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{linkedExam.timeLimitMins} min</span>
                  <span>🎯 Pass: {linkedExam.passMarkPercent}%</span>
                  <span>📝 {linkedExam.totalQuestions || 20} questions</span>
                  <span>🔄 {linkedExam.maxAttempts} attempt{linkedExam.maxAttempts !== 1 ? 's' : ''}</span>
                </div>
              </div>
              <Award className="w-8 h-8 text-amber-400 flex-shrink-0" />
            </div>

            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 space-y-1">
              <p className="font-bold flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Exam Rules:</p>
              <p>• Exam opens in <strong>fullscreen</strong> — do not exit</p>
              <p>• Switching tabs = 1st warning shown, 2nd switch = <strong>auto-submit</strong></p>
              <p>• Score ≥ {linkedExam.passMarkPercent}% to qualify for next round</p>
            </div>

            <button
              onClick={launchExam}
              className="mt-4 w-full btn-primary justify-center py-3 font-black text-base">
              <Maximize2 className="w-5 h-5" /> Start Exam (Fullscreen)
            </button>
          </div>
        </div>
      )}

      {/* Legacy exams from examsApi (non-linked) */}
      {(exams as any[]).filter((e: any) => e.id !== linkedExam?.id).length > 0 && enrollment && (
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Other Assessments</h2>
          <div className="space-y-2">
            {(exams as any[]).filter((e: any) => e.id !== linkedExam?.id).map((exam: any) => (
              <div key={exam.id}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all">
                <Award className="w-5 h-5 text-amber-500 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{exam.title}</p>
                  <p className="text-xs text-gray-400">{exam.timeLimitMins} min · Pass: {exam.passMarkPercent}%</p>
                </div>
                <button className="btn-primary text-xs"
                  onClick={() => navigate(`/dashboard/mock-test/${exam.id}`)}>
                  Take Exam
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
