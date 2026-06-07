import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Pencil, Trash2, Building2, Users, BookOpen,
  ChevronRight, FolderOpen, Folder, GraduationCap,
  Star, Clock, MoreVertical, Eye, Settings2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { departmentsApi, categoriesApi, coursesApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import type { Department, Category, Course } from '../../types';
import Modal from '../../components/shared/Modal';
import RichTextEditor from '../../components/shared/RichTextEditor';
import clsx from 'clsx';

const EMOJIS = ['🏢','⚙️','💼','🎨','📚','🔬','💻','🌐','🎓','🏥','⚖️','🎵','🏗️','🧪','📊','🚀','💡','🌿','🎯','🏆'];
const COLORS = ['#f97316','#6366f1','#ec4899','#10b981','#2563eb','#8b5cf6','#f59e0b','#ef4444','#0d9488','#7c3aed','#0ea5e9','#84cc16'];

export default function DepartmentsPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);
  const [modal, setModal] = useState<'dept'|'cat'|null>(null);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [deptForm, setDF] = useState({ name:'', description:'', iconEmoji:'🏢', color:'#6366f1', displayOrder:'0' });
  const [catForm, setCF] = useState({ name:'', description:'', iconEmoji:'📁', departmentId:'', parentId:'', displayOrder:'0' });
  const [menuOpen, setMenuOpen] = useState<number | null>(null);

  const orgId = user?.organizationId;

  const { data: departments = [], isLoading: deptsLoading } = useQuery<Department[]>({
    queryKey: ['departments', orgId],
    queryFn: () => departmentsApi.getAll(orgId).then(r => r.data),
    enabled: !!orgId,
  });

  const { data: allCategories = [] } = useQuery<Category[]>({
    queryKey: ['categories', orgId],
    queryFn: () => categoriesApi.getAll(orgId).then(r => r.data),
    enabled: !!orgId,
  });

  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ['dept-courses', selectedCat?.id],
    queryFn: () => coursesApi.getAll({ categoryId: selectedCat!.id, size: 50 }).then(r => r.data.items),
    enabled: !!selectedCat?.id,
  });

  // Flatten all categories including children
  const flatCats = (cats: Category[]): Category[] =>
    cats.flatMap(c => [c, ...flatCats(c.children ?? [])]);
  const allFlat = flatCats(allCategories);

  // Get categories for a department
  const getCatsByDept = (deptId: number) =>
    allFlat.filter(c => (c as any).departmentId === deptId && !c.parentId);

  // Department mutations
  const deptCreateMut = useMutation({
    mutationFn: () => departmentsApi.create({ ...deptForm, organizationId: orgId!, displayOrder: Number(deptForm.displayOrder) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['departments'] }); toast.success('Department created'); setModal(null); },
    onError: () => toast.error('Failed to create'),
  });
  const deptUpdateMut = useMutation({
    mutationFn: () => departmentsApi.update(editingDept!.id, { ...deptForm, displayOrder: Number(deptForm.displayOrder) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['departments'] }); toast.success('Updated'); setModal(null); },
    onError: () => toast.error('Failed to update'),
  });
  const deptDeleteMut = useMutation({
    mutationFn: (id: number) => departmentsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['departments'] }); toast.success('Deleted'); setSelectedDept(null); },
  });

  // Category mutations
  const catCreateMut = useMutation({
    mutationFn: () => categoriesApi.create({
      name: catForm.name, description: catForm.description,
      parentId: catForm.parentId ? Number(catForm.parentId) : null,
      departmentId: catForm.departmentId ? Number(catForm.departmentId) : selectedDept?.id,
      organizationId: orgId!, displayOrder: Number(catForm.displayOrder)
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); toast.success('Category created'); setModal(null); },
    onError: () => toast.error('Failed'),
  });
  const catUpdateMut = useMutation({
    mutationFn: () => categoriesApi.update(editingCat!.id, { name: catForm.name, description: catForm.description, displayOrder: Number(catForm.displayOrder) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); toast.success('Updated'); setModal(null); },
    onError: () => toast.error('Failed'),
  });
  const catDeleteMut = useMutation({
    mutationFn: (id: number) => categoriesApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); toast.success('Deleted'); setSelectedCat(null); },
  });

  const openCreateDept = () => {
    setEditingDept(null);
    setDF({ name:'', description:'', iconEmoji:'🏢', color:'#6366f1', displayOrder: String((departments as Department[]).length) });
    setModal('dept');
  };
  const openEditDept = (d: Department) => {
    setEditingDept(d);
    setDF({ name: d.name, description: d.description ?? '', iconEmoji: d.iconEmoji ?? '🏢', color: d.color ?? '#6366f1', displayOrder: String(d.displayOrder) });
    setModal('dept');
    setMenuOpen(null);
  };
  const openCreateCat = (deptId?: number) => {
    setEditingCat(null);
    setCF({ name:'', description:'', iconEmoji:'📁', departmentId: String(deptId ?? selectedDept?.id ?? ''), parentId:'', displayOrder:'0' });
    setModal('cat');
  };
  const openEditCat = (cat: Category) => {
    setEditingCat(cat);
    setCF({ name: cat.name, description: cat.description ?? '', iconEmoji: cat.iconEmoji ?? '📁', departmentId: String((cat as any).departmentId ?? ''), parentId: String(cat.parentId ?? ''), displayOrder: String(cat.displayOrder) });
    setModal('cat');
    setMenuOpen(null);
  };

  const depts = departments as Department[];
  const cats = getCatsByDept(selectedDept?.id ?? 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm" style={{ background: 'linear-gradient(135deg,var(--org-primary),var(--org-secondary))' }}>
              <Building2 className="w-5 h-5" />
            </div>
            Departments & Categories
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage departments → categories → courses hierarchy</p>
        </div>
        <button className="btn-primary" onClick={openCreateDept}><Plus className="w-4 h-4" /> New Department</button>
      </div>

      {/* 3-column tree layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-[600px]">

        {/* Column 1: Departments */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-400" />
              <span className="font-bold text-sm text-gray-700">Departments</span>
              <span className="bg-gray-200 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">{depts.length}</span>
            </div>
            <button onClick={openCreateDept} className="w-6 h-6 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center hover:bg-brand-100 transition-colors">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {deptsLoading ? (
              <div className="p-4 space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-gray-100 animate-pulse rounded-xl" />)}</div>
            ) : depts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                <Building2 className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-sm">No departments yet</p>
              </div>
            ) : depts.map(dept => (
              <button key={dept.id}
                onClick={() => { setSelectedDept(dept); setSelectedCat(null); }}
                className={clsx('w-full flex items-center gap-3 px-4 py-3 text-left border-b border-gray-50 hover:bg-gray-50 transition-all group',
                  selectedDept?.id === dept.id && 'bg-orange-50 border-r-2 border-r-[var(--org-primary)]')}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 shadow-sm"
                  style={{ background: `${dept.color || '#6366f1'}15`, border: `1.5px solid ${dept.color || '#6366f1'}30` }}>
                  {dept.iconEmoji || '🏢'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={clsx('font-bold text-sm truncate', selectedDept?.id === dept.id ? 'text-orange-700' : 'text-gray-800')}>{dept.name}</p>
                  <p className="text-xs text-gray-400">{dept.categoryCount} categories · {dept.userCount} members</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={e => { e.stopPropagation(); openEditDept(dept); }}
                    className="w-6 h-6 rounded-lg hover:bg-blue-100 text-blue-500 flex items-center justify-center" title="Edit">
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button onClick={e => { e.stopPropagation(); if(confirm('Delete?')) deptDeleteMut.mutate(dept.id); }}
                    className="w-6 h-6 rounded-lg hover:bg-red-100 text-red-400 flex items-center justify-center" title="Delete">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                {selectedDept?.id === dept.id && <ChevronRight className="w-4 h-4 text-orange-400 flex-shrink-0" />}
              </button>
            ))}
          </div>
        </div>

        {/* Column 2: Categories for selected dept */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-gray-400" />
              <span className="font-bold text-sm text-gray-700">
                {selectedDept ? selectedDept.name : 'Select a Department'}
              </span>
              {selectedDept && <span className="bg-gray-200 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">{cats.length}</span>}
            </div>
            {selectedDept && (
              <button onClick={() => openCreateCat(selectedDept.id)} className="w-6 h-6 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center hover:bg-brand-100">
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {!selectedDept ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-300">
                <ChevronRight className="w-10 h-10 mb-2" />
                <p className="text-sm">Click a department</p>
              </div>
            ) : cats.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                <Folder className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-sm mb-3">No categories yet</p>
                <button className="btn-primary text-xs" onClick={() => openCreateCat(selectedDept.id)}>
                  <Plus className="w-3 h-3" /> Add Category
                </button>
              </div>
            ) : cats.map(cat => (
              <div key={cat.id}>
                <button
                  onClick={() => setSelectedCat(cat)}
                  className={clsx('w-full flex items-center gap-3 px-4 py-3 text-left border-b border-gray-50 hover:bg-gray-50 transition-all group',
                    selectedCat?.id === cat.id && 'bg-green-50 border-r-2 border-r-green-500')}>
                  <span className="text-xl flex-shrink-0">{cat.iconEmoji || '📁'}</span>
                  <div className="flex-1 min-w-0">
                    <p className={clsx('font-bold text-sm truncate', selectedCat?.id === cat.id ? 'text-green-700' : 'text-gray-800')}>{cat.name}</p>
                    <p className="text-xs text-gray-400">{cat.courseCount} courses · {cat.children?.length ?? 0} sub-cats</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={e => { e.stopPropagation(); openEditCat(cat); }}
                      className="w-6 h-6 rounded-lg hover:bg-blue-100 text-blue-500 flex items-center justify-center">
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button onClick={e => { e.stopPropagation(); if(confirm('Delete?')) catDeleteMut.mutate(cat.id); }}
                      className="w-6 h-6 rounded-lg hover:bg-red-100 text-red-400 flex items-center justify-center">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  {selectedCat?.id === cat.id && <ChevronRight className="w-4 h-4 text-green-400 flex-shrink-0" />}
                </button>
                {/* Sub-categories */}
                {(cat.children ?? []).map(sub => (
                  <button key={sub.id}
                    onClick={() => setSelectedCat(sub)}
                    className={clsx('w-full flex items-center gap-3 pl-10 pr-4 py-2 text-left border-b border-gray-50 hover:bg-gray-50 transition-all group',
                      selectedCat?.id === sub.id && 'bg-green-50 border-r-2 border-r-green-400')}>
                    <span className="text-sm flex-shrink-0">{sub.iconEmoji || '└📁'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 truncate">{sub.name}</p>
                      <p className="text-xs text-gray-400">{sub.courseCount} courses</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                      <button onClick={e => { e.stopPropagation(); openEditCat(sub); }}
                        className="w-5 h-5 rounded hover:bg-blue-100 text-blue-400 flex items-center justify-center">
                        <Pencil className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </button>
                ))}
              </div>
            ))}
          </div>
          {selectedDept && (
            <div className="p-3 border-t border-gray-100">
              <button className="w-full btn-secondary text-xs justify-center" onClick={() => openCreateCat(selectedDept.id)}>
                <Plus className="w-3 h-3" /> Add Category to {selectedDept.name}
              </button>
            </div>
          )}
        </div>

        {/* Column 3: Courses for selected category */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-gray-400" />
              <span className="font-bold text-sm text-gray-700">
                {selectedCat ? selectedCat.name : 'Select a Category'}
              </span>
              {selectedCat && <span className="bg-gray-200 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">{(courses as Course[]).length}</span>}
            </div>
            {selectedCat && (
              <button onClick={() => navigate('/dashboard/courses/new')} className="w-6 h-6 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center hover:bg-brand-100">
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {!selectedCat ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-300">
                <ChevronRight className="w-10 h-10 mb-2" />
                <p className="text-sm">Click a category</p>
              </div>
            ) : (courses as Course[]).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                <GraduationCap className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-sm mb-3">No courses in this category</p>
                <button className="btn-primary text-xs" onClick={() => navigate('/dashboard/courses/new')}>
                  <Plus className="w-3 h-3" /> Create Course
                </button>
              </div>
            ) : (courses as Course[]).map(course => (
              <div key={course.id}
                className="flex items-start gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors group">
                <div className="w-12 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-orange-100 to-amber-100">
                  {course.thumbnailUrl
                    ? <img src={course.thumbnailUrl} className="w-full h-full object-cover" alt="" />
                    : <div className="w-full h-full flex items-center justify-center text-xl">📚</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 line-clamp-1">{course.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={clsx('text-xs px-1.5 py-0.5 rounded-full font-medium',
                      course.level === 'Beginner' ? 'bg-green-100 text-green-700' :
                      course.level === 'Intermediate' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700')}>
                      {course.level}
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-0.5">
                      <Users className="w-3 h-3" />{course.enrollmentCount}
                    </span>
                    <span className="font-bold text-xs" style={{ color: 'var(--org-primary)' }}>
                      {course.isFree ? 'Free' : `₹${course.price}`}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button onClick={() => navigate(`/dashboard/courses/${course.id}/edit`)}
                    className="w-6 h-6 rounded-lg hover:bg-blue-100 text-blue-500 flex items-center justify-center" title="Edit">
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button onClick={() => navigate(`/dashboard/courses/${course.id}/exam`)}
                    className="w-6 h-6 rounded-lg hover:bg-amber-100 text-amber-500 flex items-center justify-center" title="Exams">
                    <GraduationCap className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {selectedCat && (
            <div className="p-3 border-t border-gray-100">
              <button className="w-full btn-secondary text-xs justify-center"
                onClick={() => navigate('/dashboard/courses/new')}>
                <Plus className="w-3 h-3" /> Add Course to {selectedCat.name}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Department Modal */}
      <Modal open={modal === 'dept'} onClose={() => setModal(null)} title={editingDept ? 'Edit Department' : 'New Department'}>
        <div className="p-5 space-y-4">
          {/* Emoji grid */}
          <div>
            <label className="label">Icon</label>
            <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-xl">
              {EMOJIS.map(e => (
                <button key={e} onClick={() => setDF(f => ({ ...f, iconEmoji: e }))}
                  className={clsx('w-9 h-9 rounded-lg text-xl transition-all hover:scale-110',
                    deptForm.iconEmoji === e ? 'bg-white shadow-md scale-110 ring-2 ring-[var(--org-primary)]' : 'hover:bg-white')}>
                  {e}
                </button>
              ))}
            </div>
          </div>
          {/* Color palette */}
          <div>
            <label className="label">Color</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map(c => (
                <button key={c} onClick={() => setDF(f => ({ ...f, color: c }))}
                  className="w-8 h-8 rounded-full hover:scale-110 transition-all flex-shrink-0"
                  style={{ background: c, outline: deptForm.color === c ? `3px solid ${c}` : 'none', outlineOffset: '2px' }} />
              ))}
            </div>
          </div>
          {/* Preview */}
          <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm"
              style={{ background: `${deptForm.color}20`, border: `2px solid ${deptForm.color}40` }}>
              {deptForm.iconEmoji}
            </div>
            <div>
              <p className="font-bold text-gray-900">{deptForm.name || 'Department Name'}</p>
              <p className="text-xs text-gray-400">{deptForm.description || 'Description…'}</p>
            </div>
          </div>
          <div><label className="label">Name *</label>
            <input className="input" placeholder="e.g. Engineering & Technology" value={deptForm.name}
              onChange={e => setDF(f => ({ ...f, name: e.target.value }))} /></div>
          <div>
            <RichTextEditor
              label="Description"
              value={deptForm.description}
              onChange={val => setDF(f => ({ ...f, description: val }))}
              placeholder="Describe what this department covers…"
              minHeight={120}
            />
          </div>
          <div className="flex gap-3">
            <button className="btn-secondary flex-1 justify-center" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn-primary flex-1 justify-center"
              onClick={() => editingDept ? deptUpdateMut.mutate() : deptCreateMut.mutate()}
              disabled={!deptForm.name || deptCreateMut.isPending || deptUpdateMut.isPending}>
              {deptCreateMut.isPending || deptUpdateMut.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Category Modal */}
      <Modal open={modal === 'cat'} onClose={() => setModal(null)} title={editingCat ? 'Edit Category' : 'New Category'}>
        <div className="p-5 space-y-4">
          <div><label className="label">Name *</label>
            <input className="input" placeholder="e.g. Web Development" value={catForm.name}
              onChange={e => setCF(f => ({ ...f, name: e.target.value }))} /></div>
          <div>
            <RichTextEditor
              label="Description"
              value={catForm.description}
              onChange={val => setCF(f => ({ ...f, description: val }))}
              placeholder="Describe what this category covers…"
              minHeight={100}
            />
          </div>
          <div><label className="label">Department</label>
            <select className="input" value={catForm.departmentId}
              onChange={e => setCF(f => ({ ...f, departmentId: e.target.value }))}>
              <option value="">No department</option>
              {depts.map(d => <option key={d.id} value={d.id}>{d.iconEmoji} {d.name}</option>)}
            </select></div>
          <div><label className="label">Parent Category (optional)</label>
            <select className="input" value={catForm.parentId}
              onChange={e => setCF(f => ({ ...f, parentId: e.target.value }))}>
              <option value="">Root category</option>
              {allFlat.filter(c => !c.parentId).map(c => <option key={c.id} value={c.id}>{c.iconEmoji} {c.name}</option>)}
            </select></div>
          <div className="flex gap-3">
            <button className="btn-secondary flex-1 justify-center" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn-primary flex-1 justify-center"
              onClick={() => editingCat ? catUpdateMut.mutate() : catCreateMut.mutate()}
              disabled={!catForm.name}>Save</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
