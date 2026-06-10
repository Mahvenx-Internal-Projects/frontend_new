import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Save, ChevronLeft, Plus, Trash2, Eye,
  BookOpen, Video, Music, FileText, Globe, Lock, Pencil
} from 'lucide-react';
import toast from 'react-hot-toast';
import { coursesApi, categoriesApi, usersApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import Modal from '../../components/shared/Modal';
import FileUpload from '../../components/shared/FileUpload';
import RichTextEditor from '../../components/shared/RichTextEditor';
import clsx from 'clsx';

function fmtSecs(s: number) {
  if (!s) return '';
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60;
  if (h) return `${h}h ${m}m`;
  return m ? `${m}m ${sec}s` : `${sec}s`;
}

export default function CourseEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const isEdit = !!id;

  const [activeTab, setActiveTab] = useState<'info'|'content'|'preview'>('info');
  const [courseForm, setCF] = useState({
    title: '', description: '', level: 'Beginner', status: 'Draft',
    price: '0', isFree: true, categoryId: '', thumbnailUrl: '', tags: '', language: 'English',
    instructorId: ''
  });

  // Module state
  const [expandedModule, setExpandedModule] = useState<number | null>(null);
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
      instructorId: String(courseData.instructorId ?? '')
    });
  }, [courseData]);

  const { data: modulesRaw = [], refetch: refetchModules } = useQuery({
    queryKey: ['course-modules', id],
    queryFn: () => coursesApi.getModules(Number(id)).then(r => r.data),
    enabled: isEdit,
  });
  const modules = modulesRaw as any[];

  const { data: categories = [] } = useQuery({
    queryKey: ['cats-all'],
    queryFn: () => categoriesApi.getAll(user?.organizationId).then(r => r.data),
  });

  const { data: instructorsRaw = [] } = useQuery({
    queryKey: ['instructors'],
    queryFn: () => usersApi.getAll({ role: 'Instructor', size: 100 }).then(r => (r.data as any).items ?? []),
  });
  const instructors = instructorsRaw as any[];

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
      };
      return isEdit ? coursesApi.update(Number(id), payload) : coursesApi.create(payload);
    },
    onSuccess: (res: any) => {
      toast.success('Course saved!');
      qc.invalidateQueries({ queryKey: ['courses'] });
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
    await fetch(`/api/lessons/${lessonId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
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
          <button className="btn-primary" onClick={() => saveCourse.mutate()}
            disabled={!courseForm.title || saveCourse.isPending}>
            <Save className="w-4 h-4" /> {saveCourse.isPending ? 'Saving…' : 'Save Course'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-1">
        {([['info','⚙️ Course Info'],['content','📚 Content'],['preview','👁 Preview']] as const).map(([t,l]) => (
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
                  label="Description"
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
                <select className="input" value={courseForm.instructorId} onChange={e => setCF(f => ({...f, instructorId: e.target.value}))}>
                  <option value="">Select instructor</option>
                  {instructors.map((i: any) => <option key={i.id} value={i.id}>{i.firstName} {i.lastName}</option>)}
                </select>
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
                        (mod.lessons ?? []).map((lesson: any, li: number) => (
                          <div key={lesson.id}
                            className="flex items-center gap-3 px-5 py-3 border-b border-gray-50 hover:bg-gray-50 group transition-colors">
                            <span className="text-gray-300 text-xs w-5 text-center flex-shrink-0">{li + 1}</span>
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
                                {lesson.isPreview && <span className="text-xs bg-green-100 text-green-600 px-1.5 rounded font-semibold">Free</span>}
                                {!lesson.isPublished && <span className="text-xs bg-gray-100 text-gray-400 px-1.5 rounded">Draft</span>}
                              </div>
                            </div>
                            {/* Actions */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                              <button type="button"
                                onClick={() => navigate(`/dashboard/courses/${id}/lesson/${lesson.id}/edit`)}
                                className="p-2 rounded-lg hover:bg-blue-100 text-blue-500 transition-colors" title="Edit lesson">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button type="button"
                                onClick={() => deleteLesson(lesson.id)}
                                className="p-2 rounded-lg hover:bg-red-100 text-red-400 transition-colors" title="Delete lesson">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
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
                  </div>
                  <h2 className="text-2xl font-black text-gray-900 mb-2">{courseForm.title || '(No title yet)'}</h2>
                  <div className="text-sm text-gray-500 mb-3 rich-preview"
                    dangerouslySetInnerHTML={{ __html: courseForm.description || '<em>No description</em>' }} />
                  <p className="text-2xl font-black" style={{ color: 'var(--org-primary)' }}>
                    {courseForm.isFree ? '🆓 Free' : `₹${Number(courseForm.price || 0).toLocaleString('en-IN')}`}
                  </p>
                </div>
              </div>

              {modules.length > 0 && (
                <div className="border-t border-gray-100 pt-5">
                  <h3 className="font-bold text-gray-900 mb-3">Curriculum — {modules.length} module{modules.length!==1?'s':''}</h3>
                  {modules.map((mod: any, i: number) => (
                    <div key={mod.id} className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">{i+1}</span>
                        <p className="font-semibold text-gray-800">{mod.title}</p>
                        <span className="text-xs text-gray-400">{(mod.lessons??[]).length} lessons</span>
                      </div>
                      <div className="pl-8 space-y-1">
                        {(mod.lessons ?? []).map((l: any) => (
                          <div key={l.id} className="flex items-center gap-2 text-sm text-gray-600 py-1 border-b border-gray-50">
                            {l.type==='Video' ? <Video className="w-3.5 h-3.5 text-purple-400 flex-shrink-0"/> :
                             l.type==='Audio' ? <Music className="w-3.5 h-3.5 text-amber-400 flex-shrink-0"/> :
                             <FileText className="w-3.5 h-3.5 text-blue-400 flex-shrink-0"/>}
                            <span className="flex-1">{l.title}</span>
                            {l.durationSecs > 0 && <span className="text-xs text-gray-400">{fmtSecs(l.durationSecs)}</span>}
                            {l.isPreview && <span className="text-xs text-green-600 font-semibold">Free</span>}
                          </div>
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
