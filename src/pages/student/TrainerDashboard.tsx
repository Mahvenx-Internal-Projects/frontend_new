import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  BookOpen, Users, Calendar, Video, ClipboardList, Clock,
  Plus, Pencil, Trash2, CheckCircle2, Bell, Send, Eye,
  BarChart3, Award, TrendingUp, FileText, Monitor
} from 'lucide-react';
import toast from 'react-hot-toast';
import { assignmentsApi, liveClassApi, attendanceApi, interviewApi, coursesApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import Modal from '../../components/shared/Modal';
import clsx from 'clsx';

export default function TrainerDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'overview'|'assignments'|'liveclasses'|'attendance'|'interviews'>(
    (searchParams.get('tab') as any) ?? 'overview'
  );
  // Sync tab from URL on navigation
  const tabFromUrl = (searchParams.get('tab') ?? 'overview') as typeof activeTab;
  const effectiveTab = tabFromUrl !== activeTab && searchParams.get('tab') ? tabFromUrl : activeTab;
  const [assignModal, setAssignModal] = useState(false);
  const [liveModal, setLiveModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);

  const [assignForm, setAF] = useState({ title: '', description: '', maxMarks: '100', dueDate: '', courseId: '', attachmentUrl: '' });
  const [liveForm, setLF] = useState({ title: '', description: '', scheduledAt: '', durationMinutes: '60', platform: 'Zoom', meetingLink: '', meetingId: '', meetingPassword: '', courseId: '' });

  const { data: courses = [] } = useQuery({
    queryKey: ['trainer-courses', user?.id],
    queryFn: () => coursesApi.getAll({ instructorId: user?.id, size: 100 }).then(r => r.data.items ?? r.data),
    enabled: !!user?.id,
  });

  const { data: upcomingClasses = [] } = useQuery({
    queryKey: ['upcoming-classes', user?.organizationId],
    queryFn: () => liveClassApi.getUpcoming(user?.organizationId).then(r => r.data),
    enabled: !!user?.organizationId,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['trainer-assignments', selectedCourse],
    queryFn: () => assignmentsApi.getByCourse(selectedCourse!).then(r => r.data),
    enabled: !!selectedCourse,
  });

  const { data: liveClasses = [] } = useQuery({
    queryKey: ['trainer-liveclasses', selectedCourse],
    queryFn: () => liveClassApi.getByCourse(selectedCourse!).then(r => r.data),
    enabled: !!selectedCourse,
  });

  const { data: interviews = [] } = useQuery({
    queryKey: ['trainer-interviews', user?.organizationId],
    queryFn: () => interviewApi.getAll({ orgId: user?.organizationId }).then(r => r.data),
    enabled: !!user?.organizationId,
  });

  const createAssignMut = useMutation({
    mutationFn: () => assignmentsApi.create({ ...assignForm, maxMarks: Number(assignForm.maxMarks), courseId: Number(assignForm.courseId), createdById: user!.id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['trainer-assignments'] }); toast.success('Assignment created & students notified'); setAssignModal(false); },
    onError: () => toast.error('Failed to create'),
  });

  const createLiveMut = useMutation({
    mutationFn: () => liveClassApi.create({ ...liveForm, durationMinutes: Number(liveForm.durationMinutes), courseId: Number(liveForm.courseId), hostId: user!.id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['trainer-liveclasses', 'upcoming-classes'] }); toast.success('Live class scheduled & students emailed'); setLiveModal(false); },
    onError: () => toast.error('Failed'),
  });

  const deleteAssignMut = useMutation({
    mutationFn: (id: number) => assignmentsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['trainer-assignments'] }); toast.success('Deleted'); },
  });

  const deleteLiveMut = useMutation({
    mutationFn: (id: number) => liveClassApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['trainer-liveclasses'] }); toast.success('Cancelled'); },
  });

  const remindMut = useMutation({
    mutationFn: (id: number) => liveClassApi.sendReminder(id),
    onSuccess: (data) => toast.success(`Reminder sent to ${data.data.sent} students`),
    onError: () => toast.error('Failed to send'),
  });

  const coursesList = courses as any[];
  const upcomingList = upcomingClasses as any[];
  const assignmentsList = assignments as any[];
  const liveList = liveClasses as any[];
  const interviewList = interviews as any[];

  const p = 'var(--org-primary)';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Trainer Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Welcome back, {user?.firstName}! Manage your courses and students.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => setLiveModal(true)}><Video className="w-4 h-4" /> Schedule Class</button>
          <button className="btn-primary" onClick={() => setAssignModal(true)}><Plus className="w-4 h-4" /> New Assignment</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'My Courses', value: coursesList.length, icon: BookOpen, color: 'text-brand-600', bg: 'bg-brand-50' },
          { label: 'Upcoming Classes', value: upcomingList.length, icon: Video, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Pending Grading', value: assignmentsList.filter((a: any) => a.submissionCount > 0).length, icon: ClipboardList, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Interviews', value: interviewList.filter((i: any) => i.status === 'Scheduled').length, icon: Award, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{s.label}</p>
              <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center`}><s.icon className={`w-4 h-4 ${s.color}`} /></div>
            </div>
            <p className="text-3xl font-black text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Course selector */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <label className="label mb-2">Select Course to Manage</label>
        <div className="flex flex-wrap gap-2">
          {coursesList.map((c: any) => (
            <button key={c.id}
              onClick={() => setSelectedCourse(selectedCourse === c.id ? null : c.id)}
              className={clsx('px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all',
                selectedCourse === c.id ? 'text-white border-transparent shadow-md' : 'border-gray-200 text-gray-600 hover:border-gray-300')}
              style={selectedCourse === c.id ? { background: 'linear-gradient(135deg,var(--org-primary),var(--org-secondary))' } : {}}>
              {c.title}
            </button>
          ))}
          {coursesList.length === 0 && <p className="text-sm text-gray-400">No courses assigned. Create a course first.</p>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-1 flex-wrap">
        {[
          ['overview', '📊 Overview'],
          ['assignments', '📝 Assignments'],
          ['liveclasses', '🎥 Live Classes'],
          ['attendance', '✅ Attendance'],
          ['interviews', '🎯 Interviews'],
        ].map(([t, label]) => (
          <button key={t} onClick={() => setActiveTab(t as any)}
            className={clsx('px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap',
              activeTab === t ? 'border-[var(--org-primary)] text-[var(--org-primary)]' : 'border-transparent text-gray-500 hover:text-gray-700')}>
            {label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {effectiveTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Upcoming classes */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-black text-gray-900 mb-4 flex items-center gap-2"><Calendar className="w-5 h-5" style={{ color: 'var(--org-primary)' }} /> Upcoming Classes</h3>
            {upcomingList.length === 0 ? (
              <div className="text-center py-8 text-gray-400"><Video className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>No upcoming classes</p></div>
            ) : upcomingList.slice(0, 5).map((lc: any) => (
              <div key={lc.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 mb-2 border border-gray-100">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-bold text-xs" style={{ background: 'linear-gradient(135deg,var(--org-primary),var(--org-secondary))' }}>
                  {new Date(lc.scheduledAt).getDate()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 truncate">{lc.title}</p>
                  <p className="text-xs text-gray-500">{new Date(lc.scheduledAt).toLocaleString()} · {lc.durationMinutes}min</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{lc.platform}</span>
                    {lc.meetingLink && <a href={lc.meetingLink} target="_blank" rel="noreferrer" className="text-xs text-brand-600 underline">Join Link</a>}
                  </div>
                </div>
                <button onClick={() => remindMut.mutate(lc.id)} className="btn-ghost text-xs p-1.5" title="Send reminder"><Bell className="w-4 h-4" /></button>
              </div>
            ))}
          </div>

          {/* Recent interviews */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-black text-gray-900 mb-4 flex items-center gap-2"><Award className="w-5 h-5 text-purple-500" /> Interview Schedule</h3>
            {interviewList.length === 0 ? (
              <div className="text-center py-8 text-gray-400"><Award className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>No interviews scheduled</p></div>
            ) : interviewList.slice(0, 5).map((iv: any) => (
              <div key={iv.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 mb-2 border border-gray-100">
                <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-xs flex-shrink-0">
                  {iv.studentName?.split(' ').map((n: string) => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 truncate">{iv.studentName}</p>
                  <p className="text-xs text-gray-500">{iv.title} · {new Date(iv.scheduledAt).toLocaleDateString()}</p>
                </div>
                <span className={clsx('text-xs font-semibold px-2 py-1 rounded-full',
                  iv.status === 'Scheduled' ? 'bg-blue-100 text-blue-700' :
                  iv.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                  {iv.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assignments tab */}
      {effectiveTab === 'assignments' && (
        <div className="space-y-4">
          {!selectedCourse && <div className="card p-8 text-center text-gray-400"><ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>Select a course above to manage assignments</p></div>}
          {selectedCourse && (
            <>
              <div className="flex justify-end">
                <button className="btn-primary" onClick={() => setAssignModal(true)}><Plus className="w-4 h-4" /> New Assignment</button>
              </div>
              {assignmentsList.length === 0 ? (
                <div className="card p-12 text-center text-gray-400"><FileText className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>No assignments for this course</p></div>
              ) : assignmentsList.map((a: any) => (
                <div key={a.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-gray-900">{a.title}</h3>
                        <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full',
                          a.status === 'Published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                          {a.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mb-2">{a.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span>Max Marks: <strong className="text-gray-700">{a.maxMarks}</strong></span>
                        <span>Due: <strong className="text-red-500">{new Date(a.dueDate).toLocaleDateString()}</strong></span>
                        <span>Submissions: <strong className="text-blue-600">{a.submissionCount}</strong></span>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button className="btn-secondary text-xs" onClick={() => navigate(`/dashboard/assignments/${a.id}/submissions`)}>
                        <Eye className="w-3.5 h-3.5" /> Grade
                      </button>
                      <button className="btn-ghost text-xs text-red-500" onClick={() => { if(confirm('Delete?')) deleteAssignMut.mutate(a.id); }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Live Classes tab */}
      {effectiveTab === 'liveclasses' && (
        <div className="space-y-4">
          {!selectedCourse && <div className="card p-8 text-center text-gray-400"><Video className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>Select a course above</p></div>}
          {selectedCourse && (
            <>
              <div className="flex justify-end">
                <button className="btn-primary" onClick={() => setLiveModal(true)}><Plus className="w-4 h-4" /> Schedule Class</button>
              </div>
              {liveList.length === 0 ? (
                <div className="card p-12 text-center text-gray-400"><Monitor className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>No classes scheduled</p></div>
              ) : liveList.map((lc: any) => (
                <div key={lc.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-gray-900">{lc.title}</h3>
                        <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full',
                          lc.status === 'Scheduled' ? 'bg-blue-100 text-blue-700' :
                          lc.status === 'Live' ? 'bg-red-100 text-red-600 animate-pulse' :
                          lc.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                          {lc.status === 'Live' ? '🔴 LIVE' : lc.status}
                        </span>
                        {lc.emailSent && <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">✓ Emails Sent</span>}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2 text-sm">
                        <div><p className="text-xs text-gray-400">Date & Time</p><p className="font-semibold text-gray-800">{new Date(lc.scheduledAt).toLocaleString()}</p></div>
                        <div><p className="text-xs text-gray-400">Duration</p><p className="font-semibold text-gray-800">{lc.durationMinutes} min</p></div>
                        <div><p className="text-xs text-gray-400">Platform</p><p className="font-semibold text-gray-800">{lc.platform}</p></div>
                        {lc.meetingId && <div><p className="text-xs text-gray-400">Meeting ID</p><p className="font-mono font-semibold text-gray-800">{lc.meetingId}</p></div>}
                      </div>
                      {lc.meetingLink && <a href={lc.meetingLink} target="_blank" rel="noreferrer" className="text-xs text-brand-600 underline mt-2 inline-block">{lc.meetingLink}</a>}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button className="btn-secondary text-xs" onClick={() => remindMut.mutate(lc.id)} title="Send reminder email">
                        <Bell className="w-3.5 h-3.5" /> Remind
                      </button>
                      <button className="btn-ghost text-xs text-red-500" onClick={() => { if(confirm('Cancel?')) deleteLiveMut.mutate(lc.id); }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Attendance tab */}
      {effectiveTab === 'attendance' && (
        <div className="card p-8 text-center text-gray-400">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-semibold text-gray-500 mb-2">Attendance Management</p>
          <p className="text-sm mb-4">Select a course and date to mark attendance</p>
          <button className="btn-primary mx-auto" onClick={() => navigate('/dashboard/attendance')}>
            Open Attendance Tracker →
          </button>
        </div>
      )}

      {/* Interviews tab */}
      {effectiveTab === 'interviews' && (
        <div className="space-y-3">
          {interviewList.length === 0 ? (
            <div className="card p-12 text-center text-gray-400"><Award className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>No interviews scheduled</p></div>
          ) : interviewList.map((iv: any) => (
            <div key={iv.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-sm">
                    {iv.studentName?.split(' ').map((n: string) => n[0]).join('')}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{iv.studentName}</p>
                    <p className="text-xs text-gray-500">{iv.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(iv.scheduledAt).toLocaleString()} · {iv.durationMinutes}min · {iv.platform}
                    </p>
                  </div>
                </div>
                <span className={clsx('text-xs font-semibold px-3 py-1.5 rounded-full',
                  iv.status === 'Scheduled' ? 'bg-blue-100 text-blue-700' :
                  iv.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                  {iv.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Assignment Modal */}
      <Modal open={assignModal} onClose={() => setAssignModal(false)} title="Create Assignment" size="lg">
        <div className="p-5 space-y-4">
          <div><label className="label">Title *</label><input className="input" value={assignForm.title} onChange={e => setAF(f => ({...f, title: e.target.value}))} /></div>
          <div><label className="label">Description</label><textarea className="input" rows={2} value={assignForm.description} onChange={e => setAF(f => ({...f, description: e.target.value}))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Max Marks</label><input className="input" type="number" value={assignForm.maxMarks} onChange={e => setAF(f => ({...f, maxMarks: e.target.value}))} /></div>
            <div><label className="label">Due Date *</label><input className="input" type="datetime-local" value={assignForm.dueDate} onChange={e => setAF(f => ({...f, dueDate: e.target.value}))} /></div>
          </div>
          <div><label className="label">Course *</label>
            <select className="input" value={assignForm.courseId} onChange={e => setAF(f => ({...f, courseId: e.target.value}))}>
              <option value="">Select course</option>
              {coursesList.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select></div>
          <div><label className="label">Attachment URL (optional)</label><input className="input" placeholder="https://…" value={assignForm.attachmentUrl} onChange={e => setAF(f => ({...f, attachmentUrl: e.target.value}))} /></div>
          <div className="flex gap-3"><button className="btn-secondary flex-1 justify-center" onClick={() => setAssignModal(false)}>Cancel</button>
            <button className="btn-primary flex-1 justify-center" onClick={() => createAssignMut.mutate()} disabled={!assignForm.title || !assignForm.dueDate || !assignForm.courseId || createAssignMut.isPending}>
              {createAssignMut.isPending ? 'Creating…' : 'Create & Notify Students'}
            </button></div>
        </div>
      </Modal>

      {/* Live Class Modal */}
      <Modal open={liveModal} onClose={() => setLiveModal(false)} title="Schedule Live Class" size="lg">
        <div className="p-5 space-y-4">
          <div><label className="label">Title *</label><input className="input" placeholder="e.g. SAP Module 3 - Live Session" value={liveForm.title} onChange={e => setLF(f => ({...f, title: e.target.value}))} /></div>
          <div><label className="label">Description</label><textarea className="input" rows={2} value={liveForm.description} onChange={e => setLF(f => ({...f, description: e.target.value}))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Date & Time *</label><input className="input" type="datetime-local" value={liveForm.scheduledAt} onChange={e => setLF(f => ({...f, scheduledAt: e.target.value}))} /></div>
            <div><label className="label">Duration (minutes)</label><input className="input" type="number" value={liveForm.durationMinutes} onChange={e => setLF(f => ({...f, durationMinutes: e.target.value}))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Platform</label>
              <select className="input" value={liveForm.platform} onChange={e => setLF(f => ({...f, platform: e.target.value}))}>
                {['Zoom','GoogleMeet','Teams','YouTube','Custom'].map(p => <option key={p} value={p}>{p}</option>)}
              </select></div>
            <div><label className="label">Course *</label>
              <select className="input" value={liveForm.courseId} onChange={e => setLF(f => ({...f, courseId: e.target.value}))}>
                <option value="">Select course</option>
                {coursesList.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select></div>
          </div>
          <div><label className="label">Meeting Link</label><input className="input" placeholder="https://zoom.us/j/…" value={liveForm.meetingLink} onChange={e => setLF(f => ({...f, meetingLink: e.target.value}))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Meeting ID</label><input className="input" placeholder="123 456 789" value={liveForm.meetingId} onChange={e => setLF(f => ({...f, meetingId: e.target.value}))} /></div>
            <div><label className="label">Password</label><input className="input" placeholder="passcode" value={liveForm.meetingPassword} onChange={e => setLF(f => ({...f, meetingPassword: e.target.value}))} /></div>
          </div>
          <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700 flex items-start gap-2">
            <Send className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Email with class details, meeting link, and password will be sent to all enrolled students automatically.</span>
          </div>
          <div className="flex gap-3">
            <button className="btn-secondary flex-1 justify-center" onClick={() => setLiveModal(false)}>Cancel</button>
            <button className="btn-primary flex-1 justify-center" onClick={() => createLiveMut.mutate()} disabled={!liveForm.title || !liveForm.scheduledAt || !liveForm.courseId || createLiveMut.isPending}>
              {createLiveMut.isPending ? 'Scheduling…' : 'Schedule & Email Students'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
