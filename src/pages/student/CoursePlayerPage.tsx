import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft, ChevronRight, CheckCircle2, Download,
  FileText, Music, Film, BookOpen, Menu, X, Clock,
  PlayCircle, Award, Timer, ChevronDown, Volume2,
  List, Home
} from 'lucide-react';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import VideoPlayer from '../../components/shared/VideoPlayer';
import clsx from 'clsx';

// ─── Types ─────────────────────────────────────────────────────
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

function fmtTime(s: number) {
  if (!s || isNaN(s)) return '0:00';
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = Math.floor(s%60);
  if (h) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  return `${m}:${String(sec).padStart(2,'0')}`;
}
function fmtBytes(b: number) {
  if (!b) return '';
  return b < 1048576 ? `${(b/1024).toFixed(0)} KB` : `${(b/1048576).toFixed(1)} MB`;
}

// ─── Block renderers ────────────────────────────────────────────
function RenderBlock({ block, onVideoTime }: { block: Block; onVideoTime?: (c:number,d:number)=>void }) {
  // Normalize type to PascalCase to handle both 'video' and 'Video' from API
  const blockType = block.type ? (block.type.charAt(0).toUpperCase() + block.type.slice(1).toLowerCase()) as BlockType : block.type;
  const normalizedBlock = { ...block, type: blockType };
  switch (blockType) {
    case 'Heading': {
      const t = block.headingText ?? '';
      if (block.headingLevel===1) return <h1 className="text-3xl font-black text-gray-900 mt-8 mb-4 leading-tight">{t}</h1>;
      if (block.headingLevel===3) return <h3 className="text-xl font-bold text-gray-800 mt-6 mb-3">{t}</h3>;
      return <h2 className="text-2xl font-black text-gray-900 mt-7 mb-3 pb-2 border-b border-gray-100">{t}</h2>;
    }
    case 'Text': return (
      <div className="my-4 rich-content leading-7 text-[15px] text-gray-700"
        dangerouslySetInnerHTML={{ __html: block.textContent ?? '' }} />
    );
    case 'Image': return (
      <figure className={clsx('my-6', block.imageAlign !== 'full' && 'flex flex-col', block.imageAlign === 'center' && 'items-center')}>
        <img src={block.imageUrl} alt={block.imageCaption ?? ''}
          className={clsx('rounded-2xl shadow-md', block.imageAlign === 'full' ? 'w-full' : 'max-h-[500px] object-contain')}/>
        {block.imageCaption && <figcaption className="text-sm text-gray-400 mt-2 italic text-center">{block.imageCaption}</figcaption>}
      </figure>
    );
    case 'Video': return (
      <div className="my-6">
        {block.videoTitle && <p className="font-semibold text-gray-800 mb-2 flex items-center gap-2"><Film className="w-4 h-4 text-purple-500"/>{block.videoTitle}</p>}
        <VideoPlayer src={block.videoUrl ?? ''} title={block.videoTitle} onTimeUpdate={onVideoTime} className="rounded-2xl shadow-xl"/>
      </div>
    );
    case 'Audio': return (
      <div className="my-5 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-5 border border-amber-200">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-400 flex items-center justify-center shadow-md"><Music className="w-6 h-6 text-white"/></div>
          <div><p className="font-bold text-gray-900">{block.audioTitle || 'Audio'}</p><p className="text-xs text-amber-600">🎵 Audio lesson</p></div>
        </div>
        <audio src={block.audioUrl} controls className="w-full"/>
      </div>
    );
    case 'PDF': return (
      <div className="my-5 space-y-3">
        <div className="flex items-center gap-3 p-4 bg-red-50 rounded-2xl border border-red-200">
          <div className="w-11 h-11 rounded-xl bg-red-500 flex items-center justify-center flex-shrink-0"><FileText className="w-6 h-6 text-white"/></div>
          <div className="flex-1 min-w-0"><p className="font-bold text-gray-900 truncate">{block.fileName || 'Document.pdf'}</p>{block.fileSizeBytes ? <p className="text-xs text-gray-400">{fmtBytes(block.fileSizeBytes)}</p>:null}</div>
          <a href={block.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs font-bold text-white bg-red-500 px-3 py-2 rounded-xl"><Download className="w-3.5 h-3.5"/> Download</a>
        </div>
        {(block.embedPdf ?? true) && block.fileUrl && (
          <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm" style={{height:'600px'}}>
            <iframe src={`${block.fileUrl}#toolbar=0`} className="w-full h-full" title={block.fileName}/>
          </div>
        )}
      </div>
    );
    case 'File': return (
      <a href={block.fileUrl} download target="_blank" rel="noreferrer"
        className="my-3 flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl border border-gray-200 transition-colors group">
        <div className="w-10 h-10 rounded-xl bg-gray-200 group-hover:bg-gray-300 flex items-center justify-center"><Download className="w-5 h-5 text-gray-600"/></div>
        <div className="flex-1 min-w-0"><p className="font-semibold text-gray-800 truncate">{block.fileName || 'Download'}</p>{block.fileSizeBytes ? <p className="text-xs text-gray-400">{fmtBytes(block.fileSizeBytes)}</p>:null}</div>
        <span className="text-xs font-bold text-blue-600">Download ↓</span>
      </a>
    );
    case 'Divider': return <hr className="my-8 border-gray-200"/>;
    case 'Callout': {
      const s: Record<string,{bg:string;border:string;icon:string;text:string}> = {
        info:{bg:'bg-blue-50',border:'border-blue-200',icon:'ℹ️',text:'text-blue-800'},
        warning:{bg:'bg-amber-50',border:'border-amber-200',icon:'⚠️',text:'text-amber-800'},
        success:{bg:'bg-green-50',border:'border-green-200',icon:'✅',text:'text-green-800'},
        danger:{bg:'bg-red-50',border:'border-red-200',icon:'❌',text:'text-red-800'},
      };
      const st = s[block.calloutStyle ?? 'info'] ?? s.info;
      return <div className={clsx('flex items-start gap-3 p-4 rounded-2xl border-2 my-5',st.bg,st.border)}><span className="text-xl flex-shrink-0">{st.icon}</span><p className={clsx('text-sm leading-relaxed font-medium',st.text)}>{block.calloutText}</p></div>;
    }
    case 'Code': return (
      <div className="my-5 rounded-2xl overflow-hidden border border-gray-800 shadow-lg">
        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-800">
          <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500"/><div className="w-3 h-3 rounded-full bg-amber-500"/><div className="w-3 h-3 rounded-full bg-green-500"/></div>
          <span className="text-xs font-mono text-gray-400">{block.codeLanguage}</span>
          <button onClick={() => navigator.clipboard.writeText(block.codeContent ?? '')} className="text-xs text-gray-400 hover:text-white">Copy</button>
        </div>
        <pre className="bg-gray-950 text-green-400 text-sm font-mono p-5 overflow-x-auto leading-relaxed"><code>{block.codeContent}</code></pre>
      </div>
    );
    default: return null;
  }
}

// ─── MAIN COURSE PLAYER PAGE ────────────────────────────────────
export default function CoursePlayerPage() {
  const { courseId, lessonId } = useParams<{courseId:string; lessonId:string}>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [watchedSecs, setWatchedSecs] = useState(0);
  const [sessionStart] = useState(Date.now());
  const [lessonCompleted, setLessonCompleted] = useState(false);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [courseCompleted, setCourseCompleted] = useState(false);
  const [showCertModal, setShowCertModal] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());
  const saveRef = useRef<ReturnType<typeof setInterval>|null>(null);

  // Fetch lesson
  const { data: lesson, isLoading } = useQuery({
    queryKey: ['lesson-play', lessonId],
    queryFn: () => api.get(`/lessons/${lessonId}`).then((r:any) => r.data),
    enabled: !!lessonId,
  });

  // Fetch course with modules+lessons
  const { data: course } = useQuery({
    queryKey: ['course-play', courseId],
    queryFn: () => api.get(`/courses/${courseId}`).then((r:any) => r.data),
    enabled: !!courseId,
  });

  // Fetch progress
  const { data: progressData = [] } = useQuery({
    queryKey: ['progress', courseId, user?.id],
    queryFn: () => api.get(`/lessons/progress/course/${courseId}`).then((r:any) => r.data),
    enabled: !!courseId && !!user?.id,
  });

  const modules: any[] = (course?.modules ?? []);
  const flatLessons: any[] = modules.flatMap((m:any) => (m.lessons ?? []).map((l:any) => ({...l, moduleName: m.title, moduleId: m.id})));
  const progressMap: Record<number,any> = {};
  (progressData as any[]).forEach((p:any) => { progressMap[p.lessonId] = p; });

  const completedCount = (progressData as any[]).filter((p:any) => p.isCompleted).length;
  const totalLessons   = flatLessons.length;
  const overallPct     = totalLessons > 0 ? Math.round(completedCount / totalLessons * 100) : 0;

  const currentIdx = flatLessons.findIndex(l => String(l.id) === lessonId);
  const prevLesson = currentIdx > 0 ? flatLessons[currentIdx - 1] : null;
  const nextLesson = currentIdx < flatLessons.length - 1 ? flatLessons[currentIdx + 1] : null;

  // Auto-expand current module
  useEffect(() => {
    const cur = flatLessons.find(l => String(l.id) === lessonId);
    if (cur) setExpandedModules(prev => new Set([...prev, cur.moduleId]));
  }, [lessonId, course]);

  // Reset watch state on lesson change
  useEffect(() => {
    setWatchedSecs(0);
    setVideoCurrentTime(0);
    setLessonCompleted(progressMap[Number(lessonId)]?.isCompleted ?? false);
  }, [lessonId]);

  const progressMut = useMutation({
    mutationFn: (data: {isCompleted:boolean; watchedSeconds:number; lastPositionSec:number}) =>
      api.post('/lessons/progress', { lessonId: Number(lessonId), ...data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['progress'] });
      qc.invalidateQueries({ queryKey: ['certs'] });
    },
  });

  // Auto-save every 15s
  useEffect(() => {
    if (!lessonId) return;
    saveRef.current = setInterval(() => {
      if (watchedSecs > 0)
        progressMut.mutate({ isCompleted: lessonCompleted, watchedSeconds: watchedSecs, lastPositionSec: Math.round(videoCurrentTime) });
    }, 15000);
    return () => { if (saveRef.current) clearInterval(saveRef.current); };
  }, [watchedSecs, lessonCompleted, videoCurrentTime, lessonId]);

  const markLessonComplete = useCallback(() => {
    setLessonCompleted(true);
    progressMut.mutate({ isCompleted: true, watchedSeconds: watchedSecs, lastPositionSec: Math.round(videoCurrentTime) });
    // Check if course is now complete
    const newCompleted = completedCount + (lessonCompleted ? 0 : 1);
    if (newCompleted >= totalLessons && totalLessons > 0) {
      setCourseCompleted(true);
      setTimeout(() => setShowCertModal(true), 800);
    }
  }, [watchedSecs, videoCurrentTime, completedCount, totalLessons, lessonCompleted]);

  const handleVideoTime = useCallback((cur:number, dur:number) => {
    setVideoCurrentTime(cur);
    setWatchedSecs(Math.round(cur));
    if (!lessonCompleted && dur > 0 && cur/dur >= 0.8) markLessonComplete();
  }, [lessonCompleted, markLessonComplete]);

  // Wall clock for non-video lessons
  const blocks: Block[] = [...(lesson?.contentBlocks ?? [])].sort((a:Block,b:Block) => a.order - b.order);
  const hasVideo = blocks.some(b => b.type === 'Video');
  useEffect(() => {
    if (hasVideo || !lesson) return;
    const t = setInterval(() => setWatchedSecs(s => s+1), 1000);
    return () => clearInterval(t);
  }, [hasVideo, lesson?.id]);

  const sessionMins = Math.round((Date.now() - sessionStart) / 60000);

  // ── Certificate modal ──────────────────────────────────────
  const CertModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
        <div className="w-24 h-24 rounded-full mx-auto flex items-center justify-center mb-6 shadow-2xl"
          style={{background:'linear-gradient(135deg,#f59e0b,#d97706)'}}>
          <Award className="w-12 h-12 text-white"/>
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">🎉 Course Complete!</h2>
        <p className="text-gray-500 mb-2">You've completed <strong>{course?.title}</strong></p>
        <p className="text-sm text-gray-400 mb-6">Your certificate has been issued and is ready to download.</p>
        <div className="flex gap-3">
          <button className="flex-1 btn-secondary" onClick={() => setShowCertModal(false)}>Continue Learning</button>
          <button className="flex-1 btn-primary" onClick={() => navigate('/dashboard/certificates')}>
            <Award className="w-4 h-4"/> View Certificate
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-gray-950 overflow-hidden">
      <style>{`
        .rich-content h1{font-size:1.875rem;font-weight:900;color:#111827;margin:1.5rem 0 0.75rem;line-height:1.2}
        .rich-content h2{font-size:1.5rem;font-weight:800;color:#1f2937;margin:1.25rem 0 0.5rem}
        .rich-content h3{font-size:1.25rem;font-weight:700;color:#374151;margin:1rem 0 0.5rem}
        .rich-content p{margin:0.625rem 0;line-height:1.75;color:#374151}
        .rich-content ul{list-style:disc;padding-left:1.5rem;margin:0.625rem 0}
        .rich-content ol{list-style:decimal;padding-left:1.5rem;margin:0.625rem 0}
        .rich-content li{margin:0.25rem 0;color:#374151}
        .rich-content strong,.rich-content b{font-weight:700;color:#111827}
        .rich-content a{color:var(--org-primary,#6366f1);text-decoration:underline}
        .rich-content blockquote{border-left:4px solid var(--org-primary,#6366f1);padding:.5rem 1rem;background:rgba(99,102,241,.05);border-radius:0 .5rem .5rem 0;margin:.75rem 0;color:#4b5563;font-style:italic}
        .rich-content pre{background:#1f2937;color:#34d399;padding:1rem;border-radius:.75rem;font-family:monospace;font-size:.8125rem;overflow-x:auto;margin:.75rem 0}
      `}</style>

      {/* ── TOP BAR ─────────────────────────────────────────── */}
      <header className="flex items-center gap-3 px-4 py-3 bg-gray-900 border-b border-gray-800 flex-shrink-0">
        <button onClick={() => navigate(`/dashboard/catalog/${courseId}`)}
          className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors flex-shrink-0" title="Back to course">
          <ChevronLeft className="w-5 h-5"/>
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400 truncate">{course?.title}</p>
          <p className="text-sm font-semibold text-white truncate">{lesson?.title}</p>
        </div>

        {/* Overall progress */}
        <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
          <div className="text-right">
            <p className="text-xs text-gray-400">Course Progress</p>
            <p className="text-xs font-bold text-white">{completedCount}/{totalLessons} lessons</p>
          </div>
          <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{width:`${overallPct}%`,background:'linear-gradient(90deg,var(--org-primary),var(--org-secondary,var(--org-primary)))'}}/>
          </div>
          <span className="text-xs font-bold w-10 text-right" style={{color:'var(--org-primary)'}}>{overallPct}%</span>
        </div>

        {/* Sidebar toggle */}
        <button onClick={() => setSidebarOpen(!sidebarOpen)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold transition-colors flex-shrink-0">
          <List className="w-4 h-4"/>
          <span className="hidden sm:inline">{sidebarOpen ? 'Hide' : 'Show'} Outline</span>
        </button>

        <Link to="/dashboard/student" className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors flex-shrink-0" title="Dashboard">
          <Home className="w-4 h-4"/>
        </Link>
      </header>

      {/* ── BODY ────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT: Lesson content ────────────────────────── */}
        <main className="flex-1 overflow-y-auto bg-white">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center"><div className="w-10 h-10 rounded-full border-4 border-[var(--org-primary)] border-t-transparent animate-spin mx-auto mb-3"/><p className="text-gray-400 text-sm">Loading lesson…</p></div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto px-6 py-8">

              {/* Lesson header */}
              <div className="mb-6">
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <span className={clsx('text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1',
                    lesson?.type==='Video'?'bg-purple-100 text-purple-700':lesson?.type==='Audio'?'bg-amber-100 text-amber-700':'bg-blue-100 text-blue-700')}>
                    {lesson?.type==='Video'?<><Film className="w-3 h-3"/>Video</>:lesson?.type==='Audio'?<><Volume2 className="w-3 h-3"/>Audio</>:<><BookOpen className="w-3 h-3"/>{lesson?.type}</>}
                  </span>
                  {lessonCompleted && (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3"/> Completed
                    </span>
                  )}
                </div>
                <h1 className="text-2xl font-black text-gray-900 leading-tight">{lesson?.title}</h1>
                {lesson?.description && (
                  <div className="text-sm text-gray-500 mt-2 rich-content prose prose-sm"
                    dangerouslySetInnerHTML={{ __html: lesson.description }}/>
                )}
              </div>

              {/* Watch progress bar */}
              {(lesson?.durationSecs > 0 || watchedSecs > 0) && (
                <div className="mb-6 bg-gray-50 rounded-2xl p-4 border border-gray-100">
                  <div className="flex items-center justify-between mb-2 text-xs">
                    <span className="flex items-center gap-1.5 font-semibold text-gray-600">
                      <Timer className="w-3.5 h-3.5 text-purple-500"/> Lesson Progress
                    </span>
                    <div className="flex items-center gap-3 text-gray-500">
                      <span className="flex items-center gap-1"><PlayCircle className="w-3 h-3 text-green-500"/>{fmtTime(watchedSecs)} watched</span>
                      {lesson?.durationSecs > 0 && (
                        <span className="flex items-center gap-1 text-orange-500 font-semibold">
                          <Clock className="w-3 h-3"/>
                          {fmtTime(Math.max(0, lesson.durationSecs - watchedSecs))} left
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: lesson?.durationSecs > 0 ? `${Math.min(100,Math.round(watchedSecs/lesson.durationSecs*100))}%` : lessonCompleted ? '100%' : '0%',
                        background: lessonCompleted ? '#10b981' : 'linear-gradient(90deg,var(--org-primary),var(--org-secondary,var(--org-primary)))'
                      }}/>
                  </div>
                </div>
              )}

              {/* Content blocks */}
              {blocks.length === 0 ? (
                <div className="text-center py-20 text-gray-300"><BookOpen className="w-16 h-16 mx-auto mb-4 opacity-30"/><p className="font-semibold text-gray-400">No content yet for this lesson</p></div>
              ) : blocks.map((b,i) => <RenderBlock key={i} block={b} onVideoTime={b.type==='Video'?handleVideoTime:undefined}/>)}

              {/* Resources */}
              {lesson?.resources?.length > 0 && (
                <div className="mt-8 bg-gray-50 rounded-2xl p-5 border border-gray-200">
                  <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><Download className="w-4 h-4"/> Lesson Resources</h3>
                  <div className="space-y-2">
                    {lesson.resources.map((r:any) => (
                      <a key={r.id} href={r.fileUrl} target="_blank" rel="noreferrer" download
                        className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
                        <FileText className="w-4 h-4 text-gray-400 flex-shrink-0"/>
                        <span className="text-sm font-medium text-gray-700 flex-1">{r.title}</span>
                        {r.fileSizeBytes > 0 && <span className="text-xs text-gray-400">{fmtBytes(r.fileSizeBytes)}</span>}
                        <Download className="w-3.5 h-3.5 text-blue-500"/>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Session stats */}
              {sessionMins > 0 && (
                <div className="mt-6 grid grid-cols-3 gap-3">
                  {[
                    {label:'Watched',value:fmtTime(watchedSecs),color:'text-purple-600',bg:'bg-purple-50'},
                    {label:'Session',value:`${sessionMins}m`,color:'text-blue-600',bg:'bg-blue-50'},
                    {label:'Progress',value:`${lesson?.durationSecs>0?Math.min(100,Math.round(watchedSecs/lesson.durationSecs*100)):lessonCompleted?100:0}%`,color:'text-green-600',bg:'bg-green-50'},
                  ].map(s => (
                    <div key={s.label} className={clsx('rounded-2xl p-3 text-center border border-gray-100',s.bg)}>
                      <p className={clsx('text-xl font-black',s.color)}>{s.value}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Navigation + Mark Complete */}
              <div className="flex items-center justify-between gap-3 mt-8 pb-8">
                <button
                  className={clsx('flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-sm transition-all',
                    prevLesson ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-gray-50 text-gray-300 cursor-not-allowed')}
                  disabled={!prevLesson}
                  onClick={() => prevLesson && navigate(`/learn/${courseId}/lesson/${prevLesson.id}`)}>
                  <ChevronLeft className="w-4 h-4"/>
                  <div className="text-left hidden sm:block">
                    <p className="text-xs opacity-60">Previous</p>
                    <p className="truncate max-w-[120px]">{prevLesson?.title ?? '—'}</p>
                  </div>
                </button>

                {!lessonCompleted ? (
                  <button onClick={markLessonComplete}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm bg-green-500 hover:bg-green-600 text-white transition-all shadow-md">
                    <CheckCircle2 className="w-4 h-4"/> Mark Complete
                  </button>
                ) : (
                  <span className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold text-green-700 bg-green-100">
                    <CheckCircle2 className="w-4 h-4"/> Completed!
                  </span>
                )}

                <button
                  className={clsx('flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-sm text-white transition-all shadow-md',
                    nextLesson ? 'hover:opacity-90' : 'opacity-30 cursor-not-allowed')}
                  style={{background:'linear-gradient(135deg,var(--org-primary),var(--org-secondary,var(--org-primary)))'}}
                  disabled={!nextLesson}
                  onClick={() => nextLesson && navigate(`/learn/${courseId}/lesson/${nextLesson.id}`)}>
                  <div className="text-right hidden sm:block">
                    <p className="text-xs opacity-70">Next</p>
                    <p className="truncate max-w-[120px]">{nextLesson?.title ?? '—'}</p>
                  </div>
                  <ChevronRight className="w-4 h-4"/>
                </button>
              </div>
            </div>
          )}
        </main>

        {/* ── RIGHT: Course outline sidebar ──────────────── */}
        {sidebarOpen && (
          <aside className="w-80 flex-shrink-0 bg-gray-900 border-l border-gray-800 flex flex-col overflow-hidden">
            {/* Sidebar header */}
            <div className="px-4 py-3 border-b border-gray-800 flex-shrink-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-bold text-white">Course Outline</p>
                <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-white transition-colors">
                  <X className="w-4 h-4"/>
                </button>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{width:`${overallPct}%`,background:'linear-gradient(90deg,var(--org-primary),var(--org-secondary,var(--org-primary)))'}}/>
                </div>
                <span className="text-xs font-bold text-white">{overallPct}%</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{completedCount} of {totalLessons} lessons done</p>
            </div>

            {/* Modules + lessons */}
            <div className="flex-1 overflow-y-auto">
              {modules.map((mod:any) => {
                const isExpanded = expandedModules.has(mod.id);
                const modLessons = mod.lessons ?? [];
                const modCompleted = modLessons.filter((l:any) => progressMap[l.id]?.isCompleted).length;
                return (
                  <div key={mod.id} className="border-b border-gray-800">
                    {/* Module header */}
                    <button
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-800 transition-colors"
                      onClick={() => setExpandedModules(prev => {
                        const n = new Set(prev);
                        n.has(mod.id) ? n.delete(mod.id) : n.add(mod.id);
                        return n;
                      })}>
                      <ChevronDown className={clsx('w-4 h-4 text-gray-500 flex-shrink-0 transition-transform', isExpanded && 'rotate-180')}/>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-200 truncate">{mod.title}</p>
                        <p className="text-xs text-gray-500">{modCompleted}/{modLessons.length} completed</p>
                      </div>
                    </button>

                    {/* Lessons */}
                    {isExpanded && modLessons.map((l:any, li:number) => {
                      const isActive  = String(l.id) === lessonId;
                      const isDone    = progressMap[l.id]?.isCompleted || (isActive && lessonCompleted);
                      const isWatched = progressMap[l.id]?.watchedSeconds > 0;
                      const pct       = l.durationSecs > 0 && progressMap[l.id]
                        ? Math.min(100, Math.round(progressMap[l.id].watchedSeconds / l.durationSecs * 100)) : 0;

                      return (
                        <button key={l.id}
                          onClick={() => navigate(`/learn/${courseId}/lesson/${l.id}`)}
                          className={clsx('w-full flex items-start gap-3 px-4 py-3 text-left transition-all border-l-2 hover:bg-gray-800',
                            isActive ? 'bg-gray-800 border-l-[var(--org-primary)]' : 'border-transparent')}>
                          {/* Status icon */}
                          <div className={clsx('w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold',
                            isDone ? 'bg-green-500 text-white' : isActive ? 'text-white' : 'bg-gray-700 text-gray-400')}
                            style={isActive && !isDone ? {background:'var(--org-primary)'} : {}}>
                            {isDone ? <CheckCircle2 className="w-3.5 h-3.5"/> : isActive ? <PlayCircle className="w-3.5 h-3.5"/> : li+1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={clsx('text-xs font-semibold leading-snug line-clamp-2',
                              isActive ? 'text-white' : isDone ? 'text-gray-400' : 'text-gray-300')}>
                              {l.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-500">
                                {l.type==='Video'?'🎬':l.type==='Audio'?'🎵':'📖'}
                              </span>
                              {l.durationSecs > 0 && <span className="text-xs text-gray-500">{fmtTime(l.durationSecs)}</span>}
                            </div>
                            {/* Per-lesson mini progress */}
                            {isWatched && !isDone && l.durationSecs > 0 && (
                              <div className="mt-1.5 h-1 bg-gray-700 rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{width:`${pct}%`,background:'var(--org-primary)'}}/>
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Certificate prompt when 100% */}
            {overallPct === 100 && (
              <div className="px-4 py-4 border-t border-gray-800 bg-gradient-to-r from-amber-900/30 to-yellow-900/20 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <Award className="w-8 h-8 text-amber-400 flex-shrink-0"/>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-amber-300">Course Complete! 🎉</p>
                    <button className="text-xs text-amber-400 underline hover:text-amber-300 mt-0.5"
                      onClick={() => navigate('/dashboard/certificates')}>
                      View your certificate →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Certificate modal */}
      {showCertModal && <CertModal/>}
    </div>
  );
}
