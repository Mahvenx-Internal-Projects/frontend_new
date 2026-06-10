// LessonSlideOver — standalone component (NOT inside CourseEditorPage render)
// This fixes: blocks state resetting on every parent re-render
import { useState, useEffect } from 'react';
import {
  Save, Plus, Trash2, GripVertical, X,
  ChevronDown, ChevronUp, Eye, EyeOff,
  Video, Music, FileText, Image, AlertCircle,
  Code2, AlignLeft, Minus, BookOpen
} from 'lucide-react';
import toast from 'react-hot-toast';
import FileUpload from '../../components/shared/FileUpload';
import RichTextEditor from '../../components/shared/RichTextEditor';
import clsx from 'clsx';

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
  _videoMode?: 'upload'|'url';
}

const BLOCK_TYPES: { type: BlockType; icon: React.ReactNode; label: string; color: string; desc: string }[] = [
  { type:'Heading', icon:<AlignLeft className="w-4 h-4"/>,  label:'Heading',  color:'bg-gray-100 text-gray-700',    desc:'H1 / H2 / H3 heading' },
  { type:'Text',    icon:<FileText className="w-4 h-4"/>,   label:'Text',     color:'bg-blue-50 text-blue-700',     desc:'Rich paragraph with formatting' },
  { type:'Image',   icon:<Image className="w-4 h-4"/>,      label:'Image',    color:'bg-green-50 text-green-700',   desc:'Upload image with caption' },
  { type:'Video',   icon:<Video className="w-4 h-4"/>,      label:'Video',    color:'bg-purple-50 text-purple-700', desc:'Upload MP4 or paste YouTube URL' },
  { type:'Audio',   icon:<Music className="w-4 h-4"/>,      label:'Audio',    color:'bg-amber-50 text-amber-700',   desc:'Upload MP3/WAV audio lecture' },
  { type:'PDF',     icon:<FileText className="w-4 h-4"/>,   label:'PDF',      color:'bg-red-50 text-red-700',       desc:'PDF viewer with download' },
  { type:'File',    icon:<FileText className="w-4 h-4"/>,   label:'File',     color:'bg-orange-50 text-orange-700', desc:'Downloadable resource file' },
  { type:'Callout', icon:<AlertCircle className="w-4 h-4"/>,label:'Callout',  color:'bg-yellow-50 text-yellow-700', desc:'Info / warning / tip box' },
  { type:'Code',    icon:<Code2 className="w-4 h-4"/>,      label:'Code',     color:'bg-indigo-50 text-indigo-700', desc:'Code snippet with syntax' },
  { type:'Divider', icon:<Minus className="w-4 h-4"/>,      label:'Divider',  color:'bg-gray-50 text-gray-500',     desc:'Horizontal separator line' },
];

function fmtSecs(s: number) {
  if (!s) return '0s';
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60;
  if (h) return `${h}h ${m}m`;
  return m ? `${m}m ${sec}s` : `${sec}s`;
}

// ─── Block editor ─────────────────────────────────────────────
function BlockEditor({ block, onChange }: { block: Block; onChange: (b: Block) => void }) {
  const u = (p: Partial<Block>) => onChange({ ...block, ...p });

  switch (block.type) {
    case 'Heading': return (
      <div className="space-y-2">
        <div className="flex gap-2">
          <select className="input w-28 text-sm" value={block.headingLevel ?? 2} onChange={e => u({ headingLevel: +e.target.value })}>
            <option value={1}>H1 — Big Title</option>
            <option value={2}>H2 — Section</option>
            <option value={3}>H3 — Sub-section</option>
          </select>
          <input className="input flex-1 font-bold" placeholder="Heading text…"
            value={block.headingText ?? ''} onChange={e => u({ headingText: e.target.value })} />
        </div>
        <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 pointer-events-none">
          {block.headingLevel===1 && <p className="text-2xl font-black">{block.headingText||'Heading 1 Preview'}</p>}
          {(block.headingLevel===2||!block.headingLevel) && <p className="text-xl font-bold">{block.headingText||'Heading 2 Preview'}</p>}
          {block.headingLevel===3 && <p className="text-lg font-semibold">{block.headingText||'Heading 3 Preview'}</p>}
        </div>
      </div>
    );

    case 'Text': return (
      <RichTextEditor
        value={block.textContent ?? ''}
        onChange={html => u({ textContent: html })}
        placeholder="Enter your lesson content here. Use the toolbar above for bold, italic, headings, lists, links and more…"
        minHeight={160}
      />
    );

    case 'Image': return (
      <div className="space-y-3">
        <FileUpload type="image" folder="lessons/images" label="Upload Image"
          onUploaded={url => u({ imageUrl: url })} currentUrl={block.imageUrl} />
        {block.imageUrl && (
          <>
            <input className="input text-sm" placeholder="Caption (optional)"
              value={block.imageCaption ?? ''} onChange={e => u({ imageCaption: e.target.value })} />
            <div className="flex gap-2 items-center">
              <span className="text-xs text-gray-500 font-semibold">Align:</span>
              {['left','center','full'].map(a => (
                <button key={a} type="button" onClick={() => u({ imageAlign: a })}
                  className={clsx('px-3 py-1 rounded-lg text-xs font-semibold border-2 capitalize',
                    block.imageAlign===a ? 'border-[var(--org-primary)] text-[var(--org-primary)] bg-[var(--org-primary)]/10' : 'border-gray-200')}>
                  {a}
                </button>
              ))}
            </div>
            <img src={block.imageUrl} alt="" className="max-h-40 rounded-xl object-contain border border-gray-200 bg-gray-50" />
          </>
        )}
      </div>
    );

    case 'Video': return (
      <div className="space-y-3">
        {/* Upload vs URL toggle */}
        <div className="flex gap-2">
          {(['upload','url'] as const).map(mode => (
            <button key={mode} type="button" onClick={() => u({ _videoMode: mode })}
              className={clsx('flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all',
                (block._videoMode ?? 'upload') === mode
                  ? 'border-[var(--org-primary)] bg-[var(--org-primary)]/10 text-[var(--org-primary)]'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300')}>
              {mode === 'upload' ? '⬆️ Upload Video' : '🔗 Paste URL / YouTube'}
            </button>
          ))}
        </div>

        {(block._videoMode ?? 'upload') === 'url' ? (
          <div className="space-y-2">
            <input className="input text-sm" type="url"
              placeholder="https://www.youtube.com/watch?v=... or https://yourcdn.com/video.mp4"
              value={block.videoUrl ?? ''}
              onChange={e => u({ videoUrl: e.target.value })} />
            {(block.videoUrl ?? '').match(/youtube|youtu\.be/) && (
              <p className="text-xs bg-red-50 text-red-600 border border-red-200 rounded-xl px-3 py-2">
                ▶️ YouTube detected — will embed in lesson player automatically.
              </p>
            )}
          </div>
        ) : (
          <FileUpload type="video" folder="lessons/videos" label="Upload Video (MP4, MOV, WebM — max 2 GB)"
            onUploaded={url => u({ videoUrl: url, _videoMode: 'upload' })} currentUrl={block.videoUrl} />
        )}

        {block.videoUrl && (
          <>
            <input className="input text-sm" placeholder="Video title"
              value={block.videoTitle ?? ''} onChange={e => u({ videoTitle: e.target.value })} />
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="text-xs font-semibold text-gray-500 block mb-1">Duration (seconds)</label>
                <input className="input text-sm" type="number" min={0}
                  value={block.videoDurationSecs ?? 0} onChange={e => u({ videoDurationSecs: +e.target.value })} />
              </div>
              <div className="bg-gray-50 rounded-xl px-3 py-2 text-xs text-gray-500 border border-gray-200">
                ≈ {fmtSecs(block.videoDurationSecs ?? 0)}
              </div>
            </div>
            {/* Preview */}
            {(block.videoUrl.includes('youtube') || block.videoUrl.includes('youtu.be')) ? (
              <div className="rounded-2xl overflow-hidden bg-black" style={{aspectRatio:'16/9'}}>
                {(() => {
                  const id = block.videoUrl.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1];
                  return id ? <iframe src={`https://www.youtube.com/embed/${id}`} className="w-full h-full" allowFullScreen title="yt"/> : <p className="text-white text-xs p-4">Invalid YouTube URL</p>;
                })()}
              </div>
            ) : (
              <div className="bg-gray-900 rounded-2xl overflow-hidden" style={{aspectRatio:'16/9'}}>
                <video src={block.videoUrl} controls preload="metadata" className="w-full h-full" />
              </div>
            )}
          </>
        )}
      </div>
    );

    case 'Audio': return (
      <div className="space-y-3">
        <FileUpload type="file" folder="lessons/audio" label="Upload Audio (MP3, WAV, M4A)"
          accept="audio/mpeg,audio/wav,audio/mp4,audio/ogg,.mp3,.wav,.m4a,.ogg"
          onUploaded={url => u({ audioUrl: url })} currentUrl={block.audioUrl} />
        {block.audioUrl && (
          <>
            <input className="input text-sm" placeholder="Audio title"
              value={block.audioTitle ?? ''} onChange={e => u({ audioTitle: e.target.value })} />
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
              <audio src={block.audioUrl} controls className="w-full" />
            </div>
          </>
        )}
      </div>
    );

    case 'PDF': return (
      <div className="space-y-3">
        <FileUpload type="file" folder="lessons/pdfs" label="Upload PDF" accept=".pdf,application/pdf"
          onUploaded={(url, key) => u({ fileUrl: url, fileName: key.split('/').pop() })} currentUrl={block.fileUrl} />
        {block.fileUrl && (
          <>
            <input className="input text-sm" placeholder="PDF title"
              value={block.fileName ?? ''} onChange={e => u({ fileName: e.target.value })} />
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
              <input type="checkbox" checked={block.embedPdf ?? true}
                onChange={e => u({ embedPdf: e.target.checked })} />
              Embed PDF viewer in the lesson (students can read inline)
            </label>
          </>
        )}
      </div>
    );

    case 'File': return (
      <div className="space-y-3">
        <FileUpload type="file" folder="lessons/files" label="Upload Downloadable File"
          onUploaded={(url, key) => u({ fileUrl: url, fileName: key.split('/').pop() })} currentUrl={block.fileUrl} />
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
            const cols: Record<string,string> = { info:'bg-blue-500',warning:'bg-amber-500',success:'bg-green-500',danger:'bg-red-500' };
            const icons: Record<string,string> = { info:'ℹ️',warning:'⚠️',success:'✅',danger:'❌' };
            return (
              <button key={s} type="button" onClick={() => u({ calloutStyle: s })}
                className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border-2 capitalize transition-all',
                  block.calloutStyle===s ? `${cols[s]} text-white border-transparent` : 'border-gray-200 text-gray-600')}>
                {icons[s]} {s}
              </button>
            );
          })}
        </div>
        <textarea className="input w-full min-h-[80px] text-sm" placeholder="Callout message…"
          value={block.calloutText ?? ''} onChange={e => u({ calloutText: e.target.value })} />
        {block.calloutText && (
          <div className={clsx('flex items-start gap-3 p-4 rounded-xl border-2',
            block.calloutStyle==='warning' ? 'bg-amber-50 border-amber-200' :
            block.calloutStyle==='success' ? 'bg-green-50 border-green-200' :
            block.calloutStyle==='danger'  ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200')}>
            <span className="text-xl">{{ info:'ℹ️',warning:'⚠️',success:'✅',danger:'❌' }[block.calloutStyle??'info']}</span>
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
            <option key={l}>{l}</option>)}
        </select>
        <textarea className="input w-full min-h-[120px] font-mono text-sm bg-gray-900 text-green-400 border-gray-700 resize-y"
          placeholder="// Enter code here…"
          value={block.codeContent ?? ''} onChange={e => u({ codeContent: e.target.value })} />
      </div>
    );

    case 'Divider': return <div className="py-2"><hr className="border-dashed border-gray-300" /></div>;
    default: return <p className="text-xs text-gray-400">Unknown block type</p>;
  }
}

// ─── MAIN SLIDE-OVER COMPONENT ────────────────────────────────
interface Props {
  lessonId: number | null;       // null = new lesson
  moduleId: number;
  onClose: () => void;
  onSaved: () => void;
}

export default function LessonSlideOver({ lessonId, moduleId, onClose, onSaved }: Props) {
  const [meta, setMeta] = useState({ title: '', description: '', isPreview: false, isPublished: true, durationSecs: 0 });
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [showBlockMenu, setShowBlockMenu] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const token = () => localStorage.getItem('lms_token') ?? '';
  const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

  // Load existing lesson when editing
  useEffect(() => {
    if (!lessonId) return;
    setLoading(true);
    fetch(`/api/lessons/${lessonId}`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(data => {
        setMeta({ title: data.title, description: data.description ?? '', isPreview: data.isPreview, isPublished: data.isPublished, durationSecs: data.durationSecs });
        setBlocks(data.contentBlocks ?? []);
      })
      .catch(() => toast.error('Failed to load lesson'))
      .finally(() => setLoading(false));
  }, [lessonId]);

  const save = async () => {
    if (!meta.title.trim()) { toast.error('Lesson title is required'); return; }
    setSaving(true);
    try {
      let id = lessonId;
      if (!id) {
        const res = await fetch('/api/lessons', {
          method: 'POST', headers: headers(),
          body: JSON.stringify({ ...meta, type: 'Mixed', displayOrder: 0, moduleId, videoUrl: null, fileUrl: null, content: null })
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        id = data.id;
      } else {
        const res = await fetch(`/api/lessons/${id}`, { method: 'PUT', headers: headers(), body: JSON.stringify(meta) });
        if (!res.ok) throw new Error(await res.text());
      }
      // Save blocks
      const reindexed = blocks.map((b, i) => ({ ...b, order: i }));
      const bRes = await fetch(`/api/lessons/${id}/blocks`, {
        method: 'PUT', headers: headers(),
        body: JSON.stringify({ blocks: reindexed })
      });
      if (!bRes.ok) throw new Error(await bRes.text());
      toast.success(lessonId ? 'Lesson updated!' : 'Lesson created!');
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to save lesson');
    } finally {
      setSaving(false);
    }
  };

  const addBlock = (type: BlockType) => {
    const defaults: Record<BlockType, Partial<Block>> = {
      Heading: { headingText: 'New Section', headingLevel: 2 },
      Text:    { textContent: '' },
      Image:   { imageAlign: 'center' },
      Video:   { videoTitle: '', _videoMode: 'upload' },
      Audio:   { audioTitle: '' },
      PDF:     { embedPdf: true },
      File:    {},
      Callout: { calloutStyle: 'info', calloutText: '' },
      Code:    { codeLanguage: 'javascript', codeContent: '' },
      Divider: {},
    };
    setBlocks(p => [...p, { type, order: p.length, ...defaults[type] }]);
    setShowBlockMenu(false);
  };

  const removeBlock = (i: number) => setBlocks(p => p.filter((_,j) => j!==i).map((b,j) => ({...b,order:j})));
  const moveBlock = (i: number, dir: -1|1) => {
    const next = [...blocks];
    const t = i+dir;
    if (t < 0 || t >= next.length) return;
    [next[i], next[t]] = [next[t], next[i]];
    setBlocks(next.map((b,j) => ({...b,order:j})));
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative ml-auto w-full max-w-2xl h-full bg-white shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white flex-shrink-0">
          <div>
            <h2 className="font-black text-gray-900 text-lg">{lessonId ? 'Edit Lesson' : 'New Lesson'}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{blocks.length} content block{blocks.length!==1?'s':''}</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer px-3 py-2 bg-gray-50 rounded-xl border border-gray-200 select-none">
              <input type="checkbox" checked={meta.isPublished} onChange={e => setMeta(m => ({...m, isPublished: e.target.checked}))} />
              Published
            </label>
            <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer px-3 py-2 bg-gray-50 rounded-xl border border-gray-200 select-none">
              <input type="checkbox" checked={meta.isPreview} onChange={e => setMeta(m => ({...m, isPreview: e.target.checked}))} />
              Free Preview
            </label>
            <button className="btn-primary text-sm flex items-center gap-2" onClick={save} disabled={saving}>
              <Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save Lesson'}
            </button>
            <button className="btn-ghost p-2" onClick={onClose}><X className="w-4 h-4" /></button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin w-8 h-8 rounded-full border-4 border-[var(--org-primary)] border-t-transparent" />
          </div>
        ) : (
          <>
            {/* Lesson meta */}
            <div className="px-5 py-3 border-b border-gray-100 flex-shrink-0 space-y-2 bg-gray-50">
              <input className="input font-semibold text-base" placeholder="Lesson title *"
                value={meta.title} onChange={e => setMeta(m => ({...m, title: e.target.value}))} />
              <RichTextEditor
                value={meta.description}
                onChange={val => setMeta(m => ({...m, description: val}))}
                placeholder="Brief description of what students will learn in this lesson…"
                minHeight={70}
              />
              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-gray-500">Duration (secs):</label>
                <input className="input text-sm w-28" type="number" min={0}
                  value={meta.durationSecs} onChange={e => setMeta(m => ({...m, durationSecs: +e.target.value}))} />
                <span className="text-xs text-gray-400">≈ {fmtSecs(meta.durationSecs)}</span>
              </div>
            </div>

            {/* Blocks list */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {blocks.length === 0 && !loading && (
                <div className="text-center py-14">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="font-semibold text-gray-500">No content blocks yet</p>
                  <p className="text-sm text-gray-400 mt-1">Click "Add Content Block" below to get started</p>
                </div>
              )}

              {blocks.map((block, idx) => {
                const bt = BLOCK_TYPES.find(b => b.type === block.type)!;
                return (
                  <div key={`${block.type}-${idx}`} className="border-2 border-gray-200 rounded-2xl overflow-hidden hover:border-gray-300 transition-colors bg-white">
                    {/* Block header */}
                    <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
                        <span className={clsx('flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full', bt?.color ?? 'bg-gray-100 text-gray-600')}>
                          {bt?.icon} {bt?.label ?? block.type}
                        </span>
                        <span className="text-xs text-gray-400">#{idx + 1}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => moveBlock(idx,-1)} disabled={idx===0} className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30"><ChevronUp className="w-3.5 h-3.5"/></button>
                        <button onClick={() => moveBlock(idx,1)} disabled={idx===blocks.length-1} className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30"><ChevronDown className="w-3.5 h-3.5"/></button>
                        <button onClick={() => removeBlock(idx)} className="p-1.5 rounded-lg hover:bg-red-100 text-red-400 hover:text-red-600 transition-colors"><Trash2 className="w-3.5 h-3.5"/></button>
                      </div>
                    </div>
                    {/* Block editor */}
                    <div className="p-4">
                      <BlockEditor block={block} onChange={b => setBlocks(p => p.map((x,i) => i===idx ? {...b, order:i} : x))} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add block footer */}
            <div className="px-5 py-3 border-t border-gray-100 flex-shrink-0 bg-white">
              <div className="relative">
                <button className="btn-secondary w-full justify-center py-2.5" onClick={() => setShowBlockMenu(s => !s)}>
                  <Plus className="w-4 h-4" /> Add Content Block
                </button>
                {showBlockMenu && (
                  <div className="absolute bottom-12 left-0 right-0 bg-white border border-gray-200 rounded-2xl shadow-2xl p-3 z-20">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 px-1">Choose content type</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {BLOCK_TYPES.map(bt => (
                        <button key={bt.type} type="button" onClick={() => addBlock(bt.type)}
                          className={clsx('flex items-center gap-2 p-3 rounded-xl text-sm font-semibold transition-all hover:scale-[1.01] text-left', bt.color)}>
                          <span className="flex-shrink-0">{bt.icon}</span>
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
          </>
        )}
      </div>
    </div>
  );
}

// Re-export block type and interface for use in CourseEditorPage
export type { Block, BlockType };