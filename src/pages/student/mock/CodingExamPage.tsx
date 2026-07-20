import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Play, Send, Clock, ChevronLeft, ChevronRight, CheckCircle2, XCircle, AlertTriangle, Maximize, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { mockTestApi, judgeApi } from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';
import clsx from 'clsx';

// Language configs
const LANGUAGES = [
  { id: 'python', label: 'Python', ext: 'py' },
  { id: 'cpp', label: 'C++', ext: 'cpp' },
  { id: 'java', label: 'Java', ext: 'java' },
  { id: 'js', label: 'JavaScript', ext: 'js' },
  { id: 'c', label: 'C', ext: 'c' },
];

const PASS_THRESHOLD = 80; // 80% to qualify

export default function CodingExamPage() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [phase, setPhase] = useState<'info' | 'mcq' | 'coding' | 'result'>('info');
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [mcqQuestions, setMcqQuestions] = useState<any[]>([]);
  const [codingQuestions, setCodingQuestions] = useState<any[]>([]);
  const [mcqAnswers, setMcqAnswers] = useState<Record<number, number | null>>({});
  const [currentMcq, setCurrentMcq] = useState(0);
  const [currentCoding, setCurrentCoding] = useState(0);
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState('');
  const [runInput, setRunInput] = useState('');
  const [runResult, setRunResult] = useState<any>(null);
  const [submitResult, setSubmitResult] = useState<any>(null);
  const [codingScores, setCodingScores] = useState<Record<number, number>>({}); // questionId → score%
  const [timeLeft, setTimeLeft] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [tabWarning, setTabWarning] = useState(false);
  const [tabViolations, setTabViolations] = useState(0);
  const timerRef = useRef<any>(null);
  const submitRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: test } = useQuery({
    queryKey: ['coding-exam-info', testId],
    queryFn: () => mockTestApi.get(Number(testId)).then((r: any) => r.data),
    enabled: !!testId,
  });

  const startMut = useMutation({
    mutationFn: () => mockTestApi.start({ mockTestId: Number(testId), studentId: user!.id }),
    onSuccess: (res: any) => {
      const allQ = res.data.questions ?? [];
      const mcq = allQ.filter((q: any) => q.questionType !== 'Coding');
      const coding = allQ.filter((q: any) => q.questionType === 'Coding');
      setMcqQuestions(mcq);
      setCodingQuestions(coding);
      setAttemptId(res.data.attemptId);
      setTimeLeft(res.data.timeLimitMins * 60);
      setStartTime(Date.now());
      setPhase(mcq.length > 0 ? 'mcq' : 'coding');
      if (coding.length > 0) {
        const firstCQ = coding[0];
        setCode(getStarterCode(firstCQ, 'python'));
        setRunInput(firstCQ.codingQuestion?.sampleInput ?? '');
      }
      try { document.documentElement.requestFullscreen?.(); } catch {}
    },
    onError: (e: any) => {
      const msg = e.response?.data?.message ?? 'Could not start';
      setStartError(msg);
      if (!msg.toLowerCase().includes('attempt')) toast.error(msg);
    },
  });

  const runMut = useMutation({
    mutationFn: () => judgeApi.run(code, language, runInput),
    onSuccess: (res: any) => setRunResult(res.data),
    onError: () => toast.error('Code execution failed'),
  });

  const submitCodeMut = useMutation({
    mutationFn: (codingQuestionId: number) => judgeApi.submit(codingQuestionId, code, language),
    onSuccess: (res: any, codingQuestionId: number) => {
      setSubmitResult(res.data);
      setCodingScores(prev => ({ ...prev, [codingQuestionId]: res.data.score }));
      if (res.data.allPassed) toast.success('All test cases passed! 🎉');
      else toast(`${res.data.passed}/${res.data.totalTestCases} test cases passed`, { icon: '📊' });
    },
    onError: () => toast.error('Submission failed'),
  });

  const finalSubmitMut = useMutation({
    mutationFn: () => {
      const timeTaken = Math.round((Date.now() - startTime) / 1000);
      const mcqAnswersList = mcqQuestions.map(q => ({
        questionId: q.id,
        selectedOptionId: mcqAnswers[q.id] ?? null,
      }));
      return mockTestApi.submit({ attemptId: attemptId!, answers: mcqAnswersList, timeTakenSecs: timeTaken });
    },
    onSuccess: (res: any) => {
      if (timerRef.current) clearInterval(timerRef.current);
      try { document.exitFullscreen?.(); } catch {}
      // Calculate combined score
      const mcqScore = res.data.scorePct ?? 0;
      const codingScoreList = Object.values(codingScores);
      const avgCodingScore = codingScoreList.length > 0
        ? codingScoreList.reduce((a, b) => a + b, 0) / codingScoreList.length
        : 100;
      const combined = mcqQuestions.length > 0 && codingQuestions.length > 0
        ? (mcqScore * 0.6 + avgCodingScore * 0.4)  // 60% MCQ, 40% coding
        : mcqQuestions.length > 0 ? mcqScore : avgCodingScore;
      setResult({ ...res.data, combinedScore: Math.round(combined), qualified: combined >= PASS_THRESHOLD });
      setPhase('result');
    },
    onError: () => toast.error('Final submission failed'),
  });

  useEffect(() => { submitRef.current = finalSubmitMut; }, [finalSubmitMut]);

  // Timer
  useEffect(() => {
    if (phase !== 'mcq' && phase !== 'coding') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          toast("Time's up! Auto-submitting…", { icon: '⏰' });
          submitRef.current?.mutate();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  // Tab-switch detection
  useEffect(() => {
    if (phase !== 'mcq' && phase !== 'coding') return;
    const handle = () => {
      if (document.hidden) {
        setTabViolations(v => {
          const next = v + 1;
          if (next >= 2) {
            toast.error('Second violation — submitting automatically.', { duration: 4000 });
            submitRef.current?.mutate();
          } else {
            setTabWarning(true);
          }
          return next;
        });
      }
    };
    document.addEventListener('visibilitychange', handle);
    return () => document.removeEventListener('visibilitychange', handle);
  }, [phase]);

  const fmt = (s: number) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  const getStarterCode = (q: any, lang: string): string => {
    const cq = q.codingQuestion;
    if (!cq) return `# Write your ${lang} solution here\n`;
    return {
      python: cq.starterCodePython ?? '# Write your Python solution here\n',
      cpp: cq.starterCodeCpp ?? '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // Write your solution\n    return 0;\n}\n',
      java: cq.starterCodeJava ?? 'import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        // Write your solution\n    }\n}\n',
      js: cq.starterCodeJs ?? '// Write your JavaScript solution here\n',
      c: '// Write your C solution here\n',
    }[lang] ?? '// Write your solution\n';
  };

  const switchCodingQuestion = (idx: number) => {
    setCurrentCoding(idx);
    setSubmitResult(null);
    setRunResult(null);
    const q = codingQuestions[idx];
    setCode(getStarterCode(q, language));
    setRunInput(q.codingQuestion?.sampleInput ?? '');
  };

  const switchLanguage = (lang: string) => {
    setLanguage(lang);
    setCode(getStarterCode(codingQuestions[currentCoding], lang));
  };

  // Simple code editor with tab support
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newVal = code.substring(0, start) + '    ' + code.substring(end);
      setCode(newVal);
      setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + 4; }, 0);
    }
  };

  const currentCodingQ = codingQuestions[currentCoding];

  // ─── TAB WARNING ──────────────────────────────────────────────
  const WarningOverlay = () => (
    <div className="fixed inset-0 z-[999] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h2 className="text-xl font-black text-gray-900 mb-2">⚠️ Warning!</h2>
        <p className="text-gray-600 mb-1">You switched away from the exam.</p>
        <p className="text-sm text-red-600 font-semibold mb-6">
          {tabViolations >= 1 ? 'Next violation will auto-submit!' : 'First warning — one more and exam submits automatically.'}
        </p>
        <div className="flex gap-3">
          <button className="flex-1 btn-primary justify-center"
            onClick={() => { setTabWarning(false); try { document.documentElement.requestFullscreen?.(); } catch {} }}>
            <Maximize className="w-4 h-4" /> Return to Exam
          </button>
          <button className="flex-1 btn-secondary text-red-500 justify-center"
            onClick={() => { if (confirm('Submit exam now?')) finalSubmitMut.mutate(); }}>
            Submit Now
          </button>
        </div>
      </div>
    </div>
  );

  // ─── INFO SCREEN ─────────────────────────────────────────────
  if (phase === 'info') return (
    <div className="max-w-xl mx-auto space-y-5 py-8">
      <button className="btn-ghost" onClick={() => navigate(-1)}><ChevronLeft className="w-4 h-4" /> Back</button>
      <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
        <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4"
          style={{ background: 'linear-gradient(135deg,var(--org-primary),var(--org-secondary))' }}>
          <span className="text-2xl">🎯</span>
        </div>
        <h1 className="text-2xl font-black mb-2">{test?.title}</h1>
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'MCQ', value: test?.questions?.filter((q: any) => q.questionType !== 'Coding').length ?? '—' },
            { label: 'Coding', value: test?.questions?.filter((q: any) => q.questionType === 'Coding').length ?? '—' },
            { label: 'Time', value: `${test?.timeLimitMins ?? 0}m` },
          ].map(s => (
            <div key={s.label} className="bg-gray-50 rounded-2xl p-4">
              <p className="text-2xl font-black">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-700 text-left space-y-1 mb-5">
          <p className="font-bold">📋 Rules:</p>
          <p>• Exam opens in fullscreen — do not exit</p>
          <p>• Switching tabs triggers a warning; 2nd violation = auto-submit</p>
          <p>• Results will be communicated by the organization after evaluation</p>
          <p>• MCQ: 60% weight · Coding: 40% weight</p>
        </div>
        {startError?.toLowerCase().includes('attempt') ? (
          <div className="space-y-3">
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-2xl p-4 text-left">
              <span className="text-xl">⛔</span>
              <div>
                <p className="font-black text-amber-800">Attempts Exhausted</p>
                <p className="text-sm text-amber-700 mt-0.5">{startError}</p>
                <p className="text-xs text-amber-600 mt-1">Contact your instructor if you need another attempt.</p>
              </div>
            </div>
            <button className="btn-secondary w-full justify-center py-3"
              onClick={() => navigate(-1)}>
              ← Go Back
            </button>
          </div>
        ) : startError ? (
          <div className="space-y-3">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700 text-left">
              <p className="font-bold mb-1">Cannot Start Exam</p>
              <p>{startError}</p>
            </div>
            <button className="btn-primary w-full justify-center py-3.5 font-black"
              onClick={() => { setStartError(null); startMut.mutate(); }} disabled={startMut.isPending}>
              {startMut.isPending ? 'Starting…' : 'Try Again'}
            </button>
          </div>
        ) : (
          <button className="btn-primary w-full justify-center py-3.5 font-black"
            onClick={() => startMut.mutate()} disabled={startMut.isPending}>
            {startMut.isPending ? 'Starting…' : 'Start Exam 🚀'}
          </button>
        )}
      </div>
    </div>
  );

  // ─── RESULT SCREEN ─────────────────────────────────────────────
  // ─── RESULT — show thank you, NOT score ─────────────────────
  if (phase === 'result' && result) {
    const orgName = user?.organizationName ?? 'our organization';
    return (
      <div className="max-w-xl mx-auto py-8 space-y-5">
        <div className="bg-white rounded-3xl shadow-xl p-10 text-center">
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
            <strong>{orgName}</strong> will review your performance and get back to you shortly. Please check your email for further updates.
          </p>
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 text-sm text-blue-800 text-left mb-8">
            <p className="font-bold mb-2">📧 What happens next?</p>
            <p>• You will receive an email with your result within 30 minutes</p>
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
  }

  // ─── MCQ PHASE ────────────────────────────────────────────────
  if (phase === 'mcq') {
    const q = mcqQuestions[currentMcq];
    const answeredCount = Object.keys(mcqAnswers).length;
    return (
      <div className="min-h-screen bg-gray-50">
        {tabWarning && <WarningOverlay />}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div>
            <h2 className="font-black text-gray-900 text-sm">{test?.title} — MCQ Section</h2>
            <p className="text-xs text-gray-400">Q{currentMcq+1}/{mcqQuestions.length} · {answeredCount} answered</p>
          </div>
          <div className="flex items-center gap-3">
            <div className={clsx('font-mono text-xl font-black px-4 py-2 rounded-xl', timeLeft < 120 ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-900')}>
              <Clock className="w-4 h-4 inline mr-1" />{fmt(timeLeft)}
            </div>
            <button className="btn-primary text-sm"
              onClick={() => { if (codingQuestions.length > 0) { setPhase('coding'); switchCodingQuestion(0); } else { if (confirm('Submit exam?')) finalSubmitMut.mutate(); } }}>
              {codingQuestions.length > 0 ? 'Coding Section →' : 'Submit Exam'}
            </button>
          </div>
        </div>

        <div className="max-w-3xl mx-auto p-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
            <div className="flex items-start gap-3 mb-5">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-black flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,var(--org-primary),var(--org-secondary))' }}>
                {currentMcq+1}
              </div>
              <p className="text-gray-900 font-semibold text-base leading-relaxed">{q?.text}</p>
            </div>
            <div className="space-y-2.5">
              {q?.options?.map((opt: any) => {
                const sel = mcqAnswers[q.id] === opt.id;
                return (
                  <button key={opt.id} onClick={() => setMcqAnswers(prev => ({ ...prev, [q.id]: opt.id }))}
                    className={clsx('w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 text-left transition-all',
                      sel ? 'text-white border-transparent' : 'border-gray-200 hover:border-gray-300')}
                    style={sel ? { background: 'linear-gradient(135deg,var(--org-primary),var(--org-secondary))' } : {}}>
                    <div className={clsx('w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                      sel ? 'bg-white/30 border-white' : 'border-gray-300')}>
                      {sel && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <span className={clsx('text-sm font-medium', sel ? 'text-white' : 'text-gray-700')}>{opt.text}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex justify-between">
            <button className="btn-secondary" disabled={currentMcq === 0} onClick={() => setCurrentMcq(c => c-1)}><ChevronLeft className="w-4 h-4" /> Prev</button>
            <button className="btn-primary" onClick={() => {
              if (currentMcq < mcqQuestions.length - 1) setCurrentMcq(c => c+1);
              else { if (codingQuestions.length > 0) { setPhase('coding'); switchCodingQuestion(0); } else { if (confirm('Submit?')) finalSubmitMut.mutate(); } }
            }}>
              {currentMcq < mcqQuestions.length - 1 ? <><span>Next</span><ChevronRight className="w-4 h-4" /></> : (codingQuestions.length > 0 ? 'Coding Section →' : 'Submit ✓')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── CODING PHASE (split pane) ────────────────────────────────
  if (phase === 'coding' && currentCodingQ) {
    const cq = currentCodingQ.codingQuestion;
    return (
      <div className="h-screen flex flex-col bg-gray-900 overflow-hidden">
        {tabWarning && <WarningOverlay />}
        {/* Top bar */}
        <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-white font-semibold text-sm">{test?.title} — Coding Section</span>
            <div className="flex gap-1">
              {codingQuestions.map((_: any, i: number) => (
                <button key={i} onClick={() => { submitRef.current = null; switchCodingQuestion(i); }}
                  className={clsx('w-8 h-6 rounded text-xs font-bold transition-all',
                    i === currentCoding ? 'bg-purple-600 text-white' :
                    codingScores[codingQuestions[i].id] !== undefined ? 'bg-green-700 text-white' : 'bg-gray-600 text-gray-300')}>
                  Q{i+1}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={clsx('font-mono text-lg font-black px-3 py-1 rounded-lg', timeLeft < 120 ? 'bg-red-900 text-red-300' : 'bg-gray-700 text-white')}>
              <Clock className="w-4 h-4 inline mr-1" />{fmt(timeLeft)}
            </div>
            <button className="text-xs font-bold px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white transition-colors"
              onClick={() => { if (confirm('Submit exam?')) finalSubmitMut.mutate(); }}>
              {finalSubmitMut.isPending ? 'Submitting…' : 'Submit Exam ✓'}
            </button>
          </div>
        </div>

        {/* Split pane */}
        <div className="flex flex-1 overflow-hidden">
          {/* LEFT: Problem */}
          <div className="w-[45%] flex flex-col bg-white overflow-y-auto border-r border-gray-200">
            <div className="p-5 border-b border-gray-100">
              <h1 className="text-lg font-black text-gray-900 mb-1">{currentCodingQ.text}</h1>
              <div className="flex gap-2 flex-wrap text-xs">
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-semibold">{currentCodingQ.difficulty}</span>
                {currentCodingQ.marks && <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{currentCodingQ.marks} marks</span>}
              </div>
            </div>
            <div className="p-5 space-y-4 text-sm text-gray-700 flex-1">
              {cq?.problemStatement && (
                <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: cq.problemStatement }} />
              )}
              {cq?.constraints && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="font-semibold text-gray-900 mb-1 text-xs">Constraints:</p>
                  <pre className="text-xs text-gray-600 whitespace-pre-wrap">{cq.constraints}</pre>
                </div>
              )}
              {cq?.sampleInput && (
                <div>
                  <p className="font-semibold text-gray-900 mb-1 text-xs">Example:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gray-900 rounded-lg p-3">
                      <p className="text-[10px] text-gray-400 mb-1 font-mono uppercase">Input</p>
                      <pre className="text-green-400 font-mono text-xs whitespace-pre-wrap">{cq.sampleInput}</pre>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-3">
                      <p className="text-[10px] text-gray-400 mb-1 font-mono uppercase">Output</p>
                      <pre className="text-green-400 font-mono text-xs whitespace-pre-wrap">{cq.sampleOutput}</pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* Test results */}
            {submitResult && (
              <div className="border-t border-gray-100 p-4">
                <div className={clsx('flex items-center gap-2 mb-3 font-bold text-sm', submitResult.allPassed ? 'text-green-600' : 'text-red-600')}>
                  {submitResult.allPassed ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  {submitResult.passed}/{submitResult.totalTestCases} test cases passed · Score: {submitResult.score}%
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {submitResult.results?.map((r: any, i: number) => (
                    <div key={i} className={clsx('rounded-lg p-2.5 text-xs', r.passed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200')}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold">{r.isHidden ? `Hidden Test ${i+1}` : `Test ${i+1}`}</span>
                        <span className={r.passed ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>{r.passed ? '✓ Passed' : '✗ Failed'}</span>
                      </div>
                      {!r.isHidden && !r.passed && (
                        <div className="grid grid-cols-2 gap-2 mt-1 font-mono">
                          <div><p className="text-gray-500">Expected:</p><p>{r.expectedOutput}</p></div>
                          <div><p className="text-gray-500">Got:</p><p className="text-red-600">{r.actualOutput || '(empty)'}</p></div>
                        </div>
                      )}
                      {r.stderr && <p className="text-red-500 mt-1 break-all">{r.stderr}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Editor */}
          <div className="w-[55%] flex flex-col bg-gray-900">
            {/* Editor toolbar */}
            <div className="bg-gray-800 px-3 py-2 flex items-center gap-2 border-b border-gray-700 flex-shrink-0">
              <select value={language} onChange={e => switchLanguage(e.target.value)}
                className="bg-gray-700 text-white text-xs rounded-lg px-2 py-1 border-0 focus:outline-none">
                {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
              </select>
              <button onClick={() => setCode(getStarterCode(currentCodingQ, language))}
                className="text-gray-400 hover:text-white p-1 rounded transition-colors" title="Reset to starter code">
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <span className="flex-1" />
              <button onClick={() => runMut.mutate()} disabled={runMut.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-600 hover:bg-gray-500 text-white text-xs font-semibold transition-colors">
                <Play className="w-3 h-3" /> {runMut.isPending ? 'Running…' : 'Run'}
              </button>
              <button onClick={() => submitCodeMut.mutate(cq?.id ?? currentCodingQ.id)} disabled={submitCodeMut.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-semibold transition-colors">
                <Send className="w-3 h-3" /> {submitCodeMut.isPending ? 'Testing…' : 'Submit Code'}
              </button>
            </div>

            {/* Code textarea */}
            <textarea
              ref={textareaRef}
              value={code}
              onChange={e => setCode(e.target.value)}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              className="flex-1 bg-gray-900 text-green-400 font-mono text-sm p-4 resize-none focus:outline-none border-0 min-h-0"
              style={{ tabSize: 4 }}
              placeholder="// Write your code here"
            />

            {/* Bottom: Run I/O */}
            <div className="border-t border-gray-700 flex-shrink-0">
              <div className="grid grid-cols-2 h-36">
                <div className="border-r border-gray-700 flex flex-col">
                  <p className="text-[10px] text-gray-500 px-3 py-1.5 border-b border-gray-700 font-mono uppercase">Input</p>
                  <textarea value={runInput} onChange={e => setRunInput(e.target.value)}
                    className="flex-1 bg-gray-900 text-gray-300 font-mono text-xs p-3 resize-none focus:outline-none border-0"
                    placeholder="stdin for Run…" />
                </div>
                <div className="flex flex-col">
                  <p className="text-[10px] text-gray-500 px-3 py-1.5 border-b border-gray-700 font-mono uppercase">Output</p>
                  {runResult ? (
                    <div className="flex-1 p-3 overflow-y-auto">
                      {runResult.stdout && <pre className="text-green-400 font-mono text-xs whitespace-pre-wrap">{runResult.stdout}</pre>}
                      {runResult.stderr && <pre className="text-red-400 font-mono text-xs whitespace-pre-wrap">{runResult.stderr}</pre>}
                      {runResult.compileOutput && <pre className="text-amber-400 font-mono text-xs whitespace-pre-wrap">{runResult.compileOutput}</pre>}
                      {!runResult.stdout && !runResult.stderr && !runResult.compileOutput && (
                        <p className="text-gray-500 text-xs">(empty output)</p>
                      )}
                      <p className="text-gray-600 text-[10px] mt-1">{runResult.statusDescription} {runResult.timeMs && `· ${runResult.timeMs}s`}</p>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <p className="text-gray-600 text-xs">Click Run to see output</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <div className="text-center py-20 text-gray-400">Loading exam…</div>;
}
