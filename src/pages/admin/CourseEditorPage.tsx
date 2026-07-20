import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Save, ChevronLeft, ChevronRight, ChevronDown, Plus, Trash2, Eye,
  BookOpen, Video, Music, FileText, Globe, Lock, Pencil, ClipboardList, Link2, AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { coursesApi, categoriesApi, usersApi, mockTestApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import Modal from '../../components/shared/Modal';
import FileUpload from '../../components/shared/FileUpload';
import RichTextEditor from '../../components/shared/RichTextEditor';
import clsx from 'clsx';

const API_BASE = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? '' : 'https://lms.worksupport360.com';


function fmtSecs(s: number) {
  if (!s) return '';
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60;
  if (h) return `${h}h ${m}m`;
  return m ? `${m}m ${sec}s` : `${sec}s`;
}

// Counts lessons at every depth of the tree, not just root-level — so the
// "X lessons" summary in the preview matches what a student would
// actually see, including sub-lessons.
function countLessonsDeep(lessons: any[]): number {
  return lessons.reduce((sum, l) => sum + 1 + countLessonsDeep(l.lessons ?? l.childLessons ?? []), 0);
}

// Sums durationSecs across every lesson at every depth — gives the
// course's real total runtime, not just the root-level lessons.
function sumDurationDeep(lessons: any[]): number {
  return lessons.reduce((sum, l) => sum + (l.durationSecs ?? 0) + sumDurationDeep(l.lessons ?? l.childLessons ?? []), 0);
}

// Read-only recursive row for the Preview tab's curriculum — mirrors
// LessonTreeRow's structure but without any edit/delete actions, since
// this is purely a "what will the student see" preview.
function PreviewLessonRow({ lesson, depth }: { lesson: any; depth: number }) {
  const children: any[] = lesson.lessons ?? lesson.childLessons ?? [];
  return (
    <>
      <div className="flex items-center gap-2 text-sm text-gray-600 py-1.5 border-b border-gray-50"
        style={{ paddingLeft: `${depth * 20}px` }}>
        {lesson.type==='Video' ? <Video className="w-3.5 h-3.5 text-purple-400 flex-shrink-0"/> :
         lesson.type==='Audio' ? <Music className="w-3.5 h-3.5 text-amber-400 flex-shrink-0"/> :
         lesson.type==='PDF'   ? <FileText className="w-3.5 h-3.5 text-red-400 flex-shrink-0"/> :
         <FileText className="w-3.5 h-3.5 text-blue-400 flex-shrink-0"/>}
        <span className="flex-1">{lesson.title}</span>
        {children.length > 0 && (
          <span className="text-xs text-purple-400">{children.length} sub-lesson{children.length !== 1 ? 's' : ''}</span>
        )}
        {lesson.durationSecs > 0 && <span className="text-xs text-gray-400">{fmtSecs(lesson.durationSecs)}</span>}
        {lesson.isPreview && <span className="text-xs text-green-600 font-semibold">Free</span>}
      </div>
      {children.map((child: any) => (
        <PreviewLessonRow key={child.id} lesson={child} depth={depth + 1} />
      ))}
    </>
  );
}

// ─── Recursive lesson tree row ──────────────────────────────────────────
// Renders a lesson, then recursively renders its childLessons indented one
// level deeper. Each row offers "+ Sub-lesson" to add a child at any depth,
// so the tree can nest infinitely (Lesson → Sub-lesson → Sub-sub-lesson...).
function LessonTreeRow({ lesson, depth, courseId, moduleId, navigate, onDelete, onAddChild }: {
  lesson: any; depth: number; courseId: string | number; moduleId: number;
  navigate: (path: string) => void;
  onDelete: (lessonId: number) => void;
  onAddChild: (parentLessonId: number) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const children: any[] = lesson.lessons ?? lesson.childLessons ?? [];
  const hasChildren = children.length > 0;

  return (
    <>
      <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-50 hover:bg-gray-50 group transition-colors"
        style={{ paddingLeft: `${20 + depth * 24}px` }}>
        {/* Expand/collapse caret — only shown when this lesson has children */}
        {hasChildren ? (
          <button type="button" onClick={() => setExpanded(e => !e)}
            className="flex-shrink-0 p-0.5 rounded hover:bg-gray-200 text-gray-400">
            {expanded ? <ChevronDown className="w-3.5 h-3.5"/> : <ChevronRight className="w-3.5 h-3.5"/>}
          </button>
        ) : (
          <span className="w-4 flex-shrink-0" />
        )}

        {/* Type icon */}
        <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
          lesson.type==='Video'   ? 'bg-purple-100 text-purple-600' :
          lesson.type==='Audio'   ? 'bg-amber-100 text-amber-600' :
          lesson.type==='Article' ? 'bg-blue-100 text-blue-600' :
          'bg-gray-100 text-gray-500')}>
          {lesson.type==='Video'   ? <Video className="w-4 h-4"/> :
           lesson.type==='Audio'   ? <Music className="w-4 h-4"/> :
           lesson.type==='Article' ? <FileText className="w-4 h-4"/> :
           <BookOpen className="w-4 h-4"/>}
        </div>

        {/* Title + meta */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">{lesson.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-gray-400">{lesson.type}</span>
            {lesson.durationSecs > 0 && <span className="text-xs text-gray-400">· {fmtSecs(lesson.durationSecs)}</span>}
            {(lesson.contentBlocksCount > 0) && (
              <span className="text-xs bg-blue-50 text-blue-600 px-1.5 rounded font-medium">
                {lesson.contentBlocksCount} block{lesson.contentBlocksCount !== 1 ? 's' : ''}
              </span>
            )}
            {hasChildren && (
              <span className="text-xs bg-purple-50 text-purple-600 px-1.5 rounded font-medium">
                {children.length} sub-lesson{children.length !== 1 ? 's' : ''}
              </span>
            )}
            {lesson.isPreview && <span className="text-xs bg-green-100 text-green-600 px-1.5 rounded font-semibold">Free</span>}
            {!lesson.isPublished && <span className="text-xs bg-gray-100 text-gray-400 px-1.5 rounded">Draft</span>}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button type="button"
            onClick={() => onAddChild(lesson.id)}
            className="p-2 rounded-lg hover:bg-purple-100 text-purple-500 transition-colors" title="Add sub-lesson">
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button type="button"
            onClick={() => navigate(`/dashboard/courses/${courseId}/lesson/${lesson.id}/edit`)}
            className="p-2 rounded-lg hover:bg-blue-100 text-blue-500 transition-colors" title="Edit lesson">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button type="button"
            onClick={() => onDelete(lesson.id)}
            className="p-2 rounded-lg hover:bg-red-100 text-red-400 transition-colors" title="Delete lesson and all sub-lessons">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Recursively render children, indented one level deeper */}
      {hasChildren && expanded && children.map((child: any) => (
        <LessonTreeRow key={child.id} lesson={child} depth={depth + 1}
          courseId={courseId} moduleId={moduleId} navigate={navigate}
          onDelete={onDelete} onAddChild={onAddChild} />
      ))}
    </>
  );
}

export default function CourseEditorPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const isEdit = !!id;

  const tabFromUrl = searchParams.get('tab');
  const moduleFromUrl = searchParams.get('moduleId');
  const [activeTab, setActiveTab] = useState<'info'|'content'|'assessment'|'preview'>(
    tabFromUrl === 'content' || tabFromUrl === 'preview' || tabFromUrl === 'assessment' ? tabFromUrl : 'info'
  );
  const [courseForm, setCF] = useState({
    title: '', description: '', level: 'Beginner', status: 'Draft',
    price: '0', isFree: true, categoryId: '', thumbnailUrl: '', tags: '', language: 'English',
    instructorId: '', enforceSequentialLessons: false
  });

  // Module state — auto-expand the module specified in the URL param
  // (set when navigating back from lesson editor) so the updated
  // sub-lesson tree is immediately visible without a manual click.
  const [expandedModule, setExpandedModule] = useState<number | null>(
    moduleFromUrl ? Number(moduleFromUrl) : null
  );
  const [modModal, setModModal] = useState(false);
  const [modForm, setMF] = useState({ title: '', description: '' });


  const { data: courseData } = useQuery({
    queryKey: ['course-edit', id],
    queryFn: () => coursesApi.get(Number(id)).then(r => r.data),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!courseData) return;
    setCF({
      title: courseData.title ?? '', description: courseData.description ?? '',
      level: courseData.level ?? 'Beginner', status: courseData.status ?? 'Draft',
      price: String(courseData.price ?? 0), isFree: courseData.isFree ?? true,
      categoryId: String(courseData.categoryId ?? ''), thumbnailUrl: courseData.thumbnailUrl ?? '',
      tags: courseData.tags ?? '', language: courseData.language ?? 'English',
      instructorId: String(courseData.instructorId ?? ''),
      enforceSequentialLessons: courseData.enforceSequentialLessons ?? false
    });
  }, [courseData]);

  const { data: modulesRaw = [], refetch: refetchModules } = useQuery({
    queryKey: ['course-modules', id],
    queryFn: () => coursesApi.getModules(Number(id)).then(r => r.data),
    enabled: isEdit,
  });
  const modules = modulesRaw as any[];

  // Auto-expand the first module when modules load for the first time
  // and no specific module was requested via URL — so the tree is never
  // completely hidden (all collapsed) by default.
  useEffect(() => {
    if (modules.length > 0 && expandedModule === null && !moduleFromUrl) {
      setExpandedModule(modules[0].id);
    }
  }, [modules.length]);

  const { data: categories = [] } = useQuery({
    queryKey: ['cats-all'],
    queryFn: () => categoriesApi.getAll(user?.organizationId).then(r => r.data),
  });

  // All PUBLISHED exams in this org (only published exams can be linked to courses)
  const { data: allExams = [] } = useQuery({
    queryKey: ['exams-org', user?.organizationId],
    queryFn: () => mockTestApi.getAll({ orgId: user?.organizationId }).then((r: any) => {
      const all = r.data?.items ?? r.data ?? [];
      // Only show Published exams in the link dropdown
      return all.filter((e: any) => e.status === 'Published');
    }),
    enabled: !!user?.organizationId && isEdit,
  });

  // Exam currently linked to this course
  const { data: linkedExams = [], refetch: refetchLinkedExam } = useQuery({
    queryKey: ['exams-course', id],
    queryFn: () => mockTestApi.getAll({ courseId: Number(id) }).then((r: any) => r.data?.items ?? r.data ?? []),
    enabled: !!id,
  });
  const linkedExam = (linkedExams as any[])[0] ?? null;

  const attachExamMut = useMutation({
    mutationFn: (examId: number) => mockTestApi.linkCourse(examId, Number(id)),
    onSuccess: () => { toast.success('Exam linked to course!'); refetchLinkedExam(); qc.invalidateQueries({ queryKey: ['exams-org'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to link exam — make sure backend is updated'),
  });
  const detachExamMut = useMutation({
    mutationFn: (examId: number) => mockTestApi.linkCourse(examId, null),
    onSuccess: () => { toast.success('Exam unlinked'); refetchLinkedExam(); qc.invalidateQueries({ queryKey: ['exams-org'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to unlink exam'),
  });

  const isInstructorRole = user?.role === 'Instructor';

  // Instructors aren't authorized to list other users (UsersController is
  // SuperAdmin/OrgAdmin only) — fetching this for the dropdown would 403.
  // Since an Instructor can only ever create courses under their own name
  // anyway, skip the lookup entirely for them.
  const { data: instructorsRaw = [] } = useQuery({
    queryKey: ['instructors'],
    queryFn: () => usersApi.getAll({ role: 'Instructor', size: 100 }).then(r => (r.data as any).items ?? []),
    enabled: !isInstructorRole,
  });
  const instructors = instructorsRaw as any[];

  // Auto-assign the logged-in Instructor as the course's instructor —
  // they never see or use the dropdown, so this must happen here instead.
  useEffect(() => {
    if (isInstructorRole && user?.id && !courseForm.instructorId) {
      setCF(f => ({ ...f, instructorId: String(user.id) }));
    }
  }, [isInstructorRole, user?.id]);

  // Rich text editors store "empty" content as HTML like '<p></p>' or
  // '<p><br></p>', never a literal empty string — so a plain truthy check
  // on courseForm.description would always pass even when nothing was
  // actually typed. Strip tags first to check for real text content.
  const descriptionIsEmpty = !courseForm.description?.replace(/<[^>]*>/g, '').trim();

  const handleSaveClick = () => {
    if (!courseForm.title.trim()) { toast.error('Course title is required'); return; }
    if (descriptionIsEmpty) { toast.error('Course description is required'); return; }
    saveCourse.mutate();
  };

  const saveCourse = useMutation({
    mutationFn: async () => {
      const payload = {
        title: courseForm.title, description: courseForm.description,
        level: courseForm.level, status: courseForm.status,
        price: Number(courseForm.price), isFree: courseForm.isFree,
        categoryId: Number(courseForm.categoryId) || undefined,
        thumbnailUrl: courseForm.thumbnailUrl, tags: courseForm.tags,
        language: courseForm.language,
        instructorId: Number(courseForm.instructorId) || undefined,
        organizationId: user!.organizationId,
        enforceSequentialLessons: courseForm.enforceSequentialLessons,
      };
      if (isEdit) return coursesApi.update(Number(id), payload);
      // On create, explicitly pass status so Draft/Published is respected from the start
      return coursesApi.create({ ...payload, status: courseForm.status ?? 'Draft' });
    },
    onSuccess: (res: any) => {
      toast.success('Course saved!');
      qc.invalidateQueries({ queryKey: ['courses'] });
      qc.invalidateQueries({ queryKey: ['course-edit', id] });
      if (!isEdit) navigate(`/dashboard/courses/${res.data.id}/edit`);
    },
    onError: () => toast.error('Failed to save course'),
  });

  const createMod = useMutation({
    mutationFn: () => coursesApi.createModule({ ...modForm, courseId: Number(id), displayOrder: modules.length }),
    onSuccess: () => { refetchModules(); setModModal(false); setMF({ title:'', description:'' }); toast.success('Module added'); },
    onError: () => toast.error('Failed to add module'),
  });

  const deleteMod = useMutation({
    mutationFn: (mid: number) => coursesApi.deleteModule(mid),
    onSuccess: () => { refetchModules(); toast.success('Module deleted'); },
  });

  const deleteLesson = async (lessonId: number) => {
    if (!confirm('Delete this lesson?')) return;
    const token = localStorage.getItem('lms_token');
    await fetch(`${API_BASE}/api/lessons/${lessonId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    refetchModules();
    toast.success('Lesson deleted');
  };

  return (
    <div className="max-w-5xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button className="btn-ghost" onClick={() => navigate('/dashboard/courses')}><ChevronLeft className="w-4 h-4" /></button>
          <div>
            <h1 className="text-xl font-black text-gray-900">{isEdit ? (courseForm.title || 'Edit Course') : 'New Course'}</h1>
            <p className="text-xs text-gray-400 mt-0.5">{isEdit ? `ID: ${id}` : 'Fill details, then add content'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {isEdit && (
            <button className="btn-secondary" onClick={() => navigate(`/dashboard/catalog/${id}`)}>
              <Eye className="w-4 h-4" /> Preview
            </button>
          )}
          <button className="btn-primary" onClick={handleSaveClick}
            disabled={!courseForm.title || descriptionIsEmpty || saveCourse.isPending}>
            <Save className="w-4 h-4" /> {saveCourse.isPending ? 'Saving…' : 'Save Course'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-1">
        {([['info','⚙️ Course Info'],['content','📚 Content'],['assessment','🎯 Assessment'],['preview','👁 Preview']] as const).map(([t,l]) => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={clsx('px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap',
              activeTab===t ? 'border-[var(--org-primary)] text-[var(--org-primary)]' : 'border-transparent text-gray-500 hover:text-gray-700')}>
            {l}
          </button>
        ))}
      </div>

      {/* ─── INFO TAB ─────────────────────────────────────── */}
      {activeTab === 'info' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <h2 className="font-bold text-gray-600 text-xs uppercase tracking-wider">Basic Information</h2>
              <div>
                <label className="label">Course Title *</label>
                <input className="input text-base font-semibold" placeholder="e.g. Complete React & TypeScript Masterclass"
                  value={courseForm.title} onChange={e => setCF(f => ({...f, title: e.target.value}))} />
              </div>
              <div>
                <RichTextEditor
                  label="Description *"
                  value={courseForm.description}
                  onChange={val => setCF(f => ({...f, description: val}))}
                  placeholder="What will students learn? Describe outcomes, prerequisites, and why this course is unique…"
                  minHeight={180}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Level</label>
                  <select className="input" value={courseForm.level} onChange={e => setCF(f => ({...f, level: e.target.value}))}>
                    {['Beginner','Intermediate','Advanced'].map(l => <option key={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Language</label>
                  <select className="input" value={courseForm.language} onChange={e => setCF(f => ({...f, language: e.target.value}))}>
                    {['English','Hindi','Telugu','Tamil','Kannada','Bengali','Marathi'].map(l => <option key={l}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Tags <span className="font-normal text-gray-400">(comma separated)</span></label>
                <input className="input" placeholder="react, javascript, web development"
                  value={courseForm.tags} onChange={e => setCF(f => ({...f, tags: e.target.value}))} />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <h2 className="font-bold text-gray-600 text-xs uppercase tracking-wider">Settings</h2>
              <div>
                <label className="label">Category</label>
                <select className="input" value={courseForm.categoryId} onChange={e => setCF(f => ({...f, categoryId: e.target.value}))}>
                  <option value="">Select category</option>
                  {(categories as any[]).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Instructor</label>
                {isInstructorRole ? (
                  <div className="input bg-gray-50 text-gray-600 flex items-center gap-2 cursor-default">
                    <span className="w-5 h-5 rounded-full bg-[var(--org-primary)] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </span>
                    {user?.firstName} {user?.lastName} (you)
                  </div>
                ) : (
                  <select className="input" value={courseForm.instructorId} onChange={e => setCF(f => ({...f, instructorId: e.target.value}))}>
                    <option value="">Select instructor</option>
                    {instructors.map((i: any) => <option key={i.id} value={i.id}>{i.firstName} {i.lastName}</option>)}
                  </select>
                )}
              </div>
              <div>
                <label className="label">Pricing</label>
                <div className="flex gap-2 mb-2">
                  {([true,false] as const).map(free => (
                    <button key={String(free)} type="button" onClick={() => setCF(f => ({...f, isFree: free, price: free ? '0' : f.price}))}
                      className={clsx('flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-all',
                        courseForm.isFree===free ? 'border-[var(--org-primary)] bg-[var(--org-primary)]/10 text-[var(--org-primary)]' : 'border-gray-200 text-gray-500')}>
                      {free ? '🆓 Free' : '💰 Paid'}
                    </button>
                  ))}
                </div>
                {!courseForm.isFree && (
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-500 text-sm">₹</span>
                    <input className="input pl-8" type="number" min={0}
                      value={courseForm.price} onChange={e => setCF(f => ({...f, price: e.target.value}))} />
                  </div>
                )}
              </div>
              <div>
                <label className="label">Status</label>
                <div className="flex gap-2">
                  {['Draft','Published'].map(s => (
                    <button key={s} type="button" onClick={() => setCF(f => ({...f, status: s}))}
                      className={clsx('flex-1 py-2 rounded-xl text-xs font-bold border-2 flex items-center justify-center gap-1.5 transition-all',
                        courseForm.status===s ? 'border-transparent text-white' : 'border-gray-200 text-gray-500')}
                      style={courseForm.status===s ? { background: s==='Published' ? '#10b981' : '#6b7280' } : {}}>
                      {s==='Published' ? <Globe className="w-3.5 h-3.5"/> : <Lock className="w-3.5 h-3.5"/>} {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5"/> Sequential Lessons
                </label>
                <button type="button"
                  onClick={() => setCF(f => ({ ...f, enforceSequentialLessons: !f.enforceSequentialLessons }))}
                  className={clsx('w-full flex items-center justify-between px-4 py-2.5 rounded-xl border-2 transition-all',
                    courseForm.enforceSequentialLessons ? 'border-[var(--org-primary)] bg-[var(--org-primary)]/10' : 'border-gray-200')}>
                  <span className="text-sm text-gray-700">
                    {courseForm.enforceSequentialLessons
                      ? 'Students must finish each lesson before the next unlocks'
                      : 'Students can watch lessons in any order'}
                  </span>
                  <div className={clsx('w-10 h-5.5 rounded-full relative transition-colors flex-shrink-0',
                    courseForm.enforceSequentialLessons ? 'bg-[var(--org-primary)]' : 'bg-gray-300')}
                    style={{ width: '40px', height: '22px' }}>
                    <div className={clsx('absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-transform',
                      courseForm.enforceSequentialLessons && 'translate-x-[18px]')}
                      style={{ width: '18px', height: '18px' }} />
                  </div>
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-bold text-gray-600 text-xs uppercase tracking-wider mb-3">Thumbnail</h2>
              <FileUpload type="image" folder="thumbnails" label=""
                onUploaded={url => setCF(f => ({...f, thumbnailUrl: url}))}
                currentUrl={courseForm.thumbnailUrl} />
            </div>
          </div>
        </div>
      )}

      {/* ─── CONTENT TAB ──────────────────────────────────── */}
      {activeTab === 'content' && (
        <div className="space-y-4">
          {!isEdit ? (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-700">
              ⚠️ Save the course info first, then come back here to add modules and lessons.
            </div>
          ) : (
            <>
              <div className="flex justify-end">
                <button className="btn-primary" onClick={() => { setModModal(true); setMF({ title:'', description:'' }); }}>
                  <Plus className="w-4 h-4" /> Add Module
                </button>
              </div>

              {modules.length === 0 && (
                <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="font-bold text-gray-500">No modules yet</p>
                  <p className="text-sm text-gray-400 mt-1">Add a module to start organizing your lessons</p>
                  <button className="btn-primary mt-4" onClick={() => { setModModal(true); setMF({ title:'', description:'' }); }}>
                    <Plus className="w-4 h-4" /> Add First Module
                  </button>
                </div>
              )}

              {modules.map((mod: any, mi: number) => (
                <div key={mod.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  {/* Module header */}
                  <div
                    className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors select-none"
                    onClick={() => setExpandedModule(expandedModule === mod.id ? null : mod.id)}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0 shadow-sm"
                        style={{ background: 'linear-gradient(135deg,var(--org-primary),var(--org-secondary,var(--org-primary)))' }}>
                        {mi + 1}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{mod.title}</p>
                        <p className="text-xs text-gray-400">{(mod.lessons ?? []).length} lesson{(mod.lessons ?? []).length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); navigate(`/dashboard/courses/${id}/lesson/new?moduleId=${mod.id}`); }}
                        className="btn-secondary text-xs py-1.5 px-3">
                        <Plus className="w-3 h-3" /> Lesson
                      </button>
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); if (confirm('Delete this module and all its lessons?')) deleteMod.mutate(mod.id); }}
                        className="btn-ghost text-xs text-red-400 py-1.5">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-gray-400 text-lg">{expandedModule === mod.id ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {/* Lessons list */}
                  {expandedModule === mod.id && (
                    <div className="border-t border-gray-100">
                      {(mod.lessons ?? []).length === 0 ? (
                        <div className="px-5 py-8 text-center">
                          <p className="text-sm text-gray-400 mb-3">No lessons in this module yet</p>
                          <button type="button" className="btn-secondary text-sm"
                            onClick={() => navigate(`/dashboard/courses/${id}/lesson/new?moduleId=${mod.id}`)}>
                            <Plus className="w-3.5 h-3.5" /> Add First Lesson
                          </button>
                        </div>
                      ) : (
                        (mod.lessons ?? []).map((lesson: any) => (
                          <LessonTreeRow key={lesson.id} lesson={lesson} depth={0}
                            courseId={id!} moduleId={mod.id} navigate={navigate}
                            onDelete={deleteLesson}
                            onAddChild={(parentLessonId) =>
                              navigate(`/dashboard/courses/${id}/lesson/new?moduleId=${mod.id}&parentLessonId=${parentLessonId}`)} />
                        ))
                      )}
                      <div className="px-5 py-3 border-t border-gray-50">
                        <button type="button" className="btn-secondary text-xs w-full justify-center"
                          onClick={() => navigate(`/dashboard/courses/${id}/lesson/new?moduleId=${mod.id}`)}>
                          <Plus className="w-3 h-3" /> Add Lesson to "{mod.title}"
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {modules.length > 0 && (
                <div className="flex justify-center pt-2">
                  <button type="button" onClick={() => setActiveTab('preview')}
                    className="btn-secondary">
                    <Eye className="w-4 h-4" /> Preview Full Course
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ─── ASSESSMENT TAB ───────────────────────────────── */}
      {activeTab === 'assessment' && (
        <div className="space-y-5">
          {!isEdit ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400">
              Save the course first to assign an assessment.
            </div>
          ) : (
            <>
              {/* Currently linked exam */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-purple-500" /> Linked Assessment
                </h3>
                {linkedExam ? (
                  <div className="flex items-start justify-between gap-4 p-4 bg-purple-50 border border-purple-200 rounded-2xl">
                    <div>
                      <p className="font-bold text-gray-900">{linkedExam.title}</p>
                      <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                        <span>⏱ {linkedExam.timeLimitMins} min</span>
                        <span>🎯 {linkedExam.passMarkPercent}% to pass</span>
                        <span>📝 {linkedExam.totalQuestions || 'All'} questions shown</span>
                        <span>🔄 Max {linkedExam.maxAttempts} attempt{linkedExam.maxAttempts !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1 w-fit">
                        <AlertTriangle className="w-3 h-3" />
                        Students must complete this course content before the exam unlocks
                      </div>
                    </div>
                    <button onClick={() => detachExamMut.mutate(linkedExam.id)} disabled={detachExamMut.isPending}
                      className="btn-ghost text-red-500 text-xs shrink-0">
                      Unlink
                    </button>
                  </div>
                ) : (
                  <div className="p-6 border-2 border-dashed border-gray-200 rounded-2xl text-center text-gray-400">
                    <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No assessment linked yet.</p>
                    <p className="text-xs mt-1">Students will not see an exam for this course until you link one below.</p>
                  </div>
                )}
              </div>

              {/* Assign existing exam */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-indigo-500" /> Assign Existing Assessment
                </h3>
                <p className="text-xs text-gray-400 mb-4">Pick an assessment from your organisation to link to this course. Students will see the exam at the bottom of their course page.</p>
                <div className="space-y-2">
                  {(allExams as any[])
                    .map((exam: any) => {
                      const isLinked = linkedExam?.id === exam.id;
                      return (
                        <div key={exam.id}
                          className={clsx('flex items-center justify-between gap-3 p-3.5 rounded-xl border transition-all',
                            isLinked ? 'border-purple-300 bg-purple-50' : 'border-gray-100 hover:border-gray-200 bg-gray-50')}>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-gray-900 truncate">{exam.title}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{exam.timeLimitMins}m · {exam.passMarkPercent}% pass · {exam.maxAttempts} attempt</p>
                          </div>
                          {isLinked ? (
                            <span className="text-xs font-bold text-purple-600 bg-purple-100 px-2 py-1 rounded-full shrink-0">✓ Linked</span>
                          ) : (
                            <button onClick={() => attachExamMut.mutate(exam.id)} disabled={attachExamMut.isPending}
                              className="btn-primary text-xs py-1.5 px-3 shrink-0">
                              Link
                            </button>
                          )}
                        </div>
                      );
                    })}
                  {(allExams as any[]).length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-4">No assessments found. Create one in the Assessments section first.</p>
                  )}
                </div>
              </div>

              {/* How it works */}
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 text-sm text-blue-800 space-y-1.5">
                <p className="font-bold">📋 How this works for students:</p>
                <p>• When a student opens this course, the linked exam appears at the bottom of the course page</p>
                <p>• Clicking "Start Exam" opens fullscreen mode automatically</p>
                <p>• If the student switches to another tab — <strong>warning shown</strong>, second violation = <strong>auto-submit</strong></p>
                <p>• Score ≥ {linkedExam?.passMarkPercent ?? 80}% → <strong>Congratulations</strong> message; below → <strong>Not qualified</strong> message</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── PREVIEW TAB ──────────────────────────────────── */}
      {activeTab === 'preview' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
          {!isEdit ? (
            <p className="text-gray-400 text-center py-8">Save the course first to see a preview.</p>
          ) : (
            <>
              <div className="flex gap-5 flex-col sm:flex-row">
                {courseForm.thumbnailUrl
                  ? <img src={courseForm.thumbnailUrl} alt={courseForm.title} className="w-full sm:w-64 h-40 object-cover rounded-2xl shadow-md flex-shrink-0" />
                  : <div className="w-full sm:w-64 h-40 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-50 flex items-center justify-center flex-shrink-0"><BookOpen className="w-12 h-12 text-blue-300" /></div>
                }
                <div className="flex-1">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {[courseForm.level, courseForm.language, courseForm.status].map(tag => (
                      <span key={tag} className="text-xs px-2.5 py-1 rounded-full font-semibold bg-gray-100 text-gray-600">{tag}</span>
                    ))}
                    {courseForm.enforceSequentialLessons && (
                      <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-purple-100 text-purple-600 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Sequential
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl font-black text-gray-900 mb-2">{courseForm.title || '(No title yet)'}</h2>
                  <div className="text-sm text-gray-500 mb-3 rich-preview"
                    dangerouslySetInnerHTML={{ __html: courseForm.description || '<em>No description</em>' }} />

                  {/* Category / instructor / tags summary */}
                  <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-gray-500 mb-3">
                    {courseForm.categoryId && (
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-gray-400" />
                        {(categories as any[]).find((c: any) => String(c.id) === courseForm.categoryId)?.name ?? 'Category'}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      {isInstructorRole
                        ? `${user?.firstName} ${user?.lastName}`
                        : instructors.find((i: any) => String(i.id) === courseForm.instructorId)
                          ? `${instructors.find((i: any) => String(i.id) === courseForm.instructorId)?.firstName} ${instructors.find((i: any) => String(i.id) === courseForm.instructorId)?.lastName}`
                          : 'No instructor assigned'}
                    </span>
                  </div>
                  {courseForm.tags && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {courseForm.tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                        <span key={tag} className="text-xs px-2 py-0.5 rounded-md bg-gray-50 text-gray-400 border border-gray-100">#{tag}</span>
                      ))}
                    </div>
                  )}

                  {/* Course-wide stats — computed from the actual module/lesson tree */}
                  {modules.length > 0 && (() => {
                    const totalLessons = modules.reduce((s: number, m: any) => s + countLessonsDeep(m.lessons ?? []), 0);
                    const totalSecs = modules.reduce((s: number, m: any) =>
                      s + sumDurationDeep(m.lessons ?? []), 0);
                    return (
                      <div className="flex flex-wrap gap-4 text-xs text-gray-500 mb-3 pb-3 border-b border-gray-100">
                        <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5 text-gray-400" /> {modules.length} module{modules.length!==1?'s':''}</span>
                        <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5 text-gray-400" /> {totalLessons} lesson{totalLessons!==1?'s':''}</span>
                        {totalSecs > 0 && <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5 text-gray-400" /> {fmtSecs(totalSecs)} total</span>}
                      </div>
                    );
                  })()}

                  <p className="text-2xl font-black" style={{ color: 'var(--org-primary)' }}>
                    {courseForm.isFree ? '🆓 Free' : `₹${Number(courseForm.price || 0).toLocaleString('en-IN')}`}
                  </p>
                </div>
              </div>

              {modules.length > 0 && (
                <div className="border-t border-gray-100 pt-5">
                  <h3 className="font-bold text-gray-900 mb-1">Curriculum</h3>
                  <p className="text-xs text-gray-400 mb-4">
                    {modules.length} module{modules.length!==1?'s':''} · {modules.reduce((s: number, m: any) => s + countLessonsDeep(m.lessons ?? []), 0)} lesson{modules.reduce((s: number, m: any) => s + countLessonsDeep(m.lessons ?? []), 0)!==1?'s':''}
                  </p>
                  {modules.map((mod: any, i: number) => (
                    <div key={mod.id} className="mb-5">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">{i+1}</span>
                        <p className="font-semibold text-gray-800">{mod.title}</p>
                        <span className="text-xs text-gray-400">{countLessonsDeep(mod.lessons ?? [])} lessons</span>
                      </div>
                      <div className="pl-8 space-y-1">
                        {(mod.lessons ?? []).map((l: any) => (
                          <PreviewLessonRow key={l.id} lesson={l} depth={0} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Add Module Modal */}
      <Modal open={modModal} onClose={() => setModModal(false)} title="Add Module">
        <div className="p-5 space-y-4">
          <div>
            <label className="label">Module Title *</label>
            <input className="input" placeholder="e.g. Getting Started"
              value={modForm.title} onChange={e => setMF(f => ({...f, title: e.target.value}))} />
          </div>
          <div>
            <RichTextEditor
              label="Description (optional)"
              value={modForm.description}
              onChange={val => setMF(f => ({...f, description: val}))}
              placeholder="What does this module cover?"
              minHeight={80}
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button className="btn-secondary flex-1 justify-center" onClick={() => setModModal(false)}>Cancel</button>
            <button className="btn-primary flex-1 justify-center" onClick={() => createMod.mutate()}
              disabled={!modForm.title || createMod.isPending}>
              {createMod.isPending ? 'Adding…' : 'Add Module'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
