import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Save, Plus, Trash2, GripVertical,
  ChevronUp, ChevronDown, Eye, EyeOff, CheckCircle2,
  Video, Music, Image, FileText, AlertCircle, Code2,
  AlignLeft, Minus, BookOpen, Globe, Lock, Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import FileUpload from '../../components/shared/FileUpload';
import RichTextEditor from '../../components/shared/RichTextEditor';
import clsx from 'clsx';

const API_BASE = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? '' : 'https://api.worksupport360.com';


// ─── Types ────────────────────────────────────────────────────
type BlockType = 'Heading'|'Text'|'Image'|'Video'|'Audio'|'PDF'|'File'|'Divider'|'Callout'|'Code';

interface Block {
  type: BlockType; order: number;
  headingText?: string; headingLevel?: number;
  textContent?: string;
  imageUrl?: string; imageCaption?: string; imageAlign?: string;
  videoUrl?: string; videoTitle?: string; videoDurationSecs?: number;
  _videoMode?: 'upload'|'url';
  audioUrl?: string; audioTitle?: string;
  fileUrl?: string; fileName?: string; fileSizeBytes?: number; embedPdf?: boolean;
  calloutText?: string; calloutStyle?: string;
  codeContent?: string; codeLanguage?: string;
}

const BLOCK_PALETTE: { type: BlockType; icon: React.ReactNode; label: string; color: string; bg: string; desc: string }[] = [
  { type:'Heading', icon:<AlignLeft  className="w-4 h-4"/>, label:'Heading',  color:'text-gray-700',    bg:'bg-gray-100',    desc:'H1 / H2 / H3' },
  { type:'Text',    icon:<FileText   className="w-4 h-4"/>, label:'Text',     color:'text-blue-700',    bg:'bg-blue-50',     desc:'Rich paragraph' },
  { type:'Image',   icon:<Image      className="w-4 h-4"/>, label:'Image',    color:'text-green-700',   bg:'bg-green-50',    desc:'Upload or URL' },
  { type:'Video',   icon:<Video      className="w-4 h-4"/>, label:'Video',    color:'text-purple-700',  bg:'bg-purple-50',   desc:'Upload or YouTube' },
  { type:'Audio',   icon:<Music      className="w-4 h-4"/>, label:'Audio',    color:'text-amber-700',   bg:'bg-amber-50',    desc:'MP3 / WAV' },
  { type:'PDF',     icon:<FileText   className="w-4 h-4"/>, label:'PDF',      color:'text-red-700',     bg:'bg-red-50',      desc:'Embed viewer' },
  { type:'File',    icon:<FileText   className="w-4 h-4"/>, label:'File',     color:'text-orange-700',  bg:'bg-orange-50',   desc:'Download link' },
  { type:'Callout', icon:<AlertCircle className="w-4 h-4"/>,label:'Callout',  color:'text-yellow-700',  bg:'bg-yellow-50',   desc:'Info / Warning' },
  { type:'Code',    icon:<Code2      className="w-4 h-4"/>, label:'Code',     color:'text-indigo-700',  bg:'bg-indigo-50',   desc:'Syntax highlight' },
  { type:'Divider', icon:<Minus      className="w-4 h-4"/>, label:'Divider',  color:'text-gray-500',    bg:'bg-gray-50',     desc:'Separator line' },
];

function fmtSecs(s: number) {
  if (!s) return '';
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60;
  if (h) return `${h}h ${m}m`;
  return m ? `${m}m ${sec}s` : `${sec}s`;
}

// ─── Individual block editors ─────────────────────────────────
function BlockEditor({ block, onChange }: { block: Block; onChange: (b: Block) => void }) {
  const u = (p: Partial<Block>) => onChange({ ...block, ...p });

  // TEMPORARY DIAGNOSTIC — remove once PDF upload is confirmed working.
  // Logs the exact raw value and type of block.type on every render, so
  // DevTools Console will show definitively whether this code path runs
  // and what the data actually looks like.
  console.log('[BlockEditor] block.type =', JSON.stringify(block.type), '| typeof:', typeof block.type, '| full block:', block);

  // PDF rendered directly here, completely bypassing the switch/normalize
  // logic below — guarantees this always renders regardless of how
  // block.type is cased in the data ('PDF', 'pdf', 'Pdf', etc).
  if (String(block.type).toLowerCase() === 'pdf') {
    console.log('[BlockEditor] PDF branch matched — rendering upload UI now.');
    return (
      <div className="space-y-4">
        <FileUpload type="file" folder="lessons/pdfs" label="Upload PDF Document"
          accept=".pdf,application/pdf"
          onUploaded={(url, key) => u({ fileUrl: url, fileName: key.split('/').pop() })} currentUrl={block.fileUrl} />
        {block.fileUrl && (
          <div className="space-y-3 p-4 bg-red-50 rounded-xl border border-red-200">
            <input className="input text-sm bg-white" placeholder="PDF display title"
              value={block.fileName ?? ''} onChange={e => u({ fileName: e.target.value })} />
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 font-medium">
              <input type="checkbox" className="rounded" checked={block.embedPdf ?? true}
                onChange={e => u({ embedPdf: e.target.checked })} />
              Show inline PDF viewer for students (they can also download)
            </label>
          </div>
        )}
      </div>
    );
  }

  // Normalize to PascalCase to handle old lowercase data from DB (e.g.
  // 'video' -> 'Video').
  const t = block.type ? (block.type.charAt(0).toUpperCase() + block.type.slice(1).toLowerCase()) as BlockType : block.type;

  switch (t) {

    case 'Heading': return (
      <div className="space-y-3">
        <div className="flex gap-2">
          <select className="input w-32 text-sm font-semibold" value={block.headingLevel ?? 2}
            onChange={e => u({ headingLevel: +e.target.value })}>
            <option value={1}>H1 — Big Title</option>
            <option value={2}>H2 — Section</option>
            <option value={3}>H3 — Sub-section</option>
          </select>
          <input className="input flex-1 font-bold text-base" placeholder="Type your heading…"
            value={block.headingText ?? ''} onChange={e => u({ headingText: e.target.value })} />
        </div>
        <div className="px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
          {block.headingLevel === 1 && <p className="text-2xl font-black text-gray-900">{block.headingText || 'Heading 1 Preview'}</p>}
          {(!block.headingLevel || block.headingLevel === 2) && <p className="text-xl font-bold text-gray-800">{block.headingText || 'Heading 2 Preview'}</p>}
          {block.headingLevel === 3 && <p className="text-lg font-semibold text-gray-700">{block.headingText || 'Heading 3 Preview'}</p>}
        </div>
      </div>
    );

    case 'Text': return (
      <RichTextEditor
        value={block.textContent ?? ''}
        onChange={html => u({ textContent: html })}
        placeholder="Write your lesson content here. Use the toolbar for headings, bold, lists, links, and more…"
        minHeight={200}
      />
    );

    case 'Image': return (
      <div className="space-y-4">
        <FileUpload type="image" folder="lessons/images" label="Upload Image"
          onUploaded={url => u({ imageUrl: url })} currentUrl={block.imageUrl} />
        {block.imageUrl && (
          <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <input className="input text-sm" placeholder="Image caption (optional)"
              value={block.imageCaption ?? ''} onChange={e => u({ imageCaption: e.target.value })} />
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500">Alignment:</span>
              {(['left','center','full'] as const).map(a => (
                <button key={a} type="button" onClick={() => u({ imageAlign: a })}
                  className={clsx('px-3 py-1.5 rounded-lg text-xs font-bold border-2 capitalize transition-all',
                    block.imageAlign === a ? 'border-[var(--org-primary)] text-[var(--org-primary)] bg-[var(--org-primary)]/10' : 'border-gray-200 text-gray-500 hover:border-gray-300')}>
                  {a}
                </button>
              ))}
            </div>
            <img src={block.imageUrl} alt={block.imageCaption ?? ''} className="max-h-48 rounded-xl object-contain border border-gray-200 bg-white" />
          </div>
        )}
      </div>
    );

    case 'Video': return (
      <div className="space-y-4">
        {/* Mode toggle */}
        <div className="grid grid-cols-2 gap-2">
          {(['upload','url'] as const).map(mode => (
            <button key={mode} type="button" onClick={() => u({ _videoMode: mode })}
              className={clsx('py-2.5 rounded-xl text-sm font-bold border-2 transition-all',
                (block._videoMode ?? 'upload') === mode
                  ? 'border-[var(--org-primary)] bg-[var(--org-primary)]/10 text-[var(--org-primary)]'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300')}>
              {mode === 'upload' ? '⬆️  Upload Video File' : '🔗  Paste URL or YouTube Link'}
            </button>
          ))}
        </div>

        {(block._videoMode ?? 'upload') === 'url' ? (
          <div className="space-y-2">
            <label className="label">YouTube URL or direct video URL</label>
            <input className="input text-sm" type="url"
              placeholder="https://www.youtube.com/watch?v=... or https://cdn.example.com/video.mp4"
              value={block.videoUrl ?? ''} onChange={e => u({ videoUrl: e.target.value })} />
            {(block.videoUrl ?? '').match(/youtube|youtu\.be/) && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                ▶️ YouTube video detected — will embed automatically in the lesson player.
              </div>
            )}
            {(block.videoUrl ?? '') && !(block.videoUrl ?? '').match(/youtube|youtu\.be/) && (block.videoUrl ?? '').startsWith('http') && (
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700 font-medium">
                🎬 Direct video URL — will use native player with seek/speed controls.
              </div>
            )}
          </div>
        ) : (
          <FileUpload type="video" folder="lessons/videos"
            label="Upload Video (MP4, MOV, WebM — up to 2 GB, with upload progress)"
            onUploaded={url => u({ videoUrl: url, _videoMode: 'upload' })} currentUrl={block.videoUrl} />
        )}

        {block.videoUrl && (
          <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">Video title</label>
                <input className="input text-sm" placeholder="e.g. Introduction to React Hooks"
                  value={block.videoTitle ?? ''} onChange={e => u({ videoTitle: e.target.value })} />
              </div>
              <div>
                <label className="label text-xs">
                  Duration in seconds <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    className={clsx('input text-sm', !block.videoDurationSecs && 'border-amber-400 bg-amber-50')}
                    type="number" min={0} placeholder="e.g. 900"
                    value={block.videoDurationSecs ?? ''} onChange={e => u({ videoDurationSecs: +e.target.value })} />
                  <span className="text-xs text-gray-400 whitespace-nowrap">{fmtSecs(block.videoDurationSecs ?? 0)}</span>
                </div>
                {!block.videoDurationSecs && (
                  <p className="text-xs text-amber-600 mt-1">
                    Required — without this, students can mark the lesson complete instantly with no minimum watch time enforced.
                  </p>
                )}
              </div>
            </div>
            {/* Preview */}
            {(block.videoUrl.includes('youtube') || block.videoUrl.includes('youtu.be')) ? (
              <div className="rounded-xl overflow-hidden bg-black" style={{aspectRatio:'16/9'}}>
                {(() => {
                  const id = block.videoUrl.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1];
                  return id
                    ? <iframe src={`https://www.youtube.com/embed/${id}`} className="w-full h-full" allowFullScreen title="preview" />
                    : <p className="text-white text-xs p-4">Could not parse YouTube URL</p>;
                })()}
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden bg-gray-900" style={{aspectRatio:'16/9'}}>
                <video src={block.videoUrl} controls preload="metadata" className="w-full h-full" />
              </div>
            )}
          </div>
        )}
      </div>
    );

    case 'Audio': return (
      <div className="space-y-4">
        <FileUpload type="file" folder="lessons/audio" label="Upload Audio File (MP3, WAV, M4A, OGG)"
          accept="audio/mpeg,audio/wav,audio/mp4,audio/ogg,.mp3,.wav,.m4a,.ogg"
          onUploaded={url => u({ audioUrl: url })} currentUrl={block.audioUrl} />
        {block.audioUrl && (
          <div className="space-y-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
            <input className="input text-sm bg-white" placeholder="Audio title"
              value={block.audioTitle ?? ''} onChange={e => u({ audioTitle: e.target.value })} />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400 flex items-center justify-center flex-shrink-0">
                <Music className="w-5 h-5 text-white" />
              </div>
              <audio src={block.audioUrl} controls className="flex-1" />
            </div>
          </div>
        )}
      </div>
    );

    case 'PDF': return (
      <div className="space-y-4">
        <FileUpload type="file" folder="lessons/pdfs" label="Upload PDF Document"
          accept=".pdf,application/pdf"
          onUploaded={(url, key) => u({ fileUrl: url, fileName: key.split('/').pop() })} currentUrl={block.fileUrl} />
        {block.fileUrl && (
          <div className="space-y-3 p-4 bg-red-50 rounded-xl border border-red-200">
            <input className="input text-sm bg-white" placeholder="PDF display title"
              value={block.fileName ?? ''} onChange={e => u({ fileName: e.target.value })} />
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 font-medium">
              <input type="checkbox" className="rounded" checked={block.embedPdf ?? true}
                onChange={e => u({ embedPdf: e.target.checked })} />
              Show inline PDF viewer for students (they can also download)
            </label>
          </div>
        )}
      </div>
    );

    case 'File': return (
      <div className="space-y-3">
        <FileUpload type="file" folder="lessons/files" label="Upload Downloadable File"
          onUploaded={(url, key) => u({ fileUrl: url, fileName: key.split('/').pop() })} currentUrl={block.fileUrl} />
        {block.fileUrl && (
          <input className="input text-sm" placeholder="File display name (e.g. Exercise 1 — Starter Code.zip)"
            value={block.fileName ?? ''} onChange={e => u({ fileName: e.target.value })} />
        )}
      </div>
    );

    case 'Callout': return (
      <div className="space-y-3">
        <div className="flex gap-2 flex-wrap">
          {[
            { key:'info',    emoji:'ℹ️', label:'Info',    bg:'bg-blue-500'  },
            { key:'warning', emoji:'⚠️', label:'Warning', bg:'bg-amber-500' },
            { key:'success', emoji:'✅', label:'Success', bg:'bg-green-500' },
            { key:'danger',  emoji:'❌', label:'Danger',  bg:'bg-red-500'   },
          ].map(({ key, emoji, label, bg }) => (
            <button key={key} type="button" onClick={() => u({ calloutStyle: key })}
              className={clsx('flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all',
                block.calloutStyle === key ? `${bg} text-white border-transparent shadow-sm` : 'border-gray-200 text-gray-600 hover:border-gray-300')}>
              {emoji} {label}
            </button>
          ))}
        </div>
        <textarea className="input w-full min-h-[100px] text-sm resize-y"
          placeholder="Enter your callout message here…"
          value={block.calloutText ?? ''} onChange={e => u({ calloutText: e.target.value })} />
        {block.calloutText && (
          <div className={clsx('flex items-start gap-3 p-4 rounded-xl border-2',
            block.calloutStyle === 'warning' ? 'bg-amber-50 border-amber-200' :
            block.calloutStyle === 'success' ? 'bg-green-50 border-green-200' :
            block.calloutStyle === 'danger'  ? 'bg-red-50 border-red-200' :
            'bg-blue-50 border-blue-200')}>
            <span className="text-xl flex-shrink-0">{{ info:'ℹ️', warning:'⚠️', success:'✅', danger:'❌' }[block.calloutStyle ?? 'info'] ?? 'ℹ️'}</span>
            <p className="text-sm text-gray-700">{block.calloutText}</p>
          </div>
        )}
      </div>
    );

    case 'Code': return (
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <select className="input w-44 text-sm" value={block.codeLanguage ?? 'javascript'}
            onChange={e => u({ codeLanguage: e.target.value })}>
            {['javascript','typescript','python','csharp','java','sql','html','css','bash','json','xml','go','rust','plaintext'].map(l =>
              <option key={l} value={l}>{l}</option>)}
          </select>
          <span className="text-xs text-gray-400">Select language for syntax highlighting</span>
        </div>
        <textarea
          className="input w-full font-mono text-sm bg-gray-950 text-green-400 border-gray-700 resize-y placeholder-gray-600"
          style={{ minHeight: '180px' }}
          placeholder={`// Enter your ${block.codeLanguage ?? 'code'} here…`}
          value={block.codeContent ?? ''} onChange={e => u({ codeContent: e.target.value })} />
      </div>
    );

    case 'Divider': return (
      <div className="py-4">
        <div className="flex items-center gap-4">
          <hr className="flex-1 border-dashed border-gray-300" />
          <span className="text-xs text-gray-400 font-medium">SECTION BREAK</span>
          <hr className="flex-1 border-dashed border-gray-300" />
        </div>
      </div>
    );

    default: return null;
  }
}

// ─── MAIN PAGE ────────────────────────────────────────────────
export default function LessonEditorPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId?: string }>();
  const [searchParams] = useSearchParams();
  const moduleId = searchParams.get('moduleId');
  const parentLessonId = searchParams.get('parentLessonId');
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isNew = !lessonId || lessonId === 'new';

  const [meta, setMeta] = useState({
    title: '', description: '', isPreview: false, isPublished: true, durationSecs: 0,
  });
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const token = () => localStorage.getItem('lms_token') ?? '';
  const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

  // Load existing lesson
  useEffect(() => {
    if (isNew) return;
    setLoading(true);
    console.log('[load] fetching lesson', lessonId, 'from', `${API_BASE}/api/lessons/${lessonId}`);
    fetch(`${API_BASE}/api/lessons/${lessonId}`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(async r => {
        console.log('[load] response status:', r.status);
        if (!r.ok) {
          const text = await r.text();
          throw new Error(`Failed to load lesson (${r.status}): ${text}`);
        }
        return r.json();
      })
      .then(data => {
        console.log('[load] lesson data received:', data);
        setMeta({ title: data.title ?? '', description: data.description ?? '', isPreview: data.isPreview ?? false, isPublished: data.isPublished ?? true, durationSecs: data.durationSecs ?? 0 });
        setBlocks((data.contentBlocks ?? []).sort((a: Block, b: Block) => a.order - b.order));
      })
      .catch((err) => {
        console.error('[load] FAILED:', err);
        toast.error(err.message ?? 'Failed to load lesson');
      })
      .finally(() => setLoading(false));
  }, [lessonId]);

  const save = async () => {
    console.log('[save] clicked. meta:', meta, '| blocks:', blocks);
    if (!meta.title.trim()) { toast.error('Lesson title is required'); return; }
    const missingDuration = blocks.some(b => String(b.type).toLowerCase() === 'video' && b.videoUrl && !b.videoDurationSecs);
    if (missingDuration) {
      toast.error('Please set the duration for every video block before saving');
      return;
    }
    setSaving(true);
    try {
      let id: number;
      if (isNew) {
        console.log('[save] creating new lesson, POST', `${API_BASE}/api/lessons`);
        const res = await fetch(`${API_BASE}/api/lessons`, {
          method: 'POST', headers: authHeaders(),
          body: JSON.stringify({ ...meta, type: 'Mixed', displayOrder: 0, moduleId: Number(moduleId), parentLessonId: parentLessonId ? Number(parentLessonId) : null, videoUrl: null, fileUrl: null, content: null })
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        id = data.id;
      } else {
        console.log('[save] updating lesson, PUT', `${API_BASE}/api/lessons/${lessonId}`);
        const res = await fetch(`${API_BASE}/api/lessons/${lessonId}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(meta) });
        if (!res.ok) throw new Error(await res.text());
        id = Number(lessonId);
      }
      const reindexed = blocks.map((b, i) => ({ ...b, order: i }));
      console.log('[save] saving blocks, PUT', `${API_BASE}/api/lessons/${id}/blocks`, reindexed);
      const bRes = await fetch(`${API_BASE}/api/lessons/${id}/blocks`, {
        method: 'PUT', headers: authHeaders(),
        body: JSON.stringify({ blocks: reindexed })
      });
      if (!bRes.ok) throw new Error(await bRes.text());
      console.log('[save] success');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      toast.success(isNew ? 'Lesson created!' : 'Lesson saved!');
      // Without this, navigating back to the Course Editor showed stale
      // module/lesson data from React Query's cache — the newly added
      // lesson only appeared after some OTHER action happened to trigger
      // a refetch (e.g. editing a different field). Invalidating here
      // forces a fresh fetch the moment we land back on that page.
      qc.invalidateQueries({ queryKey: ['course-modules', courseId] });
      if (isNew) {
        navigate(`/dashboard/courses/${courseId}/lesson/${id}/edit`, { replace: true });
      } else {
        // Saving an EXISTING lesson's edits is a "I'm done with this
        // lesson" action — return straight to the Content tab so the
        // updated lesson/blocks are visible immediately, instead of
        // requiring a manual click on the back arrow.
        navigate(`/dashboard/courses/${courseId}/edit?tab=content${moduleId ? '&moduleId=' + moduleId : ''}`);
      }
    } catch (e: any) {
      console.error('[save] FAILED:', e);
      toast.error(e.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const addBlock = (type: BlockType) => {
    const defaults: Record<BlockType, Partial<Block>> = {
      Heading: { headingText: '', headingLevel: 2 },
      Text:    { textContent: '' },
      Image:   { imageAlign: 'center' },
      Video:   { _videoMode: 'upload', videoTitle: '' },
      Audio:   { audioTitle: '' },
      PDF:     { embedPdf: true },
      File:    {},
      Callout: { calloutStyle: 'info', calloutText: '' },
      Code:    { codeLanguage: 'javascript', codeContent: '' },
      Divider: {},
    };
    setBlocks(p => [...p, { type, order: p.length, ...defaults[type] }]);
    // Scroll to bottom after adding
    setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 100);
  };

  const removeBlock = (i: number) => setBlocks(p => p.filter((_,j) => j!==i).map((b,j) => ({...b,order:j})));
  const moveBlock = (i: number, dir: -1|1) => {
    const a = [...blocks], t = i+dir;
    if (t < 0 || t >= a.length) return;
    [a[i], a[t]] = [a[t], a[i]];
    setBlocks(a.map((b,j) => ({...b,order:j})));
  };

  const totalDuration = blocks
    .filter(b => b.type === 'Video')
    .reduce((sum, b) => sum + (b.videoDurationSecs ?? 0), 0);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 rounded-full border-4 border-[var(--org-primary)] border-t-transparent animate-spin mx-auto" />
        <p className="text-gray-400 text-sm">Loading lesson…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ─── Sticky top bar ────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button className="btn-ghost flex-shrink-0" onClick={() => navigate(`/dashboard/courses/${courseId}/edit?tab=content${moduleId ? '&moduleId=' + moduleId : ''}`)}>
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <h1 className="font-black text-gray-900 truncate text-base">
                {meta.title || (isNew ? 'New Lesson' : 'Edit Lesson')}
              </h1>
              <p className="text-xs text-gray-400">
                {blocks.length} block{blocks.length !== 1 ? 's' : ''}{totalDuration > 0 ? ` · ${fmtSecs(totalDuration)}` : ''}
                {isNew && parentLessonId && <span className="text-purple-500 font-semibold"> · Adding as sub-lesson</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Published toggle */}
            <button type="button" onClick={() => setMeta(m => ({...m, isPublished: !m.isPublished}))}
              className={clsx('flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all',
                meta.isPublished ? 'border-green-300 bg-green-50 text-green-700' : 'border-gray-200 bg-gray-50 text-gray-500')}>
              {meta.isPublished ? <><Globe className="w-3 h-3"/>Published</> : <><Lock className="w-3 h-3"/>Draft</>}
            </button>
            {/* Free preview toggle */}
            <button type="button" onClick={() => setMeta(m => ({...m, isPreview: !m.isPreview}))}
              className={clsx('flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all',
                meta.isPreview ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-200 bg-gray-50 text-gray-500')}>
              {meta.isPreview ? <><Eye className="w-3 h-3"/>Free Preview</> : <><EyeOff className="w-3 h-3"/>Enrolled Only</>}
            </button>
            {/* Save button */}
            <button className={clsx('flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-sm transition-all',
              saved ? 'bg-green-500' : 'bg-[var(--org-primary)] hover:opacity-90')}
              onClick={save} disabled={saving}>
              {saved ? <CheckCircle2 className="w-4 h-4"/> : <Save className="w-4 h-4"/>}
              {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Lesson'}
            </button>
          </div>
        </div>
      </div>

      {/* ─── Main two-column layout ─────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 xl:grid-cols-4 gap-6">

        {/* ── Left: Lesson meta + blocks ────────────────────── */}
        <div className="xl:col-span-3 space-y-5">

          {/* Lesson info card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-[var(--org-primary)]" />
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Lesson Details</h2>
            </div>
            <div>
              <label className="label">Lesson Title *</label>
              <input className="input text-base font-semibold" placeholder="e.g. Introduction to React Hooks"
                value={meta.title} onChange={e => setMeta(m => ({...m, title: e.target.value}))} />
            </div>
            <div>
              <RichTextEditor
                label="Description"
                value={meta.description}
                onChange={val => setMeta(m => ({...m, description: val}))}
                placeholder="Brief overview of what students will learn in this lesson…"
                minHeight={100}
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <label className="text-sm font-medium text-gray-600">Duration (seconds)</label>
              </div>
              <input className="input w-32 text-sm" type="number" min={0}
                value={meta.durationSecs || ''} placeholder="e.g. 900"
                onChange={e => setMeta(m => ({...m, durationSecs: +e.target.value}))} />
              {meta.durationSecs > 0 && <span className="text-sm text-gray-400">≈ {fmtSecs(meta.durationSecs)}</span>}
            </div>
          </div>

          {/* Content blocks */}
          {blocks.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[var(--org-primary)]" />
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Content Blocks</h2>
                <span className="text-xs text-gray-400">({blocks.length})</span>
              </div>

              {blocks.map((block, idx) => {
                const info = BLOCK_PALETTE.find(b => b.type === block.type)!;
                return (
                  <div key={`${block.type}-${idx}`}
                    className="bg-white rounded-2xl border-2 border-gray-200 hover:border-gray-300 shadow-sm transition-all overflow-hidden">
                    {/* Block toolbar */}
                    <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200">
                      <div className="flex items-center gap-2">
                        <GripVertical className="w-4 h-4 text-gray-300 cursor-grab flex-shrink-0" />
                        <span className={clsx('flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full', info.bg, info.color)}>
                          {info.icon} {info.label}
                        </span>
                        <span className="text-xs text-gray-400 font-medium">Block {idx + 1}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => moveBlock(idx,-1)} disabled={idx===0}
                          className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-20 transition-colors" title="Move up">
                          <ChevronUp className="w-4 h-4 text-gray-600" />
                        </button>
                        <button onClick={() => moveBlock(idx,1)} disabled={idx===blocks.length-1}
                          className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-20 transition-colors" title="Move down">
                          <ChevronDown className="w-4 h-4 text-gray-600" />
                        </button>
                        <div className="w-px h-5 bg-gray-200 mx-1" />
                        <button onClick={() => removeBlock(idx)}
                          className="p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors" title="Remove block">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {/* Block content */}
                    <div className="p-5">
                      <BlockEditor
                        block={block}
                        onChange={b => setBlocks(p => p.map((x,i) => i===idx ? {...b, order:i} : x))}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty state */}
          {blocks.length === 0 && (
            <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-gray-300" />
              </div>
              <p className="font-bold text-gray-500 text-lg">No content yet</p>
              <p className="text-sm text-gray-400 mt-2 mb-6">Add content blocks from the panel on the right →</p>
            </div>
          )}

          {/* Bottom save */}
          <div className="flex justify-end pb-8">
            <button className="btn-primary px-8 py-3 text-base font-bold" onClick={save} disabled={saving}>
              <Save className="w-4 h-4" />
              {saving ? 'Saving…' : 'Save Lesson'}
            </button>
          </div>
        </div>

        {/* ── Right: Block palette (sticky) ──────────────────── */}
        <div className="xl:col-span-1">
          <div className="sticky top-24 space-y-4">
            {/* Add blocks panel */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-[var(--org-primary)]" />
                  <h3 className="text-sm font-bold text-gray-700">Add Content Block</h3>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">Click any type to add it</p>
              </div>
              <div className="p-3 space-y-1">
                {BLOCK_PALETTE.map(bt => (
                  <button key={bt.type} type="button" onClick={() => addBlock(bt.type)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors group text-left">
                    <span className={clsx('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110', bt.bg, bt.color)}>
                      {bt.icon}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-700">{bt.label}</p>
                      <p className="text-xs text-gray-400">{bt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Block count summary */}
            {blocks.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Content Summary</h3>
                <div className="space-y-1.5">
                  {BLOCK_PALETTE.filter(bt => blocks.some(b => b.type === bt.type)).map(bt => {
                    const count = blocks.filter(b => b.type === bt.type).length;
                    return (
                      <div key={bt.type} className="flex items-center justify-between text-xs">
                        <span className={clsx('flex items-center gap-1.5 font-medium', bt.color)}>{bt.icon} {bt.label}</span>
                        <span className="bg-gray-100 text-gray-600 font-bold px-2 py-0.5 rounded-full">{count}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-gray-700">
                  <span>Total blocks</span>
                  <span className="text-[var(--org-primary)]">{blocks.length}</span>
                </div>
              </div>
            )}

            {/* Quick tips */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
              <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2">Tips</h3>
              <ul className="space-y-1.5 text-xs text-blue-600">
                <li>• Use <strong>Heading</strong> to structure sections</li>
                <li>• <strong>Text</strong> blocks support bold, italic, lists and links</li>
                <li>• <strong>Video</strong> supports YouTube or uploaded files</li>
                <li>• <strong>Callout</strong> highlights important notes</li>
                <li>• Use <strong>↑↓</strong> arrows to reorder blocks</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
