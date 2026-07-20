import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Clock, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Flag, Award, Maximize, AlertTriangle, BarChart3, Code2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { mockTestApi } from '../../../services/api';
import { judgeApi } from '../../../services/api';
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
  const [answers, setAnswers] = useState<Record<number, number | Set<number> | string | null>>({});
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  // Compiler state for Q19/Q20 (uses Judge0 free API)
  const [codeMap,    setCodeMap]    = useState<Record<number, string>>({});
  const [langMap,    setLangMap]    = useState<Record<number, string>>({});
  const [runResults, setRunResults] = useState<Record<number, any>>({});
  const [runningId,  setRunningId]  = useState<number | null>(null);
  const [runInput,   setRunInput]   = useState<Record<number, string>>({});
  const [result, setResult] = useState<any>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [tabWarning, setTabWarning] = useState(false);
  const [tabViolations, setTabViolations] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const submitMutRef = useRef<any>(null);

  const [startError, setStartError] = useState<string | null>(null);

  const { data: test } = useQuery({
    queryKey: ['mocktest-info', testId],
    queryFn: () => mockTestApi.get(Number(testId)).then((r: any) => r.data),
    enabled: !!testId,
  });

  const startMut = useMutation({
    mutationFn: () => mockTestApi.start({ mockTestId: Number(testId), studentId: user!.id }),
    onSuccess: (res: any) => {
      setStartError(null);
      setAttemptId(res.data.attemptId);
      setQuestions(res.data.questions);
      setTimeLimitSecs(res.data.timeLimitMins * 60);
      setTimeLeft(res.data.timeLimitMins * 60);
      setStartTime(Date.now());
      setPhase('taking');
      try { document.documentElement.requestFullscreen?.(); } catch {}
    },
    onError: (e: any) => {
      const msg = e.response?.data?.message ?? 'Could not start assessment';
      setStartError(msg);
      if (!msg.toLowerCase().includes('attempt')) toast.error(msg);
    },
  });

  const submitMut = useMutation({
    mutationFn: () => {
      const timeTaken = Math.round((Date.now() - startTime) / 1000);
      const answersList = questions.map(q => {
        const ans = answers[q.id];
        if (q.questionType === 'Coding')
          // Send marks:N if student ran code and got correct output, else empty
          return { questionId: q.id, textAnswer: typeof ans === 'string' && ans.startsWith('marks:') ? ans : '' };
        if (q.questionType === 'MultipleChoice' && ans instanceof Set)
          return { questionId: q.id, selectedOptionIds: [...ans] };
        if (q.questionType === 'ShortAnswer' || q.questionType === 'Formula')
          return { questionId: q.id, textAnswer: typeof ans === 'string' ? ans : '' };
        return { questionId: q.id, selectedOptionId: typeof ans === 'number' ? ans : null };
      });
      return mockTestApi.submit({ attemptId: attemptId!, answers: answersList, timeTakenSecs: timeTaken });
    },
    onSuccess: (res: any) => {
      if (timerRef.current) clearInterval(timerRef.current);
      // Exit fullscreen
      try { document.exitFullscreen?.(); } catch {}
      setResult(res.data);
      setPhase('result');
    },
    onError: () => toast.error('Submission failed'),
  });

  // Keep ref current so event handlers can call it
  useEffect(() => { submitMutRef.current = submitMut; }, [submitMut]);

  // ── Timer ──────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'taking') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          toast("Time's up! Auto-submitting…", { icon: '⏰' });
          submitMutRef.current?.mutate();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  // ── Tab-switch / visibility detection ─────────────────────
  useEffect(() => {
    if (phase !== 'taking') return;
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Don't trigger warning on coding questions — student may be running code
        const currentQ = questions[current];
        if (currentQ?.questionType === 'Coding') return;

        setTabViolations(v => {
          const next = v + 1;
          if (next >= 2) {
            toast.error('You left the assessment twice. Submitting automatically.', { duration: 4000 });
            submitMutRef.current?.mutate();
          } else {
            setTabWarning(true);
          }
          return next;
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [phase, current, questions]);

  // ── Fullscreen-exit detection ──────────────────────────────
  useEffect(() => {
    if (phase !== 'taking') return;
    const handleFsChange = () => {
      if (!document.fullscreenElement) {
        setTabWarning(true);
      }
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
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

  // ─── TAB WARNING OVERLAY ───────────────────────────────────
  const TabWarningOverlay = () => (
    <div className="fixed inset-0 z-[999] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-xl font-black text-gray-900 mb-2">⚠️ Warning!</h2>
        <p className="text-gray-600 mb-1">You left the assessment window.</p>
        <p className="text-sm text-red-600 font-semibold mb-6">
          {tabViolations >= 1
            ? 'Next violation will auto-submit your assessment!'
            : 'This is your first warning. One more and your exam will be submitted automatically.'}
        </p>
        <div className="flex gap-3">
          <button className="flex-1 btn-primary justify-center"
            onClick={() => {
              setTabWarning(false);
              try { document.documentElement.requestFullscreen?.(); } catch {}
            }}>
            <Maximize className="w-4 h-4" /> Return to Assessment
          </button>
          <button className="flex-1 btn-secondary justify-center text-red-500"
            onClick={() => { if (confirm('Are you sure you want to submit?')) submitMut.mutate(); }}>
            Submit Now
          </button>
        </div>
      </div>
    </div>
  );

  // ─── INFO SCREEN ──────────────────────────────────────────
  if (phase === 'info') return (
    <div className="max-w-xl mx-auto space-y-5">
      <button className="btn-ghost" onClick={() => navigate(-1)}><ChevronLeft className="w-4 h-4" /> Back</button>
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 text-center">
        <div className="w-20 h-20 rounded-3xl mx-auto flex items-center justify-center shadow-xl mb-5"
          style={{ background: 'linear-gradient(135deg,var(--org-primary),var(--org-secondary))' }}>
          <Award className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-2xl font-black text-gray-900 mb-1">{test?.title ?? 'Loading…'}</h1>

        {/* Status badge — warn if not published */}
        {test?.status && test.status !== 'Published' && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200 mb-3">
            <AlertTriangle className="w-3 h-3" />
            Status: {test.status} — must be Published for students to attempt
          </div>
        )}

        {test?.description && <div className="text-gray-500 text-sm mb-5 prose prose-sm" dangerouslySetInnerHTML={{ __html: test.description }} />}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Questions', value: test?.totalQuestions || '—' },
            { label: 'Time', value: test ? `${test.timeLimitMins} min` : '—' },
            { label: 'Attempts', value: test ? `${test.maxAttempts}` : '—' },
          ].map(s => (
            <div key={s.label} className="bg-gray-50 rounded-2xl p-4">
              <p className="text-2xl font-black text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-700 text-left space-y-1.5 mb-6">
          <p className="font-bold">📋 Instructions:</p>
          <p>• {test?.maxAttempts ?? 1} attempt(s) allowed</p>
          <p>• Timer starts immediately when you click Start</p>
          <p>• Assessment opens in fullscreen — do not exit</p>
          <p>• Switching tabs or windows will trigger a warning</p>
          <p>• 2nd tab switch = automatic submission</p>
          {test?.randomizeQuestions && <p>• Questions are randomized each attempt</p>}
        </div>

        {/* Error message */}
        {startError && (
          <div className={`flex items-start gap-3 rounded-2xl p-4 text-sm text-left mb-4 ${
            startError.toLowerCase().includes('attempt')
              ? 'bg-amber-50 border border-amber-200 text-amber-800'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold mb-0.5">
                {startError.toLowerCase().includes('attempt') ? '⛔ Attempts Exhausted' : 'Cannot Start Exam'}
              </p>
              <p>{startError}</p>
              {startError.toLowerCase().includes('attempt') && (
                <p className="text-xs mt-2 opacity-70">You have used all available attempts for this assessment. Contact your instructor if you need another attempt.</p>
              )}
            </div>
          </div>
        )}

        {/* Loading previous result */}
        {startError?.toLowerCase().includes('attempt') ? (
          /* Attempts exhausted — hide start, show navigation */
          <div className="space-y-3">
            <button className="btn-secondary w-full justify-center py-3"
              onClick={() => navigate(`/dashboard/mock-analysis/${user?.id}`)}>
              <BarChart3 className="w-4 h-4" /> View My Results
            </button>
            <button className="btn-ghost w-full justify-center text-sm text-gray-400"
              onClick={() => navigate(-1)}>
              ← Go Back
            </button>
          </div>
        ) : (
          <button className="btn-primary w-full justify-center py-3.5 text-base font-black"
            onClick={() => { setStartError(null); startMut.mutate(); }}
            disabled={startMut.isPending}>
            {startMut.isPending ? 'Starting…' : 'Start Assessment 🚀'}
          </button>
        )}
      </div>
    </div>
  );

  // ─── RESULT SCREEN — show thank you, NOT the score ──────
  if (phase === 'result' && result) return (
    <div className="max-w-xl mx-auto space-y-5 py-8">
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-10 text-center">
        <div className="w-24 h-24 rounded-full mx-auto flex items-center justify-center shadow-2xl mb-6"
          style={{ background: 'linear-gradient(135deg,var(--org-primary),var(--org-secondary))' }}>
          <CheckCircle2 className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-3xl font-black text-gray-900 mb-3">
          Thank You for Attending!
        </h1>
        <p className="text-gray-600 text-base leading-relaxed mb-2">
          You have successfully completed the <strong>{test?.title}</strong> assessment.
        </p>
        <p className="text-gray-600 text-base leading-relaxed mb-8">
          <strong>{user?.organizationName ?? 'Our team'}</strong> will review your performance and get back to you shortly. Please check your email for further updates.
        </p>
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 text-sm text-blue-800 text-left mb-8">
          <p className="font-bold mb-2">📧 What happens next?</p>
          <p>• You will receive an email with your assessment result within 30 minutes</p>
          <p>• Our team will contact you if you qualify for the next round</p>
          <p>• Keep an eye on your registered email inbox</p>
        </div>
        <button className="btn-primary w-full justify-center py-3.5 font-bold"
          onClick={() => navigate('/dashboard/my-courses')}>
          Back to My Courses
        </button>
      </div>
    </div>
  );

  // ─── TEST TAKING ──────────────────────────────────────────
  if (!q) return <div className="text-center py-20 text-gray-400">Loading assessment…</div>;

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
      case 'MultipleChoice': {
        const selected = (ans instanceof Set) ? ans : new Set<number>();
        return (
          <div className="space-y-2.5">
            <p className="text-xs text-gray-500 mb-2">Select all correct answers</p>
            {q.options.map((opt: any) => {
              const checked = selected.has(opt.id);
              return (
                <button key={opt.id}
                  onClick={() => { const newSet = new Set(selected); checked ? newSet.delete(opt.id) : newSet.add(opt.id); setAnswer(q.id, newSet); }}
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
        return <textarea className="input min-h-[100px] text-base" placeholder="Type your answer here…"
          value={typeof ans === 'string' ? ans : ''} onChange={e => setAnswer(q.id, e.target.value)} />;
      case 'Formula':
        return (
          <div className="space-y-3">
            {q.formulaLatex && <div className="bg-gray-900 text-green-400 font-mono text-sm rounded-xl p-4 break-all"><p className="text-xs text-gray-500 mb-1">Formula:</p>{q.formulaLatex}</div>}
            <textarea className="input min-h-[80px] font-mono" placeholder="Enter your answer or formula…"
              value={typeof ans === 'string' ? ans : ''} onChange={e => setAnswer(q.id, e.target.value)} />
          </div>
        );
      case 'Coding': {
        const cq   = q.codingQuestion;
        const lang = langMap[q.id] ?? 'js';
        const starterByLang: Record<string,string> = {
          js:     cq?.starterCodeJs     || "const lines = [];\nrequire('readline').createInterface({ input: process.stdin })\n  .on('line', l => lines.push(l.trim()))\n  .on('close', () => {\n    // Write your solution here\n    \n  });",
          python: cq?.starterCodePython || "s = input()\n# Write your solution here\n",
          java:   cq?.starterCodeJava   || "import java.util.Scanner;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Write your solution here\n    }\n}",
          cpp:    cq?.starterCodeCpp    || "#include <iostream>\nusing namespace std;\nint main() {\n    // Write your solution here\n    return 0;\n}",
        };
        const code = codeMap[q.id] ?? starterByLang[lang] ?? '// Write your solution here\n'
        const runRes   = runResults[q.id];
        const isRunning = runningId === q.id;

        const runCode = async () => {
          setRunningId(q.id);
          try {
            const stdin  = runInput[q.id] ?? cq?.sampleInput ?? '';
            const r      = await judgeApi.run(code, lang, stdin);
            const output = (r.data.stdout ?? '').trim();
            const expected = (cq?.sampleOutput ?? '').trim();
            const passed   = output === expected && r.data.status === 'Accepted';

            // Auto-calculate marks based on output match
            const autoMarks = passed ? q.marks : 0;

            setRunResults(p => ({
              ...p,
              [q.id]: {
                ...r.data,
                expected,
                passed,
                autoMarks,
              }
            }));

            // Save marks as answer so score is calculated on submit
            setAnswer(q.id, `marks:${autoMarks}`);

            if (passed) {
              toast.success(`✅ Correct! Output matches — ${autoMarks}/${q.marks} marks`);
            } else if (r.data.status === 'Accepted') {
              toast.error(`❌ Wrong output — 0/${q.marks} marks`);
            }
          } catch { toast.error('Execution failed'); }
          finally { setRunningId(null); }
        };

        return (
          <div className="space-y-0 -mx-6 -mb-6">
            <div className="flex" style={{ minHeight: '560px' }}>
              {/* LEFT: Problem */}
              <div className="overflow-y-auto p-5 border-r border-gray-200 bg-gray-50 text-sm" style={{ width: '45%', flexShrink: 0 }}>
                {cq?.problemStatement && (
                  <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: cq.problemStatement }}/>
                )}
                {cq?.constraints && (
                  <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">Constraints</p>
                    <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono">{cq.constraints}</pre>
                  </div>
                )}
                {cq?.sampleInput && (
                  <div className="mt-3 space-y-2">
                    <div className="p-3 bg-gray-900 rounded-lg">
                      <p className="text-xs text-gray-400 mb-1 font-bold uppercase">Sample Input</p>
                      <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">{cq.sampleInput}</pre>
                    </div>
                    <div className="p-3 bg-gray-900 rounded-lg">
                      <p className="text-xs text-gray-400 mb-1 font-bold uppercase">Expected Output</p>
                      <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">{cq.sampleOutput}</pre>
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT: Editor */}
              <div className="flex flex-col flex-1 bg-gray-900">
                {/* Toolbar */}
                <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700">
                  <div className="flex gap-1">
                    {[['js','JavaScript'],['python','Python'],['java','Java'],['cpp','C++']].map(([l,label]) => (
                      <button key={l} onClick={() => setLangMap(p=>({...p,[q.id]:l}))}
                        className={clsx('px-2 py-0.5 rounded text-xs font-bold',
                          lang===l?'bg-indigo-600 text-white':'text-gray-400 hover:text-white')}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <button onClick={runCode} disabled={isRunning}
                    className="flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-bold disabled:opacity-50">
                    ▶ {isRunning ? 'Running…' : 'Run'}
                  </button>
                </div>

                {/* Code editor */}
                <textarea className="flex-1 w-full bg-gray-900 text-green-400 font-mono text-sm p-4 resize-none focus:outline-none"
                  value={code} spellCheck={false}
                  onChange={e => setCodeMap(p=>({...p,[q.id]:e.target.value}))}
                  onKeyDown={e => {
                    if(e.key==='Tab'){e.preventDefault();const el=e.target as HTMLTextAreaElement;const s=el.selectionStart;const nv=code.substring(0,s)+'  '+code.substring(el.selectionEnd);setCodeMap(p=>({...p,[q.id]:nv}));setTimeout(()=>el.setSelectionRange(s+2,s+2),0);}
                  }}/>

                {/* Stdin */}
                <div className="border-t border-gray-700 px-3 py-2">
                  <p className="text-xs text-gray-500 mb-1">Input (stdin)</p>
                  <textarea className="w-full bg-gray-800 text-gray-300 font-mono text-xs p-2 rounded resize-none focus:outline-none"
                    style={{height:'48px'}}
                    value={runInput[q.id] ?? cq?.sampleInput ?? ''}
                    onChange={e=>setRunInput(p=>({...p,[q.id]:e.target.value}))}/>
                </div>

                {/* Output — always visible, fixed height */}
                <div className="border-t border-gray-700 px-3 py-2" style={{ minHeight: '80px', maxHeight: '160px', overflowY: 'auto' }}>
                  {runRes ? (
                    <>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs text-gray-400">
                          Output ({runRes.status}) {runRes.timeMs ? `${runRes.timeMs}ms` : ''}
                        </p>
                        {runRes.status === 'Accepted' && (
                          <span className={clsx('text-xs font-black px-2 py-0.5 rounded-full',
                            runRes.passed
                              ? 'bg-green-700 text-white'
                              : 'bg-red-600 text-white')}>
                            {runRes.passed
                              ? `✅ CORRECT — ${runRes.autoMarks}/${q.marks} marks`
                              : `❌ WRONG — 0/${q.marks} marks`}
                          </span>
                        )}
                      </div>
                      <pre className={clsx('text-sm font-mono whitespace-pre-wrap font-bold',
                        runRes.stderr ? 'text-red-400' : 'text-green-300')}>
                        {runRes.stdout || runRes.stderr || runRes.compileOutput || '(no output)'}
                      </pre>
                      {runRes.status === 'Accepted' && !runRes.passed && (
                        <div className="mt-2 space-y-1">
                          <div className="bg-red-900/30 rounded p-2">
                            <p className="text-xs text-red-400 font-bold">Your Output:</p>
                            <pre className="text-xs text-red-300 font-mono">{runRes.stdout?.trim() || '(empty)'}</pre>
                          </div>
                          <div className="bg-green-900/30 rounded p-2">
                            <p className="text-xs text-green-400 font-bold">Expected:</p>
                            <pre className="text-xs text-green-300 font-mono">{runRes.expected}</pre>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-gray-600 italic mt-2">Click ▶ Run to see output here</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      }
      default: return null;
    }
  };

  return (
    <div ref={containerRef} className={clsx("mx-auto space-y-4", q?.questionType === 'Coding' ? "max-w-6xl" : "max-w-4xl")}>
      {tabWarning && <TabWarningOverlay />}
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-black text-gray-900 text-sm">{test?.title}</h2>
          <p className="text-xs text-gray-400">Q{current+1}/{questions.length} · {answeredCount} answered</p>
        </div>
        <div className="flex items-center gap-3">
          <button title="Return to fullscreen" onClick={() => { try { document.documentElement.requestFullscreen?.(); } catch {} }}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
            <Maximize className="w-4 h-4" />
          </button>
          <div className={clsx('flex items-center gap-2 font-mono text-2xl font-black px-4 py-2 rounded-xl',
            timeLeft < 120 ? 'bg-red-50 text-red-600' : timeLeft < 300 ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-900')}>
            <Clock className="w-5 h-5" /> {fmt(timeLeft)}
          </div>
          <button className="btn-primary text-sm" disabled={submitMut.isPending}
            onClick={() => { if (confirm(`Submit with ${questions.length - answeredCount} unanswered?`)) submitMut.mutate(); }}>
            {submitMut.isPending ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      </div>

      <div className={clsx("gap-4", q?.questionType === 'Coding' ? "flex flex-col" : "grid grid-cols-1 lg:grid-cols-4")}>
        <div className={clsx("space-y-4", q?.questionType !== 'Coding' && "lg:col-span-3")}>
          {q.questionType === 'Coding' ? (
            /* Coding: full-width card, no padding (split pane fills it) */
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-black flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg,var(--org-primary),var(--org-secondary))' }}>
                  {current+1}
                </div>
                <Code2 className="w-4 h-4 text-indigo-500" />
                <span className="font-bold text-gray-800 text-sm">{q.text}</span>
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold ml-1">💻 Coding · {q.marks} marks</span>
                {answers[q.id] && typeof answers[q.id] === 'string' && (answers[q.id] as string).startsWith('marks:') && (
                  <span className={clsx('text-xs font-black px-2 py-0.5 rounded-full ml-1',
                    (answers[q.id] as string) === 'marks:0' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700')}>
                    {(answers[q.id] as string) === 'marks:0' ? '❌ 0 pts' : `✅ ${(answers[q.id] as string).split(':')[1]}/${q.marks} pts`}
                  </span>
                )}
                <button onClick={() => toggleFlag(q.id)} className="ml-auto">
                  <Flag className={clsx('w-4 h-4', flagged.has(q.id) ? 'text-amber-500' : 'text-gray-300')} />
                </button>
              </div>
              {renderQuestionInput(q)}
            </div>
          ) : (
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
                  {q.formulaLatex && q.questionType !== 'Formula' && <div className="mt-2 bg-gray-900 text-green-400 font-mono text-sm rounded-xl p-3">{q.formulaLatex}</div>}
                </div>
                <button onClick={() => toggleFlag(q.id)}
                  className={clsx('p-2 rounded-xl transition-all flex-shrink-0', flagged.has(q.id) ? 'bg-amber-100 text-amber-600' : 'hover:bg-gray-100 text-gray-400')}>
                  <Flag className="w-4 h-4" />
                </button>
              </div>
              {renderQuestionInput(q)}
            </div>
          )}
          <div className="flex justify-between gap-4">
            <button className="btn-secondary" disabled={current===0} onClick={() => setCurrent(c=>c-1)}><ChevronLeft className="w-4 h-4" /> Previous</button>
            {current < questions.length-1
              ? <button className="btn-primary" onClick={() => setCurrent(c=>c+1)}>Next <ChevronRight className="w-4 h-4" /></button>
              : <button className="btn-primary" style={{ background: '#059669' }} onClick={() => { if(confirm('Submit assessment?')) submitMut.mutate(); }}>Submit ✓</button>}
          </div>
        </div>

        {q?.questionType !== 'Coding' && <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sticky top-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Questions</p>
            <div className="grid grid-cols-5 gap-1.5 mb-4">
              {questions.map((_: any, i: number) => {
                const qItem = questions[i];
                const ans = answers[qItem.id];
                const isAnswered = ans !== null && ans !== undefined && !(ans instanceof Set && (ans as Set<number>).size === 0) && ans !== '';
                const isFlagged = flagged.has(qItem.id);
                const isActive = i === current;
                return (
                  <button key={i} onClick={() => setCurrent(i)}
                    className={clsx('h-8 rounded-lg text-xs font-bold transition-all',
                      isActive ? 'text-white scale-110' : isFlagged ? 'bg-amber-100 text-amber-700' : isAnswered ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}
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
        </div>}
      </div>
    </div>
  );
}