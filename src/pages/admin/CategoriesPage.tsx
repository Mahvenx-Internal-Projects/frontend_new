import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, ChevronRight, ChevronDown, FolderOpen, Folder } from 'lucide-react';
import toast from 'react-hot-toast';
import { categoriesApi, departmentsApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import type { Category } from '../../types';
import Modal from '../../components/shared/Modal';
import RichTextEditor from '../../components/shared/RichTextEditor';
import clsx from 'clsx';

function CategoryNode({ cat, depth = 0, onEdit, onDelete, onAddChild }:
  { cat: Category; depth?: number; onEdit: (c: Category) => void; onDelete: (id: number) => void; onAddChild: (c: Category) => void; }) {
  const [open, setOpen] = useState(true);
  const hasChildren = cat.children?.length > 0;

  return (
    <div>
      <div className={clsx(
        'flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-gray-50 group',
        depth > 0 && 'ml-6'
      )}>
        <button onClick={() => setOpen(!open)} className={clsx('w-4 h-4 text-gray-400', !hasChildren && 'invisible')}>
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        {hasChildren && open ? <FolderOpen className="w-4 h-4 text-amber-500" /> : <Folder className="w-4 h-4 text-amber-400" />}
        <span className="flex-1 text-sm font-medium text-gray-800">{cat.name}</span>
        <span className="badge-gray text-xs">{cat.courseCount} courses</span>
        <span className={cat.isActive ? 'badge-green' : 'badge-gray'}>
          {cat.isActive ? 'Active' : 'Inactive'}
        </span>
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
          <button className="p-1 rounded hover:bg-brand-50 text-brand-600" title="Add sub-category" onClick={() => onAddChild(cat)}>
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button className="p-1 rounded hover:bg-blue-50 text-blue-600" onClick={() => onEdit(cat)}>
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button className="p-1 rounded hover:bg-red-50 text-red-500"
            onClick={() => { if (confirm('Delete category?')) onDelete(cat.id); }}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {open && hasChildren && (
        <div>
          {cat.children.map(child => (
            <CategoryNode key={child.id} cat={child} depth={depth + 1} onEdit={onEdit} onDelete={onDelete} onAddChild={onAddChild} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CategoriesPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [parentCat, setParentCat] = useState<Category | null>(null);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: '', description: '', displayOrder: '0', departmentId: '' });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments', user?.organizationId],
    queryFn: () => departmentsApi.getAll(user?.organizationId).then(r => r.data),
    enabled: !!user?.organizationId,
  });

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories', user?.organizationId],
    queryFn: () => categoriesApi.getAll(user?.organizationId).then(r => r.data),
  });

  const createMut = useMutation({
    mutationFn: () => categoriesApi.create({
      name: form.name, description: form.description,
      parentId: parentCat?.id ?? null,
      organizationId: user!.organizationId,
      departmentId: form.departmentId ? Number(form.departmentId) : null,
      displayOrder: Number(form.displayOrder)
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); toast.success('Category created'); setModal(false); },
  });

  const updateMut = useMutation({
    mutationFn: () => categoriesApi.update(editing!.id, { name: form.name, description: form.description, displayOrder: Number(form.displayOrder) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); toast.success('Updated'); setModal(false); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => categoriesApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); toast.success('Deleted'); },
  });

  const openCreate = (parent?: Category) => {
    setEditing(null);
    setParentCat(parent ?? null);
    setForm({ name: '', description: '', displayOrder: '0', departmentId: '' });
    setModal(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setParentCat(null);
    setForm({ name: cat.name, description: cat.description ?? '', displayOrder: String(cat.displayOrder), departmentId: '' });
    setModal(true);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Course Categories</h1>
          <p className="page-sub">Organize courses with a hierarchical category tree</p>
        </div>
        <button className="btn-primary" onClick={() => openCreate()}>
          <Plus className="w-4 h-4" /> New Category
        </button>
      </div>

      <div className="card p-4">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-gray-100 animate-pulse rounded" />)}
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Folder className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No categories yet. Create your first one.</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {categories.map((cat: Category) => (
              <CategoryNode key={cat.id} cat={cat} onEdit={openEdit} onDelete={(id) => deleteMut.mutate(id)} onAddChild={(c) => openCreate(c)} />
            ))}
          </div>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)}
        title={editing ? 'Edit Category' : parentCat ? `Add sub-category under "${parentCat.name}"` : 'New Category'}>
        <div className="space-y-4 p-4">
          {parentCat && !editing && (
            <div className="bg-amber-50 text-amber-700 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
              <Folder className="w-4 h-4" /> Sub-category of: <strong>{parentCat.name}</strong>
            </div>
          )}
          <div>
            <label className="label">Category Name *</label>
            <input className="input" placeholder="e.g. Web Development" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          {(departments as any[]).length > 0 && (
            <div>
              <label className="label">Department</label>
              <select className="input" value={form.departmentId} onChange={e => setForm(f => ({ ...f, departmentId: e.target.value }))}>
                <option value="">No department</option>
                {(departments as any[]).map((d: any) => <option key={d.id} value={d.id}>{d.iconEmoji} {d.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <RichTextEditor
              label="Description"
              value={form.description}
              onChange={val => setForm(f => ({ ...f, description: val }))}
              placeholder="Describe what this category covers…"
              minHeight={120}
            />
          </div>
          <div>
            <label className="label">Display Order</label>
            <input className="input" type="number" min={0} value={form.displayOrder} onChange={e => setForm(f => ({ ...f, displayOrder: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1 justify-center" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn-primary flex-1 justify-center"
              onClick={() => editing ? updateMut.mutate() : createMut.mutate()}
              disabled={!form.name || createMut.isPending || updateMut.isPending}>
              {(createMut.isPending || updateMut.isPending) ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
