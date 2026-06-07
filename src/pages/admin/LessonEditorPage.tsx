import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Trash2, GripVertical, Save, ArrowLeft, Eye, EyeOff,
  Type, Image, Film, Music, FileText, Minus, AlertCircle, Code2,
  ChevronUp, ChevronDown, Settings, CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import FileUpload from '../../components/shared/FileUpload';
import RichTextEditor from '../../components/shared/RichTextEditor';
import clsx from 'clsx';

// ─── Types ─────────────────────────────────────────────────────
type BlockType = 'Heading'|'Text'|'Image'|'Video'|'Audio'|'PDF'|'File'|'Divider'|'Callout'|'Code';

interface Block {
  type: BlockType;
  order: number;
  headingText?: string; headingLevel?: number;
  textContent?: string;
  imageUrl?: string; imageCaption?: string; imageAlign?: string;
  videoUrl?: string; videoTitle?: string; videoDurationSecs?: number; videoThumbnail?: string;
  audioUrl?: string; audioTitle?: string;
  fileUrl?: string; fileName?: string; fileSizeBytes?: number; embedPdf?: boolean;
  calloutText?: string; calloutStyle?: string;
  codeContent?: string; codeLanguage?: string;
}

const BLOCK_TYPES: { type: BlockType; icon: React.ReactNode; label: string; color: string }[] = [
  { type: 'Heading', icon: <Type className="w-4 h-4" />, label: 'Heading', color: 'bg-gray-100 text-gray-700' },
  { type: 'Text',    icon: <FileText className="w-4 h-4" />, label: 'Text', color: 'bg-blue-50 text-blue-700' },
  { type: 'Image',   icon: <Image className="w-4 h-4" />, label: 'Image', color: 'bg-green-50 text-green-700' },
  { type: 'Video',   icon: <Film className="w-4 h-4" />, label: 'Video', color: 'bg-purple-50 text-purple-700' },
  { type: 'Audio',   icon: <Music className="w-4 h-4" />, label: 'Audio', color: 'bg-amber-50 text-amber-700' },
  { type: 'PDF',     icon: <FileText className="w-4 h-4" />, label: 'PDF', color: 'bg-red-50 text-red-700' },
  { type: 'File',    icon: <FileText className="w-4 h-4" />, label: 'File', color: 'bg-orange-50 text-orange-700' },
  { type: 'Callout', icon: <AlertCircle className="w-4 h-4" />, label: 'Callout', color: 'bg-yellow-50 text-yellow-700' },
  { type: 'Code',    icon: <Code2 className="w-4 h-4" />, label: 'Code', color: 'bg-indigo-50 text-indigo-700' },
  { type: 'Divider', icon: <Minus className="w-4 h-4" />, label: 'Divider', color: 'bg-gray-50 text-gray-500' },
];

function defaultBlock(type: BlockType): Block {
  const base = { type, order: 0 };
  switch (type) {
    case 'Heading': return { ...base, headingText: 'New Heading', headingLevel: 2 };
    case 'Text':    return { ...base, textContent: 'Enter your text here...' };
    case 'Image':   return { ...base, imageAlign: 'center' };
    case 'Video':   return { ...base, videoTitle: '' };
    case 'Audio':   return { ...base, audioTitle: '' };
    case 'PDF':     return { ...base, embedPdf: true };
    case 'File':    return { ...base };
    case 'Callout': return { ...base, calloutText: '', calloutStyle: 'info' };
    case 'Code':    return { ...base, codeContent: '', codeLanguage: 'javascript' };
    default:        return base;
  }
}

// ─── Block editor components ───────────────────────────────────
function BlockEditor({ block, onChange }: { block: Block; onChange: (b: Block) => void }) {
  const u = (patch: Partial<Block>) => onChange({ ...block, ...patch });

  switch (block.type) {
    case 'Heading': return (
      <div className="space-y-2">
        <div className="flex gap-2">
          <select className="input w-28" value={block.headingLevel ?? 2} onChange={e => u({ headingLevel: Number(e.target.value) })}>
            <option value={1}>H1 - Title</option>
            <option value={2}>H2 - Section</option>
            <option value={3}>H3 - Sub</option>
          </select>
          <input className="input flex-1 font-bold" placeholder="Heading text…"
            value={block.headingText ?? ''} onChange={e => u({ headingText: e.target.value })} />
        </div>
        <div className="p-3 bg-gray-50 rounded-xl">
          {block.headingLevel === 1 && <p className="text-2xl font-black text-gray-900">{block.headingText || 'Heading 1'}</p>}
          {block.headingLevel === 2 && <p className="text-xl font-bold text-gray-900">{block.headingText || 'Heading 2'}</p>}
          {block.headingLevel === 3 && <p className="text-lg font-semibold text-gray-800">{block.headingText || 'Heading 3'}</p>}
        </div>
      </div>
    );

    case 'Text': return (
      <RichTextEditor
        value={block.textContent ?? ''}
        onChange={html => u({ textContent: html })}
        placeholder="Enter your content here. Use the toolbar for bold, italic, headings, lists, links and more…"
        minHeight={150}
      />
    );

    case 'Image': return (
      <div className="space-y-3">
        <FileUpload type="image" folder="lessons/images" label="Upload Image"
          onUploaded={(url) => u({ imageUrl: url })}
          currentUrl={block.imageUrl} />
        {block.imageUrl && (
          <>
            <input className="input" placeholder="Caption (optional)" value={block.imageCaption ?? ''} onChange={e => u({ imageCaption: e.target.value })} />
            <div className="flex gap-2">
              <label className="label w-20">Align</label>
              {['left','center','full'].map(a => (
                <button key={a} onClick={() => u({ imageAlign: a })}
                  className={clsx('px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all capitalize',
                    block.imageAlign === a ? 'border-[var(--org-primary)] text-[var(--org-primary)] bg-[var(--org-primary)]/10' : 'border-gray-200')}>
                  {a}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );

    case 'Video': return (
      <div className="space-y-3">
        <FileUpload type="video" folder="lessons/videos" label="Upload Video"
          onUploaded={(url) => u({ videoUrl: url })}
          currentUrl={block.videoUrl} />
        {block.videoUrl && (
          <>
            <input className="input" placeholder="Video title" value={block.videoTitle ?? ''} onChange={e => u({ videoTitle: e.target.value })} />
            <div className="flex gap-3">
              <div className="flex-1"><label className="label">Duration (seconds)</label>
                <input className="input" type="number" value={block.videoDurationSecs ?? 0} onChange={e => u({ videoDurationSecs: Number(e.target.value) })} /></div>
            </div>
            <div className="bg-gray-900 rounded-xl overflow-hidden aspect-video flex items-center justify-center">
              <video src={block.videoUrl} controls className="w-full h-full" preload="metadata" />
            </div>
          </>
        )}
      </div>
    );

    case 'Audio': return (
      <div className="space-y-3">
        <FileUpload type="file" folder="lessons/audio" label="Upload Audio (MP3, WAV, M4A)"
          accept="audio/mpeg,audio/wav,audio/mp4,audio/ogg,.mp3,.wav,.m4a,.ogg"
          onUploaded={(url) => u({ audioUrl: url })}
          currentUrl={block.audioUrl} />
        {block.audioUrl && (
          <>
            <input className="input" placeholder="Audio title" value={block.audioTitle ?? ''} onChange={e => u({ audioTitle: e.target.value })} />
            <div className="bg-gray-50 rounded-xl p-4">
              <audio src={block.audioUrl} controls className="w-full" />
            </div>
          </>
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
          <>
            <input className="input" placeholder="PDF title / filename" value={block.fileName ?? ''} onChange={e => u({ fileName: e.target.value })} />
            <div className="flex items-center gap-3">
              <input type="checkbox" id={`embed-${block.order}`} checked={block.embedPdf ?? true} onChange={e => u({ embedPdf: e.target.checked })} />
              <label htmlFor={`embed-${block.order}`} className="text-sm text-gray-700 cursor-pointer">Embed PDF viewer in page</label>
            </div>
          </>
        )}
      </div>
    );

    case 'File': return (
      <div className="space-y-3">
        <FileUpload type="file" folder="lessons/files" label="Upload Downloadable File"
          onUploaded={(url, key) => u({ fileUrl: url, fileName: key.split('/').pop() })}
          currentUrl={block.fileUrl} />
        {block.fileUrl && (
          <input className="input" placeholder="Display name for the file" value={block.fileName ?? ''} onChange={e => u({ fileName: e.target.value })} />
        )}
      </div>
    );

    case 'Callout': return (
      <div className="space-y-3">
        <div className="flex gap-2">
          {['info','warning','success','danger'].map(style => (
            <button key={style} onClick={() => u({ calloutStyle: style })}
              className={clsx('px-3 py-1.5 rounded-lg text-xs font-bold border-2 capitalize transition-all',
                block.calloutStyle === style ? 'border-transparent text-white' : 'border-gray-200 text-gray-600',
                style === 'info' && block.calloutStyle === style && 'bg-blue-500',
                style === 'warning' && block.calloutStyle === style && 'bg-amber-500',
                style === 'success' && block.calloutStyle === style && 'bg-green-500',
                style === 'danger' && block.calloutStyle === style && 'bg-red-500',
              )}>
              {style === 'info' ? 'ℹ️' : style === 'warning' ? '⚠️' : style === 'success' ? '✅' : '❌'} {style}
            </button>
          ))}
        </div>
        <textarea className="input w-full min-h-[80px]" placeholder="Callout message…"
          value={block.calloutText ?? ''} onChange={e => u({ calloutText: e.target.value })} />
        <CalloutPreview style={block.calloutStyle ?? 'info'} text={block.calloutText ?? 'Callout preview'} />
      </div>
    );

    case 'Code': return (
      <div className="space-y-2">
        <select className="input w-40" value={block.codeLanguage ?? 'javascript'}
          onChange={e => u({ codeLanguage: e.target.value })}>
          {['javascript','typescript','python','csharp','java','sql','html','css','bash','json','xml'].map(l => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
        <textarea className="input w-full min-h-[120px] font-mono text-sm bg-gray-900 text-green-400"
          placeholder="// Enter code here…"
          value={block.codeContent ?? ''} onChange={e => u({ codeContent: e.target.value })} />
      </div>
    );

    case 'Divider': return (
      <div className="py-3"><hr className="border-gray-300 border-dashed" /></div>
    );

    default: return null;
  }
}

function CalloutPreview({ style, text }: { style: string; text: string }) {
  const cfg: Record<string, { bg: string; border: string; icon: string }> = {
    info:    { bg: 'bg-blue-50',   border: 'border-blue-300',  icon: 'ℹ️' },
    warning: { bg: 'bg-amber-50',  border: 'border-amber-300', icon: '⚠️' },
    success: { bg: 'bg-green-50',  border: 'border-green-300', icon: '✅' },
    danger:  { bg: 'bg-red-50',    border: 'border-red-300',   icon: '❌' },
  };
  const c = cfg[style] ?? cfg.info;
  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border-2 ${c.bg} ${c.border}`}>
      <span className="text-lg flex-shrink-0">{c.icon}</span>
      <p className="text-sm text-gray-700">{text}</p>
    </div>
  );
}

// ─── MAIN PAGE ─────────────────────────────────────────────────
export default function LessonEditorPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId?: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isNew = !lessonId || lessonId === 'new';

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [showBlockMenu, setShowBlockMenu] = useState(false);
  const [saved, setSaved] = useState(false);

  const [meta, setMeta] = useState({
    title: '', description: '', isPreview: false, isPublished: true,
    displayOrder: 0, durationSecs: 0, moduleId: 0, type: 'Mixed'
  });

  // Fetch existing lesson
  const { data: lesson } = useQuery({
    queryKey: ['lesson', lessonId],
    queryFn: () => api.get(`/lessons/${lessonId}`).then((r: any) => r.data),
    enabled: !isNew && !!lessonId,
  });

  useEffect(() => {
    if (lesson) {
      setMeta({
        title: lesson.title, description: lesson.description ?? '',
        isPreview: lesson.isPreview, isPublished: lesson.isPublished,
        displayOrder: lesson.displayOrder, durationSecs: lesson.durationSecs,
        moduleId: lesson.moduleId, type: lesson.type,
      });
      setBlocks(lesson.contentBlocks ?? []);
    }
  }, [lesson]);

  // Fetch modules for this course
  const { data: modulesData } = useQuery({
    queryKey: ['modules', courseId],
    queryFn: () => api.get(`/modules/course/${courseId}`).then((r: any) => r.data),
    enabled: !!courseId,
  });
  const modules: any[] = modulesData ?? [];

  const saveMut = useMutation({
    mutationFn: async () => {
      const reindexed = blocks.map((b, i) => ({ ...b, order: i }));
      if (isNew) {
        const { data: created } = await api.post('/lessons', { ...meta, courseId: Number(courseId) });
        await api.put(`/lessons/${created.id}/blocks`, { blocks: reindexed });
        return created;
      } else {
        await api.put(`/lessons/${lessonId}`, meta);
        await api.put(`/lessons/${lessonId}/blocks`, { blocks: reindexed });
        return { id: lessonId };
      }
    },
    onSuccess: (data) => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      qc.invalidateQueries({ queryKey: ['lesson'] });
      toast.success('Lesson saved!');
      if (isNew) navigate(`/dashboard/courses/${courseId}/lesson/${data.id}/edit`, { replace: true });
    },
    onError: () => toast.error('Failed to save'),
  });

  const addBlock = (type: BlockType) => {
    setBlocks(prev => [...prev, { ...defaultBlock(type), order: prev.length }]);
    setShowBlockMenu(false);
  };

  const removeBlock = (idx: number) =>
    setBlocks(prev => prev.filter((_, i) => i !== idx).map((b, i) => ({ ...b, order: i })));

  const moveBlock = (idx: number, dir: -1 | 1) => {
    const next = [...blocks];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setBlocks(next.map((b, i) => ({ ...b, order: i })));
  };

  const updateBlock = (idx: number, b: Block) =>
    setBlocks(prev => prev.map((x, i) => i === idx ? { ...b, order: i } : x));

  const typeInfo = (t: BlockType) => BLOCK_TYPES.find(bt => bt.type === t)!;

  return (
    <div className="max-w-4xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button className="btn-ghost" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4" /></button>
          <div>
            <h1 className="text-xl font-black text-gray-900">
              {isNew ? 'New Lesson' : `Edit: ${meta.title}`}
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">{blocks.length} content blocks</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-200">
            <input type="checkbox" id="published" checked={meta.isPublished}
              onChange={e => setMeta(m => ({ ...m, isPublished: e.target.checked }))} />
            <label htmlFor="published" className="text-xs font-semibold text-gray-600 cursor-pointer flex items-center gap-1">
              {meta.isPublished ? <Eye className="w-3.5 h-3.5 text-green-500" /> : <EyeOff className="w-3.5 h-3.5 text-gray-400" />}
              {meta.isPublished ? 'Published' : 'Draft'}
            </label>
          </div>
          <button className="btn-primary flex items-center gap-2" onClick={() => saveMut.mutate()}
            disabled={!meta.title || !meta.moduleId || saveMut.isPending}>
            {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saveMut.isPending ? 'Saving…' : saved ? 'Saved!' : 'Save Lesson'}
          </button>
        </div>
      </div>

      {/* Lesson metadata */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wide flex items-center gap-2">
          <Settings className="w-4 h-4" /> Lesson Settings
        </h2>
        <div><label className="label">Lesson Title *</label>
          <input className="input text-base font-semibold" placeholder="e.g. Introduction to React Hooks"
            value={meta.title} onChange={e => setMeta(m => ({ ...m, title: e.target.value }))} /></div>
        <div>
          <RichTextEditor
            label="Description"
            value={meta.description}
            onChange={val => setMeta(m => ({ ...m, description: val }))}
            placeholder="Brief description of what students will learn in this lesson…"
            minHeight={100}
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div><label className="label">Module *</label>
            <select className="input" value={meta.moduleId} onChange={e => setMeta(m => ({ ...m, moduleId: Number(e.target.value) }))}>
              <option value={0}>Select module</option>
              {modules.map((mod: any) => <option key={mod.id} value={mod.id}>{mod.title}</option>)}
            </select></div>
          <div><label className="label">Order</label>
            <input className="input" type="number" value={meta.displayOrder}
              onChange={e => setMeta(m => ({ ...m, displayOrder: Number(e.target.value) }))} /></div>
          <div><label className="label">Duration (secs)</label>
            <input className="input" type="number" value={meta.durationSecs}
              onChange={e => setMeta(m => ({ ...m, durationSecs: Number(e.target.value) }))} /></div>
          <div className="flex flex-col justify-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={meta.isPreview}
                onChange={e => setMeta(m => ({ ...m, isPreview: e.target.checked }))} />
              <span className="text-sm font-medium text-gray-700">Free Preview</span>
            </label>
          </div>
        </div>
      </div>

      {/* Content blocks */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wide">Content Blocks</h2>
          <div className="relative">
            <button className="btn-primary text-sm" onClick={() => setShowBlockMenu(!showBlockMenu)}>
              <Plus className="w-4 h-4" /> Add Block
            </button>
            {showBlockMenu && (
              <div className="absolute right-0 top-10 z-20 bg-white border border-gray-200 rounded-2xl shadow-2xl p-2 w-64">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide px-2 py-1 mb-1">Choose block type</p>
                <div className="grid grid-cols-2 gap-1">
                  {BLOCK_TYPES.map(bt => (
                    <button key={bt.type} onClick={() => addBlock(bt.type)}
                      className={clsx('flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]', bt.color)}>
                      {bt.icon} {bt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {blocks.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-gray-300" />
            </div>
            <p className="font-semibold text-gray-500">No content blocks yet</p>
            <p className="text-sm mt-1">Click "Add Block" to start building your lesson</p>
          </div>
        ) : (
          <div className="space-y-3">
            {blocks.map((block, idx) => {
              const ti = typeInfo(block.type);
              return (
                <div key={idx} className="border border-gray-200 rounded-2xl overflow-hidden hover:border-gray-300 transition-colors">
                  {/* Block header */}
                  <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 text-gray-300" />
                      <span className={clsx('flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full', ti.color)}>
                        {ti.icon} {ti.label}
                      </span>
                      <span className="text-xs text-gray-400">#{idx + 1}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => moveBlock(idx, -1)} disabled={idx === 0}
                        className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30 transition-colors">
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => moveBlock(idx, 1)} disabled={idx === blocks.length - 1}
                        className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30 transition-colors">
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => removeBlock(idx)}
                        className="p-1.5 rounded-lg hover:bg-red-100 text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {/* Block content editor */}
                  <div className="p-4">
                    <BlockEditor block={block} onChange={b => updateBlock(idx, b)} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {blocks.length > 0 && (
          <div className="flex justify-end mt-5 pt-4 border-t border-gray-100">
            <button className="btn-primary" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
              <Save className="w-4 h-4" />
              {saveMut.isPending ? 'Saving…' : 'Save All Blocks'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
