import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, Plus, Search, Pencil, Trash2, X, Phone,
  Mail, MapPin, Briefcase, Star, Filter, Download
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import clsx from 'clsx';

const DOMAINS = ['All','DotNet','Java','Python','SAP','ServiceNow','React','Angular','FullStack','DevOps','QA','DataScience','Mobile','Other'];
const STATUSES = ['All','Available','Deployed','OnHold'];
const TYPES    = ['All','Fresher','Experienced'];

const DOMAIN_COLORS: Record<string,string> = {
  DotNet:'bg-purple-100 text-purple-700', Java:'bg-orange-100 text-orange-700',
  Python:'bg-blue-100 text-blue-700', SAP:'bg-yellow-100 text-yellow-700',
  ServiceNow:'bg-green-100 text-green-700', React:'bg-cyan-100 text-cyan-700',
  Angular:'bg-red-100 text-red-700', FullStack:'bg-indigo-100 text-indigo-700',
  DevOps:'bg-gray-100 text-gray-700', QA:'bg-pink-100 text-pink-700',
  DataScience:'bg-teal-100 text-teal-700', Mobile:'bg-violet-100 text-violet-700',
  Other:'bg-gray-100 text-gray-600',
};
const STATUS_COLORS: Record<string,string> = {
  Available:'bg-green-100 text-green-700', Deployed:'bg-blue-100 text-blue-700', OnHold:'bg-amber-100 text-amber-700'
};

const EMPTY = {
  name:'', email:'', phone:'', candidateType:'Fresher', experienceYears:0,
  currentLocation:'', preferredLocation:'', preparedLocation:'',
  skillSet:'', domain:'DotNet', status:'Available',
  currentCTC:'', expectedCTC:'', notes:''
};

function ResourceModal({ resource, orgId, onClose }: { resource: any; orgId: number; onClose: () => void }) {
  const qc = useQueryClient();
  const isEdit = !!resource?.id;
  const [form, setForm] = useState(isEdit ? {
    ...resource,
    currentCTC: resource.currentCTC ?? '',
    expectedCTC: resource.expectedCTC ?? '',
  } : EMPTY);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
const [resumeUrl, setResumeUrl] = useState('');
const [uploadingResume, setUploadingResume] = useState(false);

  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));
const uploadResume = async (file: File) => {
  try {
    setUploadingResume(true);

    const formData = new FormData();
    formData.append("file", file);

    const res = await api.post(
      "/upload/file?folder=resume",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    setResumeUrl(res.data.url);
    toast.success("Resume uploaded successfully");
  } catch {
    toast.error("Resume upload failed");
  } finally {
    setUploadingResume(false);
  }
};
  const saveMut = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        resumeUrl,
        experienceYears: Number(form.experienceYears),
        currentCTC: form.currentCTC !== '' ? Number(form.currentCTC) : null,
        expectedCTC: form.expectedCTC !== '' ? Number(form.expectedCTC) : null,
        organizationId: orgId,
      };
      return isEdit
        ? api.put(`/bench/${resource.id}`, payload)
        : api.post('/bench', payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Resource updated!' : 'Resource added!');
      qc.invalidateQueries({ queryKey: ['bench'] });
      onClose();
    },
    onError: () => toast.error('Failed to save'),
  });

  const inp = 'input w-full text-sm';
  const lbl = 'block text-xs font-bold text-gray-500 mb-1';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl my-8">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-black text-gray-900">{isEdit ? 'Edit Resource' : 'Add New Resource'}</h2>
          <button onClick={onClose} className="btn-ghost p-2 rounded-xl"><X className="w-5 h-5"/></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Row 1 — Name, Phone, Email */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><label className={lbl}>Full Name *</label><input className={inp} value={form.name} onChange={e=>set('name',e.target.value)} placeholder="John Smith"/></div>
            <div><label className={lbl}>Phone *</label><input className={inp} value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="+91 9876543210"/></div>
            <div><label className={lbl}>Email *</label><input className={inp} type="email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="john@email.com"/></div>
          </div>

          {/* Row 2 — Candidate Type, Domain, Experience */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={lbl}>Candidate Type *</label>
              <select className={inp} value={form.candidateType} onChange={e=>set('candidateType',e.target.value)}>
                <option value="Fresher">🎓 Fresher</option>
                <option value="Experienced">💼 Experienced</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Domain *</label>
              <select className={inp} value={form.domain} onChange={e=>set('domain',e.target.value)}>
                {DOMAINS.filter(d=>d!=='All').map(d=><option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Experience (Years)</label>
              <input className={inp} type="number" min="0" step="0.5"
                value={form.experienceYears}
                onChange={e=>set('experienceYears',e.target.value)}
                disabled={form.candidateType === 'Fresher'}
                placeholder={form.candidateType === 'Fresher' ? '0 (Fresher)' : '3.5'}/>
            </div>
          </div>

          {/* Row 3 — CTC fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={lbl}>Current CTC (LPA)</label>
              <input className={inp} type="number" step="0.1" min="0"
                value={form.currentCTC}
                onChange={e=>set('currentCTC',e.target.value)}
                disabled={form.candidateType === 'Fresher'}
                placeholder={form.candidateType === 'Fresher' ? 'N/A (Fresher)' : '4.5'}/>
            </div>
            <div>
              <label className={lbl}>Expected CTC (LPA) *</label>
              <input className={inp} type="number" step="0.1" min="0"
                value={form.expectedCTC}
                onChange={e=>set('expectedCTC',e.target.value)}
                placeholder="6.0"/>
            </div>
            <div>
              <label className={lbl}>Status</label>
              <select className={inp} value={form.status} onChange={e=>set('status',e.target.value)}>
                <option value="Available">✅ Available</option>
                <option value="Deployed">🚀 Deployed</option>
                <option value="OnHold">⏸ On Hold</option>
              </select>
            </div>
          </div>

          {/* Row 4 — Locations */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><label className={lbl}>Current Location *</label><input className={inp} value={form.currentLocation} onChange={e=>set('currentLocation',e.target.value)} placeholder="Hyderabad"/></div>
            <div><label className={lbl}>Preferred Location</label><input className={inp} value={form.preferredLocation} onChange={e=>set('preferredLocation',e.target.value)} placeholder="Bangalore, Mumbai"/></div>
            <div><label className={lbl}>Prepared Location</label><input className={inp} value={form.preparedLocation} onChange={e=>set('preparedLocation',e.target.value)} placeholder="Hyderabad, Remote"/></div>
          </div>

          {/* Skill Set */}
          <div>
            <label className={lbl}>Skill Set * <span className="text-gray-400 font-normal">(comma-separated)</span></label>
            <input className={inp} value={form.skillSet} onChange={e=>set('skillSet',e.target.value)} placeholder="Java, Spring Boot, MySQL, REST APIs, Microservices"/>
          </div>
         {/* Resume Upload */}
<div>
  <label className={lbl}>Resume *</label>

  <input
    id="resumeUpload"
    type="file"
    accept=".pdf,.doc,.docx"
    className="hidden"
    onChange={async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setResumeFile(file);
      await uploadResume(file);
    }}
  />

  <label
    htmlFor="resumeUpload"
    className="flex flex-col items-center justify-center w-full border-2 border-dashed border-indigo-300 rounded-2xl p-6 cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition"
  >
    {!resumeFile ? (
      <>
        <div className="text-5xl mb-3">📄</div>

        <h3 className="font-semibold text-gray-800">
          Drag & Drop Resume Here
        </h3>

        <p className="text-gray-400 text-sm mt-1">
          or click to browse
        </p>

        <span className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium">
          Browse Resume
        </span>

        <p className="text-xs text-gray-400 mt-3">
          PDF, DOC, DOCX • Max 5 MB
        </p>
      </>
    ) : (
      <>
        <div className="text-5xl mb-3">📄</div>

        <h3 className="font-semibold text-gray-800">
          {resumeFile.name}
        </h3>

        <p className="text-sm text-gray-500">
          {(resumeFile.size / 1024 / 1024).toFixed(2)} MB
        </p>

        {uploadingResume ? (
          <p className="text-blue-600 mt-3 font-medium">
            ☁ Uploading to Cloud...
          </p>
        ) : (
          <p className="text-green-600 mt-3 font-medium">
            ✔ Uploaded Successfully
          </p>
        )}

        <span className="mt-4 text-indigo-600 text-sm font-medium">
          Replace Resume
        </span>
      </>
    )}
  </label>
</div>

          {/* Notes */}
          <div>
            <label className={lbl}>Notes</label>
            <textarea className={`${inp} min-h-[70px] resize-none`} value={form.notes} onChange={e=>set('notes',e.target.value)} placeholder="Any additional information..."/>
          </div>
        </div>

        <div className="p-5 border-t border-gray-100 flex gap-3 justify-end">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button
            className="btn-primary px-6"
            disabled={!form.name || !form.phone || !form.email || !form.currentLocation || saveMut.isPending}
            onClick={() => saveMut.mutate()}>
            {saveMut.isPending ? 'Saving…' : isEdit ? '💾 Update Resource' : '➕ Add Resource'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BenchResourcesPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [search,   setSearch]   = useState('');
  const [domain,   setDomain]   = useState('All');
  const [status,   setStatus]   = useState('All');
  const [typeF,    setTypeF]    = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState<any>(null);

  const orgId = user?.organizationId ?? 0;

  const { data: resources = [], isLoading } = useQuery({
    queryKey: ['bench', orgId, domain, status, typeF, search],
    queryFn: () => api.get('/bench', { params: { orgId, domain, status, type: typeF, search } }).then(r => r.data),
    enabled: !!orgId,
  });

  const { data: stats } = useQuery({
    queryKey: ['bench-stats', orgId],
    queryFn: () => api.get('/bench/stats', { params: { orgId } }).then(r => r.data),
    enabled: !!orgId,
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/bench/${id}`),
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['bench'] }); },
    onError: () => toast.error('Delete failed'),
  });

  const list = resources as any[];

  const exportCSV = () => {
    const header = 'Name,Email,Phone,Type,Domain,Experience,CurrentCTC,ExpectedCTC,CurrentLocation,PreferredLocation,PreparedLocation,SkillSet,Status\n';
    const rows = list.map(r =>
      `"${r.name}","${r.email}","${r.phone}","${r.candidateType}","${r.domain}","${r.experienceYears}","${r.currentCTC??''}","${r.expectedCTC??''}","${r.currentLocation}","${r.preferredLocation}","${r.preparedLocation}","${r.skillSet}","${r.status}"`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'bench-resources.csv'; a.click();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600"/> Bench Resources
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage available candidates by domain and skill</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="btn-secondary text-sm flex items-center gap-1.5">
            <Download className="w-4 h-4"/> Export CSV
          </button>
          <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn-primary text-sm flex items-center gap-1.5">
            <Plus className="w-4 h-4"/> Add Resource
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: 'Total',       value: stats.total,       color: 'text-gray-800',   bg: 'bg-gray-50' },
            { label: 'Available',   value: stats.available,   color: 'text-green-700',  bg: 'bg-green-50' },
            { label: 'Deployed',    value: stats.deployed,    color: 'text-blue-700',   bg: 'bg-blue-50' },
            { label: 'On Hold',     value: stats.onHold,      color: 'text-amber-700',  bg: 'bg-amber-50' },
            { label: 'Freshers',    value: stats.freshers,    color: 'text-purple-700', bg: 'bg-purple-50' },
            { label: 'Experienced', value: stats.experienced, color: 'text-indigo-700', bg: 'bg-indigo-50' },
          ].map(s => (
            <div key={s.label} className={clsx('rounded-2xl p-4 text-center border border-gray-100', s.bg)}>
              <p className={clsx('text-2xl font-black', s.color)}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
          {/* Top domain */}
          {stats.byDomain?.[0] && (
            <div className="rounded-2xl p-4 text-center border border-indigo-100 bg-indigo-50">
              <p className="text-2xl font-black text-indigo-700">{stats.byDomain[0].count}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stats.byDomain[0].domain}</p>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input className="input pl-9 w-full text-sm" placeholder="Search name, skill, location…"
            value={search} onChange={e => setSearch(e.target.value)}/>
        </div>

        {/* Candidate type filter */}
        <div className="flex rounded-xl overflow-hidden border border-gray-200">
          {TYPES.map(t => (
            <button key={t} onClick={() => setTypeF(t)}
              className={clsx('px-3 py-2 text-xs font-bold transition-colors',
                typeF === t ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50')}>
              {t === 'Fresher' ? '🎓' : t === 'Experienced' ? '💼' : ''} {t}
            </button>
          ))}
        </div>

        {/* Domain filter */}
        <select className="input text-sm" value={domain} onChange={e => setDomain(e.target.value)}>
          {DOMAINS.map(d => <option key={d} value={d}>{d === 'All' ? '🌐 All Domains' : d}</option>)}
        </select>

        {/* Status filter */}
        <select className="input text-sm" value={status} onChange={e => setStatus(e.target.value)}>
          {STATUSES.map(s => <option key={s} value={s}>{s === 'All' ? '📋 All Status' : s}</option>)}
        </select>

        <span className="text-xs text-gray-400">{list.length} records</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="hidden lg:grid grid-cols-12 gap-2 px-5 py-3 bg-gray-50 border-b text-xs font-bold text-gray-400 uppercase">
          <span className="col-span-2">Candidate</span>
          <span className="col-span-1 text-center">Type</span>
          <span className="col-span-1 text-center">Domain</span>
          <span className="col-span-1 text-center">Exp</span>
          <span className="col-span-1 text-center">CTC</span>
          <span className="col-span-1 text-center">ECTC</span>
          <span className="col-span-2">Location</span>
          <span className="col-span-2">Skills</span>
          <span className="col-span-1 text-right">Actions</span>
        </div>

        {isLoading ? (
          <div className="p-10 text-center">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"/>
          </div>
        ) : list.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-200"/>
            <p className="font-semibold text-gray-400">No resources found</p>
            <p className="text-sm text-gray-300 mt-1">Add your first bench resource to get started</p>
          </div>
        ) : list.map((r: any) => (
          <div key={r.id} className="grid grid-cols-2 lg:grid-cols-12 gap-2 px-5 py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">

            {/* Candidate info */}
            <div className="col-span-2 flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-black text-sm flex-shrink-0">
                {r.name.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 text-sm">{r.name}</p>
                <a href={`mailto:${r.email}`} className="text-xs text-gray-400 hover:text-indigo-500 flex items-center gap-1">
                  <Mail className="w-3 h-3"/>{r.email}
                </a>
                <a href={`tel:${r.phone}`} className="text-xs text-gray-400 hover:text-green-500 flex items-center gap-1">
                  <Phone className="w-3 h-3"/>{r.phone}
                </a>
              </div>
            </div>

            {/* Candidate type */}
            <div className="col-span-1 flex items-center justify-center">
              <span className={clsx('text-xs font-bold px-2 py-1 rounded-full',
                r.candidateType === 'Fresher' ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700')}>
                {r.candidateType === 'Fresher' ? '🎓 Fresher' : '💼 Exp'}
              </span>
            </div>

            {/* Domain */}
            <div className="col-span-1 flex items-center justify-center">
              <span className={clsx('text-xs font-bold px-2 py-1 rounded-full', DOMAIN_COLORS[r.domain] ?? 'bg-gray-100 text-gray-600')}>
                {r.domain}
              </span>
            </div>

            {/* Experience */}
            <div className="col-span-1 text-center">
              <p className="text-sm font-bold text-gray-800">
                {r.candidateType === 'Fresher' ? '—' : `${r.experienceYears}y`}
              </p>
            </div>

            {/* CTC */}
            <div className="col-span-1 text-center">
              <p className="text-xs font-bold text-gray-700">
                {r.currentCTC ? `₹${r.currentCTC}L` : '—'}
              </p>
              <p className="text-xs text-gray-400">CTC</p>
            </div>

            {/* ECTC */}
            <div className="col-span-1 text-center">
              <p className="text-xs font-bold text-green-600">
                {r.expectedCTC ? `₹${r.expectedCTC}L` : '—'}
              </p>
              <p className="text-xs text-gray-400">ECTC</p>
            </div>

            {/* Location */}
            <div className="col-span-2">
              <p className="text-xs text-gray-600 flex items-center gap-1">
                <MapPin className="w-3 h-3 flex-shrink-0 text-gray-400"/>{r.currentLocation}
              </p>
              {r.preferredLocation && (
                <p className="text-xs text-gray-400 mt-0.5">Pref: {r.preferredLocation}</p>
              )}
              {r.preparedLocation && (
                <p className="text-xs text-blue-500 mt-0.5">Ready: {r.preparedLocation}</p>
              )}
            </div>

            {/* Skills */}
            <div className="col-span-2">
              <div className="flex flex-wrap gap-1">
                {r.skillSet?.split(',').slice(0,3).map((s: string) => (
                  <span key={s} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-md">{s.trim()}</span>
                ))}
                {r.skillSet?.split(',').length > 3 && (
                  <span className="text-xs text-gray-400">+{r.skillSet.split(',').length - 3}</span>
                )}
              </div>
              <span className={clsx('text-xs font-bold px-2 py-0.5 rounded-full mt-1 inline-block', STATUS_COLORS[r.status])}>
                {r.status}
              </span>
            </div>

            {/* Actions */}
            <div className="col-span-1 flex items-center justify-end gap-1">
              <button className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-400"
                onClick={() => { setEditing(r); setShowForm(true); }}>
                <Pencil className="w-4 h-4"/>
              </button>
              <button className="p-1.5 hover:bg-red-50 rounded-lg text-red-400"
                onClick={() => { if(confirm(`Delete ${r.name}?`)) deleteMut.mutate(r.id); }}>
                <Trash2 className="w-4 h-4"/>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <ResourceModal
          resource={editing}
          orgId={orgId}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}
    </div>
  );
}