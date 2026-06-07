import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Building2, Globe, Users, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import { orgsApi } from '../../services/api';
import type { Organization } from '../../types';
import Modal from '../../components/shared/Modal';

export default function OrganizationsPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<null | 'create' | 'edit'>(null);
  const [selected, setSelected] = useState<Organization | null>(null);
  const [form, setForm] = useState({ name: '', website: '', primaryColor: '#6366f1', logoUrl: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => orgsApi.getAll({ page: 1, size: 50 }).then(r => r.data),
  });

  const createMut = useMutation({
    mutationFn: () => orgsApi.create({ name: form.name, website: form.website, primaryColor: form.primaryColor }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['organizations'] }); toast.success('Organization created'); setModal(null); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Error'),
  });

  const updateMut = useMutation({
    mutationFn: () => orgsApi.update(selected!.id, { name: form.name, website: form.website, primaryColor: form.primaryColor, logoUrl: form.logoUrl }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['organizations'] }); toast.success('Updated'); setModal(null); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Error'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => orgsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['organizations'] }); toast.success('Deactivated'); },
  });

  const openEdit = (org: Organization) => {
    setSelected(org);
    setForm({ name: org.name, website: org.website ?? '', primaryColor: org.primaryColor ?? '#6366f1', logoUrl: org.logoUrl ?? '' });
    setModal('edit');
  };

  const openCreate = () => {
    setForm({ name: '', website: '', primaryColor: '#6366f1', logoUrl: '' });
    setModal('create');
  };

  const orgs: Organization[] = data?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="page-header mb-0">
          <h1 className="page-title">Organizations</h1>
          <p className="page-sub">Manage all organizations in the platform</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus className="w-4 h-4" /> New Organization
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="card p-6 animate-pulse h-44 bg-gray-100" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {orgs.map(org => (
            <div key={org.id} className="card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm"
                    style={{ background: org.primaryColor ?? '#6366f1' }}>
                    {org.logoUrl ? <img src={org.logoUrl} className="w-full h-full object-cover rounded-xl" alt={org.name} />
                      : org.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{org.name}</h3>
                    <p className="text-xs text-gray-400">/{org.slug}</p>
                  </div>
                </div>
                <span className={org.isActive ? 'badge-green' : 'badge-gray'}>
                  {org.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="w-4 h-4 text-gray-400" /> {org.userCount} users
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <BookOpen className="w-4 h-4 text-gray-400" /> {org.courseCount} courses
                </div>
                {org.website && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 col-span-2 truncate">
                    <Globe className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <a href={org.website} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline truncate">{org.website}</a>
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <button className="btn-secondary flex-1 justify-center text-xs" onClick={() => openEdit(org)}>
                  <Pencil className="w-3 h-3" /> Edit
                </button>
                <button className="btn-danger flex-1 justify-center text-xs"
                  onClick={() => { if (confirm('Deactivate?')) deleteMut.mutate(org.id); }}>
                  <Trash2 className="w-3 h-3" /> Deactivate
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal !== null} onClose={() => setModal(null)}
        title={modal === 'create' ? 'New Organization' : 'Edit Organization'}>
        <div className="space-y-4 p-4">
          <div>
            <label className="label">Organization Name *</label>
            <input className="input" placeholder="Acme Corp" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Website</label>
            <input className="input" placeholder="https://example.com" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} />
          </div>
          <div>
            <label className="label">Logo URL</label>
            <input className="input" placeholder="https://..." value={form.logoUrl} onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value }))} />
          </div>
          <div>
            <label className="label">Brand Color</label>
            <div className="flex items-center gap-3">
              <input type="color" className="w-10 h-10 rounded-lg cursor-pointer border border-gray-300"
                value={form.primaryColor} onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))} />
              <input className="input" value={form.primaryColor} onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1 justify-center" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn-primary flex-1 justify-center"
              onClick={() => modal === 'create' ? createMut.mutate() : updateMut.mutate()}
              disabled={!form.name || createMut.isPending || updateMut.isPending}>
              {(createMut.isPending || updateMut.isPending) ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
