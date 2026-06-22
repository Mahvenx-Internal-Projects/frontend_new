import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft, Star, Users, Clock, Globe, BookOpen, Play,
  CheckCircle2, Lock, Award, ChevronDown, ChevronRight
} from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { coursesApi, enrollmentsApi, examsApi, lessonsApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import type { Module, Lesson } from '../../types';
import clsx from 'clsx';

export default function CourseDetailPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [expandedMods, setExpandedMods] = useState<Set<number>>(new Set([0]));
  const numericCourseId = Number(courseId);
  const hasValidCourseId = !Number.isNaN(numericCourseId) && numericCourseId > 0;

  const { data: course, isLoading } = useQuery({
    queryKey: ['course-detail', numericCourseId],
    queryFn: () => coursesApi.get(numericCourseId).then(r => r.data),
    enabled: hasValidCourseId,
  });

  const { data: exams = [] } = useQuery({
    queryKey: ['course-exams', numericCourseId],
    queryFn: () => examsApi.getByCourse(numericCourseId).then(r => r.data),
    enabled: hasValidCourseId,
  });

  const { data: myEnrollments = [] } = useQuery({
    queryKey: ['my-enrollments', user?.id],
    queryFn: () => enrollmentsApi.getByUser(user!.id).then(r => r.data),
    enabled: !!user?.id,
  });

  const enrollment = (myEnrollments as any[]).find((e: any) => e.courseId === numericCourseId);

  // Per-lesson progress — drives the green tick / pending state on each
  // lesson row in the curriculum list below.
  const { data: lessonProgress = [] } = useQuery({
    queryKey: ['course-lesson-progress', numericCourseId],
    queryFn: () => lessonsApi.getCourseProgress(numericCourseId).then(r => r.data),
    enabled: hasValidCourseId && !!enrollment,
  });
  const progressByLessonId: Record<number, any> = {};
  (lessonProgress as any[]).forEach((p: any) => { progressByLessonId[p.lessonId] = p; });

  const enrollMut = useMutation({
    mutationFn: () => enrollmentsApi.enroll({ userId: user!.id, courseId: numericCourseId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-enrollments'] });
      toast.success('Enrolled! Start learning now.');
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Enrollment failed'),
  });

  if (isLoading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-gray-100 rounded w-1/3" />
      <div className="h-64 bg-gray-100 rounded-xl" />
    </div>
  );

  if (!course) return <div className="text-center py-20 text-gray-400">Course not found.</div>;

  const totalLessons = (course.modules ?? []).reduce((s: number, m: Module) => s + (m.lessons?.length ?? 0), 0);
  const completedLessonsCount = (lessonProgress as any[]).filter((p: any) => p.isCompleted).length;
  const pendingLessonsCount = Math.max(0, totalLessons - completedLessonsCount);
  const previewLessons = (course.modules ?? []).flatMap((m: Module) => m.lessons ?? []).filter((l: Lesson) => l.isPreview);
  const firstLesson = (course.modules ?? [])[0]?.lessons?.[0];

  return (
    <div className="max-w-4xl space-y-5">
      <button className="btn-ghost" onClick={() => navigate('/dashboard/catalog')}>
        <ChevronLeft className="w-4 h-4" /> Back to Catalog
      </button>

      {/* Hero */}
      <div className="card overflow-hidden">
        <div className="h-48 bg-gradient-to-br from-brand-600 to-purple-700 relative">
          {course.thumbnailUrl && <img src={course.thumbnailUrl} className="w-full h-full object-cover opacity-60" alt="" />}
          <div className="absolute inset-0 p-6 flex flex-col justify-end bg-gradient-to-t from-black/60">
            <div className="flex gap-2 mb-2">
              <span className="badge-blue">{course.level}</span>
              <span className="badge bg-white/20 text-white">{course.categoryName}</span>
            </div>
            <h1 className="text-2xl font-bold text-white leading-tight">{course.title}</h1>
          </div>
        </div>

        <div className="p-6">
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-4">
            <span className="flex items-center gap-1"><Star className="w-4 h-4 text-amber-400 fill-amber-400" />{course.averageRating.toFixed(1)} ({course.ratingCount} ratings)</span>
            <span className="flex items-center gap-1"><Users className="w-4 h-4" />{course.enrollmentCount} students</span>
            <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{course.durationMinutes} minutes</span>
            <span className="flex items-center gap-1"><Globe className="w-4 h-4" />{course.language}</span>
            <span className="flex items-center gap-1"><BookOpen className="w-4 h-4" />{totalLessons} lessons</span>
          </div>

          <div className="text-gray-600 text-sm leading-relaxed mb-4 prose prose-sm" dangerouslySetInnerHTML={{ __html: course.description ?? '' }} />

          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs text-gray-400">Instructor</p>
              <p className="font-semibold text-gray-800">{course.instructorName}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">
                  {course.isFree ? <span className="text-green-600">Free</span> : `$${course.price}`}
                </p>
              </div>
              {enrollment ? (
                <button className="btn-primary"
                  onClick={() => firstLesson && navigate(`/learn/${course.id}/lesson/${firstLesson.id}`)}>
                  <Play className="w-4 h-4" /> Continue Learning
                </button>
              ) : (
                <button className="btn-primary" onClick={() => enrollMut.mutate()} disabled={enrollMut.isPending}>
                  {enrollMut.isPending ? 'Enrolling…' : 'Enroll Now'}
                </button>
              )}
            </div>
          </div>

          {enrollment && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Progress</span><span>{enrollment.progressPercent}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: `${enrollment.progressPercent}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Curriculum */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="font-semibold text-gray-900">Course Curriculum</h2>
          {enrollment && (
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-700 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5"/> {completedLessonsCount} completed
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 font-semibold">
                {pendingLessonsCount} pending
              </span>
            </div>
          )}
        </div>
        <div className="space-y-2">
          {(() => {
            // Flat, in-order lesson list across all modules — needed to
            // determine sequential lock state consistently with the
            // lesson player page's logic.
            const flatLessons: Lesson[] = (course.modules ?? []).flatMap((m: Module) => m.lessons ?? []);
            const isLessonLocked = (lessonId: number): boolean => {
              if (!course.enforceSequentialLessons) return false;
              const idx = flatLessons.findIndex(l => l.id === lessonId);
              for (let i = 0; i < idx; i++) {
                if (!progressByLessonId[flatLessons[i].id]?.isCompleted) return true;
              }
              return false;
            };

            return (course.modules ?? []).map((mod: Module, mi: number) => (
            <div key={mod.id} className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                onClick={() => setExpandedMods(s => { const n = new Set(s); n.has(mi) ? n.delete(mi) : n.add(mi); return n; })}>
                {expandedMods.has(mi) ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                <span className="flex-1 font-medium text-sm text-gray-800">{mod.title}</span>
                <span className="text-xs text-gray-400">{mod.lessons?.length ?? 0} lessons</span>
              </button>
              {expandedMods.has(mi) && (
                <div className="divide-y divide-gray-100">
                  {(mod.lessons ?? []).map((lesson: Lesson) => {
                    const sequentiallyLocked = isLessonLocked(lesson.id);
                    const canPlay = (lesson.isPreview || !!enrollment) && !sequentiallyLocked;
                    const prog = progressByLessonId[lesson.id];
                    const isDone = prog?.isCompleted ?? false;
                    const isStarted = !isDone && (prog?.watchedSeconds ?? 0) > 0;
                    return (
                      <div key={lesson.id}
                        className={clsx('flex items-center gap-3 px-4 py-2.5', canPlay ? 'cursor-pointer hover:bg-gray-50' : 'opacity-60',
                          isDone && 'bg-green-50/40')}
                        title={sequentiallyLocked ? 'Complete earlier lessons to unlock' : ''}
                        onClick={() => canPlay && enrollment && navigate(`/learn/${course.id}/lesson/${lesson.id}`)}>
                        {/* Completion indicator: green tick / in-progress dot / lock / play */}
                        {isDone ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                        ) : !canPlay ? (
                          <Lock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        ) : isStarted ? (
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-[var(--org-primary)] flex items-center justify-center flex-shrink-0">
                            <div className="w-1.5 h-1.5 rounded-full bg-[var(--org-primary)]" />
                          </div>
                        ) : (
                          <Play className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" />
                        )}
                        <span className={clsx('flex-1 text-sm', isDone ? 'text-gray-500 line-through' : 'text-gray-700')}>
                          {lesson.title}
                        </span>
                        {lesson.isPreview && <span className="badge-blue text-xs">Preview</span>}
                        {isStarted && prog?.watchedSeconds > 0 && (
                          <span className="text-xs text-[var(--org-primary)] font-semibold">
                            {Math.min(100, Math.round(prog.watchedSeconds / Math.max(1, lesson.durationSecs) * 100))}%
                          </span>
                        )}
                        <span className="text-xs text-gray-400">{Math.round(lesson.durationSecs / 60)} min</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ));
          })()}
        </div>
      </div>

      {/* Exams */}
      {(exams as any[]).length > 0 && enrollment && (
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Assessments</h2>
          <div className="space-y-2">
            {(exams as any[]).map((exam: any) => (
              <div key={exam.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 hover:border-brand-200 hover:bg-brand-50/30 transition-all">
                <Award className="w-5 h-5 text-amber-500 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{exam.title}</p>
                  <p className="text-xs text-gray-400">{exam.timeLimitMins} min · Pass: {exam.passMarkPercent}%</p>
                </div>
                <button className="btn-primary text-xs" onClick={() => navigate(`/dashboard/exam/${exam.id}`)}>
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
