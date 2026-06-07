import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft, Plus, Trash2, Save, CheckCircle2,
  Clock, Award, ToggleLeft, AlignLeft, ListChecks
} from 'lucide-react';
import toast from 'react-hot-toast';
import { examsApi, coursesApi } from '../../services/api';
import type { Exam, Question } from '../../types';
import Modal from '../../components/shared/Modal';

const typeIcon: Record<string, React.ReactNode> = {
  SingleChoice: <ListChecks className="w-4 h-4 text-brand-500" />,
  MultiChoice:  <CheckCircle2 className="w-4 h-4 text-green-500" />,
  TrueFalse:    <ToggleLeft className="w-4 h-4 text-amber-500" />,
  ShortAnswer:  <AlignLeft className="w-4 h-4 text-purple-500" />,
};

export default function ExamEditorPage() {
  const { id: courseId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  // Exam form
  const [examModal, setExamModal] = useState(false);
  const [examForm, setEF] = useState({
    title: '', instructions: '', timeLimitMins: '60',
    passMarkPercent: '70', maxAttempts: '3', randomize: false
  });
  const [editingExam, setEditingExam] = useState<Exam | null>(null);

  // Question form
  const [qModal, setQModal] = useState(false);
  const [activeExamId, setActiveExamId] = useState<number | null>(null);
  const [qForm, setQF] = useState({
    text: '', type: 'SingleChoice', marks: '1', explanation: '',
    options: [
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
    ]
  });

  const { data: course } = useQuery({
    queryKey: ['course-exam', courseId],
    queryFn: () => coursesApi.get(Number(courseId)).then(r => r.data),
  });

  const { data: exams = [], isLoading } = useQuery({
    queryKey: ['exams', courseId],
    queryFn: () => examsApi.getByCourse(Number(courseId)).then(r => r.data),
  });

  const createExamMut = useMutation({
    mutationFn: () => examsApi.create({
      title: examForm.title, instructions: examForm.instructions,
      courseId: Number(courseId),
      timeLimitMins: Number(examForm.timeLimitMins),
      passMarkPercent: Number(examForm.passMarkPercent),
      maxAttempts: Number(examForm.maxAttempts),
      randomize: examForm.randomize
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exams', courseId] });
      toast.success('Exam created');
      setExamModal(false);
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Error'),
  });

  const updateExamMut = useMutation({
    mutationFn: () => examsApi.update(editingExam!.id, {
      title: examForm.title, instructions: examForm.instructions,
      timeLimitMins: Number(examForm.timeLimitMins),
      passMarkPercent: Number(examForm.passMarkPercent),
      maxAttempts: Number(examForm.maxAttempts),
      isPublished: editingExam!.isPublished,
      randomize: examForm.randomize
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exams', courseId] });
      toast.success('Exam updated');
      setExamModal(false);
    },
  });

  const togglePublishMut = useMutation({
    mutationFn: (exam: Exam) => examsApi.update(exam.id, { isPublished: !exam.isPublished }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exams', courseId] }),
  });

  const addQuestionMut = useMutation({
    mutationFn: () => examsApi.addQuestion(activeExamId!, {
      text: qForm.text,
      type: qForm.type,
      marks: Number(qForm.marks),
      explanation: qForm.explanation,
      options: ['SingleChoice', 'MultiChoice', 'TrueFalse'].includes(qForm.type)
        ? qForm.options.filter(o => o.text.trim())
        : []
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exams', courseId] });
      toast.success('Question added');
      setQModal(false);
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Error'),
  });

  const openCreateExam = () => {
    setEditingExam(null);
    setEF({ title: '', instructions: '', timeLimitMins: '60', passMarkPercent: '70', maxAttempts: '3', randomize: false });
    setExamModal(true);
  };

  const openEditExam = (exam: Exam) => {
    setEditingExam(exam);
    setEF({
      title: exam.title, instructions: exam.instructions ?? '',
      timeLimitMins: String(exam.timeLimitMins),
      passMarkPercent: String(exam.passMarkPercent),
      maxAttempts: String(exam.maxAttempts),
      randomize: exam.randomize
    });
    setExamModal(true);
  };

  const openAddQuestion = (examId: number) => {
    setActiveExamId(examId);
    setQF({ text: '', type: 'SingleChoice', marks: '1', explanation: '', options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }] });
    setQModal(true);
  };

  const addOption = () => setQF(f => ({ ...f, options: [...f.options, { text: '', isCorrect: false }] }));
  const removeOption = (i: number) => setQF(f => ({ ...f, options: f.options.filter((_, idx) => idx !== i) }));
  const setOption = (i: number, text: string) => setQF(f => ({ ...f, options: f.options.map((o, idx) => idx === i ? { ...o, text } : o) }));
  const setCorrect = (i: number, multi: boolean) => setQF(f => ({
    ...f,
    options: f.options.map((o, idx) =>
      multi
        ? idx === i ? { ...o, isCorrect: !o.isCorrect } : o
        : { ...o, isCorrect: idx === i }
    )
  }));

  const hasMCOptions = ['SingleChoice', 'MultiChoice', 'TrueFalse'].includes(qForm.type);

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button className="btn-ghost" onClick={() => navigate(`/dashboard/courses/${courseId}/edit`)}>
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <div>
            <h1 className="page-title">Exam Editor</h1>
            <p className="page-sub">{course?.title}</p>
          </div>
        </div>
        <button className="btn-primary" onClick={openCreateExam}>
          <Plus className="w-4 h-4" /> New Exam
        </button>
      </div>

      {/* Exams list */}
      {isLoading ? (
        <div className="space-y-3">{[...Array(2)].map((_, i) => <div key={i} className="card h-32 animate-pulse bg-gray-100" />)}</div>
      ) : (exams as Exam[]).length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <Award className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No exams yet</p>
          <p className="text-sm mt-1">Create an exam to assess your students</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(exams as Exam[]).map(exam => (
            <div key={exam.id} className="card overflow-hidden">
              {/* Exam header */}
              <div className="flex items-center gap-4 px-5 py-4 border-b border-gray-100 bg-gray-50">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{exam.title}</h3>
                  {exam.instructions && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{exam.instructions}</p>}
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {exam.timeLimitMins} min</span>
                  <span className="flex items-center gap-1"><Award className="w-3.5 h-3.5" /> Pass: {exam.passMarkPercent}%</span>
                  <span className="flex items-center gap-1"><ListChecks className="w-3.5 h-3.5" /> {exam.questions?.length ?? 0} Qs</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={exam.isPublished ? 'badge-green' : 'badge-gray'}>
                    {exam.isPublished ? 'Published' : 'Draft'}
                  </span>
                  <button className="btn-secondary text-xs" onClick={() => openEditExam(exam)}>Edit</button>
                  <button
                    className={exam.isPublished ? 'btn-secondary text-xs' : 'btn-primary text-xs'}
                    onClick={() => togglePublishMut.mutate(exam)}
                  >
                    {exam.isPublished ? 'Unpublish' : 'Publish'}
                  </button>
                </div>
              </div>

              {/* Questions */}
              <div className="divide-y divide-gray-100">
                {(exam.questions ?? []).map((q: Question, qi) => (
                  <div key={q.id} className="px-5 py-3 flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-brand-50 text-brand-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {qi + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {typeIcon[q.type]}
                        <span className="text-xs text-gray-400 capitalize">{q.type.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <span className="text-xs text-gray-400">· {q.marks} {q.marks === 1 ? 'mark' : 'marks'}</span>
                      </div>
                      <p className="text-sm text-gray-800 font-medium">{q.text}</p>
                      {q.options && q.options.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {q.options.map(opt => (
                            <div key={opt.id} className={`flex items-center gap-2 text-xs px-2 py-1 rounded ${opt.isCorrect ? 'bg-green-50 text-green-700' : 'text-gray-500'}`}>
                              <span className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${opt.isCorrect ? 'bg-green-500 border-green-500' : 'border-gray-300'}`} />
                              {opt.text}
                            </div>
                          ))}
                        </div>
                      )}
                      {q.explanation && (
                        <p className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded mt-2">
                          💡 {q.explanation}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add question button */}
              <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
                <button className="btn-secondary text-xs" onClick={() => openAddQuestion(exam.id)}>
                  <Plus className="w-3.5 h-3.5" /> Add Question
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Exam Modal */}
      <Modal open={examModal} onClose={() => setExamModal(false)} title={editingExam ? 'Edit Exam' : 'Create Exam'} size="lg">
        <div className="space-y-4 p-5">
          <div>
            <label className="label">Exam Title *</label>
            <input className="input" placeholder="e.g. Module 1 Final Quiz" value={examForm.title}
              onChange={e => setEF(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label className="label">Instructions</label>
            <textarea className="input" rows={2} placeholder="Instructions for students…"
              value={examForm.instructions} onChange={e => setEF(f => ({ ...f, instructions: e.target.value }))} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Time Limit (min)</label>
              <input className="input" type="number" min={5} value={examForm.timeLimitMins}
                onChange={e => setEF(f => ({ ...f, timeLimitMins: e.target.value }))} />
            </div>
            <div>
              <label className="label">Pass Mark (%)</label>
              <input className="input" type="number" min={1} max={100} value={examForm.passMarkPercent}
                onChange={e => setEF(f => ({ ...f, passMarkPercent: e.target.value }))} />
            </div>
            <div>
              <label className="label">Max Attempts</label>
              <input className="input" type="number" min={1} value={examForm.maxAttempts}
                onChange={e => setEF(f => ({ ...f, maxAttempts: e.target.value }))} />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={examForm.randomize}
              onChange={e => setEF(f => ({ ...f, randomize: e.target.checked }))} />
            <span className="text-sm text-gray-700">Randomize question order</span>
          </label>
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1 justify-center" onClick={() => setExamModal(false)}>Cancel</button>
            <button className="btn-primary flex-1 justify-center"
              onClick={() => editingExam ? updateExamMut.mutate() : createExamMut.mutate()}
              disabled={!examForm.title || createExamMut.isPending || updateExamMut.isPending}>
              <Save className="w-4 h-4" />
              {(createExamMut.isPending || updateExamMut.isPending) ? 'Saving…' : 'Save Exam'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Question Modal */}
      <Modal open={qModal} onClose={() => setQModal(false)} title="Add Question" size="lg">
        <div className="space-y-4 p-5">
          <div>
            <label className="label">Question Text *</label>
            <textarea className="input" rows={2} placeholder="Type your question here…"
              value={qForm.text} onChange={e => setQF(f => ({ ...f, text: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Question Type</label>
              <select className="input" value={qForm.type}
                onChange={e => {
                  const t = e.target.value;
                  setQF(f => ({
                    ...f, type: t,
                    options: t === 'TrueFalse'
                      ? [{ text: 'True', isCorrect: true }, { text: 'False', isCorrect: false }]
                      : t === 'ShortAnswer' ? []
                      : [{ text: '', isCorrect: false }, { text: '', isCorrect: false }]
                  }));
                }}>
                <option value="SingleChoice">Single Choice</option>
                <option value="MultiChoice">Multiple Choice</option>
                <option value="TrueFalse">True / False</option>
                <option value="ShortAnswer">Short Answer</option>
              </select>
            </div>
            <div>
              <label className="label">Marks</label>
              <input className="input" type="number" min={1} value={qForm.marks}
                onChange={e => setQF(f => ({ ...f, marks: e.target.value }))} />
            </div>
          </div>

          {/* Options for MCQ / TrueFalse */}
          {hasMCOptions && (
            <div>
              <label className="label">
                Options
                <span className="text-xs text-gray-400 font-normal ml-2">
                  {qForm.type === 'MultiChoice' ? 'Check all correct answers' : 'Select the correct answer'}
                </span>
              </label>
              <div className="space-y-2">
                {qForm.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type={qForm.type === 'MultiChoice' ? 'checkbox' : 'radio'}
                      name="correct"
                      checked={opt.isCorrect}
                      onChange={() => setCorrect(i, qForm.type === 'MultiChoice')}
                      className="flex-shrink-0 accent-brand-600"
                    />
                    <input
                      className="input flex-1"
                      placeholder={`Option ${i + 1}`}
                      value={opt.text}
                      onChange={e => setOption(i, e.target.value)}
                      disabled={qForm.type === 'TrueFalse'}
                    />
                    {qForm.type !== 'TrueFalse' && qForm.options.length > 2 && (
                      <button className="p-1 text-gray-400 hover:text-red-500" onClick={() => removeOption(i)}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {qForm.type !== 'TrueFalse' && (
                <button className="btn-ghost text-xs mt-2" onClick={addOption}>
                  <Plus className="w-3.5 h-3.5" /> Add Option
                </button>
              )}
            </div>
          )}

          {qForm.type === 'ShortAnswer' && (
            <div className="bg-amber-50 text-amber-700 text-xs px-3 py-2 rounded-lg">
              Short answer questions will require manual grading after submission.
            </div>
          )}

          <div>
            <label className="label">Explanation (optional)</label>
            <input className="input" placeholder="Shown after student answers…" value={qForm.explanation}
              onChange={e => setQF(f => ({ ...f, explanation: e.target.value }))} />
          </div>

          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1 justify-center" onClick={() => setQModal(false)}>Cancel</button>
            <button className="btn-primary flex-1 justify-center"
              onClick={() => addQuestionMut.mutate()}
              disabled={!qForm.text || addQuestionMut.isPending}>
              {addQuestionMut.isPending ? 'Adding…' : 'Add Question'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
