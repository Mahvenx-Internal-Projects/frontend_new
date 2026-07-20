import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Trash2, Pencil, Save, ArrowLeft, CheckCircle2,
  Image, ChevronDown, ChevronUp, Calculator, AlignLeft,
  CircleDot, CheckSquare, List, ToggleLeft, Eye, EyeOff, Upload, Download,
  Code2, Terminal, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { mockTestApi, uploadApi, judgeApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import clsx from 'clsx';

// ─── Question type config ─────────────────────────────────────
const Q_TYPES = [
  { value: 'SingleChoice', label: 'Single Choice',  icon: <CircleDot className="w-4 h-4" />,    color: 'text-blue-600 bg-blue-50',    desc: 'One correct answer (radio buttons)' },
  { value: 'MultiChoice',  label: 'Multi Choice',   icon: <CheckSquare className="w-4 h-4" />,  color: 'text-green-600 bg-green-50',  desc: 'Multiple correct answers (checkboxes)' },
  { value: 'Dropdown',     label: 'Dropdown',        icon: <List className="w-4 h-4" />,         color: 'text-purple-600 bg-purple-50', desc: 'Select from a dropdown list' },
  { value: 'TrueFalse',    label: 'True / False',    icon: <ToggleLeft className="w-4 h-4" />,   color: 'text-amber-600 bg-amber-50',  desc: 'True or False question' },
  { value: 'Formula',      label: 'Formula / Math',  icon: <Calculator className="w-4 h-4" />,  color: 'text-red-600 bg-red-50',      desc: 'Mathematical formula with LaTeX' },
  { value: 'ShortAnswer',  label: 'Short Answer',    icon: <AlignLeft className="w-4 h-4" />,   color: 'text-gray-600 bg-gray-50',    desc: 'Free text (manual grading)' },
  { value: 'Coding',       label: '💻 Coding',        icon: <Code2 className="w-4 h-4" />,       color: 'text-indigo-600 bg-indigo-50', desc: 'Write & execute code — LeetCode style compiler' },
];

const diffColors: Record<string, string> = {
  Easy: 'bg-green-100 text-green-700', Medium: 'bg-amber-100 text-amber-700',
  Hard: 'bg-red-100 text-red-700', Mixed: 'bg-blue-100 text-blue-700'
};

// ─── Latex preview component ──────────────────────────────────
function LatexPreview({ latex }: { latex: string }) {
  return (
    <div className="bg-gray-900 text-white rounded-xl p-4 font-mono text-sm my-2">
      <p className="text-xs text-gray-400 mb-1">LaTeX Preview (raw):</p>
      <p className="text-green-400 break-all">{latex || 'Enter LaTeX...'}</p>
      <p className="text-xs text-gray-500 mt-2">Rendered on student view via KaTeX</p>
    </div>
  );
}

// ─── Single question form ─────────────────────────────────────
function QuestionForm({
  testId, question, onSaved, onCancel
}: {
  testId: number;
  question?: any;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    text: question?.text ?? '',
    questionType: question?.questionType ?? 'SingleChoice',
    topic: question?.topic ?? 'General',
    difficulty: question?.difficulty ?? 'Medium',
    marks: question?.marks ?? 1,
    negativeMarks: question?.negativeMarks ?? 0,
    explanation: question?.explanation ?? '',
    imageUrl: question?.imageUrl ?? '',
    explanationImageUrl: question?.explanationImageUrl ?? '',
    formulaLatex: question?.formulaLatex ?? '',
  });

  const [options, setOptions] = useState<{ text: string; isCorrect: boolean; imageUrl: string }[]>(
    question?.options?.map((o: any) => ({ text: o.text, isCorrect: o.isCorrect, imageUrl: o.imageUrl ?? '' })) ??
    [{ text: '', isCorrect: true, imageUrl: '' }, { text: '', isCorrect: false, imageUrl: '' },
     { text: '', isCorrect: false, imageUrl: '' }, { text: '', isCorrect: false, imageUrl: '' }]
  );

  const [uploadingImg, setUploadingImg] = useState<number | 'question' | 'explanation' | null>(null);

  const saveMut = useMutation({
    mutationFn: () => {
      const payload = {
        ...form, mockTestId: testId,
        options: form.questionType === 'TrueFalse'
          ? [{ text: 'True', isCorrect: options[0]?.isCorrect ?? true, imageUrl: '' },
             { text: 'False', isCorrect: !(options[0]?.isCorrect ?? true), imageUrl: '' }]
          : form.questionType === 'ShortAnswer' || form.questionType === 'Formula'
          ? []
          : options.filter(o => o.text.trim()),
      };
      return question
        ? mockTestApi.updateQuestion(question.id, payload)
        : mockTestApi.addQuestion(testId, payload);
    },
    onSuccess: () => { toast.success(question ? 'Question updated' : 'Question added'); onSaved(); },
    onError: () => toast.error('Failed to save question'),
  });

  const uploadImage = async (file: File, target: number | 'question' | 'explanation') => {
    setUploadingImg(target);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const token = localStorage.getItem('lms_token');
      const resp = await fetch('/api/upload/image?folder=questions', {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd
      });
      const data = await resp.json();
      if (target === 'question') setForm(f => ({ ...f, imageUrl: data.url }));
      else if (target === 'explanation') setForm(f => ({ ...f, explanationImageUrl: data.url }));
      else setOptions(prev => prev.map((o, i) => i === target ? { ...o, imageUrl: data.url } : o));
      toast.success('Image uploaded');
    } catch { toast.error('Image upload failed'); }
    finally { setUploadingImg(null); }
  };

  const isCoding    = form.questionType === 'Coding';
  const needsOptions = !['ShortAnswer', 'Formula', 'Coding'].includes(form.questionType);
  const isMulti = form.questionType === 'MultiChoice';
  const isTrueFalse = form.questionType === 'TrueFalse';

  return (
    <div className="bg-white border-2 border-blue-200 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-900">{question ? 'Edit Question' : 'Add New Question'}</h3>
        <button onClick={onCancel} className="btn-ghost text-xs">Cancel</button>
      </div>

      {/* Question type selector */}
      <div>
        <label className="label">Question Type</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Q_TYPES.map(qt => (
            <button key={qt.value} onClick={() => setForm(f => ({ ...f, questionType: qt.value }))}
              className={clsx('flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all text-sm font-semibold',
                form.questionType === qt.value ? `border-transparent ${qt.color} shadow-md` : 'border-gray-200 hover:border-gray-300')}>
              {qt.icon} {qt.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-1">{Q_TYPES.find(q => q.value === form.questionType)?.desc}</p>
      </div>

      {/* Question text */}
      <div>
        <label className="label">Question Text *
          <span className="text-xs font-normal text-gray-400 ml-2">Supports inline LaTeX: \(x^2\)</span>
        </label>
        <textarea className="input min-h-[80px]" placeholder="Enter your question here…"
          value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))} />
      </div>

      {/* Question image upload */}
      <div>
        <label className="label">Question Image (optional)</label>
        <div className="flex items-center gap-3">
          {form.imageUrl && <img src={form.imageUrl} alt="Question" className="h-16 rounded-lg object-cover" />}
          <label className="btn-secondary cursor-pointer text-xs">
            <Image className="w-3.5 h-3.5" />
            {uploadingImg === 'question' ? 'Uploading…' : form.imageUrl ? 'Change Image' : 'Upload Image'}
            <input type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f, 'question'); }} />
          </label>
          {form.imageUrl && <button className="text-xs text-red-400 hover:text-red-600" onClick={() => setForm(f => ({ ...f, imageUrl: '' }))}>Remove</button>}
        </div>
      </div>

      {/* Formula input for math questions */}
      {form.questionType === 'Formula' && (
        <div>
          <label className="label">LaTeX Formula
            <span className="text-xs font-normal text-gray-400 ml-2">e.g. \\frac{"{1}"}{"{2}"} or x^{"{2}"}+y^{"{2}"}=r^{"{2}"}</span>
          </label>
          <textarea className="input font-mono text-sm min-h-[60px]"
            placeholder="e.g. \frac{1}{2} \cdot m \cdot v^{2}"
            value={form.formulaLatex} onChange={e => setForm(f => ({ ...f, formulaLatex: e.target.value }))} />
          <LatexPreview latex={form.formulaLatex} />
        </div>
      )}

      {/* ── Coding question builder ────────────────────────── */}
      {isCoding && <CodingQuestionBuilder questionId={question?.id} testId={testId} />}

      {/* Options */}
      {needsOptions && !isTrueFalse && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label m-0">
              Options {isMulti && <span className="text-xs text-gray-400 font-normal ml-1">(check all correct answers)</span>}
            </label>
            <button className="btn-secondary text-xs" onClick={() => setOptions(p => [...p, { text: '', isCorrect: false, imageUrl: '' }])}>
              <Plus className="w-3 h-3" /> Add Option
            </button>
          </div>
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className={clsx('flex items-start gap-3 p-3 rounded-xl border-2 transition-all',
                opt.isCorrect ? 'border-green-300 bg-green-50' : 'border-gray-200')}>
                {/* Correct toggle */}
                <button
                  onClick={() => {
                    if (isMulti) {
                      setOptions(p => p.map((o, j) => j === i ? { ...o, isCorrect: !o.isCorrect } : o));
                    } else {
                      setOptions(p => p.map((o, j) => ({ ...o, isCorrect: j === i })));
                    }
                  }}
                  className={clsx('w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-2 transition-all',
                    opt.isCorrect ? 'bg-green-500 border-green-500' : 'border-gray-300')}
                  title={isMulti ? 'Toggle correct' : 'Set as correct'}>
                  {opt.isCorrect && <CheckCircle2 className="w-3 h-3 text-white" />}
                </button>
                <div className="flex-1 space-y-1.5">
                  <input className="input py-2" placeholder={`Option ${i + 1}`}
                    value={opt.text} onChange={e => setOptions(p => p.map((o, j) => j === i ? { ...o, text: e.target.value } : o))} />
                  {/* Option image */}
                  <div className="flex items-center gap-2">
                    {opt.imageUrl && <img src={opt.imageUrl} alt="" className="h-10 rounded object-cover" />}
                    <label className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer flex items-center gap-1">
                      <Image className="w-3 h-3" />
                      {uploadingImg === i ? 'Uploading…' : opt.imageUrl ? 'Change' : 'Add Image'}
                      <input type="file" accept="image/*" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f, i); }} />
                    </label>
                    {opt.imageUrl && <button className="text-xs text-red-400" onClick={() => setOptions(p => p.map((o, j) => j === i ? { ...o, imageUrl: '' } : o))}>Remove</button>}
                  </div>
                </div>
                <button onClick={() => setOptions(p => p.filter((_, j) => j !== i))}
                  className="text-red-400 hover:text-red-600 p-1 mt-1 flex-shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* True/False */}
      {isTrueFalse && (
        <div>
          <label className="label">Correct Answer</label>
          <div className="flex gap-3">
            {['True', 'False'].map(val => (
              <button key={val}
                onClick={() => setOptions([{ text: 'True', isCorrect: val === 'True', imageUrl: '' }, { text: 'False', isCorrect: val === 'False', imageUrl: '' }])}
                className={clsx('flex-1 py-3 rounded-xl font-bold text-sm border-2 transition-all',
                  options[0]?.isCorrect === (val === 'True') ? 'border-green-400 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600')}>
                {val === 'True' ? '✅ True' : '❌ False'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Meta fields */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div><label className="label">Topic</label>
          <input className="input" value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))} /></div>
        <div><label className="label">Difficulty</label>
          <select className="input" value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}>
            {['Easy','Medium','Hard'].map(d => <option key={d} value={d}>{d}</option>)}
          </select></div>
        <div><label className="label">Marks</label>
          <input className="input" type="number" min={1} value={form.marks} onChange={e => setForm(f => ({ ...f, marks: Number(e.target.value) }))} /></div>
        <div><label className="label">Negative Marks</label>
          <input className="input" type="number" min={0} value={form.negativeMarks} onChange={e => setForm(f => ({ ...f, negativeMarks: Number(e.target.value) }))} /></div>
      </div>

      {/* Explanation */}
      <div>
        <label className="label">Explanation (shown after answer)</label>
        <textarea className="input" rows={2} placeholder="Explain the correct answer…"
          value={form.explanation} onChange={e => setForm(f => ({ ...f, explanation: e.target.value }))} />
        <div className="flex items-center gap-3 mt-2">
          {form.explanationImageUrl && <img src={form.explanationImageUrl} alt="Explanation" className="h-12 rounded-lg" />}
          <label className="btn-secondary text-xs cursor-pointer">
            <Image className="w-3.5 h-3.5" />
            {uploadingImg === 'explanation' ? 'Uploading…' : 'Add Explanation Image'}
            <input type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f, 'explanation'); }} />
          </label>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button className="btn-secondary flex-1 justify-center" onClick={onCancel}>Cancel</button>
        <button className="btn-primary flex-1 justify-center" onClick={() => saveMut.mutate()}
          disabled={!form.text || saveMut.isPending}>
          {saveMut.isPending ? 'Saving…' : question ? 'Update Question' : 'Add Question'}
        </button>
      </div>
    </div>
  );
}

// ─── CODING QUESTION BUILDER ──────────────────────────────────
// Shown inside QuestionForm when type === 'Coding'.
// Lets admin write the problem, constraints, examples, starter code and test cases.
function CodingQuestionBuilder({ questionId, testId }: { questionId?: number; testId: number }) {
  const qc = useQueryClient();
  const LANGS = ['python', 'cpp', 'java', 'js'];
  const LANG_LABELS: Record<string, string> = { python: 'Python', cpp: 'C++', java: 'Java', js: 'JavaScript' };

  const [problem, setProblem] = useState('');
  const [constraints, setConstraints] = useState('');
  const [sampleInput, setSampleInput] = useState('');
  const [sampleOutput, setSampleOutput] = useState('');
  const [starterCode, setStarterCode] = useState<Record<string, string>>({ python: '', cpp: '', java: '', js: '' });
  const [activeLang, setActiveLang] = useState('python');
  const [testCases, setTestCases] = useState([{ input: '', expectedOutput: '', isHidden: false }]);
  const [runCode, setRunCode] = useState('');
  const [runInput, setRunInput] = useState('');
  const [runLang, setRunLang] = useState('python');
  const [runResult, setRunResult] = useState<any>(null);

  // Load existing coding question if editing
  const { data: existing } = useQuery({
    queryKey: ['coding-q', questionId],
    queryFn: () => judgeApi.getCodingQuestion(questionId!).then((r: any) => r.data),
    enabled: !!questionId,
  });

  useState(() => {
    if (existing) {
      setProblem(existing.problemStatement ?? '');
      setConstraints(existing.constraints ?? '');
      setSampleInput(existing.sampleInput ?? '');
      setSampleOutput(existing.sampleOutput ?? '');
      setStarterCode({ python: existing.starterCodePython ?? '', cpp: existing.starterCodeCpp ?? '', java: existing.starterCodeJava ?? '', js: existing.starterCodeJs ?? '' });
      if (existing.testCases?.length) setTestCases(existing.testCases.map((t: any) => ({ input: t.input, expectedOutput: t.expectedOutput, isHidden: t.isHidden ?? false })));
    }
  });

  const saveCodingQ = useMutation({
    mutationFn: () => judgeApi.createCodingQuestion({
      mockTestQuestionId: questionId,
      problemStatement: problem,
      constraints, sampleInput, sampleOutput,
      starterCodePython: starterCode.python,
      starterCodeCpp:    starterCode.cpp,
      starterCodeJava:   starterCode.java,
      starterCodeJs:     starterCode.js,
      testCases: testCases.map((tc, i) => ({ input: tc.input, expectedOutput: tc.expectedOutput, isHidden: tc.isHidden, order: i })),
    }),
    onSuccess: () => { toast.success('Coding question saved!'); qc.invalidateQueries({ queryKey: ['coding-q', questionId] }); },
    onError: () => toast.error('Save failed — make sure the MCQ question is saved first'),
  });

  const runMut = useMutation({
    mutationFn: () => judgeApi.run(runCode, runLang, runInput),
    onSuccess: (r: any) => setRunResult(r.data),
    onError: () => toast.error('Execution failed'),
  });

  if (!questionId) return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm text-indigo-700">
      <p className="font-bold">💡 Save the question title & marks first</p>
      <p className="mt-1">Click "Add Question" above, then the coding details panel will appear here.</p>
    </div>
  );

  return (
    <div className="space-y-5 border-t-2 border-indigo-200 pt-4 mt-4">
      <div className="flex items-center gap-2">
        <Code2 className="w-5 h-5 text-indigo-600" />
        <h3 className="font-bold text-indigo-700">Coding Question Details</h3>
      </div>

      {/* Problem statement */}
      <div>
        <label className="label">Problem Statement * <span className="text-xs font-normal text-gray-400">(HTML supported)</span></label>
        <textarea className="input font-mono text-sm min-h-[120px]"
          placeholder="<p>Given an array of integers <code>nums</code> and an integer <code>target</code>, return indices of two numbers that add up to target.</p>"
          value={problem} onChange={e => setProblem(e.target.value)} />
        {problem && (
          <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm prose prose-sm max-w-none border"
            dangerouslySetInnerHTML={{ __html: problem }} />
        )}
      </div>

      {/* Constraints & Examples */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Constraints</label>
          <textarea className="input text-sm min-h-[80px] font-mono"
            placeholder={"2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9"}
            value={constraints} onChange={e => setConstraints(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">Sample Input</label>
            <textarea className="input text-sm min-h-[80px] font-mono"
              placeholder={"4\n2 7 11 15\n9"}
              value={sampleInput} onChange={e => setSampleInput(e.target.value)} />
          </div>
          <div>
            <label className="label">Sample Output</label>
            <textarea className="input text-sm min-h-[80px] font-mono"
              placeholder="0 1"
              value={sampleOutput} onChange={e => setSampleOutput(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Starter code per language */}
      <div>
        <label className="label">Starter Code (shown to student)</label>
        <div className="flex gap-1 mb-2">
          {LANGS.map(l => (
            <button key={l} onClick={() => setActiveLang(l)}
              className={clsx('px-3 py-1 rounded-lg text-xs font-bold transition-colors',
                activeLang === l ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
              {LANG_LABELS[l]}
            </button>
          ))}
        </div>
        <textarea className="input font-mono text-sm min-h-[120px] bg-gray-900 text-green-400"
          placeholder={`# Write ${LANG_LABELS[activeLang]} starter code here`}
          value={starterCode[activeLang]}
          onChange={e => setStarterCode(p => ({ ...p, [activeLang]: e.target.value }))} />
      </div>

      {/* Test Cases */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label m-0">Test Cases <span className="text-xs font-normal text-gray-400">(hidden cases used for scoring)</span></label>
          <button className="btn-secondary text-xs" onClick={() => setTestCases(p => [...p, { input: '', expectedOutput: '', isHidden: false }])}>
            <Plus className="w-3 h-3" /> Add Case
          </button>
        </div>
        <div className="space-y-3">
          {testCases.map((tc, i) => (
            <div key={i} className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200 relative">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Input (stdin)</label>
                <textarea className="input font-mono text-xs min-h-[60px]"
                  placeholder={"4\n2 7 11 15\n9"}
                  value={tc.input} onChange={e => setTestCases(p => p.map((x, j) => j===i ? {...x, input: e.target.value} : x))} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Expected Output</label>
                <textarea className="input font-mono text-xs min-h-[60px]"
                  placeholder="0 1"
                  value={tc.expectedOutput} onChange={e => setTestCases(p => p.map((x, j) => j===i ? {...x, expectedOutput: e.target.value} : x))} />
              </div>
              <div className="col-span-2 flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                  <input type="checkbox" checked={tc.isHidden}
                    onChange={e => setTestCases(p => p.map((x, j) => j===i ? {...x, isHidden: e.target.checked} : x))} />
                  Hidden (used for scoring, student sees "hidden" label)
                </label>
                {testCases.length > 1 && (
                  <button className="text-red-400 hover:text-red-600" onClick={() => setTestCases(p => p.filter((_, j) => j!==i))}>
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Test your code here */}
      <div className="bg-gray-900 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Terminal className="w-4 h-4 text-green-400" />
          <p className="text-sm font-bold text-white">Test Code (Admin Preview)</p>
        </div>
        <div className="flex gap-2 mb-2">
          {LANGS.map(l => (
            <button key={l} onClick={() => setRunLang(l)}
              className={clsx('px-2 py-0.5 rounded text-xs font-bold',
                runLang === l ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300')}>
              {LANG_LABELS[l]}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-gray-500 mb-1">Code</p>
            <textarea className="w-full bg-gray-800 text-green-400 font-mono text-xs p-2 rounded min-h-[120px] focus:outline-none"
              value={runCode} onChange={e => setRunCode(e.target.value)} placeholder="# paste code to test" />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Stdin</p>
            <textarea className="w-full bg-gray-800 text-green-400 font-mono text-xs p-2 rounded min-h-[60px] focus:outline-none"
              value={runInput} onChange={e => setRunInput(e.target.value)} />
            {runResult && (
              <div className="mt-2">
                <p className="text-xs text-gray-500 mb-1">Output</p>
                <pre className="text-xs text-green-400 bg-gray-800 p-2 rounded font-mono whitespace-pre-wrap">
                  {runResult.stdout || runResult.stderr || runResult.compileOutput || '(empty)'}
                </pre>
                <p className="text-xs text-gray-500 mt-1">{runResult.status} {runResult.timeMs && `· ${runResult.timeMs}ms`}</p>
              </div>
            )}
          </div>
        </div>
        <button className="btn-secondary text-xs text-green-600 border-green-700"
          onClick={() => runMut.mutate()} disabled={runMut.isPending}>
          ▶ {runMut.isPending ? 'Running…' : 'Run Code'}
        </button>
      </div>

      <button className="btn-primary w-full justify-center py-3 font-bold"
        onClick={() => saveCodingQ.mutate()} disabled={saveCodingQ.isPending || !problem}>
        {saveCodingQ.isPending ? 'Saving…' : '💾 Save Coding Question & Test Cases'}
      </button>
    </div>
  );
}

// ─── MAIN PAGE ─────────────────────────────────────────────────
export default function MockTestEditorPage() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [expandedQ, setExpandedQ] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const bulkInputRef = useRef<HTMLInputElement>(null);

  const { data: test, isLoading } = useQuery({
    queryKey: ['mocktest-edit', testId],
    queryFn: () => mockTestApi.get(Number(testId)).then((r: any) => r.data),
    enabled: !!testId,
  });

  const deleteMut = useMutation({
    mutationFn: (qId: number) => mockTestApi.deleteQuestion(qId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mocktest-edit'] }); toast.success('Deleted'); },
  });

  const toggleMut = useMutation({
    mutationFn: (qId: number) => mockTestApi.toggleQuestionActive(qId),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['mocktest-edit'] });
      toast.success(res.data.message);
    },
  });

  const publishMut = useMutation({
    mutationFn: () => mockTestApi.publish(Number(testId)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mocktest-edit'] }); toast.success('Published!'); },
  });

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const token = localStorage.getItem('lms_token');
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`/api/mocktests/${testId}/questions/bulk-upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Upload failed');
      toast.success(`Imported ${data.imported} questions successfully!`);
      qc.invalidateQueries({ queryKey: ['mocktest-edit'] });
    } catch (err: any) {
      toast.error(err.message ?? 'Upload failed');
    } finally {
      setUploading(false);
      if (bulkInputRef.current) bulkInputRef.current.value = '';
    }
  };

  const questions: any[] = test?.questions ?? [];

  // Inline settings edit
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    totalQuestions: String(test?.totalQuestions ?? 20),
    timeLimitMins: String(test?.timeLimitMins ?? 30),
    passMarkPercent: String(test?.passMarkPercent ?? 80),
    maxAttempts: String(test?.maxAttempts ?? 1),
    randomizeQuestions: test?.randomizeQuestions ?? true,
  });
  const updateSettings = useMutation({
    mutationFn: () => mockTestApi.update(Number(testId), {
      title: test?.title, description: test?.description, topic: test?.topic,
      difficulty: test?.difficulty ?? 'Mixed',
      totalQuestions: Number(settings.totalQuestions),
      timeLimitMins: Number(settings.timeLimitMins),
      passMarkPercent: Number(settings.passMarkPercent),
      maxAttempts: Number(settings.maxAttempts),
      randomizeQuestions: settings.randomizeQuestions,
      tags: test?.tags, showResultImmediately: test?.showResultImmediately ?? true,
      organizationId: test?.organizationId, createdById: test?.createdById ?? user?.id,
    }),
    onSuccess: () => { toast.success('Settings saved!'); setShowSettings(false); qc.invalidateQueries({ queryKey: ['mocktest-edit'] }); },
    onError: () => toast.error('Failed to save settings'),
  });

  // Quick-fix: patch just the totalQuestions field
  const fixTotalQuestions = useMutation({
    mutationFn: (n: number) => mockTestApi.setTotalQuestions(Number(testId), n),
    onSuccess: (_: any, n: number) => { toast.success(`Questions per exam set to ${n}!`); qc.invalidateQueries({ queryKey: ['mocktest-edit'] }); },
    onError: () => toast.error('Failed to update'),
  });

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button className="btn-ghost" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4" /></button>
          <div>
            <h1 className="text-xl font-black text-gray-900">{test?.title ?? 'Loading…'}</h1>
            <p className="text-xs text-gray-400">{questions.length} questions · {test?.timeLimitMins} mins · Pass {test?.passMarkPercent}%</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Hidden file input for bulk upload */}
          <input ref={bulkInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleBulkUpload} />
          <button className="btn-secondary text-sm" onClick={() => bulkInputRef.current?.click()} disabled={uploading}>
            <Upload className="w-4 h-4" /> {uploading ? 'Uploading…' : 'Bulk Upload (.xlsx)'}
          </button>
          <a href="/assessment_questions_template.xlsx" download className="btn-secondary text-sm flex items-center gap-1.5">
            <Download className="w-4 h-4" /> Download Template
          </a>
          {test?.status !== 'Published' && (
            <button className="btn-primary" onClick={() => publishMut.mutate()} disabled={questions.length === 0}>
              <Eye className="w-4 h-4" /> Publish Test
            </button>
          )}
          {test?.status === 'Published' && (
            <span className="flex items-center gap-1 text-xs font-bold px-3 py-2 bg-green-100 text-green-700 rounded-xl">
              <CheckCircle2 className="w-3.5 h-3.5" /> Published
            </span>
          )}
        </div>
      </div>

      {/* Warning: too many questions shown */}
      {test && test.totalQuestions > 20 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-bold text-red-700 text-sm">⚠️ Showing too many questions per exam!</p>
            <p className="text-xs text-red-600 mt-0.5">
              Currently set to <strong>{test.totalQuestions}</strong> questions shown per attempt — students see the entire question bank.
              This should be <strong>20</strong> (random from {questions.length} in bank).
            </p>
          </div>
          <button className="btn-primary text-xs shrink-0 bg-red-600 hover:bg-red-700 border-red-600"
            onClick={() => fixTotalQuestions.mutate(20)}
            disabled={fixTotalQuestions.isPending}>
            {fixTotalQuestions.isPending ? 'Fixing…' : 'Fix to 20 ✓'}
          </button>
        </div>
      )}

      {/* Test info + Edit Settings */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-4 text-sm items-center justify-between">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2"><span className="text-gray-400">Difficulty:</span>
              <span className={clsx('px-2 py-0.5 rounded-full text-xs font-bold', diffColors[test?.difficulty ?? 'Mixed'])}>{test?.difficulty}</span></div>
            <div className="flex items-center gap-2"><span className="text-gray-400">Show per exam:</span>
              <strong className={test?.totalQuestions ? 'text-green-700' : 'text-red-500'}>{test?.totalQuestions || '⚠ 0 (will show 20)'}</strong></div>
            <div className="flex items-center gap-2"><span className="text-gray-400">Questions in bank:</span><strong className="text-indigo-600">{questions.length}</strong></div>
            <div className="flex items-center gap-2"><span className="text-gray-400">Time:</span><strong>{test?.timeLimitMins} min</strong></div>
            <div className="flex items-center gap-2"><span className="text-gray-400">Pass:</span><strong>{test?.passMarkPercent}%</strong></div>
            <div className="flex items-center gap-2"><span className="text-gray-400">Max Attempts:</span><strong>{test?.maxAttempts}</strong></div>
          </div>
          <button className="btn-secondary text-xs" onClick={() => { setSettings({ totalQuestions: String(test?.totalQuestions ?? 20), timeLimitMins: String(test?.timeLimitMins ?? 30), passMarkPercent: String(test?.passMarkPercent ?? 80), maxAttempts: String(test?.maxAttempts ?? 1), randomizeQuestions: test?.randomizeQuestions ?? true }); setShowSettings(s => !s); }}>
            ⚙️ Edit Settings
          </button>
          <button className="btn-primary text-xs" onClick={() => navigate(`/dashboard/exam-attempts/${testId}`)}>
            👥 View Student Attempts & Mark Papers
          </button>
        </div>

        {showSettings && (
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Questions shown per exam *</label>
              <input type="number" className="input" min="1" value={settings.totalQuestions}
                onChange={e => setSettings(s => ({...s, totalQuestions: e.target.value}))}
                placeholder="e.g. 20" />
              <p className="text-xs text-gray-400 mt-1">Randomly picked from {questions.length} in bank</p>
            </div>
            <div>
              <label className="label">Time Limit (minutes)</label>
              <input type="number" className="input" min="1" value={settings.timeLimitMins}
                onChange={e => setSettings(s => ({...s, timeLimitMins: e.target.value}))} />
            </div>
            <div>
              <label className="label">Pass Mark %</label>
              <input type="number" className="input" min="1" max="100" value={settings.passMarkPercent}
                onChange={e => setSettings(s => ({...s, passMarkPercent: e.target.value}))} />
            </div>
            <div>
              <label className="label">Max Attempts</label>
              <input type="number" className="input" min="1" value={settings.maxAttempts}
                onChange={e => setSettings(s => ({...s, maxAttempts: e.target.value}))} />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input type="checkbox" id="rand" checked={settings.randomizeQuestions}
                onChange={e => setSettings(s => ({...s, randomizeQuestions: e.target.checked}))} />
              <label htmlFor="rand" className="text-sm font-medium text-gray-700">Randomize Questions</label>
            </div>
            <div className="flex items-end gap-2">
              <button className="btn-primary" onClick={() => updateSettings.mutate()} disabled={updateSettings.isPending}>
                {updateSettings.isPending ? 'Saving…' : 'Save Settings'}
              </button>
              <button className="btn-ghost" onClick={() => setShowSettings(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* Add question button */}
      {!showAddForm && !editingQuestion && (
        <button className="btn-primary w-full justify-center py-3" onClick={() => setShowAddForm(true)}>
          <Plus className="w-4 h-4" /> Add New Question
        </button>
      )}

      {/* Add form */}
      {showAddForm && (
        <QuestionForm testId={Number(testId)}
          onSaved={() => { setShowAddForm(false); qc.invalidateQueries({ queryKey: ['mocktest-edit'] }); }}
          onCancel={() => setShowAddForm(false)} />
      )}

      {/* Questions list */}
      <div className="space-y-3">
        {isLoading ? [...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-2xl" />) :
        questions.map((q: any, idx: number) => (
          <div key={q.id}>
            {editingQuestion?.id === q.id ? (
              <QuestionForm testId={Number(testId)} question={editingQuestion}
                onSaved={() => { setEditingQuestion(null); qc.invalidateQueries({ queryKey: ['mocktest-edit'] }); }}
                onCancel={() => setEditingQuestion(null)} />
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:border-gray-200 transition-colors">
                <div className="flex items-start gap-3 p-4 cursor-pointer"
                  onClick={() => setExpandedQ(expandedQ === q.id ? null : q.id)}>
                  {/* Index */}
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0 mt-0.5"
                    style={{ background: 'linear-gradient(135deg,var(--org-primary),var(--org-secondary))' }}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {/* Type badge */}
                      {(() => {
                        const qt = Q_TYPES.find(t => t.value === q.questionType);
                        return <span className={clsx('flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full', qt?.color)}>
                          {qt?.icon}{qt?.label}
                        </span>;
                      })()}
                      <span className={clsx('text-xs font-bold px-2 py-0.5 rounded-full', diffColors[q.difficulty])}>{q.difficulty}</span>
                      <span className="text-xs text-gray-400">{q.topic}</span>
                      {q.isActive === false && (
                        <span className="text-xs font-black px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                          🚫 INACTIVE — Hidden from exam
                        </span>
                      )}
                      <span className="text-xs font-semibold text-gray-600 ml-auto">{q.marks} mark{q.marks !== 1 ? 's' : ''}</span>
                    </div>
                    <p className={clsx('text-sm line-clamp-2', q.isActive === false ? 'text-gray-400 line-through' : 'text-gray-800')}>{q.text}</p>
                    {q.imageUrl && <img src={q.imageUrl} alt="" className="h-10 rounded mt-1 object-cover" />}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Active/Inactive toggle */}
                    <button
                      title={q.isActive === false ? 'Inactive — click to SHOW in exam' : 'Active — click to HIDE from exam'}
                      className={clsx('p-1.5 rounded-lg text-xs font-bold transition-all',
                        q.isActive === false
                          ? 'bg-red-100 text-red-500 hover:bg-red-200'
                          : 'bg-green-100 text-green-600 hover:bg-green-200')}
                      onClick={e => { e.stopPropagation(); toggleMut.mutate(q.id); }}>
                      {q.isActive === false ? '🔴' : '🟢'}
                    </button>
                    <button className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-400"
                      onClick={e => { e.stopPropagation(); setEditingQuestion(q); }}>
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button className="p-1.5 hover:bg-red-50 rounded-lg text-red-400"
                      onClick={e => { e.stopPropagation(); if(confirm('Delete?')) deleteMut.mutate(q.id); }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {expandedQ === q.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </div>

                {/* Expanded: show options */}
                {expandedQ === q.id && (
                  <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-2">
                    {q.formulaLatex && (
                      <div className="bg-gray-900 rounded-xl p-3 text-green-400 font-mono text-sm">
                        {q.formulaLatex}
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options?.map((opt: any) => (
                        <div key={opt.id}
                          className={clsx('flex items-center gap-2 p-2.5 rounded-xl border text-sm',
                            opt.isCorrect ? 'border-green-300 bg-green-50 text-green-800' : 'border-gray-200 text-gray-600')}>
                          <span className={clsx('w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0',
                            opt.isCorrect ? 'bg-green-500' : 'bg-gray-200')}>
                            {opt.isCorrect && <CheckCircle2 className="w-3 h-3 text-white" />}
                          </span>
                          {opt.imageUrl && <img src={opt.imageUrl} alt="" className="h-8 rounded object-cover" />}
                          <span>{opt.text}</span>
                        </div>
                      ))}
                    </div>
                    {q.explanation && (
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800">
                        💡 <strong>Explanation:</strong> {q.explanation}
                        {q.explanationImageUrl && <img src={q.explanationImageUrl} alt="" className="mt-2 h-16 rounded object-cover" />}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {questions.length === 0 && !isLoading && !showAddForm && (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
          <div className="text-5xl mb-3">📝</div>
          <p className="font-bold text-gray-500">No questions yet</p>
          <p className="text-sm text-gray-400 mt-1">Add questions to build your assessment</p>
        </div>
      )}
    </div>
  );
}
