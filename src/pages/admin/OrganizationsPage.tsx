import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Globe, Users, BookOpen, Upload, X, ImageIcon, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { orgsApi, uploadApi } from '../../services/api';
import type { Organization } from '../../types';
import Modal from '../../components/shared/Modal';

const API_BASE = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? '' : 'https://api.worksupport360.com';

function LogoUpload({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }
    setUploading(true);
    try {
      const res = await uploadApi.image(file, 'logos');
      onChange(res.data.url);
      toast.success('Logo uploaded');
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="label">Logo</label>

      {/* Preview */}
      {value && (
        <div className="relative inline-block">
          <img src={value} alt="Logo" className="w-24 h-24 rounded-xl object-cover border border-gray-200 shadow-sm"/>
          <button type="button"
            onClick={() => onChange('')}
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 shadow">
            <X className="w-3 h-3"/>
          </button>
        </div>
      )}

      {/* Upload area */}
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        className={`flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-xl cursor-pointer transition-colors
          ${uploading ? 'border-gray-200 bg-gray-50 cursor-not-allowed' : 'border-gray-300 hover:border-indigo-400 hover:bg-indigo-50'}`}>
        {uploading ? (
          <><Loader2 className="w-8 h-8 text-indigo-500 animate-spin"/><p className="text-sm text-gray-500">Uploading…</p></>
        ) : (
          <><ImageIcon className="w-8 h-8 text-gray-300"/>
            <p className="text-sm font-medium text-gray-600">Click or drag to upload logo</p>
            <p className="text-xs text-gray-400">PNG, JPG, SVG · max 5MB</p></>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}/>
      </div>

      {/* Manual URL fallback */}
      <input className="input text-xs" placeholder="Or paste image URL directly"
        value={value} onChange={e => onChange(e.target.value)}/>
    </div>
  );
}

export default function OrganizationsPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<null | 'create' | 'edit'>(null);
  const [selected, setSelected] = useState<Organization | null>(null);
  const [form, setForm] = useState({
    name: '', slug: '', website: '', portalUrl: '',
    primaryColor: '#6366f1', secondaryColor: '#8b5cf6',
    tagline: '', logoUrl: '', bannerUrl: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => orgsApi.getAll({ page: 1, size: 50 }).then(r => r.data),
  });

  const createMut = useMutation({
    mutationFn: () => orgsApi.create({
      name: form.name, slug: form.slug, website: form.website,
      primaryColor: form.primaryColor, secondaryColor: form.secondaryColor,
      tagline: form.tagline, logoUrl: form.logoUrl, bannerUrl: form.bannerUrl,
      portalUrl: form.portalUrl,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['organizations'] }); toast.success('Organization created'); setModal(null); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Error'),
  });

  const updateMut = useMutation({
    mutationFn: () => orgsApi.update(selected!.id, {
      name: form.name, website: form.website, portalUrl: form.portalUrl,
      primaryColor: form.primaryColor, secondaryColor: form.secondaryColor,
      tagline: form.tagline, logoUrl: form.logoUrl, bannerUrl: form.bannerUrl,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['organizations'] }); toast.success('Updated'); setModal(null); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Error'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => orgsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['organizations'] }); toast.success('Deactivated'); },
  });

  const openEdit = (org: any) => {
    setSelected(org);
    setForm({
      name: org.name ?? '', slug: org.slug ?? '', website: org.website ?? '',
      portalUrl: org.portalUrl ?? '', primaryColor: org.primaryColor ?? '#6366f1',
      secondaryColor: org.secondaryColor ?? '#8b5cf6', tagline: org.tagline ?? '',
      logoUrl: org.logoUrl ?? '', bannerUrl: org.bannerUrl ?? '',
    });
    setModal('edit');
  };

  const openCreate = () => {
    setForm({ name: '', slug: '', website: '', portalUrl: '', primaryColor: '#6366f1', secondaryColor: '#8b5cf6', tagline: '', logoUrl: '', bannerUrl: '' });
    setModal('create');
  };

  const orgs: any[] = (data as any)?.items ?? data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="page-header mb-0">
          <h1 className="page-title">Organizations</h1>
          <p className="page-sub">Manage all organizations in the platform</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus className="w-4 h-4"/> New Organization
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="card p-6 animate-pulse h-44 bg-gray-100"/>)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {orgs.map((org: any) => (
            <div key={org.id} className="card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm overflow-hidden"
                    style={{ background: org.primaryColor ?? '#6366f1' }}>
                    {org.logoUrl
                      ? <img src={org.logoUrl} className="w-full h-full object-cover" alt={org.name}/>
                      : org.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{org.name}</h3>
                    <p className="text-xs text-gray-400">/{org.slug}</p>
                    {org.tagline && <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[150px]">{org.tagline}</p>}
                  </div>
                </div>
                <span className={org.isActive ? 'badge-green' : 'badge-gray'}>
                  {org.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="w-4 h-4 text-gray-400"/> {org.userCount ?? 0} users
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <BookOpen className="w-4 h-4 text-gray-400"/> {org.courseCount ?? 0} courses
                </div>
                {org.website && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 col-span-2 truncate">
                    <Globe className="w-4 h-4 text-gray-400 flex-shrink-0"/>
                    <a href={org.website} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline truncate">{org.website}</a>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <button className="btn-secondary flex-1 justify-center text-xs" onClick={() => openEdit(org)}>
                  <Pencil className="w-3 h-3"/> Edit
                </button>
                <button className="btn-danger flex-1 justify-center text-xs"
                  onClick={() => { if (confirm('Deactivate this organization?')) deleteMut.mutate(org.id); }}>
                  <Trash2 className="w-3 h-3"/> Deactivate
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal !== null} onClose={() => setModal(null)}
        title={modal === 'create' ? 'New Organization' : `Edit — ${selected?.name}`}>
        <div className="space-y-4 p-4 max-h-[75vh] overflow-y-auto">

          {/* Logo upload */}
          <LogoUpload value={form.logoUrl} onChange={url => setForm(f => ({ ...f, logoUrl: url }))}/>

          <div>
            <label className="label">Organization Name *</label>
            <input className="input" placeholder="Acme Corp" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}/>
          </div>

          {modal === 'create' && (
            <div>
              <label className="label">Slug <span className="text-xs text-gray-400">(URL identifier)</span></label>
              <input className="input" placeholder="acme-corp" value={form.slug}
                onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}/>
            </div>
          )}

          <div>
            <label className="label">Tagline</label>
            <input className="input" placeholder="Empowering learners worldwide" value={form.tagline}
              onChange={e => setForm(f => ({ ...f, tagline: e.target.value }))}/>
          </div>

          <div>
            <label className="label">Website</label>
            <input className="input" placeholder="https://example.com" value={form.website}
              onChange={e => setForm(f => ({ ...f, website: e.target.value }))}/>
          </div>

          <div>
            <label className="label">Portal URL <span className="text-xs text-gray-400">(deployed frontend domain)</span></label>
            <input className="input" placeholder="https://yourportal.com" value={form.portalUrl}
              onChange={e => setForm(f => ({ ...f, portalUrl: e.target.value }))}/>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Primary Color</label>
              <div className="flex items-center gap-2">
                <input type="color" className="w-10 h-10 rounded-lg cursor-pointer border border-gray-300"
                  value={form.primaryColor} onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))}/>
                <input className="input" value={form.primaryColor}
                  onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))}/>
              </div>
            </div>
            <div>
              <label className="label">Secondary Color</label>
              <div className="flex items-center gap-2">
                <input type="color" className="w-10 h-10 rounded-lg cursor-pointer border border-gray-300"
                  value={form.secondaryColor} onChange={e => setForm(f => ({ ...f, secondaryColor: e.target.value }))}/>
                <input className="input" value={form.secondaryColor}
                  onChange={e => setForm(f => ({ ...f, secondaryColor: e.target.value }))}/>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2 sticky bottom-0 bg-white pb-1">
            <button className="btn-secondary flex-1 justify-center" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn-primary flex-1 justify-center"
              onClick={() => modal === 'create' ? createMut.mutate() : updateMut.mutate()}
              disabled={!form.name || createMut.isPending || updateMut.isPending}>
              {(createMut.isPending || updateMut.isPending) ? 'Saving…' : modal === 'create' ? 'Create' : 'Save Changes'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
