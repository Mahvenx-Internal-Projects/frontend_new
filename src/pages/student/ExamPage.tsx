import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useEffect, useState, useRef } from 'react';
import { Clock, Award, CheckCircle2, XCircle, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { examsApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import type { Exam, Question } from '../../types';
import clsx from 'clsx';

interface Answer { questionId: number; selectedOptionIds: number[]; textAnswer: string; }

type Phase = 'info' | 'taking' | 'result';

export default function ExamPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [phase, setPhase] = useState<Phase>('info');
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const [current, setCurrent] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [result, setResult] = useState<{ score: number; marks: number; totalMarks: number; passed: boolean } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: exam } = useQuery<Exam>({
    queryKey: ['exam', examId],
    queryFn: () => examsApi.get(Number(examId)).then(r => r.data),
  });

  const startMut = useMutation({
    mutationFn: () => examsApi.startAttempt({ examId: Number(examId), userId: user!.id }),
    onSuccess: (data) => {
      setAttemptId(data.data.id);
      setTimeLeft(data.data.timeLimitMins * 60);
      setPhase('taking');
      setCurrent(0);
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Could not start exam'),
  });

  const submitMut = useMutation({
    mutationFn: () => examsApi.submit({
      attemptId: attemptId!,
      answers: Object.values(answers)
    }),
    onSuccess: (data) => {
      setResult(data.data);
      setPhase('result');
      if (timerRef.current) clearInterval(timerRef.current);
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Submit failed'),
  });

  // Timer
  useEffect(() => {
    if (phase !== 'taking') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          toast('Time\'s up! Submitting…', { icon: '⏰' });
          submitMut.mutate();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  const questions: Question[] = exam?.questions ?? [];
  const q = questions[current];

  const toggleOption = (optId: number, multi: boolean) => {
    if (!q) return;
    setAnswers(prev => {
      const cur = prev[q.id] ?? { questionId: q.id, selectedOptionIds: [], textAnswer: '' };
      const ids = cur.selectedOptionIds;
      return {
        ...prev,
        [q.id]: {
          ...cur,
          selectedOptionIds: multi
            ? ids.includes(optId) ? ids.filter(i => i !== optId) : [...ids, optId]
            : [optId]
        }
      };
    });
  };

  const setTextAnswer = (text: string) => {
    if (!q) return;
    setAnswers(prev => ({ ...prev, [q.id]: { questionId: q.id, selectedOptionIds: [], textAnswer: text } }));
  };

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const answered = Object.keys(answers).length;

  // ─── INFO SCREEN ────────────────────────────────────────────
  if (phase === 'info') return (
    <div className="max-w-lg mx-auto space-y-5">
      <button className="btn-ghost" onClick={() => navigate(-1)}><ChevronLeft className="w-4 h-4" /> Back</button>
      <div className="card p-8 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto">
          <Award className="w-9 h-9 text-amber-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{exam?.title}</h1>
        {exam?.instructions && <p className="text-gray-500 text-sm">{exam.instructions}</p>}
        <div className="grid grid-cols-3 gap-4 my-4">
          {[
            { label: 'Questions', value: questions.length },
            { label: 'Time Limit', value: `${exam?.timeLimitMins} min` },
            { label: 'Pass Mark', value: `${exam?.passMarkPercent}%` },
          ].map(s => (
            <div key={s.label} className="bg-gray-50 rounded-xl p-3">
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700 text-left space-y-1">
          <p className="font-semibold">Before you start:</p>
          <p>• You have {exam?.maxAttempts} attempt(s) total</p>
          <p>• Timer starts immediately after clicking Start</p>
          <p>• Answers are saved when you navigate between questions</p>
        </div>
        <button className="btn-primary w-full justify-center py-3 text-base" onClick={() => startMut.mutate()} disabled={startMut.isPending}>
          {startMut.isPending ? 'Starting…' : 'Start Exam'}
        </button>
      </div>
    </div>
  );

  // ─── RESULT SCREEN ──────────────────────────────────────────
  if (phase === 'result' && result) return (
    <div className="max-w-lg mx-auto space-y-5">
      <div className="card p-8 text-center space-y-4">
        <div className={clsx('w-20 h-20 rounded-full flex items-center justify-center mx-auto', result.passed ? 'bg-green-100' : 'bg-red-100')}>
          {result.passed
            ? <CheckCircle2 className="w-10 h-10 text-green-600" />
            : <XCircle className="w-10 h-10 text-red-500" />}
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{result.passed ? 'Congratulations! 🎉' : 'Better luck next time'}</h1>
        <p className="text-gray-500">{result.passed ? 'You passed the exam. Check your certificates!' : 'Review the material and try again.'}</p>
        <div className="flex justify-center gap-6 my-4">
          <div>
            <p className="text-4xl font-bold text-gray-900">{result.score}%</p>
            <p className="text-sm text-gray-500">Score</p>
          </div>
          <div>
            <p className="text-4xl font-bold text-gray-900">{result.marks}/{result.totalMarks}</p>
            <p className="text-sm text-gray-500">Marks</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary flex-1 justify-center" onClick={() => navigate('/dashboard/certificates')}>
            <Award className="w-4 h-4" /> Certificates
          </button>
          <button className="btn-primary flex-1 justify-center" onClick={() => navigate('/dashboard/catalog')}>
            Back to Catalog
          </button>
        </div>
      </div>
    </div>
  );

  // ─── EXAM TAKING ────────────────────────────────────────────
  if (!q) return null;

  const ans = answers[q.id] ?? { selectedOptionIds: [], textAnswer: '' };
  const isMulti = q.type === 'MultiChoice';

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="card p-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-semibold text-gray-900">{exam?.title}</h2>
          <p className="text-xs text-gray-500">Question {current + 1} of {questions.length}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className={clsx('flex items-center gap-2 font-mono text-lg font-bold', timeLeft < 60 ? 'text-red-600' : 'text-gray-900')}>
            <Clock className="w-5 h-5" /> {fmt(timeLeft)}
          </div>
          <span className="text-sm text-gray-500">{answered}/{questions.length} answered</span>
        </div>
      </div>

      {/* Question */}
      <div className="card p-6 space-y-5">
        <div className="flex items-start gap-3">
          <span className="w-8 h-8 rounded-full bg-brand-50 text-brand-700 font-bold text-sm flex items-center justify-center flex-shrink-0">
            {current + 1}
          </span>
          <div className="flex-1">
            <p className="font-medium text-gray-900 leading-relaxed">{q.text}</p>
            <p className="text-xs text-gray-400 mt-1">{q.marks} {q.marks === 1 ? 'mark' : 'marks'} · {q.type === 'MultiChoice' ? 'Select all that apply' : q.type === 'ShortAnswer' ? 'Write your answer' : 'Select one'}</p>
          </div>
        </div>

        {q.type === 'ShortAnswer' ? (
          <textarea className="input" rows={4} placeholder="Type your answer…"
            value={ans.textAnswer} onChange={e => setTextAnswer(e.target.value)} />
        ) : (
          <div className="space-y-2">
            {(q.options ?? []).map(opt => {
              const selected = ans.selectedOptionIds.includes(opt.id);
              return (
                <button key={opt.id}
                  className={clsx(
                    'w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all',
                    selected ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  )}
                  onClick={() => toggleOption(opt.id, isMulti)}>
                  <span className={clsx(
                    'w-5 h-5 flex-shrink-0 border-2 flex items-center justify-center transition-all',
                    isMulti ? 'rounded' : 'rounded-full',
                    selected ? 'bg-brand-600 border-brand-600' : 'border-gray-300'
                  )}>
                    {selected && <span className="w-2.5 h-2.5 bg-white rounded-full" />}
                  </span>
                  <span className="text-sm text-gray-700">{opt.text}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Navigation + question dots */}
      <div className="flex items-center justify-between gap-4">
        <button className="btn-secondary" disabled={current === 0} onClick={() => setCurrent(c => c - 1)}>
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>

        <div className="flex flex-wrap gap-1.5 justify-center">
          {questions.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)}
              className={clsx(
                'w-8 h-8 rounded-lg text-xs font-medium transition-all',
                i === current ? 'bg-brand-600 text-white' :
                answers[questions[i].id] ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              )}>
              {i + 1}
            </button>
          ))}
        </div>

        {current < questions.length - 1 ? (
          <button className="btn-primary" onClick={() => setCurrent(c => c + 1)}>
            Next <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button className="btn-primary bg-green-600 hover:bg-green-700"
            onClick={() => {
              if (answered < questions.length && !confirm(`You have ${questions.length - answered} unanswered questions. Submit anyway?`)) return;
              submitMut.mutate();
            }}
            disabled={submitMut.isPending}>
            {submitMut.isPending ? 'Submitting…' : 'Submit Exam'}
          </button>
        )}
      </div>
    </div>
  );
}
