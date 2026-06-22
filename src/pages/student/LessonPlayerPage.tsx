import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft, ChevronRight, CheckCircle2, Download,
  FileText, Music, Film, BookOpen, Menu, X, Clock,
  PlayCircle, BarChart3, Award, Timer, AlertCircle, Lock
} from 'lucide-react';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import VideoPlayer from '../../components/shared/VideoPlayer';
import clsx from 'clsx';

const RICH_CONTENT_STYLES = `
  .rich-content h1 { font-size: 1.75rem; font-weight: 900; color: #111; margin: 1.25rem 0 0.5rem; line-height: 1.2; }
  .rich-content h2 { font-size: 1.375rem; font-weight: 800; color: #111; margin: 1rem 0 0.5rem; }
  .rich-content h3 { font-size: 1.125rem; font-weight: 700; color: #374151; margin: 0.875rem 0 0.375rem; }
  .rich-content p  { margin: 0.5rem 0; }
  .rich-content ul { list-style: disc; padding-left: 1.5rem; margin: 0.5rem 0; }
  .rich-content ol { list-style: decimal; padding-left: 1.5rem; margin: 0.5rem 0; }
  .rich-content li { margin: 0.25rem 0; }
  .rich-content blockquote { border-left: 4px solid var(--org-primary,#f97316); padding: 0.5rem 1rem; background: #fef9f0; border-radius: 0 0.5rem 0.5rem 0; margin: 0.75rem 0; color: #92400e; font-style: italic; }
  .rich-content pre { background: #1f2937; color: #34d399; padding: 1rem; border-radius: 0.75rem; font-family: monospace; font-size: 0.8125rem; overflow-x: auto; margin: 0.75rem 0; }
  .rich-content a  { color: var(--org-primary,#f97316); text-decoration: underline; }
  .rich-content strong, .rich-content b { font-weight: 700; }
  .rich-content em, .rich-content i { font-style: italic; }
  .rich-content u { text-decoration: underline; }
  .rich-content s { text-decoration: line-through; }
`;

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
  if (b < 1024*1024) return `${(b/1024).toFixed(0)} KB`;
  return `${(b/1024/1024).toFixed(1)} MB`;
}

// ─── Individual block renderers ────────────────────────────────
function BlockRenderer({ block, onVideoTime, resumeFrom }: {
  block: Block;
  onVideoTime?: (cur: number, dur: number) => void;
  resumeFrom?: number;
}) {
  switch (block.type) {
    case 'Heading': {
      const t = block.headingText ?? '';
      if (block.headingLevel===1) return <h1 className="text-3xl font-black text-gray-900 mt-8 mb-4 leading-tight">{t}</h1>;
      if (block.headingLevel===3) return <h3 className="text-lg font-bold text-gray-800 mt-6 mb-2">{t}</h3>;
      return <h2 className="text-2xl font-black text-gray-900 mt-7 mb-3 pb-2 border-b border-gray-100">{t}</h2>;
    }
    case 'Text':
      return (
        <div className="my-4 rich-content text-gray-700 leading-7 text-[15px]"
          dangerouslySetInnerHTML={{ __html: block.textContent ?? '' }} />
      );
    case 'Image': {
      const align = block.imageAlign;
      return (
        <figure className={clsx('my-6', align!=='full' && 'flex flex-col', align==='center' && 'items-center', align==='left' && 'items-start')}>
          <img src={block.imageUrl} alt={block.imageCaption??''}
            className={clsx('rounded-2xl shadow-md', align==='full' ? 'w-full' : 'max-h-[480px] object-contain')}/>
          {block.imageCaption && <figcaption className="text-sm text-gray-400 mt-2 italic text-center">{block.imageCaption}</figcaption>}
        </figure>
      );
    }
    case 'Video':
      return (
        <div className="my-6">
          {block.videoTitle && (
            <div className="flex items-center gap-2 mb-3">
              <Film className="w-4 h-4 text-purple-500"/>
              <p className="font-semibold text-gray-800">{block.videoTitle}</p>
              {block.videoDurationSecs ? (
                <span className="text-xs text-gray-400 flex items-center gap-1 ml-auto">
                  <Clock className="w-3 h-3"/>{fmtTime(block.videoDurationSecs)}
                </span>
              ) : null}
            </div>
          )}
          <VideoPlayer
            src={block.videoUrl ?? ''}
            title={block.videoTitle}
            onTimeUpdate={onVideoTime}
            resumeFrom={resumeFrom}
            className="rounded-2xl shadow-xl"
          />
        </div>
      );
    case 'Audio':
      return (
        <div className="my-5 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-5 border border-amber-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-400 flex items-center justify-center shadow-md">
              <Music className="w-6 h-6 text-white"/>
            </div>
            <div>
              <p className="font-bold text-gray-900">{block.audioTitle || 'Audio Lecture'}</p>
              <p className="text-xs text-amber-600">🎵 Audio lesson</p>
            </div>
          </div>
          <audio src={block.audioUrl} controls className="w-full" />
        </div>
      );
    case 'PDF':
      return (
        <div className="my-5 space-y-3">
          <div className="flex items-center gap-3 p-4 bg-red-50 rounded-2xl border border-red-200 shadow-sm">
            <div className="w-11 h-11 rounded-xl bg-red-500 flex items-center justify-center flex-shrink-0 shadow-sm">
              <FileText className="w-6 h-6 text-white"/>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 truncate">{block.fileName || 'Document.pdf'}</p>
              {block.fileSizeBytes ? <p className="text-xs text-gray-400">{fmtBytes(block.fileSizeBytes)}</p> : null}
            </div>
            <a href={block.fileUrl} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 px-3 py-2 rounded-xl transition-colors flex-shrink-0">
              <Download className="w-3.5 h-3.5"/> Download
            </a>
          </div>
          {(block.embedPdf ?? true) && block.fileUrl && (
            <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm" style={{ height: '650px' }}>
              <iframe src={`${block.fileUrl}#toolbar=0`} className="w-full h-full" title={block.fileName} />
            </div>
          )}
        </div>
      );
    case 'File':
      return (
        <div className="my-3">
          <a href={block.fileUrl} download target="_blank" rel="noreferrer"
            className="flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl border border-gray-200 transition-colors shadow-sm group">
            <div className="w-10 h-10 rounded-xl bg-gray-200 group-hover:bg-gray-300 flex items-center justify-center transition-colors">
              <Download className="w-5 h-5 text-gray-600"/>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 truncate">{block.fileName || 'Download'}</p>
              {block.fileSizeBytes ? <p className="text-xs text-gray-400">{fmtBytes(block.fileSizeBytes)}</p> : null}
            </div>
            <span className="text-xs font-bold text-blue-600 flex-shrink-0">Download ↓</span>
          </a>
        </div>
      );
    case 'Divider': return <hr className="my-8 border-gray-200"/>;
    case 'Callout': {
      const styles: Record<string, { bg: string; border: string; icon: string; text: string }> = {
        info:    { bg:'bg-blue-50',   border:'border-blue-200',   icon:'ℹ️', text:'text-blue-800' },
        warning: { bg:'bg-amber-50',  border:'border-amber-200',  icon:'⚠️', text:'text-amber-800' },
        success: { bg:'bg-green-50',  border:'border-green-200',  icon:'✅', text:'text-green-800' },
        danger:  { bg:'bg-red-50',    border:'border-red-200',    icon:'❌', text:'text-red-800' },
      };
      const s = styles[block.calloutStyle ?? 'info'] ?? styles.info;
      return (
        <div className={clsx('flex items-start gap-3 p-4 rounded-2xl border-2 my-5 shadow-sm', s.bg, s.border)}>
          <span className="text-xl flex-shrink-0 mt-0.5">{s.icon}</span>
          <p className={clsx('text-sm leading-relaxed font-medium', s.text)}>{block.calloutText}</p>
        </div>
      );
    }
    case 'Code':
      return (
        <div className="my-5 rounded-2xl overflow-hidden border border-gray-800 shadow-lg">
          <div className="flex items-center justify-between px-4 py-2.5 bg-gray-800">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500"/><div className="w-3 h-3 rounded-full bg-amber-500"/><div className="w-3 h-3 rounded-full bg-green-500"/>
            </div>
            <span className="text-xs font-mono text-gray-400">{block.codeLanguage}</span>
            <button onClick={() => navigator.clipboard.writeText(block.codeContent ?? '')}
              className="text-xs text-gray-400 hover:text-white transition-colors">Copy</button>
          </div>
          <pre className="bg-gray-950 text-green-400 text-sm font-mono p-5 overflow-x-auto leading-relaxed">
            <code>{block.codeContent}</code>
          </pre>
        </div>
      );
    default: return null;
  }
}

// ─── Watch Timer Bar ──────────────────────────────────────────
function WatchTimerBar({ watchedSecs, totalSecs, lessonTitle }: {
  watchedSecs: number; totalSecs: number; lessonTitle: string;
}) {
  const pct = totalSecs > 0 ? Math.min(100, Math.round(watchedSecs / totalSecs * 100)) : 0;
  const remaining = Math.max(0, totalSecs - watchedSecs);
  const p = 'var(--org-primary)';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Timer className="w-4 h-4 text-gray-400"/>
          <span className="text-sm font-semibold text-gray-700">Progress</span>
          <span className="text-sm font-black" style={{ color: p }}>{pct}%</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <PlayCircle className="w-3.5 h-3.5 text-green-500"/>
            Watched: <strong className="text-gray-700">{fmtTime(watchedSecs)}</strong>
          </span>
          {totalSecs > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-orange-400"/>
              Remaining: <strong className="text-orange-600">{fmtTime(remaining)}</strong>
            </span>
          )}
        </div>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: pct >= 100 ? '#10b981' : `linear-gradient(90deg, ${p}, var(--org-secondary, ${p}))` }}/>
      </div>
      {pct >= 80 && pct < 100 && (
        <p className="text-xs text-green-600 mt-1.5 font-medium">🎉 Almost done!</p>
      )}
      {pct >= 100 && (
        <p className="text-xs text-green-600 mt-1.5 font-semibold flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5"/> Lesson complete!
        </p>
      )}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────
export default function LessonPlayerPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [watchedSecs, setWatchedSecs] = useState(0);
  const [sessionStart] = useState(Date.now());
  const [completed, setCompleted] = useState(false);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const saveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch lesson with blocks
  const { data: lesson, isLoading } = useQuery({
    queryKey: ['lesson-play', lessonId],
    queryFn: () => api.get(`/lessons/${lessonId}`).then((r: any) => r.data),
    enabled: !!lessonId,
  });

  // Fetch all lessons in course for sidebar
  const { data: allLessons = [] } = useQuery({
    queryKey: ['course-lessons-list', courseId],
    queryFn: () => api.get(`/lessons/module/0?courseId=${courseId}`).then((r: any) => r.data).catch(() => []),
    enabled: !!courseId,
  });

  // Fetch course progress for this student
  const { data: progressData = [] } = useQuery({
    queryKey: ['lesson-progress', courseId, user?.id],
    queryFn: () => api.get(`/lessons/progress/course/${courseId}`).then((r: any) => r.data),
    enabled: !!courseId && !!user?.id,
  });

  // Saved progress for the CURRENT lesson — used to resume video playback
  // from where the student left off and to seed the on-screen watch
  // counter with prior sessions' total instead of starting at 0. Declared
  // here (right after progressData loads) since several effects below
  // reference it before the component's later render logic runs.
  const currentLessonProgress = (progressData as any[]).find((p: any) => p.lessonId === Number(lessonId));
  const resumeFromSecs = currentLessonProgress?.lastPositionSec ?? 0;

  // Fetch course modules+lessons for sidebar (better approach)
  const { data: courseDetail } = useQuery({
    queryKey: ['course-play-detail', courseId],
    queryFn: () => api.get(`/courses/${courseId}`).then((r: any) => r.data),
    enabled: !!courseId,
  });

  const progressMut = useMutation({
    mutationFn: (data: { isCompleted: boolean; watchedSeconds: number; lastPositionSec: number }) =>
      api.post('/lessons/progress', {
        lessonId: Number(lessonId),
        ...data
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lesson-progress'] }),
  });

  // Reset watch state whenever the lesson changes (Next/Prev navigation,
  // sidebar clicks). Without this, leftover watchedSecs from the PREVIOUS
  // lesson would get attached to the new lesson's first save tick — e.g.
  // finishing a 200s lesson and clicking Next would briefly report the new
  // lesson as "200s watched" before its own video had even started.
  useEffect(() => {
    setWatchedSecs(0);
    setVideoCurrentTime(0);
    setCompleted(false);
    lastSavedSecsRef.current = 0;
    sessionStartPositionRef.current = null;
  }, [lessonId]);

  // Once the saved progress for this lesson is available, seed the
  // on-screen counter and completion state from it — so re-opening a
  // lesson shows the TRUE accumulated watch time immediately (e.g. "2m
  // watched" from a previous session) instead of starting at 0 and only
  // climbing back up as the new session plays. lastSavedSecsRef is set to
  // the same value so the next delta calculation is correct (it won't
  // re-send the already-saved seconds as a new delta).
  useEffect(() => {
    if (!currentLessonProgress) return;
    const savedSecs = currentLessonProgress.watchedSeconds ?? 0;
    setWatchedSecs(savedSecs);
    lastSavedSecsRef.current = savedSecs;
    if (currentLessonProgress.isCompleted) setCompleted(true);
  }, [currentLessonProgress?.lessonId]);

  // Tracks how much of the CURRENT session's watchedSecs has already been
  // sent to the server. Only the forward difference (delta) since the last
  // successful save is POSTed each time — the backend just adds that delta
  // onto its stored total, so re-opening a lesson in a brand new session
  // correctly ADDS to previous watch time instead of overwriting it. No
  // database schema change needed: this bookkeeping lives entirely here.
  const lastSavedSecsRef = useRef(0);

  // Records the video's playback position at the moment THIS session
  // started watching (i.e. where it resumed from). Needed because the
  // player reports raw playback position (e.g. "you are at 1:00 in the
  // video"), but watchedSecs must represent TOTAL accumulated watch time
  // across all sessions — so we track how far the position has advanced
  // since resume, not the raw position itself.
  const sessionStartPositionRef = useRef<number | null>(null);

  // Auto-save progress every 15 seconds — sends only the delta watched
  // since the last save, not the full session-local watchedSecs.
  useEffect(() => {
    if (!lessonId) return;
    saveRef.current = setInterval(() => {
      const delta = watchedSecs - lastSavedSecsRef.current;
      if (delta > 0) {
        lastSavedSecsRef.current = watchedSecs;
        progressMut.mutate({
          isCompleted: completed,
          watchedSeconds: delta,
          lastPositionSec: Math.round(videoCurrentTime),
        });
      }
    }, 15000);
    return () => { if (saveRef.current) clearInterval(saveRef.current); };
  }, [watchedSecs, completed, videoCurrentTime, lessonId]);

  // Save immediately whenever the lesson changes or the page is closed.
  // Uses refs (always current) instead of the empty-deps closure bug that
  // previously captured watchedSecs/completed/videoCurrentTime as their
  // INITIAL values (0/false/0) forever, so navigating away never actually
  // persisted the real final watch time for the lesson being left. Like the
  // interval save above, this sends only the unsaved delta.
  const watchedSecsRef = useRef(watchedSecs);
  const completedRef = useRef(completed);
  const videoCurrentTimeRef = useRef(videoCurrentTime);
  useEffect(() => { watchedSecsRef.current = watchedSecs; }, [watchedSecs]);
  useEffect(() => { completedRef.current = completed; }, [completed]);
  useEffect(() => { videoCurrentTimeRef.current = videoCurrentTime; }, [videoCurrentTime]);

  useEffect(() => {
    // Runs on lessonId change (cleanup of the PREVIOUS lesson's effect)
    // and on final component unmount (browser close / route away from /learn).
    return () => {
      const delta = watchedSecsRef.current - lastSavedSecsRef.current;
      if (delta > 0) {
        lastSavedSecsRef.current = watchedSecsRef.current;
        api.post('/lessons/progress', {
          lessonId: Number(lessonId),
          isCompleted: completedRef.current,
          watchedSeconds: delta,
          lastPositionSec: Math.round(videoCurrentTimeRef.current),
        }).catch(() => { /* best-effort on unmount, ignore failures */ });
      }
    };
  }, [lessonId]);

  // Track wall-clock time for non-video lessons (text/audio/PDF)
  const hasVideo = (lesson?.contentBlocks ?? []).some((b: Block) => b.type === 'Video');
  useEffect(() => {
    if (hasVideo || !lesson) return;
    const timer = setInterval(() => setWatchedSecs(s => s + 1), 1000);
    return () => clearInterval(timer);
  }, [hasVideo, lesson]);

  // Heartbeat for video lessons: VideoPlayer's onTimeUpdate is the source of
  // truth for actual playback position, but if it ever stalls (slow network,
  // a player edge-case, tab backgrounded mid-load) this keeps the on-screen
  // counter visibly ticking rather than looking permanently frozen at 0.
  // It only nudges the counter forward by small amounts and only while the
  // lesson isn't yet complete — handleVideoTime always overwrites it with
  // the real position the moment the player reports one.
  const [playerReporting, setPlayerReporting] = useState(false);
  useEffect(() => {
    if (!hasVideo || !lesson || completed) return;
    const timer = setInterval(() => {
      // Only tick the fallback if the real player hasn't reported in the
      // last 3 seconds — avoids double-counting when it's working fine.
      if (!playerReporting) setWatchedSecs(s => s + 1);
      setPlayerReporting(false);
    }, 1000);
    return () => clearInterval(timer);
  }, [hasVideo, lesson, completed, playerReporting]);

  // Video time update
  const handleVideoTime = useCallback((cur: number, dur: number) => {
    setPlayerReporting(true);
    setVideoCurrentTime(cur);

    if (sessionStartPositionRef.current === null) {
      // First time the player reports a position in this session — anchor
      // here. Whatever resumeFromSecs the player started at counts as
      // already-watched (it's in the saved total), so only forward
      // progress past this point adds new watch time.
      sessionStartPositionRef.current = cur;
    }
    const advancedInSession = Math.max(0, cur - sessionStartPositionRef.current);
    const newTotal = (currentLessonProgress?.watchedSeconds ?? 0) + advancedInSession;
    setWatchedSecs(Math.round(newTotal));

    // Mark complete at 80%
    if (!completed && dur > 0 && cur / dur >= 0.8) {
      setCompleted(true);
      const roundedTotal = Math.round(newTotal);
      const delta = roundedTotal - lastSavedSecsRef.current;
      if (delta > 0) {
        lastSavedSecsRef.current = roundedTotal;
        progressMut.mutate({ isCompleted: true, watchedSeconds: delta, lastPositionSec: Math.round(cur) });
      }
    }
  }, [completed, currentLessonProgress?.watchedSeconds]);

  const markComplete = () => {
    setCompleted(true);
    const delta = watchedSecs - lastSavedSecsRef.current;
    if (delta > 0) {
      lastSavedSecsRef.current = watchedSecs;
      progressMut.mutate({ isCompleted: true, watchedSeconds: delta, lastPositionSec: Math.round(videoCurrentTime) });
    } else {
      // Already fully saved up to this point — still need to flip
      // isCompleted server-side even though there's no new time to add.
      progressMut.mutate({ isCompleted: true, watchedSeconds: 0, lastPositionSec: Math.round(videoCurrentTime) });
    }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 rounded-full border-4 border-[var(--org-primary)] border-t-transparent animate-spin mx-auto"/>
        <p className="text-sm text-gray-400">Loading lesson…</p>
      </div>
    </div>
  );

  const blocks: Block[] = [...(lesson?.contentBlocks ?? [])].sort((a: Block, b: Block) => a.order - b.order);
  const totalLessonSecs = lesson?.durationSecs ?? 0;

  // Mandatory watch-time gate: the student must have watched/spent at least
  // 80% of the lesson's duration before "Mark Done" becomes clickable. This
  // mirrors the auto-complete threshold for videos so manual completion
  // can't be used to skip required content. Lessons with no set duration
  // (durationSecs == 0) have no gate — nothing to enforce against.
  const REQUIRED_PCT = 0.8;
  const requiredSecs = totalLessonSecs > 0 ? Math.ceil(totalLessonSecs * REQUIRED_PCT) : 0;
  const meetsWatchRequirement = totalLessonSecs === 0 || watchedSecs >= requiredSecs;
  const secsRemaining = Math.max(0, requiredSecs - watchedSecs);

  // Build flat lessons list from courseDetail modules
  const allModules: any[] = courseDetail?.modules ?? [];
  const flatLessons: any[] = allModules.flatMap((m: any) => (m.lessons ?? []).map((l: any) => ({ ...l, moduleName: m.title })));
  const progressMap: Record<number, any> = {};
  (progressData as any[]).forEach((p: any) => { progressMap[p.lessonId] = p; });

  const currentIdx = flatLessons.findIndex(l => String(l.id) === lessonId);
  const prev = currentIdx > 0 ? flatLessons[currentIdx - 1] : null;
  const next = currentIdx < flatLessons.length - 1 ? flatLessons[currentIdx + 1] : null;

  const sequentialLockEnabled = !!courseDetail?.enforceSequentialLessons;

  // A lesson at a given flatLessons index is locked if sequential mode is
  // on AND any earlier lesson in the course hasn't been completed yet.
  // The currently-open lesson and anything before it are always
  // reachable — only lessons strictly ahead of the first incomplete one
  // get locked.
  const isLessonLocked = (idx: number): boolean => {
    if (!sequentialLockEnabled) return false;
    for (let i = 0; i < idx; i++) {
      const lp = progressMap[flatLessons[i]?.id];
      const isCurrentlyOpenAndDone = String(flatLessons[i]?.id) === lessonId && completed;
      if (!lp?.isCompleted && !isCurrentlyOpenAndDone) return true;
    }
    return false;
  };
  const nextLocked = next ? isLessonLocked(currentIdx + 1) : false;

  // Session stats
  const sessionMins = Math.round((Date.now() - sessionStart) / 60000);

  return (
    <div className="flex gap-5 max-w-screen-xl">
      <style>{RICH_CONTENT_STYLES}</style>
      {/* ─── Main content ──────────────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-4">

        {/* Lesson header */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className={clsx('text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1',
                  lesson?.type==='Video'?'bg-purple-100 text-purple-700':
                  lesson?.type==='Audio'?'bg-amber-100 text-amber-700':
                  lesson?.type==='Article'?'bg-blue-100 text-blue-700':'bg-gray-100 text-gray-600')}>
                  {lesson?.type==='Video'?<><Film className="w-3 h-3"/>Video</>:
                   lesson?.type==='Audio'?<><Music className="w-3 h-3"/>Audio</>:
                   lesson?.type==='Article'?<><FileText className="w-3 h-3"/>Article</>:
                   <><BookOpen className="w-3 h-3"/>Mixed</>}
                </span>
                {completed && (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3"/> Completed
                  </span>
                )}
                {lesson?.durationSecs > 0 && (
                  <span className="text-xs text-gray-400 flex items-center gap-1 ml-auto">
                    <Clock className="w-3 h-3"/> {fmtTime(lesson.durationSecs)}
                  </span>
                )}
              </div>
              <h1 className="text-xl font-black text-gray-900 leading-tight">{lesson?.title}</h1>
              {lesson?.description && <div className="text-sm text-gray-500 mt-1 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: lesson.description }} />}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Exit — saves current progress, then returns to the course
                  detail page (falls back to My Courses if courseId is
                  somehow missing). */}
              <button
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 text-sm font-semibold transition-colors"
                onClick={() => {
                  if (watchedSecsRef.current > 0) {
                    api.post('/lessons/progress', {
                      lessonId: Number(lessonId),
                      isCompleted: completedRef.current,
                      watchedSeconds: watchedSecsRef.current,
                      lastPositionSec: Math.round(videoCurrentTimeRef.current),
                    }).catch(() => { /* best-effort, navigate regardless */ });
                  }
                  navigate(courseId ? `/dashboard/catalog/${courseId}` : '/dashboard/my-courses');
                }}>
                <ChevronLeft className="w-4 h-4"/> Exit
              </button>
              <button className="lg:hidden btn-ghost flex-shrink-0" onClick={() => setSidebarOpen(!sidebarOpen)}>
                {sidebarOpen ? <X className="w-5 h-5"/> : <Menu className="w-5 h-5"/>}
              </button>
            </div>
          </div>
        </div>

        {/* Watch progress bar */}
        {(totalLessonSecs > 0 || watchedSecs > 0) && (
          <WatchTimerBar
            watchedSecs={watchedSecs}
            totalSecs={totalLessonSecs || watchedSecs + 60}
            lessonTitle={lesson?.title ?? ''}
          />
        )}

        {/* Content blocks */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5 min-h-[200px]">
          {blocks.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20"/>
              <p className="font-semibold">No content yet for this lesson</p>
            </div>
          ) : (
            blocks.map((b, i) => (
              <BlockRenderer key={i} block={b}
                onVideoTime={b.type === 'Video' ? handleVideoTime : undefined}
                resumeFrom={b.type === 'Video' ? resumeFromSecs : undefined} />
            ))
          )}
        </div>

        {/* Lesson resources */}
        {lesson?.resources?.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Download className="w-4 h-4 text-gray-500"/> Lesson Resources
            </h3>
            <div className="space-y-2">
              {lesson.resources.map((r: any) => (
                <a key={r.id} href={r.fileUrl} target="_blank" rel="noreferrer" download
                  className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors">
                  <FileText className="w-4 h-4 text-gray-400 flex-shrink-0"/>
                  <span className="text-sm font-medium text-gray-700 flex-1">{r.title}</span>
                  {r.fileSizeBytes > 0 && <span className="text-xs text-gray-400">{fmtBytes(r.fileSizeBytes)}</span>}
                  <Download className="w-3.5 h-3.5 text-blue-500"/>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Session stats card */}
        {sessionMins > 0 && (
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl border border-orange-100 shadow-sm p-4">
            <p className="text-xs font-bold text-orange-700 uppercase tracking-wide mb-3 flex items-center gap-1">
              <BarChart3 className="w-3.5 h-3.5"/> Session Stats
            </p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xl font-black text-gray-900">{fmtTime(watchedSecs)}</p>
                <p className="text-xs text-gray-500">Watched</p>
              </div>
              <div>
                <p className="text-xl font-black text-gray-900">{sessionMins}m</p>
                <p className="text-xs text-gray-500">Session Time</p>
              </div>
              <div>
                <p className="text-xl font-black" style={{ color: 'var(--org-primary)' }}>
                  {totalLessonSecs > 0 ? `${Math.min(100, Math.round(watchedSecs/totalLessonSecs*100))}%` : '—'}
                </p>
                <p className="text-xs text-gray-500">Complete</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between gap-4">
          <button
            className={clsx('flex items-center gap-2 px-4 py-3 rounded-2xl border-2 font-semibold text-sm transition-all flex-1',
              prev ? 'border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-gray-50' : 'border-gray-100 text-gray-300 cursor-not-allowed')}
            disabled={!prev}
            onClick={() => prev && navigate(`/learn/${courseId}/lesson/${prev.id}`)}>
            <ChevronLeft className="w-4 h-4 flex-shrink-0"/>
            <div className="text-left min-w-0">
              <p className="text-xs text-gray-400">Previous</p>
              <p className="truncate max-w-[140px]">{prev?.title ?? '—'}</p>
            </div>
          </button>

          {!completed && (
            <button
              className={clsx('flex items-center gap-2 px-4 py-3 rounded-2xl border-2 font-semibold text-sm transition-all flex-shrink-0',
                meetsWatchRequirement
                  ? 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100'
                  : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed')}
              onClick={markComplete}
              disabled={!meetsWatchRequirement}
              title={meetsWatchRequirement ? '' : `Watch ${fmtTime(secsRemaining)} more to unlock`}>
              <CheckCircle2 className="w-4 h-4"/>
              {meetsWatchRequirement ? 'Mark Done' : `Watch ${fmtTime(secsRemaining)} more`}
            </button>
          )}

          <button
            className={clsx('flex items-center gap-2 px-4 py-3 rounded-2xl font-semibold text-sm transition-all flex-1 justify-end',
              next && !nextLocked ? 'text-white shadow-md hover:shadow-lg hover:scale-[1.01]' : 'bg-gray-100 text-gray-300 cursor-not-allowed')}
            style={next && !nextLocked ? { background: 'linear-gradient(135deg,var(--org-primary),var(--org-secondary))' } : {}}
            disabled={!next || nextLocked}
            title={nextLocked ? 'Complete this lesson to unlock the next one' : ''}
            onClick={() => next && !nextLocked && navigate(`/learn/${courseId}/lesson/${next.id}`)}>
            <div className="text-right min-w-0">
              <p className="text-xs opacity-70">{nextLocked ? 'Locked' : 'Next'}</p>
              <p className="truncate max-w-[140px]">{next?.title ?? '—'}</p>
            </div>
            {nextLocked ? <Lock className="w-4 h-4 flex-shrink-0"/> : <ChevronRight className="w-4 h-4 flex-shrink-0"/>}
          </button>
        </div>
      </div>

      {/* ─── Sidebar: course outline ────────────────────────────── */}
      <div className={clsx('w-80 flex-shrink-0 transition-all', sidebarOpen ? 'block' : 'hidden lg:block')}>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm sticky top-4 max-h-[calc(100vh-100px)] flex flex-col">
          {/* Sidebar header */}
          <div className="p-4 border-b border-gray-100 flex-shrink-0">
            <h3 className="font-black text-gray-900">Course Outline</h3>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-gray-400">{flatLessons.length} lessons</p>
              {progressData && (
                <p className="text-xs font-semibold" style={{ color: 'var(--org-primary)' }}>
                  {(progressData as any[]).filter(p => p.isCompleted).length}/{flatLessons.length} done
                </p>
              )}
            </div>
            {/* Overall progress */}
            {flatLessons.length > 0 && (
              <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.round((progressData as any[]).filter(p => p.isCompleted).length / flatLessons.length * 100)}%`,
                    background: 'linear-gradient(90deg,var(--org-primary),var(--org-secondary))'
                  }}/>
              </div>
            )}
          </div>

          {/* Lessons list grouped by module */}
          <div className="flex-1 overflow-y-auto">
            {allModules.map((mod: any, mi: number) => (
              <div key={mod.id}>
                {/* Module header */}
                <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                    {mi + 1}. {mod.title}
                  </p>
                </div>
                {/* Module lessons */}
                {(mod.lessons ?? []).map((l: any, li: number) => {
                  const isActive = String(l.id) === lessonId;
                  const prog = progressMap[l.id];
                  const isDone = prog?.isCompleted || (isActive && completed);
                  const globalIdx = flatLessons.findIndex((fl: any) => fl.id === l.id);
                  const isLocked = isLessonLocked(globalIdx);
                  return (
                    <button key={l.id}
                      onClick={() => !isLocked && navigate(`/learn/${courseId}/lesson/${l.id}`)}
                      disabled={isLocked}
                      title={isLocked ? 'Complete earlier lessons to unlock' : ''}
                      className={clsx(
                        'w-full flex items-start gap-3 px-4 py-3 text-left border-b border-gray-50 transition-all',
                        isLocked ? 'opacity-50 cursor-not-allowed' :
                        isActive
                          ? 'bg-[var(--org-primary)]/8 border-r-[3px] border-r-[var(--org-primary)]'
                          : 'hover:bg-gray-50'
                      )}>
                      {/* Status circle */}
                      <div className={clsx('w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 transition-all',
                        isDone ? 'bg-green-500 text-white' :
                        isLocked ? 'bg-gray-200 text-gray-400' :
                        isActive ? 'text-white' : 'bg-gray-100 text-gray-500')}
                        style={isActive && !isDone && !isLocked ? { background: 'var(--org-primary)' } : {}}>
                        {isDone ? <CheckCircle2 className="w-3.5 h-3.5"/> : isLocked ? <Lock className="w-3 h-3"/> : li+1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={clsx('text-xs font-semibold leading-snug line-clamp-2',
                          isActive ? 'text-[var(--org-primary)]' : isDone ? 'text-gray-600' : 'text-gray-700')}>
                          {l.title}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs text-gray-400">
                            {l.type==='Video'?'🎬':l.type==='Audio'?'🎵':l.type==='Article'?'📖':'📚'}
                          </span>
                          {l.durationSecs > 0 && <span className="text-xs text-gray-400">{fmtTime(l.durationSecs)}</span>}
                          {/* Progress bar for this lesson */}
                          {prog && !isDone && prog.watchedSeconds > 0 && l.durationSecs > 0 && (
                            <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{
                                width: `${Math.min(100, Math.round(prog.watchedSeconds/l.durationSecs*100))}%`,
                                background: 'var(--org-primary)'
                              }}/>
                            </div>
                          )}
                        </div>
                      </div>
                      {isActive && !isDone && (
                        <PlayCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--org-primary)' }}/>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Certificate prompt */}
          {flatLessons.length > 0 && (progressData as any[]).filter(p => p.isCompleted).length === flatLessons.length && (
            <div className="p-4 border-t border-gray-100 bg-gradient-to-r from-amber-50 to-yellow-50 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500 flex-shrink-0"/>
                <div>
                  <p className="text-xs font-bold text-amber-800">Course Complete! 🎉</p>
                  <button className="text-xs text-amber-600 underline font-semibold mt-0.5"
                    onClick={() => navigate('/dashboard/certificates')}>
                    View Certificate →
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
