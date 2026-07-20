import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft, User, Clock, CheckCircle2, XCircle,
  Code2, BookOpen, Award, ChevronDown, ChevronUp,
  Save, Phone, Mail, Send, X, BarChart3, Target,
  Eye, Search
} from 'lucide-react';
import toast from 'react-hot-toast';
import { mockTestApi } from '../../services/api';
import clsx from 'clsx';

// ── helpers ────────────────────────────────────────────────────
const fmtDate = (d: string | null) => d
  ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })
  : '—';

const fmtTime = (s: number) => {
  if (!s) return '—';
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h > 0 ? `${h}h ${m}m ${sec}s` : m > 0 ? `${m}m ${sec}s` : `${sec}s`;
};

// ── Student Detail Modal ───────────────────────────────────────
function StudentDetailModal({
  attempt, testId, onClose,
}: { attempt: any; testId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [markEdit, setMarkEdit] = useState<Record<string, string>>({});
  const [showMcq,    setShowMcq]    = useState(false);
  const [showCoding, setShowCoding] = useState(true);
  const [showEmail,  setShowEmail]  = useState(false);

  // Save a single coding question's marks
  const markMut = useMutation({
    mutationFn: ({ questionId, marks }: { questionId: number; marks: number }) =>
      mockTestApi.markCoding(attempt.attemptId, questionId, marks),
    onSuccess: (res: any) => {
      const d = res.data;
      toast.success(`Marks saved! New score: ${d.scorePercent}% — ${d.passed ? '✅ PASSED' : '❌ FAILED'}`);
      qc.invalidateQueries({ queryKey: ['exam-attempts', testId] });
    },
    onError: () => toast.error('Failed to save marks'),
  });

  // Send exam result email using existing email service
  const emailMut = useMutation({
    mutationFn: () => mockTestApi.sendResultEmail(attempt.attemptId),
    onSuccess: (res: any) => {
      toast.success(`✅ Result email sent to ${res.data.to}!`);
      setShowEmail(false);
    },
    onError: () => toast.error('Failed to send email — check SMTP settings'),
  });

  const mcq    = attempt.mcqAnswers      ?? [];
  const coding = attempt.codingQuestions ?? [];
  const total  = attempt.totalQuestions  ?? 0;
  const correct  = attempt.correctAnswers ?? 0;
  const wrong    = attempt.wrongAnswers   ?? 0;
  const skipped  = attempt.skippedAnswers ?? 0;

  // Live score preview
  const mcqMarks = mcq.reduce((s: number, a: any) => s + (a.marksAwarded ?? 0), 0);
  const codingMarksLive = coding.reduce((s: number, cq: any) => {
    const key = `${attempt.attemptId}-${cq.questionId}`;
    return s + (markEdit[key] !== undefined ? Number(markEdit[key]) : (cq.marksAwarded ?? 0));
  }, 0);
  const totalMarks  = attempt.totalMarks ?? 20;
  const newTotal    = mcqMarks + codingMarksLive;
  const newPct      = totalMarks > 0 ? Math.round(newTotal * 100 / totalMarks) : 0;
  const willPass    = newPct >= 80;
  const hasEdits    = coding.some((cq: any) => markEdit[`${attempt.attemptId}-${cq.questionId}`] !== undefined);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-start justify-center p-3 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl my-6">

        {/* ─── Header ─────────────────────────────────────────── */}
        <div className="p-5 border-b border-gray-100 rounded-t-3xl"
          style={{ background: 'linear-gradient(135deg,var(--org-primary)12,#fff)' }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,var(--org-primary),var(--org-secondary,#6366f1))' }}>
                {attempt.studentName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
              </div>
              <div>
                <h2 className="text-lg font-black text-gray-900">{attempt.studentName}</h2>
                <div className="flex flex-wrap gap-3 mt-1">
                  <a href={`mailto:${attempt.studentEmail}`}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-indigo-600">
                    <Mail className="w-3.5 h-3.5"/>{attempt.studentEmail}
                  </a>
                  {attempt.studentPhone && (
                    <a href={`tel:${attempt.studentPhone}`}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-green-600">
                      <Phone className="w-3.5 h-3.5"/>{attempt.studentPhone}
                    </a>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Attempt #{attempt.attemptNumber} · {fmtDate(attempt.startedAt)} → {fmtDate(attempt.completedAt)}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowEmail(v => !v)}
                className="btn-secondary text-xs flex items-center gap-1.5 text-indigo-600 border-indigo-200">
                <Send className="w-3.5 h-3.5"/> Send Email
              </button>
              <button onClick={onClose} className="btn-ghost p-2 rounded-xl"><X className="w-5 h-5"/></button>
            </div>
          </div>
        </div>

        {/* ─── Score Summary ────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 border-b border-gray-100">
          <div className={clsx('rounded-2xl p-4 text-center border-2',
            attempt.passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200')}>
            <p className={clsx('text-4xl font-black', attempt.passed ? 'text-green-700' : 'text-red-600')}>
              {attempt.scorePercent}%
            </p>
            <p className="text-xs text-gray-500 mt-1">Current Score</p>
            <span className={clsx('text-xs font-black px-2 py-0.5 rounded-full mt-1 inline-block',
              attempt.passed ? 'bg-green-700 text-white' : 'bg-red-600 text-white')}>
              {attempt.passed ? '✅ PASSED' : '❌ FAILED'}
            </span>
          </div>

          <div className="bg-indigo-50 rounded-2xl p-4 text-center border-2 border-indigo-100">
            <p className="text-4xl font-black text-indigo-700">{attempt.marksObtained}</p>
            <p className="text-xs text-gray-500 mt-1">Marks Obtained</p>
            <p className="text-xs font-bold text-indigo-500">out of {totalMarks}</p>
          </div>

          <div className="bg-amber-50 rounded-2xl p-4 text-center border-2 border-amber-100">
            <p className="text-2xl font-black text-amber-700">{fmtTime(attempt.timeTakenSecs)}</p>
            <p className="text-xs text-gray-500 mt-1">Time Spent</p>
          </div>

          <div className="bg-gray-50 rounded-2xl p-4 text-center border-2 border-gray-200">
            <p className="text-3xl font-black text-gray-800">{total}</p>
            <p className="text-xs text-gray-500 mt-1">Total Questions</p>
            <p className="text-xs font-bold mt-0.5">
              <span className="text-green-600">{correct}✓</span>
              <span className="text-gray-300 mx-1">·</span>
              <span className="text-red-500">{wrong}✗</span>
              <span className="text-gray-300 mx-1">·</span>
              <span className="text-gray-400">{skipped}—</span>
            </p>
          </div>
        </div>

        {/* ─── Progress bars ────────────────────────────────────── */}
        <div className="px-5 py-3 space-y-2 border-b border-gray-100">
          {[
            { label: 'Correct', count: correct, color: 'bg-green-500', textColor: 'text-green-600' },
            { label: 'Wrong',   count: wrong,   color: 'bg-red-400',   textColor: 'text-red-500' },
            { label: 'Skipped', count: skipped, color: 'bg-gray-300',  textColor: 'text-gray-400' },
          ].map(b => (
            <div key={b.label} className="flex items-center gap-3">
              <span className="text-xs text-gray-400 w-14 text-right">{b.label}</span>
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className={clsx('h-full rounded-full transition-all', b.color)}
                  style={{ width: total > 0 ? `${b.count * 100 / total}%` : '0%' }}/>
              </div>
              <span className={clsx('text-xs font-bold w-12', b.textColor)}>
                {b.count} ({total > 0 ? Math.round(b.count * 100 / total) : 0}%)
              </span>
            </div>
          ))}
        </div>

        {/* ─── Q19 & Q20 Manual Marking ─────────────────────────── */}
        {coding.length > 0 && (
          <div className="border-b border-gray-100">
            <button className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50"
              onClick={() => setShowCoding(v => !v)}>
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Code2 className="w-4 h-4 text-indigo-600"/>
                Programming Questions — Manual Marking ({coding.length})
              </h3>
              {showCoding ? <ChevronUp className="w-4 h-4 text-gray-400"/> : <ChevronDown className="w-4 h-4 text-gray-400"/>}
            </button>

            {showCoding && (
              <div className="px-5 pb-5 space-y-5">

                {/* Live score preview */}
                {hasEdits && (
                  <div className={clsx('rounded-2xl p-4 border-2',
                    willPass ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300')}>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                      📊 New Score Preview
                    </p>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <div className="text-center">
                          <p className="text-xl font-black text-gray-800">{mcqMarks}</p>
                          <p className="text-xs text-gray-400">MCQ marks</p>
                        </div>
                        <span className="text-gray-400 text-lg">+</span>
                        <div className="text-center">
                          <p className="text-xl font-black text-indigo-700">{codingMarksLive}</p>
                          <p className="text-xs text-gray-400">Coding marks</p>
                        </div>
                        <span className="text-gray-400 text-lg">=</span>
                        <div className="text-center">
                          <p className="text-xl font-black text-gray-800">{newTotal}</p>
                          <p className="text-xs text-gray-400">/ {totalMarks} total</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={clsx('text-5xl font-black', willPass ? 'text-green-700' : 'text-red-600')}>
                          {newPct}%
                        </p>
                        <span className={clsx('text-sm font-black px-3 py-1 rounded-full inline-block mt-1',
                          willPass ? 'bg-green-700 text-white' : 'bg-red-600 text-white')}>
                          {willPass ? '✅ WILL PASS' : '❌ WILL FAIL'}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 h-3 bg-white/60 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(newPct, 100)}%`, background: willPass ? '#10b981' : '#ef4444' }}/>
                    </div>
                    <p className="text-xs text-gray-400 mt-1 text-center">Pass threshold: 80%</p>
                  </div>
                )}

                {/* Each coding question */}
                {coding.map((cq: any, ci: number) => {
                  const key = `${attempt.attemptId}-${cq.questionId}`;
                  const saved   = cq.marksAwarded ?? 0;
                  const inputVal = markEdit[key] ?? '';
                  const preview  = inputVal !== '' ? Number(inputVal) : saved;

                  return (
                    <div key={cq.questionId}
                      className="bg-gradient-to-br from-indigo-50 to-white border-2 border-indigo-100 rounded-2xl overflow-hidden">

                      {/* Question header */}
                      <div className="p-4 border-b border-indigo-100 flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white text-xs font-black flex items-center justify-center">
                              Q{18 + ci + 1}
                            </span>
                            <p className="font-bold text-gray-900">{cq.title}</p>
                          </div>
                          <p className="text-xs text-gray-400 mt-1 ml-9">{cq.topic}</p>
                        </div>
                        {/* Marks saved badge */}
                        <div className="flex-shrink-0 text-right">
                          <p className="text-xs text-gray-400">Saved marks</p>
                          <p className="text-2xl font-black text-indigo-700">{saved}
                            <span className="text-sm text-gray-400">/{cq.marks}</span>
                          </p>
                        </div>
                      </div>

                      {/* Problem statement */}
                      {cq.problemStatement && (
                        <div className="px-4 py-3 border-b border-indigo-100">
                          <div className="prose prose-sm max-w-none text-gray-700 text-sm"
                            dangerouslySetInnerHTML={{ __html: cq.problemStatement }}/>
                        </div>
                      )}

                      {/* Sample I/O */}
                      {cq.sampleInput && (
                        <div className="grid grid-cols-2 gap-2 px-4 py-3 border-b border-indigo-100">
                          <div className="bg-gray-900 rounded-xl p-3">
                            <p className="text-xs text-gray-400 uppercase font-bold mb-1">Sample Input</p>
                            <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">{cq.sampleInput}</pre>
                          </div>
                          <div className="bg-gray-900 rounded-xl p-3">
                            <p className="text-xs text-gray-400 uppercase font-bold mb-1">Expected Output</p>
                            <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">{cq.sampleOutput}</pre>
                          </div>
                        </div>
                      )}

                      {/* ── Manual Marks Entry ── */}
                      <div className="p-4 bg-white">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                          ✏️ Enter marks for this question (student wrote on paper)
                        </p>
                        <div className="flex items-center gap-4">
                          <div className="flex-1">
                            {/* Marks bar */}
                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                              <span>Marks given</span>
                              <span className="font-bold text-indigo-600">{preview} / {cq.marks}</span>
                            </div>
                            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all"
                                style={{
                                  width: cq.marks > 0 ? `${preview / cq.marks * 100}%` : '0%',
                                  background: 'var(--org-primary)'
                                }}/>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div>
                              <label className="text-xs text-gray-500 block mb-1">Marks (0–{cq.marks})</label>
                              <input
                                type="number" min={0} max={cq.marks}
                                className="input w-20 text-center font-black text-xl"
                                placeholder={`0-${cq.marks}`}
                                value={inputVal}
                                onChange={e => {
                                  let v = Number(e.target.value);
                                  if (v < 0) v = 0;
                                  if (v > cq.marks) v = cq.marks;
                                  setMarkEdit(p => ({ ...p, [key]: String(v) }));
                                }}/>
                            </div>
                            <div className="self-end">
                              <button
                                className="btn-primary px-4 py-2.5 text-sm font-bold"
                                disabled={inputVal === '' || markMut.isPending}
                                onClick={() => markMut.mutate({ questionId: cq.questionId, marks: Number(inputVal) })}>
                                <Save className="w-4 h-4"/> {markMut.isPending ? 'Saving…' : 'Save Marks'}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Quick mark buttons */}
                        <div className="flex gap-2 mt-3 flex-wrap">
                          <p className="text-xs text-gray-400 self-center">Quick:</p>
                          {Array.from({ length: cq.marks + 1 }, (_, i) => i).map(v => (
                            <button key={v}
                              className={clsx('w-8 h-8 rounded-lg text-xs font-black border transition-all',
                                inputVal === String(v)
                                  ? 'bg-indigo-600 text-white border-indigo-600'
                                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-indigo-300')}
                              onClick={() => setMarkEdit(p => ({ ...p, [key]: String(v) }))}>
                              {v}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Save All button */}
                {hasEdits && (
                  <button
                    className="w-full btn-primary justify-center py-4 text-base font-black rounded-2xl"
                    disabled={markMut.isPending}
                    onClick={async () => {
                      for (const cq of coding) {
                        const key = `${attempt.attemptId}-${cq.questionId}`;
                        if (markEdit[key] !== undefined) {
                          await markMut.mutateAsync({ questionId: cq.questionId, marks: Number(markEdit[key]) });
                        }
                      }
                      setMarkEdit({});
                    }}>
                    <Save className="w-5 h-5"/>
                    Save All Coding Marks &amp; Update Score → {newPct}%
                    {' '}{willPass ? '✅ PASS' : '❌ FAIL'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── MCQ Answers ──────────────────────────────────────── */}
        {mcq.length > 0 && (
          <div className="border-b border-gray-100">
            <button className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50"
              onClick={() => setShowMcq(v => !v)}>
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-purple-600"/>
                MCQ Answers ({mcq.length} questions · {correct} correct · {wrong} wrong · {skipped} skipped)
              </h3>
              {showMcq ? <ChevronUp className="w-4 h-4 text-gray-400"/> : <ChevronDown className="w-4 h-4 text-gray-400"/>}
            </button>

            {showMcq && (
              <div className="px-5 pb-5 space-y-2 max-h-80 overflow-y-auto">
                {mcq.map((ans: any, i: number) => (
                  <div key={ans.questionId}
                    className={clsx('rounded-xl p-3 border',
                      ans.isSkipped  ? 'bg-gray-50 border-gray-200' :
                      ans.isCorrect  ? 'bg-green-50 border-green-200' :
                                       'bg-red-50  border-red-200')}>
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 mt-0.5 w-5 text-center">
                        {ans.isSkipped ? <span className="text-gray-400 text-xs font-bold">—</span>
                          : ans.isCorrect
                            ? <CheckCircle2 className="w-4 h-4 text-green-500"/>
                            : <XCircle className="w-4 h-4 text-red-500"/>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800">{i + 1}. {ans.questionText}</p>
                        {!ans.isSkipped && (
                          <div className="mt-1 space-y-0.5">
                            <p className={clsx('text-xs', ans.isCorrect ? 'text-green-700' : 'text-red-600')}>
                              Selected: <strong>{ans.selectedOption ?? '—'}</strong>
                            </p>
                            {!ans.isCorrect && (
                              <p className="text-xs text-gray-500">
                                Correct: <strong>{ans.correctOption}</strong>
                              </p>
                            )}
                          </div>
                        )}
                        {ans.isSkipped && <p className="text-xs text-gray-400 mt-0.5">Not answered</p>}
                        <p className="text-xs text-gray-400 mt-0.5">Topic: {ans.topic}</p>
                      </div>
                      <span className={clsx('text-xs font-black flex-shrink-0',
                        ans.isCorrect ? 'text-green-600' : 'text-gray-400')}>
                        +{ans.marksAwarded}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Send Email ─────────────────────────────────────── */}
        {showEmail && (
          <div className="px-5 py-4 border-b border-gray-100 bg-indigo-50">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Send className="w-4 h-4 text-indigo-600"/> Send Exam Result Email
            </h3>

            {/* Preview of what will be sent */}
            <div className="bg-white rounded-xl border border-indigo-200 p-4 mb-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">To:</span>
                <span className="font-semibold flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-gray-400"/>{attempt.studentEmail}
                </span>
              </div>
              {attempt.studentPhone && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Phone:</span>
                  <span className="font-semibold flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-gray-400"/>{attempt.studentPhone}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subject:</span>
                <span className="font-semibold text-indigo-600">
                  {attempt.passed ? '🎉 You Qualified!' : '📊 Exam Result'} — {attempt.scorePercent}%
                </span>
              </div>
              <div className="border-t border-gray-100 pt-2">
                <p className="text-xs text-gray-400 mb-1">Email will include:</p>
                <ul className="text-xs text-gray-600 space-y-0.5">
                  <li>✅ Score: <strong>{attempt.scorePercent}%</strong> ({attempt.marksObtained}/{totalMarks} marks)</li>
                  <li>{attempt.passed ? '✅ PASSED — next steps message' : '❌ NOT PASSED — encouragement message'}</li>
                  <li>✅ Exam name, date, organisation name</li>
                </ul>
              </div>
            </div>

            <div className={clsx('text-xs font-bold px-3 py-2 rounded-lg mb-3',
              attempt.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
              {attempt.passed
                ? '🎉 This email will congratulate the student and mention next steps.'
                : '📊 This email will inform the student they did not qualify and encourage them to try again.'}
            </div>

            <div className="flex gap-2">
              <button className="btn-primary text-sm flex-1 justify-center"
                disabled={emailMut.isPending}
                onClick={() => emailMut.mutate()}>
                <Send className="w-4 h-4"/>
                {emailMut.isPending ? 'Sending…' : `Send Result Email to ${attempt.studentName?.split(' ')[0]}`}
              </button>
              <button className="btn-ghost text-sm" onClick={() => setShowEmail(false)}>Cancel</button>
            </div>
          </div>
        )}

        {/* ─── Footer ───────────────────────────────────────────── */}
        <div className="p-4 flex items-center justify-between rounded-b-3xl">
          {attempt.readiness && (
            <span className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full font-bold">
              Interview Readiness: {attempt.readiness}
            </span>
          )}
          <button className="btn-secondary ml-auto" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Exam Attempts Page ────────────────────────────────────
export default function ExamAttemptsPage() {
  const { testId } = useParams<{ testId: string }>();
  const navigate   = useNavigate();
  const [selected, setSelected] = useState<any>(null);
  const [search,   setSearch]   = useState('');

  const { data: attempts = [], isLoading } = useQuery({
    queryKey: ['exam-attempts', testId],
    queryFn:  () => mockTestApi.getAllAttempts(Number(testId)).then((r: any) => r.data ?? []),
    enabled:  !!testId,
  });

  const list     = attempts as any[];
  const filtered = list.filter((a: any) =>
    a.studentName?.toLowerCase().includes(search.toLowerCase()) ||
    a.studentEmail?.toLowerCase().includes(search.toLowerCase()) ||
    a.studentPhone?.includes(search)
  );

  const passed   = list.filter((a: any) => a.passed).length;
  const failed   = list.filter((a: any) => !a.passed).length;
  const avgScore = list.length ? Math.round(list.reduce((s: number, a: any) => s + (a.scorePercent ?? 0), 0) / list.length) : 0;

  return (
    <div className="space-y-5 max-w-6xl">

      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <button className="btn-ghost flex items-center gap-1" onClick={() => navigate(-1)}>
          <ChevronLeft className="w-4 h-4"/> Back
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-black text-gray-900">Exam Results & Paper Correction</h1>
          <p className="text-sm text-gray-400">{list.length} attempts · {passed} passed · {failed} failed · Avg {avgScore}%</p>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input className="input pl-9 w-56 text-sm" placeholder="Search student…"
            value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Attempts', value: list.length,  icon: BarChart3,    color: 'text-blue-600',   bg: 'bg-blue-50' },
          { label: 'Passed',         value: passed,        icon: CheckCircle2, color: 'text-green-600',  bg: 'bg-green-50' },
          { label: 'Failed',         value: failed,        icon: XCircle,      color: 'text-red-500',    bg: 'bg-red-50' },
          { label: 'Avg Score',      value: `${avgScore}%`,icon: Target,       color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center mb-3', s.bg)}>
              <s.icon className={clsx('w-4 h-4', s.color)}/>
            </div>
            <p className={clsx('text-2xl font-black', s.color)}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="hidden sm:grid grid-cols-12 gap-2 px-5 py-3 bg-gray-50 border-b text-xs font-bold text-gray-400 uppercase">
          <span className="col-span-3">Student</span>
          <span className="col-span-2">Contact</span>
          <span className="col-span-1 text-center">#</span>
          <span className="col-span-2 text-center">Questions</span>
          <span className="col-span-1 text-center">Score</span>
          <span className="col-span-1 text-center">Marks</span>
          <span className="col-span-1 text-center">Time</span>
          <span className="col-span-1 text-right">Detail</span>
        </div>

        {isLoading ? (
          <div className="p-10 text-center">
            <div className="w-8 h-8 border-4 border-[var(--org-primary)] border-t-transparent rounded-full animate-spin mx-auto"/>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <Award className="w-10 h-10 mx-auto mb-2 text-gray-200"/>
            <p>No attempts found</p>
          </div>
        ) : filtered.map((a: any) => (
          <div key={a.attemptId}
            className="grid grid-cols-2 sm:grid-cols-12 gap-2 px-5 py-4 items-center border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">

            {/* Student */}
            <div className="col-span-1 sm:col-span-3 flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,var(--org-primary),var(--org-secondary,#6366f1))' }}>
                {a.studentName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">{a.studentName}</p>
                <p className="text-xs text-gray-400 truncate">{new Date(a.completedAt ?? a.startedAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short' })}</p>
              </div>
            </div>

            {/* Contact */}
            <div className="hidden sm:block sm:col-span-2 min-w-0">
              <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                <Mail className="w-3 h-3 flex-shrink-0"/>{a.studentEmail}
              </p>
              {a.studentPhone && (
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                  <Phone className="w-3 h-3 flex-shrink-0"/>{a.studentPhone}
                </p>
              )}
            </div>

            {/* Attempt */}
            <div className="hidden sm:flex sm:col-span-1 justify-center">
              <span className="text-xs bg-gray-100 text-gray-600 font-bold px-2 py-0.5 rounded-full">
                #{a.attemptNumber}
              </span>
            </div>

            {/* Questions */}
            <div className="hidden sm:block sm:col-span-2 text-center">
              <p className="text-sm font-bold text-gray-800">{a.totalQuestions}</p>
              <p className="text-xs">
                <span className="text-green-500">{a.correctAnswers}✓</span>
                {' '}<span className="text-red-400">{a.wrongAnswers}✗</span>
                {' '}<span className="text-gray-400">{a.skippedAnswers}—</span>
              </p>
            </div>

            {/* Score */}
            <div className="col-span-1 sm:col-span-1 text-center">
              <p className={clsx('text-lg font-black', a.passed ? 'text-green-600' : 'text-red-500')}>
                {a.scorePercent}%
              </p>
              <p className={clsx('text-xs font-bold', a.passed ? 'text-green-500' : 'text-red-400')}>
                {a.passed ? '✅ Pass' : '❌ Fail'}
              </p>
            </div>

            {/* Marks */}
            <div className="hidden sm:block sm:col-span-1 text-center">
              <p className="text-sm font-bold text-indigo-600">{a.marksObtained}</p>
              <p className="text-xs text-gray-400">/{a.totalMarks}</p>
            </div>

            {/* Time */}
            <div className="hidden sm:block sm:col-span-1 text-center">
              <p className="text-xs font-medium text-gray-600">{fmtTime(a.timeTakenSecs)}</p>
            </div>

            {/* View button */}
            <div className="col-span-1 sm:col-span-1 flex justify-end">
              <button
                className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1"
                onClick={() => setSelected(a)}>
                <Eye className="w-3.5 h-3.5"/> View
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {selected && (
        <StudentDetailModal
          attempt={selected}
          testId={testId!}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
