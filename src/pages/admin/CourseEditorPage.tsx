import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Save, ChevronLeft, Plus, Trash2, GripVertical, Eye,
  BookOpen, Settings, Video, Music, Image, FileText,
  Code2, AlignLeft, Minus, AlertCircle, ChevronDown,
  ChevronRight, CheckCircle2, Globe, Lock, Pencil
} from 'lucide-react';
import toast from 'react-hot-toast';
import { coursesApi, categoriesApi, modulesApi, lessonsApi, usersApi, uploadApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import Modal from '../../components/shared/Modal';
import FileUpload from '../../components/shared/FileUpload';
import RichTextEditor from '../../components/shared/RichTextEditor';
import clsx from 'clsx';

// ─── Block type definitions (same as LessonEditorPage) ────────
type BlockType = 'Heading'|'Text'|'Image'|'Video'|'Audio'|'PDF'|'File'|'Divider'|'Callout'|'Code';
interface Block {
  type: BlockType; order: number;
  headingText?: string; headingLevel?: number;
  textContent?: string;
  imageUrl?: string; imageCaption?: string; imageAlign?: string;
  videoUrl?: string; videoTitle?: string; videoDurationSecs?: number;
  audioUrl?: string; audioTitle?: string;
  fileUrl?: string; fileName?: string; fileSizeBytes?: number; embedPdf?: boolean;
  calloutText?: string; calloutStyle?: string;
  codeContent?: string; codeLanguage?: string;
}

const CONTENT_BLOCKS: { type: BlockType; icon: React.ReactNode; label: string; color: string; desc: string }[] = [
  { type: 'Heading', icon: <AlignLeft className="w-4 h-4"/>, label: 'Heading',  color: 'bg-gray-100 text-gray-700',   desc: 'Section heading H1/H2/H3' },
  { type: 'Text',    icon: <FileText className="w-4 h-4"/>,  label: 'Text',     color: 'bg-blue-50 text-blue-700',    desc: 'Paragraph with bold/italic' },
  { type: 'Image',   icon: <Image className="w-4 h-4"/>,     label: 'Image',    color: 'bg-green-50 text-green-700',  desc: 'Upload or embed image' },
  { type: 'Video',   icon: <Video className="w-4 h-4"/>,     label: 'Video',    color: 'bg-purple-50 text-purple-700',desc: 'Upload MP4 video lesson' },
  { type: 'Audio',   icon: <Music className="w-4 h-4"/>,     label: 'Audio',    color: 'bg-amber-50 text-amber-700',  desc: 'Upload audio lecture' },
  { type: 'PDF',     icon: <FileText className="w-4 h-4"/>,  label: 'PDF',      color: 'bg-red-50 text-red-700',      desc: 'PDF viewer with download' },
  { type: 'File',    icon: <FileText className="w-4 h-4"/>,  label: 'File',     color: 'bg-orange-50 text-orange-700',desc: 'Downloadable resource' },
  { type: 'Callout', icon: <AlertCircle className="w-4 h-4"/>,label:'Callout',  color: 'bg-yellow-50 text-yellow-700',desc: 'Info / warning / tip box' },
  { type: 'Code',    icon: <Code2 className="w-4 h-4"/>,     label: 'Code',     color: 'bg-indigo-50 text-indigo-700',desc: 'Code snippet with syntax' },
  { type: 'Divider', icon: <Minus className="w-4 h-4"/>,     label: 'Divider',  color: 'bg-gray-50 text-gray-500',    desc: 'Horizontal separator' },
];

function fmtSecs(s: number) {
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${sec}s`;
  return `${sec}s`;
}

// ─── Block editor ──────────────────────────────────────────────
function BlockEdit({ block, onChange, onUploadVideo }: {
  block: Block;
  onChange: (b: Block) => void;
  onUploadVideo?: (url: string) => void;
}) {
  const u = (p: Partial<Block>) => onChange({ ...block, ...p });
  switch (block.type) {
    case 'Heading': return (
      <div className="space-y-2">
        <div className="flex gap-2">
          <select className="input w-28 text-sm" value={block.headingLevel ?? 2}
            onChange={e => u({ headingLevel: Number(e.target.value) })}>
            <option value={1}>H1 — Big</option>
            <option value={2}>H2 — Section</option>
            <option value={3}>H3 — Sub</option>
          </select>
          <input className="input flex-1 font-bold" placeholder="Heading text…"
            value={block.headingText ?? ''} onChange={e => u({ headingText: e.target.value })} />
        </div>
        <div className="p-3 bg-gray-50 rounded-xl pointer-events-none">
          {block.headingLevel===1 && <p className="text-2xl font-black text-gray-900">{block.headingText||'Heading 1'}</p>}
          {(block.headingLevel===2||!block.headingLevel) && <p className="text-xl font-bold text-gray-800">{block.headingText||'Heading 2'}</p>}
          {block.headingLevel===3 && <p className="text-lg font-semibold text-gray-700">{block.headingText||'Heading 3'}</p>}
        </div>
      </div>
    );
    case 'Text': return (
      <RichTextEditor
        value={block.textContent ?? ''}
        onChange={html => u({ textContent: html })}
        placeholder="Enter your lesson content here. Use the toolbar above for bold, italic, lists, headings, links and more…"
        minHeight={150}
      />
    );
    case 'Image': return (
      <div className="space-y-3">
        <FileUpload type="image" folder="lessons/images" label="Upload Image"
          onUploaded={url => u({ imageUrl: url })} currentUrl={block.imageUrl} />
        {block.imageUrl && (
          <div className="space-y-2">
            <input className="input text-sm" placeholder="Caption (optional)"
              value={block.imageCaption ?? ''} onChange={e => u({ imageCaption: e.target.value })} />
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-semibold">Align:</span>
              {['left','center','full'].map(a => (
                <button key={a} type="button" onClick={() => u({ imageAlign: a })}
                  className={clsx('px-3 py-1 rounded-lg text-xs font-semibold border-2 capitalize transition-all',
                    block.imageAlign===a ? 'border-[var(--org-primary)] text-[var(--org-primary)] bg-[var(--org-primary)]/10' : 'border-gray-200 hover:border-gray-300')}>
                  {a}
                </button>
              ))}
            </div>
            <div className="rounded-xl overflow-hidden bg-gray-100 p-2">
              <img src={block.imageUrl} alt={block.imageCaption??''} className="max-h-40 object-contain mx-auto rounded-lg" />
              {block.imageCaption && <p className="text-xs text-center text-gray-500 mt-1">{block.imageCaption}</p>}
            </div>
          </div>
        )}
      </div>
    );
    case 'Video': return (
      <div className="space-y-3">
        <FileUpload type="video" folder="lessons/videos" label="Upload Video (MP4, MOV, WebM)"
          onUploaded={url => { u({ videoUrl: url }); onUploadVideo?.(url); }} currentUrl={block.videoUrl} />
        {block.videoUrl && (
          <div className="space-y-2">
            <input className="input text-sm" placeholder="Video title"
              value={block.videoTitle ?? ''} onChange={e => u({ videoTitle: e.target.value })} />
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-gray-500 font-semibold mb-1 block">Duration (seconds)</label>
                <input className="input text-sm" type="number" min={0}
                  value={block.videoDurationSecs ?? 0} onChange={e => u({ videoDurationSecs: Number(e.target.value) })} />
              </div>
              <div className="flex-1 flex items-end">
                <div className="bg-gray-50 rounded-xl p-2 text-xs text-gray-500 w-full">
                  ≈ {fmtSecs(block.videoDurationSecs ?? 0)} display
                </div>
              </div>
            </div>
            <div className="bg-gray-900 rounded-2xl overflow-hidden" style={{aspectRatio:'16/9'}}>
              <video src={block.videoUrl} controls className="w-full h-full" preload="metadata" />
            </div>
          </div>
        )}
      </div>
    );
    case 'Audio': return (
      <div className="space-y-3">
        <FileUpload type="file" folder="lessons/audio" label="Upload Audio (MP3, WAV, M4A)"
          accept="audio/mpeg,audio/wav,audio/mp4,audio/ogg,.mp3,.wav,.m4a,.ogg"
          onUploaded={url => u({ audioUrl: url })} currentUrl={block.audioUrl} />
        {block.audioUrl && (
          <div className="space-y-2">
            <input className="input text-sm" placeholder="Audio title"
              value={block.audioTitle ?? ''} onChange={e => u({ audioTitle: e.target.value })} />
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
              <p className="text-xs text-amber-700 font-semibold mb-2">🎵 {block.audioTitle || 'Audio lesson'}</p>
              <audio src={block.audioUrl} controls className="w-full" />
            </div>
          </div>
        )}
      </div>
    );
    case 'PDF': return (
      <div className="space-y-3">
        <FileUpload type="file" folder="lessons/pdfs" label="Upload PDF"
          accept=".pdf,application/pdf"
          onUploaded={(url, key) => u({ fileUrl: url, fileName: key.split('/').pop() })}
          currentUrl={block.fileUrl} />
        {block.fileUrl && (
          <div className="space-y-2">
            <input className="input text-sm" placeholder="PDF title"
              value={block.fileName ?? ''} onChange={e => u({ fileName: e.target.value })} />
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
              <input type="checkbox" checked={block.embedPdf ?? true}
                onChange={e => u({ embedPdf: e.target.checked })} />
              Embed PDF viewer (students can read inline)
            </label>
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-red-500" />
              <span className="text-sm font-semibold text-red-700">{block.fileName || 'document.pdf'}</span>
            </div>
          </div>
        )}
      </div>
    );
    case 'File': return (
      <div className="space-y-3">
        <FileUpload type="file" folder="lessons/files" label="Upload Downloadable File"
          onUploaded={(url, key) => u({ fileUrl: url, fileName: key.split('/').pop() })}
          currentUrl={block.fileUrl} />
        {block.fileUrl && (
          <input className="input text-sm" placeholder="File display name"
            value={block.fileName ?? ''} onChange={e => u({ fileName: e.target.value })} />
        )}
      </div>
    );
    case 'Callout': return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {['info','warning','success','danger'].map(s => {
            const colors: Record<string,string> = { info:'bg-blue-500', warning:'bg-amber-500', success:'bg-green-500', danger:'bg-red-500' };
            const icons: Record<string,string> = { info:'ℹ️', warning:'⚠️', success:'✅', danger:'❌' };
            return (
              <button key={s} type="button" onClick={() => u({ calloutStyle: s })}
                className={clsx('flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all capitalize',
                  block.calloutStyle===s ? `${colors[s]} text-white border-transparent` : 'border-gray-200 text-gray-600 hover:border-gray-300')}>
                {icons[s]} {s}
              </button>
            );
          })}
        </div>
        <textarea className="input w-full min-h-[80px] text-sm" placeholder="Callout message…"
          value={block.calloutText ?? ''} onChange={e => u({ calloutText: e.target.value })} />
        {block.calloutText && (
          <div className={clsx('flex items-start gap-3 p-4 rounded-xl border-2',
            block.calloutStyle==='info'    ? 'bg-blue-50 border-blue-200' :
            block.calloutStyle==='warning' ? 'bg-amber-50 border-amber-200' :
            block.calloutStyle==='success' ? 'bg-green-50 border-green-200' :
            block.calloutStyle==='danger'  ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200')}>
            <span className="text-xl">{{ info:'ℹ️', warning:'⚠️', success:'✅', danger:'❌' }[block.calloutStyle??'info']}</span>
            <p className="text-sm text-gray-700">{block.calloutText}</p>
          </div>
        )}
      </div>
    );
    case 'Code': return (
      <div className="space-y-2">
        <select className="input w-44 text-sm" value={block.codeLanguage ?? 'javascript'}
          onChange={e => u({ codeLanguage: e.target.value })}>
          {['javascript','typescript','python','csharp','java','sql','html','css','bash','json','xml','plaintext'].map(l =>
            <option key={l} value={l}>{l}</option>
          )}
        </select>
        <textarea className="input w-full min-h-[120px] font-mono text-sm bg-gray-900 text-green-400 border-gray-700 resize-y"
          placeholder="// Enter code here…"
          value={block.codeContent ?? ''} onChange={e => u({ codeContent: e.target.value })} />
      </div>
    );
    case 'Divider': return <div className="py-3"><hr className="border-dashed border-gray-300" /></div>;
    default: return null;
  }
}

// ─── MAIN PAGE ────────────────────────────────────────────────
export default function CourseEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const isEdit = !!id;

  const [activeTab, setActiveTab] = useState<'info'|'content'|'preview'>('info');
  const [courseForm, setCF] = useState({
    title: '', description: '', level: 'Beginner', status: 'Draft',
    price: '0', isFree: true, categoryId: '', thumbnailUrl: '', tags: '', language: 'English',
    instructorId: ''
  });

  // ─── Module & lesson state ───────────────────────────────────
  const [expandedModule, setExpandedModule] = useState<number|null>(null);
  const [modModal, setModModal] = useState(false);
  const [editingMod, setEditingMod] = useState<any>(null);
  const [modForm, setMF] = useState({ title: '', description: '' });

  // Lesson editor state (inline within the module)
  const [editingLesson, setEditingLesson] = useState<any>(null);
  const [lessonMeta, setLM] = useState({ title: '', description: '', isPreview: false, isPublished: true, durationSecs: 0, moduleId: 0 });
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [showBlockMenu, setShowBlockMenu] = useState(false);
  const [savingLesson, setSavingLesson] = useState(false);

  const { data: courseData } = useQuery({
    queryKey: ['course-edit', id],
    queryFn: () => coursesApi.get(Number(id)).then(r => r.data),
    enabled: isEdit,
  });

  useEffect(() => {
    if (courseData) {
      setCF({
        title: courseData.title, description: courseData.description ?? '',
        level: courseData.level, status: courseData.status,
        price: String(courseData.price), isFree: courseData.isFree,
        categoryId: String(courseData.categoryId), thumbnailUrl: courseData.thumbnailUrl ?? '',
        tags: courseData.tags ?? '', language: courseData.language ?? 'English',
        instructorId: String(courseData.instructorId)
      });
    }
  }, [courseData]);

  const { data: modules = [], refetch: refetchModules } = useQuery({
    queryKey: ['modules', id],
    queryFn: () => coursesApi.getModules(Number(id)).then(r => r.data),
    enabled: isEdit,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['cats-all'],
    queryFn: () => categoriesApi.getAll(user?.organizationId).then(r => r.data),
  });

  const { data: instructors = [] } = useQuery({
    queryKey: ['instructors'],
    queryFn: () => usersApi.getAll({ role: 'Instructor', size: 100 }).then(r => r.data.items ?? []),
  });

  const saveCourse = useMutation({
    mutationFn: async () => {
      const payload = {
        title: courseForm.title, description: courseForm.description,
        level: courseForm.level, status: courseForm.status,
        price: Number(courseForm.price), isFree: courseForm.isFree,
        categoryId: Number(courseForm.categoryId),
        thumbnailUrl: courseForm.thumbnailUrl, tags: courseForm.tags,
        language: courseForm.language, instructorId: Number(courseForm.instructorId),
        organizationId: user!.organizationId,
      };
      if (isEdit) return coursesApi.update(Number(id), payload);
      return coursesApi.create(payload);
    },
    onSuccess: (res: any) => {
      toast.success('Course saved!');
      if (!isEdit) navigate(`/dashboard/courses/${res.data.id}/edit`);
      qc.invalidateQueries({ queryKey: ['courses'] });
    },
    onError: () => toast.error('Failed to save'),
  });

  const createMod = useMutation({
    mutationFn: () => coursesApi.createModule({ ...modForm, courseId: Number(id), displayOrder: (modules as any[]).length }),
    onSuccess: () => { refetchModules(); setModModal(false); toast.success('Module added'); },
  });

  const deleteMod = useMutation({
    mutationFn: (mid: number) => coursesApi.deleteModule(mid),
    onSuccess: () => { refetchModules(); toast.success('Module deleted'); },
  });

  // Open lesson editor
  const openLesson = async (lesson: any | null, moduleId: number) => {
    if (!lesson) {
      // New lesson
      setEditingLesson({ id: null });
      setLM({ title: '', description: '', isPreview: false, isPublished: true, durationSecs: 0, moduleId });
      setBlocks([]);
    } else {
      setEditingLesson(lesson);
      setLM({ title: lesson.title, description: lesson.description ?? '', isPreview: lesson.isPreview, isPublished: lesson.isPublished, durationSecs: lesson.durationSecs, moduleId: lesson.moduleId });
      // Fetch blocks
      try {
        const res = await (window as any).fetch(`/api/lessons/${lesson.id}/blocks`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('lms_token')}` }
        });
        const data = await res.json();
        setBlocks(data ?? []);
      } catch { setBlocks([]); }
    }
  };

  const saveLesson = async () => {
    setSavingLesson(true);
    const token = localStorage.getItem('lms_token');
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
    try {
      let lessonId = editingLesson?.id;
      if (!lessonId) {
        const res = await fetch('/api/lessons', { method: 'POST', headers, body: JSON.stringify({ ...lessonMeta, type: 'Mixed', displayOrder: 0, videoUrl: null, fileUrl: null, content: null }) });
        const data = await res.json();
        lessonId = data.id;
      } else {
        await fetch(`/api/lessons/${lessonId}`, { method: 'PUT', headers, body: JSON.stringify(lessonMeta) });
      }
      // Save blocks
      const reindexed = blocks.map((b, i) => ({ ...b, order: i }));
      await fetch(`/api/lessons/${lessonId}/blocks`, { method: 'PUT', headers, body: JSON.stringify({ blocks: reindexed }) });
      toast.success('Lesson saved!');
      setEditingLesson(null);
      refetchModules();
    } catch { toast.error('Failed to save lesson'); }
    finally { setSavingLesson(false); }
  };

  const deleteLesson = async (lessonId: number) => {
    if (!confirm('Delete lesson?')) return;
    await fetch(`/api/lessons/${lessonId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('lms_token')}` } });
    refetchModules();
    toast.success('Lesson deleted');
  };

  const addBlock = (type: BlockType) => {
    const defaults: Record<BlockType, Partial<Block>> = {
      Heading: { headingText: 'New Section', headingLevel: 2 },
      Text:    { textContent: '' },
      Image:   { imageAlign: 'center' },
      Video:   { videoTitle: '' },
      Audio:   { audioTitle: '' },
      PDF:     { embedPdf: true },
      File:    {},
      Callout: { calloutStyle: 'info', calloutText: '' },
      Code:    { codeLanguage: 'javascript', codeContent: '' },
      Divider: {},
    };
    setBlocks(prev => [...prev, { type, order: prev.length, ...defaults[type] }]);
    setShowBlockMenu(false);
  };

  const removeBlock = (i: number) => setBlocks(prev => prev.filter((_,j) => j!==i));
  const moveBlock  = (i: number, dir: -1|1) => {
    const next = [...blocks];
    const t = i+dir;
    if (t<0||t>=next.length) return;
    [next[i],next[t]] = [next[t],next[i]];
    setBlocks(next.map((b,j) => ({...b,order:j})));
  };

  const mods = modules as any[];
  const p = 'var(--org-primary)';

  // ─── LESSON INLINE EDITOR ────────────────────────────────────
  const LessonEditor = () => (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditingLesson(null)} />
      {/* Panel */}
      <div className="relative ml-auto w-full max-w-3xl h-full bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="font-black text-gray-900">{editingLesson?.id ? 'Edit Lesson' : 'New Lesson'}</h2>
            <p className="text-xs text-gray-400">{blocks.length} content blocks</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer px-3 py-2 bg-gray-50 rounded-xl border border-gray-200">
              <input type="checkbox" checked={lessonMeta.isPublished} onChange={e => setLM(m => ({...m, isPublished: e.target.checked}))} />
              Published
            </label>
            <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer px-3 py-2 bg-gray-50 rounded-xl border border-gray-200">
              <input type="checkbox" checked={lessonMeta.isPreview} onChange={e => setLM(m => ({...m, isPreview: e.target.checked}))} />
              Free Preview
            </label>
            <button className="btn-primary text-sm" onClick={saveLesson} disabled={!lessonMeta.title||savingLesson}>
              <Save className="w-4 h-4" />{savingLesson ? 'Saving…':'Save'}
            </button>
            <button className="btn-ghost" onClick={() => setEditingLesson(null)}>✕</button>
          </div>
        </div>

        {/* Lesson meta */}
        <div className="px-5 py-3 border-b border-gray-100 flex-shrink-0 space-y-2">
          <input className="input font-semibold text-base" placeholder="Lesson title *"
            value={lessonMeta.title} onChange={e => setLM(m => ({...m, title: e.target.value}))} />
          <RichTextEditor
            value={lessonMeta.description}
            onChange={val => setLM(m => ({...m, description: val}))}
            placeholder="Brief description of what students will learn in this lesson…"
            minHeight={90}
          />
        </div>

        {/* Content blocks */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {blocks.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-semibold">No content yet</p>
              <p className="text-sm">Click "Add Content Block" below</p>
            </div>
          )}
          {blocks.map((block, idx) => {
            const bt = CONTENT_BLOCKS.find(b => b.type === block.type)!;
            return (
              <div key={idx} className="border border-gray-200 rounded-2xl overflow-hidden hover:border-gray-300 transition-colors">
                {/* Block header */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-gray-300" />
                    <span className={clsx('flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full', bt.color)}>
                      {bt.icon} {bt.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => moveBlock(idx,-1)} disabled={idx===0} className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30"><ChevronDown className="w-3.5 h-3.5 rotate-180" /></button>
                    <button onClick={() => moveBlock(idx,1)} disabled={idx===blocks.length-1} className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30"><ChevronDown className="w-3.5 h-3.5" /></button>
                    <button onClick={() => removeBlock(idx)} className="p-1.5 rounded-lg hover:bg-red-100 text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <div className="p-4">
                  <BlockEdit block={block} onChange={b => setBlocks(prev => prev.map((x,i) => i===idx ? {...b,order:i} : x))}
                    onUploadVideo={url => setLM(m => ({...m, durationSecs: m.durationSecs || 0}))} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Add block menu */}
        <div className="px-5 py-3 border-t border-gray-100 flex-shrink-0">
          <div className="relative">
            <button className="btn-secondary w-full justify-center" onClick={() => setShowBlockMenu(!showBlockMenu)}>
              <Plus className="w-4 h-4" /> Add Content Block
            </button>
            {showBlockMenu && (
              <div className="absolute bottom-12 left-0 right-0 bg-white border border-gray-200 rounded-2xl shadow-2xl p-3 z-10">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 px-1">Choose content type</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {CONTENT_BLOCKS.map(bt => (
                    <button key={bt.type} onClick={() => addBlock(bt.type)}
                      className={clsx('flex items-center gap-2 p-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]', bt.color)}>
                      {bt.icon}
                      <div>
                        <p>{bt.label}</p>
                        <p className="text-xs font-normal opacity-70">{bt.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button className="btn-ghost" onClick={() => navigate('/dashboard/courses')}><ChevronLeft className="w-4 h-4" /></button>
          <div>
            <h1 className="text-xl font-black text-gray-900">{isEdit ? courseForm.title || 'Edit Course' : 'New Course'}</h1>
            <p className="text-xs text-gray-400">{isEdit ? `Course ID: ${id}` : 'Fill in details and add content'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {isEdit && (
            <button className="btn-secondary" onClick={() => navigate(`/course/${id}`)}>
              <Eye className="w-4 h-4" /> Preview
            </button>
          )}
          <button className="btn-primary" onClick={() => saveCourse.mutate()} disabled={!courseForm.title || saveCourse.isPending}>
            <Save className="w-4 h-4" /> {saveCourse.isPending ? 'Saving…' : 'Save Course'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-1">
        {[['info','⚙️ Course Info'],['content','📚 Content'],['preview','👁 Preview']] .map(([t,l]) => (
          <button key={t} onClick={() => setActiveTab(t as any)}
            className={clsx('px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors',
              activeTab===t ? 'border-[var(--org-primary)] text-[var(--org-primary)]' : 'border-transparent text-gray-500 hover:text-gray-700')}>
            {l}
          </button>
        ))}
      </div>

      {/* ─── INFO TAB ─────────────────────────────────────────── */}
      {activeTab === 'info' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wide">Basic Information</h2>
              <div>
                <label className="label">Course Title *</label>
                <input className="input text-base font-semibold" placeholder="e.g. Complete React & Next.js Masterclass"
                  value={courseForm.title} onChange={e => setCF(f => ({...f, title: e.target.value}))} />
              </div>
              <div>
                <RichTextEditor
                  label="Description"
                  value={courseForm.description}
                  onChange={val => setCF(f => ({...f, description: val}))}
                  placeholder="What will students learn? What makes this course special? Describe the curriculum, outcomes, and who this course is for…"
                  minHeight={180}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Level</label>
                  <select className="input" value={courseForm.level} onChange={e => setCF(f => ({...f, level: e.target.value}))}>
                    {['Beginner','Intermediate','Advanced'].map(l => <option key={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Language</label>
                  <select className="input" value={courseForm.language} onChange={e => setCF(f => ({...f, language: e.target.value}))}>
                    {['English','Hindi','Telugu','Tamil','Kannada','Bengali','Marathi'].map(l => <option key={l}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Tags (comma separated)</label>
                <input className="input" placeholder="e.g. react, javascript, web development"
                  value={courseForm.tags} onChange={e => setCF(f => ({...f, tags: e.target.value}))} />
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wide">Settings</h2>
              <div>
                <label className="label">Category</label>
                <select className="input" value={courseForm.categoryId} onChange={e => setCF(f => ({...f, categoryId: e.target.value}))}>
                  <option value="">Select category</option>
                  {(categories as any[]).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Instructor</label>
                <select className="input" value={courseForm.instructorId} onChange={e => setCF(f => ({...f, instructorId: e.target.value}))}>
                  <option value="">Select instructor</option>
                  {(instructors as any[]).map((i: any) => <option key={i.id} value={i.id}>{i.firstName} {i.lastName}</option>)}
                </select>
              </div>
              {/* Pricing */}
              <div>
                <label className="label">Pricing</label>
                <div className="flex gap-2 mb-2">
                  <button onClick={() => setCF(f => ({...f, isFree: true, price: '0'}))}
                    className={clsx('flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-all',
                      courseForm.isFree ? 'border-green-400 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500')}>
                    🆓 Free
                  </button>
                  <button onClick={() => setCF(f => ({...f, isFree: false}))}
                    className={clsx('flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-all',
                      !courseForm.isFree ? 'border-[var(--org-primary)] bg-[var(--org-primary)]/10 text-[var(--org-primary)]' : 'border-gray-200 text-gray-500')}>
                    💰 Paid
                  </button>
                </div>
                {!courseForm.isFree && (
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-500">₹</span>
                    <input className="input pl-8" type="number" min={0}
                      value={courseForm.price} onChange={e => setCF(f => ({...f, price: e.target.value}))} />
                  </div>
                )}
              </div>
              {/* Status */}
              <div>
                <label className="label">Status</label>
                <div className="flex gap-2">
                  {['Draft','Published'].map(s => (
                    <button key={s} onClick={() => setCF(f => ({...f, status: s}))}
                      className={clsx('flex-1 py-2 rounded-xl text-xs font-bold border-2 flex items-center justify-center gap-1.5 transition-all',
                        courseForm.status===s ? 'border-transparent text-white' : 'border-gray-200 text-gray-500')}
                      style={courseForm.status===s ? { background: s==='Published' ? '#10b981' : '#6b7280' } : {}}>
                      {s==='Published' ? <Globe className="w-3.5 h-3.5"/> : <Lock className="w-3.5 h-3.5"/>} {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Thumbnail */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wide mb-3">Thumbnail</h2>
              <FileUpload type="image" folder="thumbnails" label=""
                onUploaded={url => setCF(f => ({...f, thumbnailUrl: url}))}
                currentUrl={courseForm.thumbnailUrl} />
            </div>
          </div>
        </div>
      )}

      {/* ─── CONTENT TAB ──────────────────────────────────────── */}
      {activeTab === 'content' && (
        <div className="space-y-4">
          {!isEdit && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-700">
              ⚠️ Save the course first before adding content modules.
            </div>
          )}
          {isEdit && (
            <>
              <div className="flex justify-end">
                <button className="btn-primary" onClick={() => { setModModal(true); setEditingMod(null); setMF({ title: '', description: '' }); }}>
                  <Plus className="w-4 h-4" /> Add Module
                </button>
              </div>
              {mods.length === 0 && (
                <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="font-bold text-gray-500">No modules yet</p>
                  <p className="text-sm text-gray-400 mt-1">Modules organize your lessons into sections</p>
                </div>
              )}

              {mods.map((mod: any, mi: number) => (
                <div key={mod.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  {/* Module header */}
                  <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedModule(expandedModule===mod.id ? null : mod.id)}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg,var(--org-primary),var(--org-secondary))' }}>
                        {mi+1}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{mod.title}</p>
                        <p className="text-xs text-gray-400">{mod.lessons?.length ?? 0} lessons</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={e => { e.stopPropagation(); openLesson(null, mod.id); }}
                        className="btn-secondary text-xs py-1.5"><Plus className="w-3 h-3"/>Lesson</button>
                      <button onClick={e => { e.stopPropagation(); if(confirm('Delete module?')) deleteMod.mutate(mod.id); }}
                        className="btn-ghost text-xs text-red-400 py-1.5"><Trash2 className="w-3.5 h-3.5"/></button>
                      {expandedModule===mod.id ? <ChevronDown className="w-4 h-4 text-gray-400"/> : <ChevronRight className="w-4 h-4 text-gray-400"/>}
                    </div>
                  </div>

                  {/* Lessons list */}
                  {expandedModule===mod.id && (
                    <div className="border-t border-gray-100">
                      {(mod.lessons ?? []).length === 0 ? (
                        <div className="px-5 py-6 text-center text-gray-400 text-sm">No lessons yet. Click "+ Lesson" to add.</div>
                      ) : (mod.lessons ?? []).map((lesson: any, li: number) => (
                        <div key={lesson.id}
                          className="flex items-center gap-3 px-5 py-3 border-b border-gray-50 hover:bg-gray-50 group">
                          <span className="text-gray-300 text-sm w-6 text-center">{li+1}</span>
                          <div className={clsx('w-7 h-7 rounded-lg flex items-center justify-center text-xs flex-shrink-0',
                            lesson.type==='Video'?'bg-purple-100 text-purple-600':
                            lesson.type==='Audio'?'bg-amber-100 text-amber-600':
                            lesson.type==='Article'?'bg-blue-100 text-blue-600':'bg-gray-100 text-gray-500')}>
                            {lesson.type==='Video'?<Video className="w-3.5 h-3.5"/>:
                             lesson.type==='Audio'?<Music className="w-3.5 h-3.5"/>:
                             lesson.type==='Article'?<FileText className="w-3.5 h-3.5"/>:<BookOpen className="w-3.5 h-3.5"/>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{lesson.title}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                              <span>{lesson.type}</span>
                              {lesson.durationSecs>0 && <span>· {fmtSecs(lesson.durationSecs)}</span>}
                              {lesson.isPreview && <span className="bg-green-100 text-green-600 px-1.5 py-0.5 rounded font-semibold">Free</span>}
                              {!lesson.isPublished && <span className="bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded font-semibold">Draft</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openLesson(lesson, mod.id)}
                              className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-500"><Pencil className="w-3.5 h-3.5"/></button>
                            <button onClick={() => deleteLesson(lesson.id)}
                              className="p-1.5 rounded-lg hover:bg-red-100 text-red-400"><Trash2 className="w-3.5 h-3.5"/></button>
                          </div>
                        </div>
                      ))}
                      <div className="px-5 py-3">
                        <button className="btn-secondary text-xs w-full justify-center" onClick={() => openLesson(null, mod.id)}>
                          <Plus className="w-3 h-3"/> Add Lesson to {mod.title}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ─── PREVIEW TAB ──────────────────────────────────────── */}
      {activeTab === 'preview' && isEdit && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
          <div className="flex gap-5 flex-col sm:flex-row">
            {courseForm.thumbnailUrl
              ? <img src={courseForm.thumbnailUrl} alt={courseForm.title} className="w-full sm:w-64 h-40 object-cover rounded-2xl flex-shrink-0 shadow-md" />
              : <div className="w-full sm:w-64 h-40 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-50 flex items-center justify-center flex-shrink-0"><BookOpen className="w-12 h-12 text-orange-300"/></div>
            }
            <div className="flex-1">
              <div className="flex flex-wrap gap-2 mb-2">
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-gray-100 text-gray-600">{courseForm.level}</span>
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-gray-100 text-gray-600">{courseForm.language}</span>
                <span className={clsx('text-xs px-2.5 py-1 rounded-full font-semibold', courseForm.status==='Published' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')}>
                  {courseForm.status}
                </span>
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-2">{courseForm.title}</h2>
              <p className="text-gray-500 text-sm mb-3">{courseForm.description}</p>
              <div className="flex items-center gap-4 text-sm">
                <span className="font-black text-2xl" style={{ color: 'var(--org-primary)' }}>
                  {courseForm.isFree ? '🆓 Free' : `₹${Number(courseForm.price).toLocaleString('en-IN')}`}
                </span>
              </div>
            </div>
          </div>
          {/* Curriculum preview */}
          <div className="border-t border-gray-100 pt-5">
            <h3 className="font-bold text-gray-900 mb-3">Curriculum ({mods.length} modules)</h3>
            {mods.map((mod: any, i: number) => (
              <div key={mod.id} className="mb-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">{i+1}</span>
                  <p className="font-semibold text-gray-800">{mod.title}</p>
                  <span className="text-xs text-gray-400">{mod.lessons?.length ?? 0} lessons</span>
                </div>
                {(mod.lessons ?? []).map((l: any) => (
                  <div key={l.id} className="flex items-center gap-2 pl-8 py-1 text-sm text-gray-600">
                    {l.type==='Video'?<Video className="w-3.5 h-3.5 text-purple-400"/>:
                     l.type==='Audio'?<Music className="w-3.5 h-3.5 text-amber-400"/>:
                     <FileText className="w-3.5 h-3.5 text-blue-400"/>}
                    <span>{l.title}</span>
                    {l.durationSecs>0 && <span className="text-gray-400 ml-auto">{fmtSecs(l.durationSecs)}</span>}
                    {l.isPreview && <span className="text-xs text-green-600 font-semibold">Free</span>}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Module Modal */}
      <Modal open={modModal} onClose={() => setModModal(false)} title="Add Module">
        <div className="p-5 space-y-3">
          <div><label className="label">Module Title *</label>
            <input className="input" placeholder="e.g. Getting Started" value={modForm.title} onChange={e => setMF(f => ({...f, title: e.target.value}))} /></div>
          <div>
            <RichTextEditor
              label="Description"
              value={modForm.description}
              onChange={val => setMF(f => ({...f, description: val}))}
              placeholder="What does this module cover?"
              minHeight={100}
            />
          </div>
          <div className="flex gap-3">
            <button className="btn-secondary flex-1 justify-center" onClick={() => setModModal(false)}>Cancel</button>
            <button className="btn-primary flex-1 justify-center" onClick={() => createMod.mutate()} disabled={!modForm.title||createMod.isPending}>
              {createMod.isPending ? 'Adding…' : 'Add Module'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Lesson editor slide-over */}
      {editingLesson && <LessonEditor />}
    </div>
  );
}
