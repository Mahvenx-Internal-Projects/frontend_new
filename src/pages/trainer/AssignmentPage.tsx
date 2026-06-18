import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Trash2, Pencil, Send, CheckCircle2, Clock,
  FileText, Upload, Download, MessageSquare, X,
  ChevronDown, ChevronUp, AlertCircle, Users
} from 'lucide-react';
import toast from 'react-hot-toast';
import { assignmentsApi, coursesApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import clsx from 'clsx';

const statusColors: Record<string,string> = {
  Pending:   'bg-gray-100 text-gray-600',
  Submitted: 'bg-blue-100 text-blue-700',
  Graded:    'bg-green-100 text-green-700',
  Returned:  'bg-amber-100 text-amber-700',
  Overdue:   'bg-red-100 text-red-700',
};

export default function AssignmentPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const isInstructor = user?.role !== 'Student';

// Line 25
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number|null>(null);
  const [expandedId, setExpandedId] = useState<number|null>(null);
  const [selectedCourse, setSelectedCourse] = useState<number>(0); // Changed from null to 0
  const [gradeModal, setGradeModal] = useState<any|null>(null);
  const [form, setForm] = useState({
    title: '', description: '', maxMarks: '100',
    dueDate: '', courseId: '', attachmentUrl: ''
  });

  const [gradeForm, setGradeForm] = useState({
    marks: '', feedback: '', status: 'Graded'
  });

  // Data
  const { data: courses = [] } = useQuery({
    queryKey: ['my-courses', user?.id],
    queryFn: () => coursesApi.getAll({ instructorId: user?.id, size: 100 }).then(r => (r.data as any).items ?? r.data),
    enabled: !!user?.id && isInstructor,
  });

  // Line 41
  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['assignments', selectedCourse, user?.id],
    queryFn: () => {
      if (isInstructor) {
        // Automatically passes either the specific course ID or 0 for "All Courses"
        return assignmentsApi.getByCourse(selectedCourse).then(r => r.data).catch(() => []);
      } else {
        return assignmentsApi.getForStudent(user!.id).then(r => r.data);
      }
    },
    enabled: !!user,
  });

  const { data: submissions = [], refetch: refetchSubs } = useQuery({
    queryKey: ['submissions', expandedId],
    queryFn: () => assignmentsApi.getSubmissions(expandedId!).then(r => r.data),
    enabled: !!expandedId && isInstructor,
  });

  const createMut = useMutation({
    mutationFn: () => assignmentsApi.create({
      title: form.title,
      description: form.description,
      attachmentUrl: form.attachmentUrl,
      // If the due date is empty, it sends null instead of an empty string ""
      dueDate: form.dueDate ? form.dueDate : null, 
      maxMarks: Number(form.maxMarks),
      courseId: Number(form.courseId),
      // CHANGED: We renamed 'instructorId' to 'createdById' to match C#
      createdById: user!.id 
    }),
    onSuccess: () => { 
      toast.success('Assignment created & students notified!'); 
      qc.invalidateQueries({queryKey:['assignments']}); 
      setShowForm(false); 
      setForm({title:'',description:'',maxMarks:'100',dueDate:'',courseId:'',attachmentUrl:''}); 
    },
    onError: () => toast.error('Failed to create'),
  });

  const updateMut = useMutation({
    mutationFn: () => assignmentsApi.update(editingId!, {
      title: form.title,
      description: form.description,
      attachmentUrl: form.attachmentUrl,
      dueDate: form.dueDate ? form.dueDate : null,
      maxMarks: Number(form.maxMarks),
      courseId: Number(form.courseId),
      createdById: user!.id // Aligns with the C# backend DTO fields
    }),
    onSuccess: () => { 
      toast.success('Updated!'); 
      qc.invalidateQueries({queryKey:['assignments']}); 
      setEditingId(null); 
      setShowForm(false); 
    },
    onError: () => toast.error('Failed to update assignment'),
  });

  const deleteMut = useMutation({
    mutationFn: (id:number) => assignmentsApi.delete(id),
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({queryKey:['assignments']}); },
  });

  const gradeMut = useMutation({
    mutationFn: () => assignmentsApi.grade({
      submissionId: gradeModal.id,
      marksObtained: Number(gradeForm.marks), // <-- CHANGED: Matches C# GradeSubmissionRequest DTO exactly
      feedback: gradeForm.feedback,
      status: gradeForm.status,
    }),
    onSuccess: () => { 
      toast.success('Graded & student notified!'); 
      refetchSubs(); 
      setGradeModal(null); 
    },
    onError: () => toast.error('Failed to grade assignment execution context'),
  });

  const startEdit = (a: any) => {
    setForm({ title: a.title, description: a.description, maxMarks: String(a.maxMarks), dueDate: a.dueDate?.slice(0,16) ?? '', courseId: String(a.courseId), attachmentUrl: a.attachmentUrl ?? '' });
    setEditingId(a.id);
    setShowForm(true);
  };

  const aList = assignments as any[];
  const pending   = aList.filter(a => a.status === 'Pending' || !a.status);
  const submitted = aList.filter(a => a.status === 'Submitted');
  const graded    = aList.filter(a => a.status === 'Graded' || a.status === 'Returned');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <FileText className="w-6 h-6" style={{color:'var(--org-primary)'}}/>
            Assignments
          </h1>
          <p className="page-sub">{isInstructor ? 'Create, grade and manage assignments' : 'View and submit your assignments'}</p>
        </div>
        {isInstructor && (
          <button className="btn-primary" onClick={() => { setShowForm(true); setEditingId(null); setForm({title:'',description:'',maxMarks:'100',dueDate:'',courseId:'',attachmentUrl:''}); }}>
            <Plus className="w-4 h-4"/> Create Assignment
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {label:'Total',     value: aList.length,      color:'text-blue-600',  bg:'bg-blue-50'  },
          {label:'Submitted', value: submitted.length,  color:'text-amber-600', bg:'bg-amber-50' },
          {label:'Graded',    value: graded.length,     color:'text-green-600', bg:'bg-green-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <p className={clsx('text-3xl font-black', s.color)}>{s.value}</p>
            <p className="text-xs text-gray-500 font-semibold mt-1">{s.label}</p>
          </div>
        ))}
      </div>
      
      {/* Course filter (instructor) */}
      {isInstructor && (courses as any[]).length > 0 && (
        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold text-gray-600">Filter by Course:</label>
          <select 
            className="input w-64" 
            value={selectedCourse} 
            onChange={e => setSelectedCourse(Number(e.target.value))}
          >
            <option value={0}>All Courses</option>
            {(courses as any[]).map((c:any) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>
      )}

      {/* Create / Edit form */}
      {showForm && (
        <div className="bg-white rounded-2xl border-2 border-[var(--org-primary)]/30 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900">{editingId ? 'Edit Assignment' : 'New Assignment'}</h3>
            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="p-2 rounded-xl hover:bg-gray-100"><X className="w-4 h-4"/></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Title *</label>
              <input className="input" placeholder="e.g. Module 1 Exercise — Variables & Loops"
                value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))}/>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Description / Instructions</label>
              <textarea className="input min-h-[100px]" placeholder="Describe the assignment, what students need to submit, grading criteria…"
                value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))}/>
            </div>
            <div>
              <label className="label">Course *</label>
              <select className="input" value={form.courseId} onChange={e => setForm(f => ({...f, courseId: e.target.value}))}>
                <option value="">Select course…</option>
                {(courses as any[]).map((c:any) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Max Marks</label>
              <input className="input" type="number" min={1} value={form.maxMarks} onChange={e => setForm(f => ({...f, maxMarks: e.target.value}))}/>
            </div>
            <div>
              <label className="label">Due Date & Time</label>
              <input className="input" type="datetime-local" value={form.dueDate} onChange={e => setForm(f => ({...f, dueDate: e.target.value}))}/>
            </div>
            <div>
              <label className="label">Reference File URL <span className="font-normal text-gray-400">(optional)</span></label>
              <input className="input" type="url" placeholder="https://drive.google.com/…"
                value={form.attachmentUrl} onChange={e => setForm(f => ({...f, attachmentUrl: e.target.value}))}/>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1 justify-center" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</button>
            <button className="btn-primary flex-1 justify-center"
              onClick={() => editingId ? updateMut.mutate() : createMut.mutate()}
              disabled={!form.title || !form.courseId || createMut.isPending || updateMut.isPending}>
              <Send className="w-4 h-4"/>
              {(createMut.isPending || updateMut.isPending) ? 'Saving…' : editingId ? 'Update Assignment' : 'Create & Notify Students'}
            </button>
          </div>
        </div>
      )}

      {/* Assignment list */}
      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_,i) => <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-2xl"/>)}</div>
      ) : aList.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center">
          <FileText className="w-14 h-14 mx-auto mb-4 text-gray-200"/>
          <p className="font-bold text-gray-500 text-lg">No assignments yet</p>
          {isInstructor && <button className="btn-primary mt-4" onClick={() => setShowForm(true)}><Plus className="w-4 h-4"/> Create First Assignment</button>}
        </div>
      ) : (
        <div className="space-y-3">
          {aList.map((a:any) => {
            const isExpanded = expandedId === a.id;
            const isOverdue  = a.dueDate && new Date(a.dueDate) < new Date() && a.status !== 'Graded';
            return (
              <div key={a.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4 p-5">
                  {/* Icon */}
                  <div className={clsx('w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0',
                    a.status==='Graded'?'bg-green-100':a.status==='Submitted'?'bg-blue-100':isOverdue?'bg-red-100':'bg-gray-100')}>
                    {a.status==='Graded'?<CheckCircle2 className="w-6 h-6 text-green-600"/>:
                     a.status==='Submitted'?<Upload className="w-6 h-6 text-blue-600"/>:
                     isOverdue?<AlertCircle className="w-6 h-6 text-red-500"/>:
                     <FileText className="w-6 h-6 text-gray-400"/>}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={clsx('text-xs font-bold px-2 py-0.5 rounded-full', statusColors[a.status ?? 'Pending'])}>
                        {isOverdue && a.status !== 'Graded' ? 'Overdue' : (a.status ?? 'Pending')}
                      </span>
                      {a.courseTitle && <span className="text-xs text-gray-400">{a.courseTitle}</span>}
                      <span className="text-xs font-bold text-gray-500 ml-auto">{a.maxMarks} marks</span>
                    </div>
                    <h3 className="font-bold text-gray-900 text-base">{a.title}</h3>
                    {a.description && <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{a.description}</p>}
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-gray-400">
                      {a.dueDate && (
                        <span className={clsx('flex items-center gap-1', isOverdue && 'text-red-500 font-semibold')}>
                          <Clock className="w-3 h-3"/>
                          Due: {new Date(a.dueDate).toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}
                        </span>
                      )}
                      {isInstructor && a.submissionCount != null && (
                        <span className="flex items-center gap-1"><Users className="w-3 h-3"/> {a.submissionCount} submissions</span>
                      )}
                      {!isInstructor && a.marksObtained != null && (
                        <span className="flex items-center gap-1 text-green-600 font-bold">
                          <CheckCircle2 className="w-3 h-3"/> Score: {a.marksObtained}/{a.maxMarks}
                        </span>
                      )}
                    </div>
                    {/* Student feedback */}
                    {!isInstructor && a.feedback && (
                      <div className="mt-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-xs text-blue-800">
                        💬 <strong>Instructor feedback:</strong> {a.feedback}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {isInstructor ? (
                      <>
                        <button onClick={() => { setExpandedId(isExpanded ? null : a.id); }}
                          className={clsx('flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all',
                            isExpanded ? 'border-[var(--org-primary)] text-[var(--org-primary)] bg-[var(--org-primary)]/10' : 'border-gray-200 text-gray-600')}>
                          <Users className="w-3.5 h-3.5"/> Submissions {isExpanded ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}
                        </button>
                        <button onClick={() => startEdit(a)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200">
                          <Pencil className="w-3.5 h-3.5"/> Edit
                        </button>
                        <button onClick={() => { if(confirm('Delete?')) deleteMut.mutate(a.id); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 border border-red-200">
                          <Trash2 className="w-3.5 h-3.5"/> Delete
                        </button>
                      </>
                    ) : (
                      a.status === 'Pending' || a.status === 'Returned' ? (
                        <StudentSubmitButton assignment={a} onSubmitted={() => qc.invalidateQueries({queryKey:['assignments']})}/>
                      ) : a.attachmentUrl && (
                        <a href={a.attachmentUrl} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-600 bg-gray-50 border border-gray-200 hover:bg-gray-100">
                          <Download className="w-3.5 h-3.5"/> Reference
                        </a>
                      )
                    )}
                  </div>
                </div>

                {/* Instructor: submissions list */}
                {isInstructor && isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50">
                    <div className="px-5 py-2 text-xs font-bold text-gray-500 uppercase tracking-wide">
                      Submissions ({(submissions as any[]).length})
                    </div>
                    {(submissions as any[]).length === 0 ? (
                      <p className="px-5 pb-4 text-sm text-gray-400">No submissions yet</p>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {(submissions as any[]).map((sub:any) => (
                          <div key={sub.id} className="flex items-center gap-4 px-5 py-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                              style={{background:'linear-gradient(135deg,var(--org-primary),var(--org-secondary,var(--org-primary)))'}}>
                              {sub.studentName?.[0] ?? '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-800">{sub.studentName}</p>
                              <p className="text-xs text-gray-400">
                                Submitted {new Date(sub.submittedAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
                              </p>
                              {sub.feedback && <p className="text-xs text-blue-600 mt-0.5">💬 {sub.feedback}</p>}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {sub.fileUrl && (
                                <a href={sub.fileUrl} target="_blank" rel="noreferrer"
                                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold text-purple-600 bg-purple-50 border border-purple-200 hover:bg-purple-100">
                                  <Download className="w-3 h-3"/> View
                                </a>
                              )}
                              {sub.marks != null ? (
                                <span className="text-xs font-black text-green-700 bg-green-100 px-2 py-1 rounded-lg">
                                  {sub.marks}/{a.maxMarks}
                                </span>
                              ) : (
                                <button onClick={() => { setGradeModal(sub); setGradeForm({marks:'', feedback:'', status:'Graded'}); }}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90"
                                  style={{background:'linear-gradient(135deg,var(--org-primary),var(--org-secondary,var(--org-primary)))'}}>
                                  <MessageSquare className="w-3 h-3"/> Grade
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Grade modal */}
      {gradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Grade Submission</h3>
              <button onClick={() => setGradeModal(null)} className="p-2 rounded-xl hover:bg-gray-100"><X className="w-4 h-4"/></button>
            </div>
            <p className="text-sm text-gray-500">Student: <strong>{gradeModal.studentName}</strong></p>
            <div>
              <label className="label">Marks *</label>
              <input className="input" type="number" min={0} placeholder="e.g. 85"
                value={gradeForm.marks} onChange={e => setGradeForm(f => ({...f, marks: e.target.value}))}/>
            </div>
            <div>
              <label className="label">Feedback / Comments</label>
              <textarea className="input min-h-[100px]" placeholder="Great work on the first part, however improve the error handling section…"
                value={gradeForm.feedback} onChange={e => setGradeForm(f => ({...f, feedback: e.target.value}))}/>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={gradeForm.status} onChange={e => setGradeForm(f => ({...f, status: e.target.value}))}>
                <option value="Graded">Graded ✅</option>
                <option value="Returned">Returned for revision ↩️</option>
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button className="btn-secondary flex-1 justify-center" onClick={() => setGradeModal(null)}>Cancel</button>
              <button className="btn-primary flex-1 justify-center" onClick={() => gradeMut.mutate()}
                disabled={!gradeForm.marks || gradeMut.isPending}>
                <Send className="w-4 h-4"/>
                {gradeMut.isPending ? 'Saving…' : 'Submit Grade & Notify'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Student submit button ─────────────────────────────────────
function StudentSubmitButton({ assignment, onSubmitted }: { assignment: any; onSubmitted: () => void }) {
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ notes: '', fileUrl: '' });

  const submitMut = useMutation({
    mutationFn: () => assignmentsApi.submit({
      assignmentId: assignment.id,
      studentId: user!.id,
      // CHANGED: Match 'SubmissionText' which your C# backend requires
      submissionText: form.notes, 
      fileUrl: form.fileUrl,
    }),  
    onSuccess: () => { 
      toast.success('Submitted! Instructor notified.'); 
      setOpen(false); 
      onSubmitted(); 
    },
    onError: () => toast.error('Submission failed'),
  });

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white hover:opacity-90 transition-all"
      style={{background:'linear-gradient(135deg,var(--org-primary),var(--org-secondary,var(--org-primary)))'}}>
      <Upload className="w-3.5 h-3.5"/>
      {assignment.status === 'Returned' ? 'Resubmit' : 'Submit'}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Submit Assignment</h3>
          <button onClick={() => setOpen(false)} className="p-2 rounded-xl hover:bg-gray-100"><X className="w-4 h-4"/></button>
        </div>
        <p className="text-sm font-semibold text-gray-700">{assignment.title}</p>
        <div>
          <label className="label">File / Work URL *</label>
          <input className="input" type="url" placeholder="Google Drive / GitHub / any file link"
            value={form.fileUrl} onChange={e => setForm(f => ({...f, fileUrl: e.target.value}))}/>
        </div>
        <div>
          <label className="label">Notes <span className="font-normal text-gray-400">(optional)</span></label>
          <textarea className="input" rows={3} placeholder="Any notes for your instructor…"
            value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))}/>
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary flex-1 justify-center" onClick={() => setOpen(false)}>Cancel</button>
          <button className="btn-primary flex-1 justify-center" onClick={() => submitMut.mutate()}
            disabled={!form.fileUrl || submitMut.isPending}>
            <Upload className="w-4 h-4"/>
            {submitMut.isPending ? 'Submitting…' : 'Submit Assignment'}
          </button>
        </div>
      </div>
    </div>
  );
}
