import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Play, Pencil, Trash2, Clock, Target,
  CheckCircle2, Award, BarChart3, Users, Eye, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { mockTestApi } from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';
import clsx from 'clsx';

const diffColors: Record<string,string> = {
  Easy: 'bg-green-100 text-green-700',
  Medium: 'bg-amber-100 text-amber-700',
  Hard: 'bg-red-100 text-red-700',
  Mixed: 'bg-blue-100 text-blue-700',
};

export default function MockTestsListPage() {
  const navigate  = useNavigate();
  const { user }  = useAuthStore();
  const qc        = useQueryClient();
  const isAdmin = ['SuperAdmin', 'OrgAdmin', 'Instructor'].includes(user?.role ?? '');

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', topic: 'General',
    difficulty: 'Mixed', timeLimitMins: '30',
    totalQuestions: '0', passMarkPercent: '60',
    randomizeQuestions: true, maxAttempts: '1',
  });

  const { data: tests = [], isLoading } = useQuery({
    queryKey: ['mock-tests', user?.organizationId],
    queryFn: () => mockTestApi.getAll({ orgId: user?.organizationId, status: isAdmin ? undefined : 'Published' }).then(r => r.data),
    enabled: !!user?.organizationId,
  });

  const createMut = useMutation({
    mutationFn: () => mockTestApi.create({
      ...form,
      timeLimitMins:    Number(form.timeLimitMins),
      totalQuestions:   Number(form.totalQuestions),
      passMarkPercent:  Number(form.passMarkPercent),
      maxAttempts:      Number(form.maxAttempts),
      organizationId:   user!.organizationId,
      createdById:      user!.id,
    }),
    onSuccess: (res: any) => {
      toast.success('Mock test created!');
      qc.invalidateQueries({ queryKey: ['mock-tests'] });
      setShowCreate(false);
      navigate(`/dashboard/mock-test-editor/${res.data.id}`);
    },
    onError: () => toast.error('Failed to create'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => mockTestApi.delete(id),
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['mock-tests'] }); },
  });

  const publishMut = useMutation({
    mutationFn: (id: number) => mockTestApi.publish(id),
    onSuccess: () => { toast.success('Test published — visible to students now!'); qc.invalidateQueries({ queryKey: ['mock-tests'] }); },
    onError: () => toast.error('Failed to publish'),
  });

  const testList = tests as any[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Target className="w-6 h-6" style={{color:'var(--org-primary)'}}/>
            {isAdmin ? 'Assessments Management' : 'Assessments'}
          </h1>
          <p className="page-sub">
            {isAdmin ? 'Create and manage assessment tests' : 'Practice tests with instant evaluation'}
          </p>
        </div>
        {isAdmin && (
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4"/> Create Mock Test
          </button>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-white rounded-2xl border-2 border-[var(--org-primary)]/30 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900">New Assessment</h3>
            <button onClick={() => setShowCreate(false)} className="p-2 rounded-xl hover:bg-gray-100"><X className="w-4 h-4"/></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Title *</label>
              <input className="input" placeholder="e.g. Full Stack Developer Assessment"
                value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))}/>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Description</label>
              <textarea className="input" rows={2} placeholder="What does this test assess?"
                value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))}/>
            </div>
            <div>
              <label className="label">Topic</label>
              <input className="input" placeholder="e.g. Web Development"
                value={form.topic} onChange={e => setForm(f => ({...f, topic: e.target.value}))}/>
            </div>
            <div>
              <label className="label">Difficulty</label>
              <select className="input" value={form.difficulty} onChange={e => setForm(f => ({...f, difficulty: e.target.value}))}>
                {['Easy','Medium','Hard','Mixed'].map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Time Limit (minutes)</label>
              <input className="input" type="number" min={5}
                value={form.timeLimitMins} onChange={e => setForm(f => ({...f, timeLimitMins: e.target.value}))}/>
            </div>
            <div>
              <label className="label">Total Questions</label>
              <input className="input" type="number" min={1}
                value={form.totalQuestions} onChange={e => setForm(f => ({...f, totalQuestions: e.target.value}))}/>
            </div>
            <div>
              <label className="label">Pass Mark %</label>
              <input className="input" type="number" min={1} max={100}
                value={form.passMarkPercent} onChange={e => setForm(f => ({...f, passMarkPercent: e.target.value}))}/>
            </div>
            <div>
              <label className="label">Max Attempts</label>
              <input className="input" type="number" min={1}
                value={form.maxAttempts} onChange={e => setForm(f => ({...f, maxAttempts: e.target.value}))}/>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="rand" checked={form.randomizeQuestions}
                onChange={e => setForm(f => ({...f, randomizeQuestions: e.target.checked}))}/>
              <label htmlFor="rand" className="text-sm font-medium text-gray-700 cursor-pointer">Randomize questions each attempt</label>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1 justify-center" onClick={() => setShowCreate(false)}>Cancel</button>
            <button className="btn-primary flex-1 justify-center" onClick={() => createMut.mutate()}
              disabled={!form.title || createMut.isPending}>
              {createMut.isPending ? 'Creating…' : 'Create & Add Questions →'}
            </button>
          </div>
        </div>
      )}

      {/* Test list */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(3)].map((_,i) => <div key={i} className="h-48 bg-gray-100 animate-pulse rounded-2xl"/>)}
        </div>
      ) : testList.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center">
          <Target className="w-14 h-14 mx-auto mb-4 text-gray-200"/>
          <p className="font-bold text-gray-500 text-lg">No assessments yet</p>
          {isAdmin && (
            <button className="btn-primary mt-4" onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4"/> Create First Mock Test
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {testList.map((t:any) => (
            <div key={t.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden">
              {/* Top bar */}
              <div className="h-1.5" style={{background:'linear-gradient(90deg,var(--org-primary),var(--org-secondary,var(--org-primary)))'}}/>

              <div className="p-5 flex-1">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm text-2xl"
                    style={{background:'linear-gradient(135deg,var(--org-primary),var(--org-secondary,var(--org-primary)))'}}>
                    🎯
                  </div>
                  <span className={clsx('text-xs font-bold px-2.5 py-1 rounded-full', diffColors[t.difficulty ?? 'Mixed'])}>
                    {t.difficulty}
                  </span>
                </div>

                <h3 className="font-bold text-gray-900 mb-1 leading-tight">{t.title}</h3>
                {t.description && (
                  <p className="text-xs text-gray-500 line-clamp-2 mb-3">{t.description}</p>
                )}

                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { label: 'Questions', value: t.totalQuestions },
                    { label: 'Time',      value: `${t.timeLimitMins}m` },
                    { label: 'Pass',      value: `${t.passMarkPercent}%` },
                  ].map(s => (
                    <div key={s.label} className="bg-gray-50 rounded-xl p-2 text-center border border-gray-100">
                      <p className="font-black text-gray-900 text-sm">{s.value}</p>
                      <p className="text-xs text-gray-400">{s.label}</p>
                    </div>
                  ))}
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
                    <Users className="w-3 h-3"/>
                    {t.attemptCount ?? 0} attempts
                    <span className={clsx('ml-auto px-2 py-0.5 rounded-full text-xs font-bold',
                      t.status === 'Published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                      {t.status}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="px-5 pb-5 space-y-2">
                {isAdmin ? (
                  <>
                    <button
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-all"
                      style={{background:'linear-gradient(135deg,var(--org-primary),var(--org-secondary,var(--org-primary)))'}}
                      onClick={() => navigate(`/dashboard/mock-test-editor/${t.id}`)}>
                      <Pencil className="w-4 h-4"/> Edit & Manage Questions
                    </button>
                    {t.status !== 'Published' && (
                      <button
                        className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-white bg-green-600 hover:bg-green-700 transition-all"
                        onClick={() => publishMut.mutate(t.id)} disabled={publishMut.isPending}>
                        <CheckCircle2 className="w-3.5 h-3.5"/> {publishMut.isPending ? 'Publishing…' : 'Publish — Make Visible to Students'}
                      </button>
                    )}
                    <div className="flex gap-2">
                      <button
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-all"
                        onClick={() => navigate(`/dashboard/${t.questionTypes?.includes('Coding') ? 'coding-exam' : 'mock-test'}/${t.id}`)}>
                        <Eye className="w-3.5 h-3.5"/> Preview
                      </button>
                      <button
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 border border-red-200 transition-all"
                        onClick={() => { if(confirm('Delete this test?')) deleteMut.mutate(t.id); }}>
                        <Trash2 className="w-3.5 h-3.5"/> Delete
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-all"
                    style={{background:'linear-gradient(135deg,var(--org-primary),var(--org-secondary,var(--org-primary)))'}}
                    onClick={() => navigate(`/dashboard/${t.questionTypes?.includes('Coding') ? 'coding-exam' : 'mock-test'}/${t.id}`)}>
                    <Play className="w-4 h-4"/> Start Test
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
