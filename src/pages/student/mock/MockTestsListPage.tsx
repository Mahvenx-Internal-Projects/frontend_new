import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Play, Pencil, Trash2, Clock, Target,
  CheckCircle2, Award, BarChart3, Users, Eye, X,
  BookOpen, ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import { mockTestApi, enrollmentsApi, coursesApi } from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';
import clsx from 'clsx';

const diffColors: Record<string,string> = {
  Easy: 'bg-green-100 text-green-700',
  Medium: 'bg-amber-100 text-amber-700',
  Hard: 'bg-red-100 text-red-700',
  Mixed: 'bg-blue-100 text-blue-700',
};

export default function MockTestsListPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const isAdmin = ['SuperAdmin', 'OrgAdmin', 'Instructor'].includes(user?.role ?? '');

  // ── Selected course filter (student view) ─────────────────
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);

  // ── Admin create form ──────────────────────────────────────
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', topic: 'General',
    difficulty: 'Mixed', timeLimitMins: '30',
    totalQuestions: '0', passMarkPercent: '80',
    randomizeQuestions: true, maxAttempts: '1',
    courseId: '',
  });

  // ── Student: fetch enrolled courses ───────────────────────
  const { data: enrollments = [] } = useQuery({
    queryKey: ['my-enrollments-for-exam', user?.id],
    queryFn: () => enrollmentsApi.getByUser(user!.id).then(r => r.data),
    enabled: !!user?.id && !isAdmin,
  });

  // ── Student: fetch courses details for enrolled courses ───
  const { data: enrolledCourses = [] } = useQuery({
    queryKey: ['enrolled-courses-detail', (enrollments as any[]).map((e:any) => e.courseId).join(',')],
    queryFn: async () => {
      const ids = (enrollments as any[]).map((e: any) => e.courseId);
      if (!ids.length) return [];
      const results = await Promise.all(ids.map((id: number) => coursesApi.get(id).then(r => r.data)));
      return results;
    },
    enabled: !isAdmin && (enrollments as any[]).length > 0,
  });

  // ── Admin: all org courses for create form dropdown ───────
  const { data: allOrgCourses = [] } = useQuery({
    queryKey: ['courses-for-exam-create', user?.organizationId],
    queryFn: () => coursesApi.getAll({ orgId: user?.organizationId }).then((r: any) => r.data?.items ?? r.data ?? []),
    enabled: !!user?.organizationId && isAdmin,
  });

  // ── Fetch exams ───────────────────────────────────────────
  const { data: rawTests = [], isLoading } = useQuery({
    queryKey: ['mock-tests', user?.organizationId, selectedCourseId, isAdmin],
    queryFn: () => {
      const params: any = { orgId: user?.organizationId };
      if (!isAdmin) params.status = 'Published';
      if (selectedCourseId) params.courseId = selectedCourseId;
      return mockTestApi.getAll(params).then((r: any) => r.data?.items ?? r.data ?? []);
    },
    enabled: !!user?.organizationId && (isAdmin || selectedCourseId !== null),
  });

  // Student: only show exams linked to their enrolled courses
  const tests = isAdmin
    ? (rawTests as any[])
    : (rawTests as any[]).filter((t: any) =>
        t.courseId && (enrollments as any[]).some((e: any) => e.courseId === t.courseId)
      );

  // ── Admin mutations ───────────────────────────────────────
  const createMut = useMutation({
    mutationFn: () => mockTestApi.create({
      ...form,
      timeLimitMins:    Number(form.timeLimitMins),
      totalQuestions:   Number(form.totalQuestions),
      passMarkPercent:  Number(form.passMarkPercent),
      maxAttempts:      Number(form.maxAttempts),
      courseId:         form.courseId ? Number(form.courseId) : undefined,
      organizationId:   user!.organizationId,
      createdById:      user!.id,
    }),
    onSuccess: (res: any) => {
      toast.success('Assessment created!');
      qc.invalidateQueries({ queryKey: ['mock-tests'] });
      setShowCreate(false);
      navigate(`/dashboard/mock-test-editor/${res.data.id}`);
    },
    onError: () => toast.error('Failed to create'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => mockTestApi.delete(id),
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['mock-tests'] }); },
    onError: () => toast.error('Failed to delete'),
  });

  const publishMut = useMutation({
    mutationFn: (id: number) => mockTestApi.publish(id),
    onSuccess: () => { toast.success('Published!'); qc.invalidateQueries({ queryKey: ['mock-tests'] }); },
  });

  const startExam = (t: any) => {
    const hasCoding = t.hasCodingQuestions || t.questionTypes?.includes('Coding');
    navigate(hasCoding ? `/dashboard/coding-exam/${t.id}` : `/dashboard/mock-test/${t.id}`);
  };

  // ─── STUDENT VIEW ────────────────────────────────────────
  if (!isAdmin) {
    const ec = enrolledCourses as any[];
    return (
      <div className="space-y-5 max-w-3xl">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Assessments</h1>
          <p className="text-sm text-gray-400 mt-0.5">Select a course to view its assessment</p>
        </div>

        {/* Course dropdown */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <label className="label flex items-center gap-1.5 mb-2">
            <BookOpen className="w-3.5 h-3.5 text-indigo-500" /> Select Your Course
          </label>
          <select
            className="input"
            value={selectedCourseId ?? ''}
            onChange={e => setSelectedCourseId(e.target.value ? Number(e.target.value) : null)}>
            <option value="">— Choose an enrolled course —</option>
            {ec.map((c: any) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
          {ec.length === 0 && (
            <p className="text-xs text-gray-400 mt-2">You are not enrolled in any courses yet.</p>
          )}
        </div>

        {/* Exam list for selected course */}
        {selectedCourseId && (
          isLoading ? (
            <div className="text-center py-10 text-gray-400">Loading assessments…</div>
          ) : tests.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
              <Award className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="font-bold text-gray-400">No assessment linked to this course yet</p>
              <p className="text-xs text-gray-400 mt-1">Check back later or contact your instructor.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tests.map((t: any) => (
                <div key={t.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-bold text-gray-900">{t.title}</h3>
                        <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full', diffColors[t.difficulty] ?? 'bg-gray-100 text-gray-600')}>{t.difficulty}</span>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3"/>{t.timeLimitMins} min</span>
                        <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/>{t.totalQuestions || 20} questions</span>
                        <span className="flex items-center gap-1"><Award className="w-3 h-3"/>{t.maxAttempts} attempt{t.maxAttempts !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    <button className="btn-primary shrink-0" onClick={() => startExam(t)}>
                      <Play className="w-4 h-4" /> Start Exam
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {!selectedCourseId && ec.length > 0 && (
          <div className="text-center py-10 text-gray-300">
            <ChevronDown className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">Select a course above to see its assessment</p>
          </div>
        )}
      </div>
    );
  }

  // ─── ADMIN / INSTRUCTOR VIEW ─────────────────────────────
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Assessments</h1>
          <p className="text-sm text-gray-400 mt-0.5">{(tests as any[]).length} total</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" /> New Assessment
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">New Assessment</h3>
            <button className="btn-ghost p-1.5" onClick={() => setShowCreate(false)}><X className="w-4 h-4"/></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Title *</label>
              <input className="input" placeholder="e.g. Python Full Stack Assessment"
                value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))}/>
            </div>
            <div className="sm:col-span-2">
              <label className="label flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5 text-gray-400"/>Link to Course (optional)</label>
              <select className="input" value={form.courseId} onChange={e => setForm(f => ({...f, courseId: e.target.value}))}>
                <option value="">— Not linked to any course —</option>
                {(allOrgCourses as any[]).map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Time Limit (mins)</label>
              <input className="input" type="number" value={form.timeLimitMins}
                onChange={e => setForm(f => ({...f, timeLimitMins: e.target.value}))}/>
            </div>
            <div>
              <label className="label">Pass Mark %</label>
              <input className="input" type="number" value={form.passMarkPercent}
                onChange={e => setForm(f => ({...f, passMarkPercent: e.target.value}))}/>
            </div>
            <div>
              <label className="label">Questions Shown</label>
              <input className="input" type="number" placeholder="0 = all"
                value={form.totalQuestions} onChange={e => setForm(f => ({...f, totalQuestions: e.target.value}))}/>
            </div>
            <div>
              <label className="label">Max Attempts</label>
              <input className="input" type="number" value={form.maxAttempts}
                onChange={e => setForm(f => ({...f, maxAttempts: e.target.value}))}/>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button className="btn-primary" onClick={() => createMut.mutate()} disabled={!form.title || createMut.isPending}>
              {createMut.isPending ? 'Creating…' : 'Create & Add Questions'}
            </button>
            <button className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Admin exam list */}
      {isLoading ? (
        <div className="text-center py-10 text-gray-400">Loading…</div>
      ) : (tests as any[]).length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <Award className="w-10 h-10 text-gray-200 mx-auto mb-3"/>
          <p className="font-bold text-gray-400">No assessments yet</p>
          <button className="btn-primary mt-4" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4"/>Create First Assessment</button>
        </div>
      ) : (
        <div className="space-y-3">
          {(tests as any[]).map((t: any) => (
            <div key={t.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-bold text-gray-900">{t.title}</h3>
                    <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full',
                      t.status === 'Published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                      {t.status}
                    </span>
                    <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full', diffColors[t.difficulty] ?? 'bg-gray-100')}>{t.difficulty}</span>
                    {t.courseTitle && <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full flex items-center gap-1"><BookOpen className="w-3 h-3"/>{t.courseTitle}</span>}
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                    <span><Clock className="w-3 h-3 inline mr-0.5"/>{t.timeLimitMins} min</span>
                    <span><Target className="w-3 h-3 inline mr-0.5"/>{t.passMarkPercent}% pass</span>
                    <span><CheckCircle2 className="w-3 h-3 inline mr-0.5"/>{t.totalQuestions || 'All'} questions</span>
                    <span><Users className="w-3 h-3 inline mr-0.5"/>{t.attemptCount ?? 0} attempts</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  {t.status !== 'Published' && (
                    <button className="btn-secondary text-xs text-green-600" onClick={() => publishMut.mutate(t.id)}>Publish</button>
                  )}
                  <button className="btn-ghost p-1.5" title="Edit" onClick={() => navigate(`/dashboard/mock-test-editor/${t.id}`)}><Pencil className="w-4 h-4"/></button>
                  <button className="btn-secondary text-xs px-2 py-1 text-indigo-600 border-indigo-200"
                    title="View Student Attempts & Mark Papers"
                    onClick={() => navigate(`/dashboard/exam-attempts/${t.id}`)}>
                    👥 Attempts
                  </button>
                  <button className="btn-ghost p-1.5 text-blue-500" title="Preview" onClick={() => startExam(t)}><Eye className="w-4 h-4"/></button>
                  <button className="btn-ghost p-1.5 text-red-500" title="Delete"
                    onClick={() => { if (confirm('Delete this assessment?')) deleteMut.mutate(t.id); }}><Trash2 className="w-4 h-4"/></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
