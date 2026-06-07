import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, Pencil, Trash2, UserCheck, UserX, Shield,
  Mail, Phone, Building2, Calendar, Filter, Download, Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import { usersApi, orgsApi, departmentsApi, userRolesApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import Modal from '../../components/shared/Modal';
import clsx from 'clsx';

const ROLE_CFG: Record<string, { badge: string; color: string }> = {
  SuperAdmin: { badge: 'bg-purple-100 text-purple-700 border border-purple-200', color: '#8b5cf6' },
  OrgAdmin:   { badge: 'bg-blue-100 text-blue-700 border border-blue-200',       color: '#3b82f6' },
  Instructor: { badge: 'bg-amber-100 text-amber-700 border border-amber-200',    color: '#f59e0b' },
  Student:    { badge: 'bg-green-100 text-green-700 border border-green-200',    color: '#10b981' },
};

const ALL_ROLES = ['SuperAdmin', 'OrgAdmin', 'Instructor', 'Student'];

function Avatar({ name, size = 9 }: { name: string; size?: number }) {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const colors = ['#f97316','#6366f1','#ec4899','#10b981','#2563eb','#8b5cf6','#f59e0b','#ef4444'];
  const bg = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className={`w-${size} h-${size} rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}
      style={{ background: bg, minWidth: `${size * 4}px`, minHeight: `${size * 4}px` }}>
      {initials}
    </div>
  );
}

function RolePill({ role, checked, onChange }: { role: string; checked: boolean; onChange: () => void }) {
  const cfg = ROLE_CFG[role];
  return (
    <label className={clsx('flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer border-2 transition-all select-none',
      checked ? 'shadow-md' : 'border-gray-100 hover:border-gray-200 bg-gray-50')}
      style={checked ? { borderColor: cfg.color, background: `${cfg.color}10` } : {}}>
      <input type="checkbox" checked={checked} onChange={onChange} className="hidden" />
      <div className={clsx('w-5 h-5 rounded flex items-center justify-center text-white text-xs border-2 transition-all')}
        style={checked ? { background: cfg.color, borderColor: cfg.color } : { borderColor: '#d1d5db' }}>
        {checked && '✓'}
      </div>
      <span className="text-sm font-semibold text-gray-700">{role}</span>
    </label>
  );
}

export default function UsersPage() {
  const { user: me } = useAuthStore();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [view, setView] = useState<'table' | 'grid'>('table');
  const [modal, setModal] = useState<null|'create'|'edit'|'roles'|'view'>(null);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '',
    roles: ['Student'] as string[],
    organizationId: String(me?.organizationId ?? ''),
    departmentIds: [] as number[]
  });

  const availableRoles = me?.role === 'SuperAdmin' ? ALL_ROLES : ALL_ROLES.filter(r => r !== 'SuperAdmin');

  const { data, isLoading } = useQuery({
    queryKey: ['users', search, roleFilter, page],
    queryFn: () => usersApi.getAll({ search: search || undefined, role: roleFilter || undefined, page, size: 20 }).then(r => r.data),
    placeholderData: (prev: any) => prev,
  });

  const { data: orgsData } = useQuery({
    queryKey: ['orgs-list'],
    queryFn: () => orgsApi.getAll({ size: 100 }).then(r => r.data),
    enabled: me?.role === 'SuperAdmin',
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments', me?.organizationId],
    queryFn: () => departmentsApi.getAll(me?.organizationId).then(r => r.data),
    enabled: !!me?.organizationId,
  });

  const createMut = useMutation({
    mutationFn: () => usersApi.create({ firstName: form.firstName, lastName: form.lastName, email: form.email, password: form.password, roles: form.roles, organizationId: Number(form.organizationId), departmentIds: form.departmentIds }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('User created'); setModal(null); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Error'),
  });

  const updateMut = useMutation({
    mutationFn: () => usersApi.update(selected!.id, { firstName: form.firstName, lastName: form.lastName }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Updated'); setModal(null); },
    onError: () => toast.error('Failed'),
  });

  const updateRolesMut = useMutation({
    mutationFn: () => userRolesApi.updateRoles(selected!.id, { roles: form.roles, departmentIds: form.departmentIds }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Roles updated'); setModal(null); },
    onError: () => toast.error('Failed'),
  });

  const toggleActiveMut = useMutation({
    mutationFn: (u: any) => usersApi.update(u.id, { isActive: !u.isActive }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Status updated'); },
  });

  const users: any[] = data?.items ?? [];

  const openCreate = () => {
    setSelected(null);
    setForm({ firstName:'', lastName:'', email:'', password:'', roles:['Student'], organizationId: String(me?.organizationId ?? ''), departmentIds:[] });
    setModal('create');
  };

  const openEdit = (u: any) => {
    setSelected(u);
    setForm(f => ({ ...f, firstName: u.firstName, lastName: u.lastName, email: u.email, password: '' }));
    setModal('edit');
  };

  const openRoles = (u: any) => {
    setSelected(u);
    setForm(f => ({ ...f, roles: u.roles ?? [u.role], departmentIds: u.departments?.map((d: any) => d.departmentId) ?? [] }));
    setModal('roles');
  };

  const openView = (u: any) => { setSelected(u); setModal('view'); };
  const toggleRole = (r: string) => setForm(f => ({ ...f, roles: f.roles.includes(r) ? f.roles.filter(x => x !== r) : [...f.roles, r] }));

  const UserFormFields = () => (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">First Name *</label>
          <input className="input" value={form.firstName} onChange={e => setForm(f => ({...f, firstName: e.target.value}))} /></div>
        <div><label className="label">Last Name *</label>
          <input className="input" value={form.lastName} onChange={e => setForm(f => ({...f, lastName: e.target.value}))} /></div>
      </div>
      <div><label className="label">Email *</label>
        <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} /></div>
      {modal === 'create' && <div><label className="label">Password *</label>
        <input className="input" type="password" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} /></div>}
    </>
  );

  const RolesFields = () => (
    <>
      <div>
        <label className="label">Roles <span className="text-xs text-gray-400 font-normal">(select all that apply)</span></label>
        <div className="grid grid-cols-2 gap-2 mt-1">
          {availableRoles.map(r => <RolePill key={r} role={r} checked={form.roles.includes(r)} onChange={() => toggleRole(r)} />)}
        </div>
        {form.roles.length === 0 && <p className="text-xs text-red-500 mt-1">At least one role required</p>}
      </div>
      {(departments as any[]).length > 0 && (
        <div>
          <label className="label">Departments <span className="text-xs text-gray-400 font-normal">(optional)</span></label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            {(departments as any[]).map((d: any) => (
              <label key={d.id} className={clsx('flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer border-2 transition-all',
                form.departmentIds.includes(d.id) ? 'shadow-sm' : 'border-gray-100 bg-gray-50')}>
                <input type="checkbox" className="hidden"
                  checked={form.departmentIds.includes(d.id)}
                  onChange={() => setForm(f => ({ ...f, departmentIds: f.departmentIds.includes(d.id) ? f.departmentIds.filter(i => i !== d.id) : [...f.departmentIds, d.id] }))} />
                <div className="w-4 h-4 rounded flex items-center justify-center text-white text-xs"
                  style={form.departmentIds.includes(d.id) ? { background: d.color || '#6366f1' } : { background: '#e5e7eb' }}>
                  {form.departmentIds.includes(d.id) && '✓'}
                </div>
                <span className="text-sm text-gray-700">{d.iconEmoji} {d.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Users</h1>
          <p className="text-sm text-gray-500">{data?.totalCount ?? 0} total users</p>
        </div>
        <button className="btn-primary" onClick={openCreate}><Plus className="w-4 h-4" /> Add User</button>
      </div>

      {/* Filters bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input pl-9" placeholder="Search name, email…" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="input w-44" value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}>
          <option value="">All Roles</option>
          {availableRoles.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <div className="flex rounded-xl border border-gray-200 overflow-hidden">
          {(['table','grid'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={clsx('px-3 py-2 text-xs font-medium capitalize transition-colors', view === v ? 'bg-[var(--org-primary)] text-white' : 'bg-white text-gray-500 hover:bg-gray-50')}>
              {v === 'table' ? '☰ Table' : '⊞ Grid'}
            </button>
          ))}
        </div>
      </div>

      {/* Table view */}
      {view === 'table' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-auto">
              <thead><tr>
                <th>User</th><th>Roles</th><th>Departments</th><th>Organization</th><th>Joined</th><th>Status</th><th className="text-right">Actions</th>
              </tr></thead>
              <tbody>
                {isLoading ? [...Array(6)].map((_, i) => (
                  <tr key={i}><td colSpan={7}><div className="h-14 bg-gray-50 animate-pulse rounded m-2" /></td></tr>
                )) : users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar name={`${u.firstName} ${u.lastName}`} />
                        <div>
                          <p className="font-semibold text-sm text-gray-900">{u.firstName} {u.lastName}</p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {(u.roles ?? [u.role]).map((r: string) => (
                          <span key={r} className={clsx('text-xs px-2 py-0.5 rounded-full font-semibold', ROLE_CFG[r]?.badge ?? 'badge-gray')}>{r}</span>
                        ))}
                      </div>
                    </td>
                    <td className="text-xs text-gray-500">
                      {u.departments?.length > 0 ? u.departments.slice(0,2).map((d: any) => d.name).join(', ') : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="text-xs text-gray-500">{u.organizationName}</td>
                    <td className="text-xs text-gray-400">{new Date(u.createdAt).toLocaleDateString('en-IN')}</td>
                    <td>
                      <span className={clsx('text-xs font-semibold px-2 py-1 rounded-full', u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-500')}>
                        {u.isActive ? '● Active' : '● Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openView(u)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors" title="View"><Eye className="w-3.5 h-3.5" /></button>
                        <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-400 hover:text-blue-600 transition-colors" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => openRoles(u)} className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-400 hover:text-purple-600 transition-colors" title="Edit Roles"><Shield className="w-3.5 h-3.5" /></button>
                        <button onClick={() => toggleActiveMut.mutate(u)} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-400 hover:text-amber-600 transition-colors" title={u.isActive ? 'Deactivate' : 'Activate'}>
                          {u.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(data?.totalPages ?? 1) > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
              <p className="text-sm text-gray-500">Page {page} of {data?.totalPages} · {data?.totalCount} users</p>
              <div className="flex gap-2">
                <button className="btn-secondary text-xs" disabled={page <= 1} onClick={() => setPage(p => p-1)}>← Previous</button>
                <button className="btn-secondary text-xs" disabled={page >= (data?.totalPages ?? 1)} onClick={() => setPage(p => p+1)}>Next →</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Grid view */}
      {view === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {isLoading ? [...Array(8)].map((_, i) => <div key={i} className="card h-48 animate-pulse bg-gray-100" />) :
          users.map(u => (
            <div key={u.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <Avatar name={`${u.firstName} ${u.lastName}`} size={12} />
                <span className={clsx('text-xs font-semibold px-2 py-1 rounded-full', u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-500')}>
                  {u.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <h3 className="font-bold text-gray-900">{u.firstName} {u.lastName}</h3>
              <p className="text-xs text-gray-400 truncate mb-3">{u.email}</p>
              <div className="flex flex-wrap gap-1 mb-3">
                {(u.roles ?? [u.role]).map((r: string) => (
                  <span key={r} className={clsx('text-xs px-2 py-0.5 rounded-full font-semibold', ROLE_CFG[r]?.badge ?? 'badge-gray')}>{r}</span>
                ))}
              </div>
              <div className="flex gap-1.5 pt-3 border-t border-gray-100">
                <button onClick={() => openEdit(u)} className="flex-1 btn-secondary text-xs justify-center py-1.5"><Pencil className="w-3 h-3" /> Edit</button>
                <button onClick={() => openRoles(u)} className="flex-1 btn-secondary text-xs justify-center py-1.5"><Shield className="w-3 h-3" /> Roles</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={modal === 'create'} onClose={() => setModal(null)} title="Add New User" size="lg">
        <div className="p-5 space-y-4">
          <UserFormFields />
          <RolesFields />
          {me?.role === 'SuperAdmin' && (
            <div><label className="label">Organization</label>
              <select className="input" value={form.organizationId} onChange={e => setForm(f => ({...f, organizationId: e.target.value}))}>
                <option value="">Select…</option>
                {(orgsData?.items ?? []).map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select></div>
          )}
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1 justify-center" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn-primary flex-1 justify-center" onClick={() => createMut.mutate()}
              disabled={!form.firstName || !form.email || form.roles.length === 0 || createMut.isPending}>
              {createMut.isPending ? 'Creating…' : 'Create User'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={modal === 'edit'} onClose={() => setModal(null)} title="Edit User">
        <div className="p-5 space-y-4">
          {selected && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-4">
              <Avatar name={`${selected.firstName} ${selected.lastName}`} />
              <div><p className="font-semibold text-gray-900">{selected.firstName} {selected.lastName}</p>
                <p className="text-xs text-gray-400">{selected.email}</p></div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">First Name</label>
              <input className="input" value={form.firstName} onChange={e => setForm(f => ({...f, firstName: e.target.value}))} /></div>
            <div><label className="label">Last Name</label>
              <input className="input" value={form.lastName} onChange={e => setForm(f => ({...f, lastName: e.target.value}))} /></div>
          </div>
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1 justify-center" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn-primary flex-1 justify-center" onClick={() => updateMut.mutate()} disabled={updateMut.isPending}>
              {updateMut.isPending ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Roles Modal */}
      <Modal open={modal === 'roles'} onClose={() => setModal(null)} title="Edit Roles & Departments" size="lg">
        <div className="p-5 space-y-4">
          {selected && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <Avatar name={`${selected.firstName} ${selected.lastName}`} />
              <div><p className="font-semibold text-gray-900">{selected.firstName} {selected.lastName}</p>
                <p className="text-xs text-gray-400">{selected.email}</p></div>
            </div>
          )}
          <RolesFields />
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1 justify-center" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn-primary flex-1 justify-center" onClick={() => updateRolesMut.mutate()}
              disabled={form.roles.length === 0 || updateRolesMut.isPending}>
              {updateRolesMut.isPending ? 'Saving…' : 'Save Roles'}
            </button>
          </div>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal open={modal === 'view'} onClose={() => setModal(null)} title="User Profile">
        {selected && (
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-4">
              <Avatar name={`${selected.firstName} ${selected.lastName}`} size={16} />
              <div>
                <h2 className="font-black text-xl text-gray-900">{selected.firstName} {selected.lastName}</h2>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(selected.roles ?? [selected.role]).map((r: string) => (
                    <span key={r} className={clsx('text-xs px-2 py-0.5 rounded-full font-semibold', ROLE_CFG[r]?.badge)}>{r}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Mail, label: 'Email', value: selected.email },
                { icon: Building2, label: 'Organization', value: selected.organizationName },
                { icon: Calendar, label: 'Joined', value: new Date(selected.createdAt).toLocaleDateString('en-IN') },
                { icon: UserCheck, label: 'Status', value: selected.isActive ? 'Active' : 'Inactive' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-3.5 h-3.5 text-gray-400" />
                    <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">{label}</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{value}</p>
                </div>
              ))}
            </div>
            {selected.departments?.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-2">Departments</p>
                <div className="flex flex-wrap gap-2">
                  {selected.departments.map((d: any) => (
                    <span key={d.departmentId} className="text-xs bg-white border border-gray-200 px-2.5 py-1.5 rounded-lg font-medium text-gray-700">{d.name}</span>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <button className="btn-secondary flex-1 justify-center" onClick={() => { setModal(null); setTimeout(() => openEdit(selected), 100); }}><Pencil className="w-3.5 h-3.5" /> Edit</button>
              <button className="btn-primary flex-1 justify-center" onClick={() => { setModal(null); setTimeout(() => openRoles(selected), 100); }}><Shield className="w-3.5 h-3.5" /> Manage Roles</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
