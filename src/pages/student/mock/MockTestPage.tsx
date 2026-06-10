import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Clock, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Flag, Award } from 'lucide-react';
import toast from 'react-hot-toast';
import { mockTestApi } from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';
import clsx from 'clsx';

type Phase = 'info' | 'taking' | 'result';

export default function MockTestPage() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [phase, setPhase] = useState<Phase>('info');
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [timeLimitSecs, setTimeLimitSecs] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [current, setCurrent] = useState(0);
  // answers: questionId → single optionId OR Set<optionId> (multi) OR text string
  const [answers, setAnswers] = useState<Record<number, number | Set<number> | string | null>>({});
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [result, setResult] = useState<any>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: test } = useQuery({
    queryKey: ['mocktest-info', testId],
    queryFn: () => mockTestApi.get(Number(testId)).then((r: any) => r.data),
    enabled: !!testId,
  });

  const startMut = useMutation({
    mutationFn: () => mockTestApi.start({ mockTestId: Number(testId), studentId: user!.id }),
    onSuccess: (res: any) => {
      setAttemptId(res.data.attemptId);
      setQuestions(res.data.questions);
      setTimeLimitSecs(res.data.timeLimitMins * 60);
      setTimeLeft(res.data.timeLimitMins * 60);
      setStartTime(Date.now());
      setPhase('taking');
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Could not start'),
  });

  const submitMut = useMutation({
    mutationFn: () => {
      const timeTaken = Math.round((Date.now() - startTime) / 1000);
      const answersList = questions.map(q => {
        const ans = answers[q.id];
        if (q.questionType === 'MultiChoice' && ans instanceof Set)
          return { questionId: q.id, selectedOptionIds: [...ans] };
        if (q.questionType === 'ShortAnswer' || q.questionType === 'Formula')
          return { questionId: q.id, textAnswer: typeof ans === 'string' ? ans : '' };
        return { questionId: q.id, selectedOptionId: typeof ans === 'number' ? ans : null };
      });
      return mockTestApi.submit({ attemptId: attemptId!, answers: answersList, timeTakenSecs: timeTaken });
    },
    onSuccess: (res: any) => {
      if (timerRef.current) clearInterval(timerRef.current);
      setResult(res.data);
      setPhase('result');
    },
    onError: () => toast.error('Submission failed'),
  });

  useEffect(() => {
    if (phase !== 'taking') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          toast('Time\'s up! Auto-submitting…', { icon: '⏰' });
          submitMut.mutate();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  const fmt = (s: number) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
  const q = questions[current];

  const setAnswer = (qId: number, value: number | Set<number> | string | null) =>
    setAnswers(prev => ({ ...prev, [qId]: value }));

  const toggleFlag = (qId: number) => setFlagged(prev => {
    const n = new Set(prev); n.has(qId) ? n.delete(qId) : n.add(qId); return n;
  });

  const answeredCount = questions.filter(q => {
    const a = answers[q.id];
    if (a === null || a === undefined) return false;
    if (a instanceof Set) return a.size > 0;
    if (typeof a === 'string') return a.trim().length > 0;
    return true;
  }).length;

  const rc = result?.readiness === 'Ready' ? '#10b981' : result?.readiness === 'NeedsPractice' ? '#f59e0b' : '#ef4444';

  // ─── INFO SCREEN ──────────────────────────────────────────
  if (phase === 'info') return (
    <div className="max-w-xl mx-auto space-y-5">
      <button className="btn-ghost" onClick={() => navigate(-1)}><ChevronLeft className="w-4 h-4" /> Back</button>
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 text-center">
        <div className="w-20 h-20 rounded-3xl mx-auto flex items-center justify-center shadow-xl mb-5"
          style={{ background: 'linear-gradient(135deg,var(--org-primary),var(--org-secondary))' }}>
          <Award className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-2xl font-black text-gray-900 mb-2">{test?.title}</h1>
        {test?.description && <div className="text-gray-500 text-sm mb-5 prose prose-sm" dangerouslySetInnerHTML={{ __html: test.description }} />}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Questions', value: test?.totalQuestions ?? 0 },
            { label: 'Time', value: `${test?.timeLimitMins ?? 0} min` },
            { label: 'Pass Mark', value: `${test?.passMarkPercent ?? 0}%` },
          ].map(s => (
            <div key={s.label} className="bg-gray-50 rounded-2xl p-4">
              <p className="text-2xl font-black text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-700 text-left space-y-1.5 mb-6">
          <p className="font-bold">📋 Instructions:</p>
          <p>• {test?.maxAttempts} attempt(s) allowed</p>
          <p>• Timer starts immediately</p>
          <p>• You can flag questions for later review</p>
          {test?.randomizeQuestions && <p>• Questions are randomized each attempt</p>}
        </div>
        <button className="btn-primary w-full justify-center py-3.5 text-base font-black"
          onClick={() => startMut.mutate()} disabled={startMut.isPending}>
          {startMut.isPending ? 'Starting…' : 'Start Mock Test 🚀'}
        </button>
      </div>
    </div>
  );

  // ─── RESULT SCREEN ────────────────────────────────────────
  if (phase === 'result' && result) return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 text-center">
        <div className="w-24 h-24 rounded-full mx-auto flex items-center justify-center shadow-2xl mb-5"
          style={{ background: result.passed ? 'linear-gradient(135deg,#10b981,#059669)' : 'linear-gradient(135deg,#ef4444,#dc2626)' }}>
          {result.passed ? <CheckCircle2 className="w-12 h-12 text-white" /> : <XCircle className="w-12 h-12 text-white" />}
        </div>
        <h1 className="text-3xl font-black text-gray-900 mb-1">{result.passed ? 'Well Done! 🎉' : 'Keep Practicing!'}</h1>
        <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold mb-6 mt-2"
          style={{ background: `${rc}20`, color: rc, border: `2px solid ${rc}40` }}>
          {result.readiness === 'Ready' ? '✅ Interview Ready' : result.readiness === 'NeedsPractice' ? '⚡ Needs Practice' : '📚 Keep Studying'}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Score', value: `${result.scorePct}%`, highlight: true },
            { label: 'Marks', value: `${result.net}/${result.totalMarks}` },
            { label: 'Rank', value: `#${result.rank}` },
            { label: 'Negative', value: `-${result.negativeMarks}` },
          ].map(s => (
            <div key={s.label} className={clsx('rounded-2xl p-4', s.highlight ? 'text-white' : 'bg-gray-50')}
              style={s.highlight ? { background: 'linear-gradient(135deg,var(--org-primary),var(--org-secondary))' } : {}}>
              <p className={clsx('text-2xl font-black', s.highlight ? 'text-white' : 'text-gray-900')}>{s.value}</p>
              <p className={clsx('text-xs mt-1', s.highlight ? 'text-white/70' : 'text-gray-500')}>{s.label}</p>
            </div>
          ))}
        </div>
        <div className="h-4 bg-gray-100 rounded-full overflow-hidden mb-6">
          <div className="h-full rounded-full transition-all duration-1000"
            style={{ width: `${result.scorePct}%`, background: 'linear-gradient(90deg,var(--org-primary),var(--org-secondary))' }} />
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary flex-1 justify-center" onClick={() => navigate('/dashboard/mock-tests')}>All Tests</button>
          <button className="btn-primary flex-1 justify-center" onClick={() => navigate(`/dashboard/mock-analysis/${user?.id}`)}>View Analysis →</button>
        </div>
      </div>
    </div>
  );

  // ─── TEST TAKING ──────────────────────────────────────────
  if (!q) return null;

  const renderQuestionInput = (q: any) => {
    const ans = answers[q.id];

    switch (q.questionType) {
      case 'SingleChoice':
      case 'Dropdown':
      case 'TrueFalse':
        if (q.questionType === 'Dropdown') return (
          <select className="input text-base py-3" value={typeof ans === 'number' ? ans : ''}
            onChange={e => setAnswer(q.id, Number(e.target.value) || null)}>
            <option value="">— Select answer —</option>
            {q.options.map((o: any) => <option key={o.id} value={o.id}>{o.text}</option>)}
          </select>
        );
        return (
          <div className="space-y-2.5">
            {q.options.map((opt: any) => {
              const sel = ans === opt.id;
              return (
                <button key={opt.id} onClick={() => setAnswer(q.id, sel ? null : opt.id)}
                  className={clsx('w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 text-left transition-all',
                    sel ? 'text-white border-transparent shadow-md' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50')}
                  style={sel ? { background: 'linear-gradient(135deg,var(--org-primary),var(--org-secondary))' } : {}}>
                  <div className={clsx('w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                    sel ? 'bg-white/30 border-white' : 'border-gray-300')}>
                    {sel && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  {opt.imageUrl && <img src={opt.imageUrl} alt="" className="h-10 rounded-lg object-cover flex-shrink-0" />}
                  <span className={clsx('text-sm font-medium', sel ? 'text-white' : 'text-gray-700')}>{opt.text}</span>
                </button>
              );
            })}
          </div>
        );

      case 'MultiChoice': {
        const selected = (ans instanceof Set) ? ans : new Set<number>();
        return (
          <div className="space-y-2.5">
            <p className="text-xs text-gray-500 mb-2">Select all correct answers</p>
            {q.options.map((opt: any) => {
              const checked = selected.has(opt.id);
              return (
                <button key={opt.id}
                  onClick={() => {
                    const newSet = new Set(selected);
                    checked ? newSet.delete(opt.id) : newSet.add(opt.id);
                    setAnswer(q.id, newSet);
                  }}
                  className={clsx('w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 text-left transition-all',
                    checked ? 'text-white border-transparent shadow-md' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50')}
                  style={checked ? { background: 'linear-gradient(135deg,var(--org-primary),var(--org-secondary))' } : {}}>
                  <div className={clsx('w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0',
                    checked ? 'bg-white/30 border-white' : 'border-gray-300')}>
                    {checked && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </div>
                  {opt.imageUrl && <img src={opt.imageUrl} alt="" className="h-10 rounded-lg object-cover flex-shrink-0" />}
                  <span className={clsx('text-sm font-medium', checked ? 'text-white' : 'text-gray-700')}>{opt.text}</span>
                </button>
              );
            })}
          </div>
        );
      }

      case 'ShortAnswer':
        return (
          <textarea className="input min-h-[100px] text-base" placeholder="Type your answer here…"
            value={typeof ans === 'string' ? ans : ''}
            onChange={e => setAnswer(q.id, e.target.value)} />
        );

      case 'Formula':
        return (
          <div className="space-y-3">
            {q.formulaLatex && (
              <div className="bg-gray-900 text-green-400 font-mono text-sm rounded-xl p-4 break-all">
                <p className="text-xs text-gray-500 mb-1">Formula:</p>
                {q.formulaLatex}
              </div>
            )}
            <textarea className="input min-h-[80px] font-mono" placeholder="Enter your answer or formula…"
              value={typeof ans === 'string' ? ans : ''}
              onChange={e => setAnswer(q.id, e.target.value)} />
          </div>
        );

      default: return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Timer header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-black text-gray-900 text-sm">{test?.title}</h2>
          <p className="text-xs text-gray-400">Q{current+1}/{questions.length} · {answeredCount} answered</p>
        </div>
        <div className="flex items-center gap-4">
          <div className={clsx('flex items-center gap-2 font-mono text-2xl font-black px-4 py-2 rounded-xl',
            timeLeft < 120 ? 'bg-red-50 text-red-600' : timeLeft < 300 ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-900')}>
            <Clock className="w-5 h-5" /> {fmt(timeLeft)}
          </div>
          <button className="btn-primary text-sm" disabled={submitMut.isPending}
            onClick={() => { if(confirm(`Submit with ${questions.length - answeredCount} unanswered?`)) submitMut.mutate(); }}>
            {submitMut.isPending ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Question panel */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-start gap-3 mb-5">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-black flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,var(--org-primary),var(--org-secondary))' }}>
                {current+1}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">{q.topic}</span>
                  <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">{q.questionType}</span>
                  <span className="text-xs text-gray-400">{q.marks} mark{q.marks!==1?'s':''}</span>
                </div>
                <p className="text-gray-900 font-semibold text-base leading-relaxed">{q.text}</p>
                {q.imageUrl && <img src={q.imageUrl} alt="Question" className="mt-3 rounded-xl max-h-60 object-contain border border-gray-200" />}
                {q.formulaLatex && q.questionType !== 'Formula' && (
                  <div className="mt-2 bg-gray-900 text-green-400 font-mono text-sm rounded-xl p-3">{q.formulaLatex}</div>
                )}
              </div>
              <button onClick={() => toggleFlag(q.id)}
                className={clsx('p-2 rounded-xl transition-all flex-shrink-0', flagged.has(q.id) ? 'bg-amber-100 text-amber-600' : 'hover:bg-gray-100 text-gray-400')}>
                <Flag className="w-4 h-4" />
              </button>
            </div>

            {renderQuestionInput(q)}
          </div>

          <div className="flex justify-between gap-4">
            <button className="btn-secondary" disabled={current===0} onClick={() => setCurrent(c=>c-1)}>
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            {current < questions.length-1
              ? <button className="btn-primary" onClick={() => setCurrent(c=>c+1)}>Next <ChevronRight className="w-4 h-4" /></button>
              : <button className="btn-primary bg-green-600" onClick={() => { if(confirm('Submit test?')) submitMut.mutate(); }}>Submit ✓</button>
            }
          </div>
        </div>

        {/* Palette */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sticky top-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Questions</p>
            <div className="grid grid-cols-5 gap-1.5 mb-4">
              {questions.map((_: any, i: number) => {
                const qItem = questions[i];
                const ans = answers[qItem.id];
                const isAnswered = ans !== null && ans !== undefined && !(ans instanceof Set && (ans as Set<number>).size === 0) && ans !== '';
                const isFlagged  = flagged.has(qItem.id);
                const isActive   = i === current;
                return (
                  <button key={i} onClick={() => setCurrent(i)}
                    className={clsx('h-8 rounded-lg text-xs font-bold transition-all',
                      isActive ? 'text-white scale-110' :
                      isFlagged ? 'bg-amber-100 text-amber-700' :
                      isAnswered ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}
                    style={isActive ? { background: 'linear-gradient(135deg,var(--org-primary),var(--org-secondary))' } : {}}>
                    {i+1}
                  </button>
                );
              })}
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-green-100" /><span className="text-gray-500">Answered</span></div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-gray-100" /><span className="text-gray-500">Not answered</span></div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-amber-100" /><span className="text-gray-500">Flagged</span></div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 text-center">
              <p className="text-2xl font-black text-gray-900">{answeredCount}/{questions.length}</p>
              <p className="text-xs text-gray-400">Answered</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
