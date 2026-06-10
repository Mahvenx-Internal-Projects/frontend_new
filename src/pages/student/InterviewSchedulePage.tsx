import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UserCheck, Calendar, Clock, MapPin, Video,
  CheckCircle2, Plus, Trash2, Send, ExternalLink,
  ChevronDown, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { interviewApi, usersApi } from '../../services/api';
import clsx from 'clsx';

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
}
function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12: true });
}

const emptyForm = {
  studentId: '', title: 'Mock Interview Session', notes: '',
  scheduledAt: '', durationMins: '60',
  meetingUrl: '', platform: 'Zoom',
  mode: 'Online', venue: ''
};

export default function InterviewSchedulePage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const isInstructor = user?.role === 'Instructor' || user?.role === 'OrgAdmin' || user?.role === 'SuperAdmin';

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });

  // Fetch interviews
  const { data: interviews = [], isLoading } = useQuery({
    queryKey: ['interviews', user?.id, isInstructor],
    queryFn: () => isInstructor
      ? interviewApi.getAll({ orgId: user!.organizationId }).then(r => r.data)
      : interviewApi.getByStudent(user!.id).then(r => r.data),
    enabled: !!user,
  });

  // Fetch students for instructor (to schedule for)
  const { data: students = [] } = useQuery({
    queryKey: ['students-list', user?.organizationId],
    queryFn: () => usersApi.getAll({ role: 'Student', orgId: user!.organizationId, size: 200 }).then(r => (r.data as any).items ?? r.data),
    enabled: !!user && isInstructor,
  });

  const createMut = useMutation({
    mutationFn: () => interviewApi.create({
      ...form,
      studentId: Number(form.studentId),
      durationMins: Number(form.durationMins),
      instructorId: user!.id,
      organizationId: user!.organizationId,
    }),
    onSuccess: () => {
      toast.success('Interview scheduled & email sent to student!');
      qc.invalidateQueries({ queryKey: ['interviews'] });
      setShowForm(false);
      setForm({ ...emptyForm });
    },
    onError: () => toast.error('Failed to schedule interview'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => interviewApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['interviews'] }); toast.success('Deleted'); },
  });

  const list = interviews as any[];
  const upcoming = list.filter(i => new Date(i.scheduledAt) > new Date())
    .sort((a,b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  const past = list.filter(i => new Date(i.scheduledAt) <= new Date())
    .sort((a,b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <UserCheck className="w-6 h-6" style={{color:'var(--org-primary)'}}/>
            Interview Schedule
          </h1>
          <p className="page-sub">
            {isInstructor ? 'Schedule & manage mock interviews for students' : 'Your scheduled mock interviews'}
          </p>
        </div>
        {isInstructor && (
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4"/> Schedule Interview
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label:'Total',    value: list.length,     color:'text-blue-600',  bg:'bg-blue-50'  },
          { label:'Upcoming', value: upcoming.length, color:'text-amber-600', bg:'bg-amber-50' },
          { label:'Done',     value: past.length,     color:'text-green-600', bg:'bg-green-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <p className={clsx('text-3xl font-black', s.color)}>{s.value}</p>
            <p className="text-xs text-gray-500 font-semibold mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-2xl border-2 border-[var(--org-primary)]/30 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900">Schedule New Interview</h3>
            <button onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-gray-100">
              <X className="w-4 h-4"/>
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Select Student *</label>
              <select className="input" value={form.studentId} onChange={e => setForm(f => ({...f, studentId: e.target.value}))}>
                <option value="">Choose student…</option>
                {(students as any[]).map((s:any) => (
                  <option key={s.id} value={s.id}>{s.firstName} {s.lastName} — {s.email}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Interview Title</label>
              <input className="input" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))}/>
            </div>
            <div>
              <label className="label">Platform</label>
              <select className="input" value={form.platform} onChange={e => setForm(f => ({...f, platform: e.target.value}))}>
                {['Zoom','Google Meet','Microsoft Teams','WebEx','Other'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Date & Time *</label>
              <input className="input" type="datetime-local" value={form.scheduledAt}
                onChange={e => setForm(f => ({...f, scheduledAt: e.target.value}))}/>
            </div>
            <div>
              <label className="label">Duration (minutes)</label>
              <select className="input" value={form.durationMins} onChange={e => setForm(f => ({...f, durationMins: e.target.value}))}>
                {['30','45','60','90','120'].map(d => <option key={d} value={d}>{d} min</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">
                Meeting Link *
                <span className="font-normal text-gray-400 ml-2">(Zoom/Meet URL — will be emailed to student)</span>
              </label>
              <input className="input" type="url" placeholder="https://zoom.us/j/... or https://meet.google.com/..."
                value={form.meetingUrl} onChange={e => setForm(f => ({...f, meetingUrl: e.target.value}))}/>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Notes for Student</label>
              <textarea className="input" rows={2} placeholder="Topics to prepare, dress code, instructions…"
                value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))}/>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1 justify-center" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn-primary flex-1 justify-center" onClick={() => createMut.mutate()}
              disabled={!form.studentId || !form.scheduledAt || !form.meetingUrl || createMut.isPending}>
              <Send className="w-4 h-4"/>
              {createMut.isPending ? 'Scheduling…' : 'Schedule & Send Email Invite'}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_,i)=><div key={i} className="h-28 bg-gray-100 animate-pulse rounded-2xl"/>)}</div>
      ) : list.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center">
          <UserCheck className="w-14 h-14 mx-auto mb-4 text-gray-200"/>
          <p className="font-bold text-gray-500 text-lg">No interviews scheduled</p>
          <p className="text-sm text-gray-400 mt-2">
            {isInstructor ? 'Click "Schedule Interview" to set up a mock interview for a student.' : 'Your instructor will schedule mock interview sessions here.'}
          </p>
          {isInstructor && <button className="btn-primary mt-4" onClick={() => setShowForm(true)}><Plus className="w-4 h-4"/> Schedule First Interview</button>}
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-bold text-gray-600 text-sm uppercase tracking-wide flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"/> Upcoming ({upcoming.length})
              </h2>
              {upcoming.map((iv:any) => <InterviewCard key={iv.id} iv={iv} isInstructor={isInstructor} onDelete={id => deleteMut.mutate(id)}/>)}
            </section>
          )}
          {past.length > 0 && (
            <section className="space-y-3 mt-4">
              <h2 className="font-bold text-gray-600 text-sm uppercase tracking-wide flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500"/> Past ({past.length})
              </h2>
              {past.map((iv:any) => <InterviewCard key={iv.id} iv={iv} isInstructor={isInstructor} onDelete={id => deleteMut.mutate(id)}/>)}
            </section>
          )}
        </>
      )}
    </div>
  );
}

function InterviewCard({ iv, isInstructor, onDelete }: { iv:any; isInstructor:boolean; onDelete:(id:number)=>void }) {
  const isUpcoming = new Date(iv.scheduledAt) > new Date();
  const minsUntil  = Math.round((new Date(iv.scheduledAt).getTime() - Date.now()) / 60000);
  const isSoon     = minsUntil > 0 && minsUntil < 60;
  const isToday    = minsUntil > 0 && minsUntil < 1440;

  return (
    <div className={clsx('bg-white rounded-2xl border-2 shadow-sm p-5 transition-all',
      isSoon ? 'border-amber-300' : isUpcoming ? 'border-[var(--org-primary)]/30' : 'border-gray-100')}>
      <div className="flex items-start gap-4">
        {/* Date badge */}
        <div className={clsx('w-16 h-16 rounded-2xl flex flex-col items-center justify-center text-white flex-shrink-0 shadow-sm',
          isUpcoming ? '' : 'bg-gray-400')}
          style={isUpcoming ? {background:'linear-gradient(135deg,var(--org-primary),var(--org-secondary,var(--org-primary)))'} : {}}>
          <span className="text-[10px] font-bold uppercase">{new Date(iv.scheduledAt).toLocaleDateString('en-IN',{month:'short'})}</span>
          <span className="text-2xl font-black leading-none">{new Date(iv.scheduledAt).getDate()}</span>
          <span className="text-[10px]">{new Date(iv.scheduledAt).toLocaleDateString('en-IN',{weekday:'short'})}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {isSoon && <span className="text-xs bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full animate-pulse">🔔 In {minsUntil}m</span>}
            {isToday && !isSoon && <span className="text-xs bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">Today</span>}
            {iv.platform && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{iv.platform}</span>}
          </div>
          <h3 className="font-bold text-gray-900 text-base">{iv.title ?? 'Mock Interview'}</h3>

          {/* Show student name for instructor */}
          {isInstructor && iv.studentName && (
            <p className="text-sm text-[var(--org-primary)] font-semibold mt-0.5">👤 {iv.studentName}</p>
          )}

          <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3"/>{fmtDate(iv.scheduledAt)} · {fmtTime(iv.scheduledAt)}</span>
            {iv.durationMins && <span className="flex items-center gap-1"><Clock className="w-3 h-3"/>{iv.durationMins} min</span>}
            {iv.venue && <span className="flex items-center gap-1"><MapPin className="w-3 h-3"/>{iv.venue}</span>}
          </div>

          {iv.notes && (
            <p className="text-xs text-gray-500 mt-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
              📋 {iv.notes}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 flex-shrink-0">
          {iv.meetingUrl && (
            <a href={iv.meetingUrl} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white hover:opacity-90 transition-all"
              style={{background: isSoon ? '#10b981' : 'linear-gradient(135deg,var(--org-primary),var(--org-secondary,var(--org-primary)))'}}>
              <Video className="w-3.5 h-3.5"/>
              {isSoon ? 'Join Now' : 'Meeting Link'}
              <ExternalLink className="w-3 h-3"/>
            </a>
          )}
          {isInstructor && (
            <button onClick={() => { if(confirm('Delete this interview?')) onDelete(iv.id); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 border border-red-200 transition-all">
              <Trash2 className="w-3.5 h-3.5"/> Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
