import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Pencil, Trash2, Users, ChevronDown, ChevronUp,
  Calendar, Clock, UserPlus, X, BookOpen, IndianRupee,
  CheckCircle, AlertCircle, Loader2, Phone, Mail, User
} from 'lucide-react';
import toast from 'react-hot-toast';
import { batchApi, coursesApi, usersApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import Modal from '../../components/shared/Modal';
import clsx from 'clsx';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtDate  = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtMoney = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`;

function statusBadge(s: string) {
  const m: Record<string, string> = {
    Active: 'bg-green-100 text-green-700', Upcoming: 'bg-blue-100 text-blue-700',
    Completed: 'bg-gray-100 text-gray-600', Cancelled: 'bg-red-100 text-red-600',
  };
  return m[s] ?? 'bg-gray-100 text-gray-500';
}
function payBadge(s: string) {
  const m: Record<string, string> = {
    Free: 'bg-purple-100 text-purple-700', FullyPaid: 'bg-green-100 text-green-700',
    PartiallyPaid: 'bg-yellow-100 text-yellow-700', Pending: 'bg-red-100 text-red-600',
  };
  return m[s] ?? 'bg-gray-100 text-gray-500';
}

// ── Payment update inline ──────────────────────────────────────────────────────
function PaymentRow({ student, batchId, onUpdated }: { student: any; batchId: number; onUpdated: () => void }) {
  const [editing, setEditing] = useState(false);
  const [paid, setPaid]       = useState(String(student.paidAmount));
  const [notes, setNotes]     = useState(student.notes ?? '');

  const mut = useMutation({
    mutationFn: () => batchApi.updatePayment(batchId, student.id, { paidAmount: Number(paid), notes }),
    onSuccess: () => { onUpdated(); setEditing(false); toast.success('Payment updated'); },
    onError: () => toast.error('Failed'),
  });

  if (!editing) return (
    <button onClick={() => setEditing(true)}
      className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full cursor-pointer', payBadge(student.paymentStatus))}>
      {student.paymentStatus}
    </button>
  );

  return (
    <div className="flex items-center gap-1">
      <input className="w-24 px-2 py-1 text-xs border border-gray-300 rounded-lg" placeholder="Paid ₹"
        value={paid} onChange={e => setPaid(e.target.value)}/>
      <button className="text-xs bg-green-600 text-white px-2 py-1 rounded-lg" onClick={() => mut.mutate()} disabled={mut.isPending}>
        {mut.isPending ? '…' : 'Save'}
      </button>
      <button className="text-xs text-gray-400 hover:text-gray-600" onClick={() => setEditing(false)}>✕</button>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TrainingBatchPage() {
  const { user } = useAuthStore();
  const qc       = useQueryClient();

  const [batchModal, setBatchModal]     = useState<null | 'create' | 'edit'>(null);
  const [studentModal, setStudentModal] = useState<any>(null);
  const [expanded, setExpanded]         = useState<number | null>(null);
  const [selected, setSelected]         = useState<any>(null);
  const [studentTab, setStudentTab]     = useState<'existing' | 'guest'>('existing');
  const [search, setSearch]             = useState('');

  const emptyBatch = { batchName: '', description: '', startDate: '', durationDays: '30', totalFee: '0', notes: '', courseId: '' };
  const [bForm, setBForm] = useState({ ...emptyBatch });
  const bf = (k: string, v: string) => setBForm(p => ({ ...p, [k]: v }));

  const emptyStudent = { userId: '', guestName: '', guestEmail: '', guestMobile: '', totalFee: '0', paidAmount: '0', notes: '' };
  const [sForm, setSForm] = useState({ ...emptyStudent });
  const sf = (k: string, v: string) => setSForm(p => ({ ...p, [k]: v }));

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: batches = [], isLoading } = useQuery({
    queryKey: ['batches', user?.organizationId],
    queryFn: () => batchApi.getAll(user!.organizationId!).then(r => r.data),
    enabled: !!user?.organizationId,
  });

  const { data: courses = [] } = useQuery({
    queryKey: ['courses-admin', user?.organizationId],
    queryFn: () => coursesApi.getAll({ orgId: user!.organizationId, page: 1, size: 100 })
      .then(r => (r.data as any).items ?? r.data),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users-list', user?.organizationId],
    queryFn: () => usersApi.getAll({ orgId: user!.organizationId, page: 1, size: 300 })
      .then(r => (r.data as any).items ?? r.data),
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createBatch = useMutation({
    mutationFn: () => batchApi.create({
      batchName: bForm.batchName, description: bForm.description,
      startDate: bForm.startDate, durationDays: Number(bForm.durationDays),
      totalFee: Number(bForm.totalFee), notes: bForm.notes,
      courseId: bForm.courseId ? Number(bForm.courseId) : null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['batches'] }); toast.success('Batch created!'); setBatchModal(null); setBForm({ ...emptyBatch }); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Error'),
  });

  const updateBatch = useMutation({
    mutationFn: () => batchApi.update(selected.id, {
      batchName: bForm.batchName, description: bForm.description,
      startDate: bForm.startDate, durationDays: Number(bForm.durationDays),
      totalFee: Number(bForm.totalFee), notes: bForm.notes,
      courseId: bForm.courseId ? Number(bForm.courseId) : null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['batches'] }); toast.success('Updated'); setBatchModal(null); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Error'),
  });

  const deleteBatch = useMutation({
    mutationFn: (id: number) => batchApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['batches'] }); toast.success('Cancelled'); },
  });

  const addStudent = useMutation({
    mutationFn: () => batchApi.addStudent(studentModal.id, {
      userId:      studentTab === 'existing' && sForm.userId ? Number(sForm.userId) : null,
      guestName:   studentTab === 'guest' ? sForm.guestName : null,
      guestEmail:  studentTab === 'guest' ? sForm.guestEmail : null,
      guestMobile: studentTab === 'guest' ? sForm.guestMobile : null,
      totalFee:    Number(sForm.totalFee),
      paidAmount:  Number(sForm.paidAmount),
      notes:       sForm.notes,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['batches'] });
      toast.success('Student added!');
      setSForm({ ...emptyStudent });
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Already added or error'),
  });

  const removeStudent = useMutation({
    mutationFn: ({ batchId, sid }: { batchId: number; sid: number }) => batchApi.removeStudent(batchId, sid),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['batches'] }); toast.success('Removed'); },
  });

  const openEdit = (b: any) => {
    setSelected(b);
    const local = new Date(b.startDate).toISOString().slice(0, 10);
    setBForm({ batchName: b.batchName, description: b.description ?? '', startDate: local,
      durationDays: String(b.durationDays), totalFee: String(b.totalFee), notes: b.notes ?? '',
      courseId: b.courseId ? String(b.courseId) : '' });
    setBatchModal('edit');
  };

  const filteredUsers = (allUsers as any[]).filter(u =>
    !search || `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(search.toLowerCase())
  );

  const batchList = batches as any[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Calendar className="w-6 h-6" style={{ color: 'var(--org-primary)' }}/> Training Batches
          </h1>
          <p className="page-sub">Manage training batches, students, and fees</p>
        </div>
        <button className="btn-primary" onClick={() => { setBForm({ ...emptyBatch }); setBatchModal('create'); }}>
          <Plus className="w-4 h-4"/> New Batch
        </button>
      </div>

      {/* Stats row */}
      {batchList.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Batches',  value: batchList.length,                                           color: 'text-indigo-600',  bg: 'bg-indigo-50' },
            { label: 'Active',         value: batchList.filter(b => b.status === 'Active').length,        color: 'text-green-600',   bg: 'bg-green-50' },
            { label: 'Total Students', value: batchList.reduce((a: number, b: any) => a + b.studentCount, 0), color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Total Fee Collected', value: fmtMoney(batchList.reduce((a: number, b: any) =>
                a + (b.students ?? []).reduce((x: number, s: any) => x + s.paidAmount, 0), 0)),
              color: 'text-emerald-600', bg: 'bg-emerald-50' },
          ].map(s => (
            <div key={s.label} className={clsx('rounded-2xl p-4', s.bg)}>
              <p className={clsx('text-2xl font-black', s.color)}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Batch cards */}
      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-gray-100 animate-pulse rounded-2xl"/>)}</div>
      ) : batchList.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center">
          <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300"/>
          <p className="font-semibold text-gray-500">No training batches yet</p>
          <button className="btn-primary mt-4" onClick={() => { setBForm({ ...emptyBatch }); setBatchModal('create'); }}>
            <Plus className="w-4 h-4"/> Create First Batch
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {batchList.map((b: any) => (
            <div key={b.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Batch header row */}
              <div className="p-5 flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--org-primary)15' }}>
                  <BookOpen className="w-5 h-5" style={{ color: 'var(--org-primary)' }}/>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-gray-900 text-base">{b.batchName}</h3>
                    <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full', statusBadge(b.status))}>{b.status}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 flex-wrap text-sm text-gray-500">
                    {b.courseTitle && <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5"/> {b.courseTitle}</span>}
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5"/> {fmtDate(b.startDate)}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5"/> {b.durationDays} days</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5"/> Ends: {fmtDate(b.endDate)}</span>
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5"/> {b.studentCount} students</span>
                    {b.totalFee > 0 && <span className="flex items-center gap-1 font-medium text-indigo-600"><IndianRupee className="w-3.5 h-3.5"/> {fmtMoney(b.totalFee)}/student</span>}
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => { setStudentModal(b); setSForm({ ...emptyStudent }); setSearch(''); setStudentTab('existing'); }}
                    className="p-2 rounded-lg hover:bg-green-50 text-green-600 transition-colors" title="Add student">
                    <UserPlus className="w-4 h-4"/>
                  </button>
                  <button onClick={() => openEdit(b)} className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors">
                    <Pencil className="w-4 h-4"/>
                  </button>
                  <button onClick={() => { if (confirm('Cancel this batch?')) deleteBatch.mutate(b.id); }}
                    className="p-2 rounded-lg hover:bg-red-50 text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4"/>
                  </button>
                  <button onClick={() => setExpanded(expanded === b.id ? null : b.id)}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
                    {expanded === b.id ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
                  </button>
                </div>
              </div>

              {/* Students table */}
              {expanded === b.id && (
                <div className="border-t border-gray-100">
                  <div className="flex items-center justify-between px-5 py-3 bg-gray-50">
                    <span className="font-semibold text-sm text-gray-700">Students ({b.studentCount})</span>
                    <button className="text-xs btn-secondary"
                      onClick={() => { setStudentModal(b); setSForm({ ...emptyStudent }); setSearch(''); setStudentTab('existing'); }}>
                      <UserPlus className="w-3.5 h-3.5"/> Add Student
                    </button>
                  </div>

                  {b.studentCount === 0 ? (
                    <p className="text-center text-sm text-gray-400 py-8">No students yet — add one above</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                            <th className="px-5 py-2 text-left">Student</th>
                            <th className="px-5 py-2 text-left">Contact</th>
                            <th className="px-5 py-2 text-right">Total Fee</th>
                            <th className="px-5 py-2 text-right">Paid</th>
                            <th className="px-5 py-2 text-right">Pending</th>
                            <th className="px-5 py-2 text-center">Payment</th>
                            <th className="px-5 py-2 text-center">Joined</th>
                            <th className="px-5 py-2"/>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {(b.students ?? []).map((s: any) => (
                            <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs flex-shrink-0">
                                    {s.name?.[0]?.toUpperCase() ?? '?'}
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-800">{s.name ?? '—'}</p>
                                    {s.isGuest && <span className="text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">Guest</span>}
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-3 text-gray-500">
                                <div className="flex flex-col gap-0.5">
                                  {s.email && <span className="flex items-center gap-1 text-xs"><Mail className="w-3 h-3"/> {s.email}</span>}
                                  {s.mobile && <span className="flex items-center gap-1 text-xs"><Phone className="w-3 h-3"/> {s.mobile}</span>}
                                </div>
                              </td>
                              <td className="px-5 py-3 text-right font-medium">{fmtMoney(s.totalFee)}</td>
                              <td className="px-5 py-3 text-right text-green-600 font-medium">{fmtMoney(s.paidAmount)}</td>
                              <td className="px-5 py-3 text-right text-red-500 font-medium">{fmtMoney(s.pendingAmount)}</td>
                              <td className="px-5 py-3 text-center">
                                <PaymentRow student={s} batchId={b.id} onUpdated={() => qc.invalidateQueries({ queryKey: ['batches'] })}/>
                              </td>
                              <td className="px-5 py-3 text-center text-xs text-gray-400">{fmtDate(s.joinedAt)}</td>
                              <td className="px-5 py-3">
                                <button onClick={() => { if (confirm('Remove student?')) removeStudent.mutate({ batchId: b.id, sid: s.id }); }}
                                  className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors">
                                  <X className="w-3.5 h-3.5"/>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Create / Edit Batch Modal ──────────────────────────────────────── */}
      <Modal open={batchModal !== null} onClose={() => setBatchModal(null)}
        title={batchModal === 'create' ? 'Create Training Batch' : `Edit — ${selected?.batchName}`}>
        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
          <div>
            <label className="label">Batch Name *</label>
            <input className="input" placeholder="e.g. Full Stack Development — Batch 5"
              value={bForm.batchName} onChange={e => bf('batchName', e.target.value)}/>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input resize-none" rows={2} placeholder="What does this batch cover?"
              value={bForm.description} onChange={e => bf('description', e.target.value)}/>
          </div>
          <div>
            <label className="label">Course (optional)</label>
            <select className="input" value={bForm.courseId} onChange={e => bf('courseId', e.target.value)}>
              <option value="">No specific course</option>
              {(courses as any[]).map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start Date *</label>
              <input className="input" type="date" value={bForm.startDate} onChange={e => bf('startDate', e.target.value)}/>
            </div>
            <div>
              <label className="label">Duration (days)</label>
              <input className="input" type="number" min={1} value={bForm.durationDays} onChange={e => bf('durationDays', e.target.value)}/>
            </div>
          </div>
          <div>
            <label className="label">Fee per Student (₹)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
              <input className="input pl-7" type="number" min={0} placeholder="0 for free"
                value={bForm.totalFee} onChange={e => bf('totalFee', e.target.value)}/>
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input resize-none" rows={2} placeholder="Internal notes..."
              value={bForm.notes} onChange={e => bf('notes', e.target.value)}/>
          </div>
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1 justify-center" onClick={() => setBatchModal(null)}>Cancel</button>
            <button className="btn-primary flex-1 justify-center"
              onClick={() => batchModal === 'create' ? createBatch.mutate() : updateBatch.mutate()}
              disabled={!bForm.batchName || !bForm.startDate || createBatch.isPending || updateBatch.isPending}>
              {(createBatch.isPending || updateBatch.isPending)
                ? <><Loader2 className="w-4 h-4 animate-spin"/> Saving…</>
                : batchModal === 'create' ? 'Create Batch' : 'Save Changes'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Add Student Modal ─────────────────────────────────────────────── */}
      <Modal open={!!studentModal} onClose={() => setStudentModal(null)}
        title={`Add Student — ${studentModal?.batchName}`}>
        <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">

          {/* Tab switch */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            <button onClick={() => setStudentTab('existing')}
              className={clsx('flex-1 py-2 text-sm font-medium rounded-lg transition-colors',
                studentTab === 'existing' ? 'bg-white shadow text-indigo-700' : 'text-gray-500 hover:text-gray-700')}>
              <User className="w-4 h-4 inline mr-1"/> Existing User
            </button>
            <button onClick={() => setStudentTab('guest')}
              className={clsx('flex-1 py-2 text-sm font-medium rounded-lg transition-colors',
                studentTab === 'guest' ? 'bg-white shadow text-indigo-700' : 'text-gray-500 hover:text-gray-700')}>
              <UserPlus className="w-4 h-4 inline mr-1"/> New / Guest
            </button>
          </div>

          {studentTab === 'existing' ? (
            <div className="space-y-2">
              <input className="input" placeholder="Search by name or email…"
                value={search} onChange={e => setSearch(e.target.value)}/>
              <div className="max-h-48 overflow-y-auto space-y-1 border border-gray-100 rounded-xl p-2">
                {filteredUsers.length === 0
                  ? <p className="text-center text-sm text-gray-400 py-4">No users found</p>
                  : filteredUsers.map((u: any) => (
                    <label key={u.id}
                      className={clsx('flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors',
                        sForm.userId === String(u.id) ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-gray-50')}>
                      <input type="radio" name="userId" value={u.id}
                        checked={sForm.userId === String(u.id)}
                        onChange={() => sf('userId', String(u.id))}
                        className="accent-indigo-600"/>
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                        {u.firstName?.[0]}{u.lastName?.[0]}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-gray-800">{u.firstName} {u.lastName}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </div>
                    </label>
                  ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="label">Full Name *</label>
                <input className="input" placeholder="Student full name"
                  value={sForm.guestName} onChange={e => sf('guestName', e.target.value)}/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Email</label>
                  <input className="input" type="email" placeholder="email@example.com"
                    value={sForm.guestEmail} onChange={e => sf('guestEmail', e.target.value)}/>
                </div>
                <div>
                  <label className="label">Mobile</label>
                  <input className="input" type="tel" placeholder="9876543210"
                    value={sForm.guestMobile} onChange={e => sf('guestMobile', e.target.value)}/>
                </div>
              </div>
            </div>
          )}

          {/* Fee section */}
          <div className="bg-gray-50 rounded-xl p-3 space-y-3">
            <p className="font-semibold text-sm text-gray-700 flex items-center gap-1">
              <IndianRupee className="w-4 h-4"/> Payment Details
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Total Fee (₹)</label>
                <input className="input" type="number" min={0} placeholder="0"
                  value={sForm.totalFee} onChange={e => sf('totalFee', e.target.value)}/>
              </div>
              <div>
                <label className="label">Paid Amount (₹)</label>
                <input className="input" type="number" min={0} placeholder="0"
                  value={sForm.paidAmount} onChange={e => sf('paidAmount', e.target.value)}/>
              </div>
            </div>
            {Number(sForm.totalFee) > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">Pending:</span>
                <span className={clsx('font-bold', Number(sForm.totalFee) - Number(sForm.paidAmount) > 0 ? 'text-red-500' : 'text-green-600')}>
                  {fmtMoney(Math.max(0, Number(sForm.totalFee) - Number(sForm.paidAmount)))}
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="label">Notes</label>
            <input className="input" placeholder="Any notes about this student…"
              value={sForm.notes} onChange={e => sf('notes', e.target.value)}/>
          </div>

          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1 justify-center" onClick={() => setStudentModal(null)}>Cancel</button>
            <button className="btn-primary flex-1 justify-center"
              onClick={() => addStudent.mutate()}
              disabled={(studentTab === 'existing' && !sForm.userId) || (studentTab === 'guest' && !sForm.guestName) || addStudent.isPending}>
              {addStudent.isPending ? <><Loader2 className="w-4 h-4 animate-spin"/> Adding…</> : 'Add Student'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
