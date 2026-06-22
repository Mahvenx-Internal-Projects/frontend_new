import { useRef, useState, useEffect } from 'react';
import {
  Play, Pause, Volume2, VolumeX, Maximize,
  SkipBack, SkipForward, Settings, Loader2, ExternalLink
} from 'lucide-react';
import clsx from 'clsx';

interface Props {
  src: string;
  title?: string;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  resumeFrom?: number;
  className?: string;
}

// ─── Detect URL type ──────────────────────────────────────────
function getVideoType(url: string): 'youtube' | 'direct' {
  if (!url) return 'direct';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  return 'direct';
}

function getYouTubeId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function fmtTime(s: number) {
  if (isNaN(s) || !isFinite(s)) return '0:00';
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  return `${m}:${String(sec).padStart(2,'0')}`;
}

// ─── YouTube Player ───────────────────────────────────────────
// Uses youtube-nocookie.com to avoid tracking consent issues.
// No sandbox attribute so autoplay / fullscreen work properly.
function YouTubePlayer({ videoId, title, className, resumeFrom = 0 }: {
  videoId: string; title?: string; className?: string;
  resumeFrom?: number;
  onTimeUpdate?: (t: number, d: number) => void;
}) {
  const [loading, setLoading] = useState(true);
  const start = resumeFrom > 0 ? `&start=${Math.floor(resumeFrom)}` : '';
  // youtube-nocookie avoids the "Video unavailable" / consent blocks on embeds.
  // YouTube's own autoplay policy requires mute=1 for autoplay=1 to work at
  // all in an iframe — there's no unmuted-autoplay path for embeds, unlike
  // native <video>. Students can unmute via the player's own volume control.
  const embedUrl =
    `https://www.youtube-nocookie.com/embed/${videoId}` +
    `?rel=0&modestbranding=1&enablejsapi=0&playsinline=1&autoplay=1&mute=1${start}`;

  return (
    <div className={clsx('relative bg-black rounded-2xl overflow-hidden', className)}
      style={{ aspectRatio: '16/9' }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
          <Loader2 className="w-10 h-10 text-white animate-spin"/>
        </div>
      )}
      <iframe
        key={videoId}
        src={embedUrl}
        title={title || 'Video Lesson'}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        onLoad={() => setLoading(false)}
        style={{ border: 'none' }}
      />
      {!loading && (
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 text-white text-xs font-semibold pointer-events-none">
          <VolumeX className="w-3.5 h-3.5"/> Use the player's volume control to unmute
        </div>
      )}
      {/* Fallback link in case embed is blocked */}
      <div className="absolute top-2 right-2 z-20">
        <a
          href={`https://www.youtube.com/watch?v=${videoId}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 text-xs bg-black/70 text-white px-2 py-1 rounded-lg hover:bg-black transition-colors"
        >
          <ExternalLink className="w-3 h-3" /> Open in YouTube
        </a>
      </div>
    </div>
  );
}

// ─── Native Video Player (Cloudflare R2 / direct MP4) ────────
function NativePlayer({ src, title, onTimeUpdate, onEnded, resumeFrom = 0, className }: Props) {
  const videoRef     = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying]         = useState(false);
  const [muted, setMuted]             = useState(false);
  const [volume, setVolume]           = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration]       = useState(0);
  const [buffered, setBuffered]       = useState(0);
  const [loading, setLoading]         = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [speed, setSpeed]             = useState(1);
  const [showSpeed, setShowSpeed]     = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const handlers: [string, EventListener][] = [
      ['loadedmetadata', () => {
        setDuration(v.duration);
        setLoading(false);
        if (resumeFrom > 0) v.currentTime = resumeFrom;
        // Attempt autoplay as soon as metadata is ready. Browsers commonly
        // block autoplay WITH sound, but allow it when muted — so try
        // unmuted first, and if that promise rejects, retry muted instead
        // of leaving the video sitting paused waiting for a manual click.
        v.play().catch(() => {
          v.muted = true;
          setMuted(true);
          v.play().catch(() => { /* still blocked — user must press play */ });
        });
      }],
      ['waiting',    () => setLoading(true)],
      ['canplay',    () => setLoading(false)],
      ['playing',    () => { setLoading(false); setPlaying(true); }],
      ['pause',      () => setPlaying(false)],
      ['progress',   () => { if (v.buffered.length > 0) setBuffered(v.buffered.end(v.buffered.length - 1) / v.duration * 100); }],
      ['timeupdate', () => { setCurrentTime(v.currentTime); onTimeUpdate?.(v.currentTime, v.duration); }],
      ['ended',      () => { setPlaying(false); onEnded?.(); }],
    ];
    handlers.forEach(([e, fn]) => v.addEventListener(e, fn));
    return () => handlers.forEach(([e, fn]) => v.removeEventListener(e, fn));
  }, [src]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    playing ? v.pause() : v.play();
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (!v || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    v.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
  };

  const skip = (secs: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.currentTime + secs, duration));
  };

  const changeVolume = (val: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = val; setVolume(val); setMuted(val === 0);
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    if (muted) { v.muted = false; v.volume = volume || 0.8; setMuted(false); }
    else        { v.muted = true;  setMuted(true); }
  };

  const changeSpeed = (s: number) => {
    if (videoRef.current) videoRef.current.playbackRate = s;
    setSpeed(s); setShowSpeed(false);
  };

  const fullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen?.();
  };

  const showCtrl = () => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (playing) hideTimer.current = setTimeout(() => setShowControls(false), 3000);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div ref={containerRef}
      className={clsx('relative bg-black rounded-2xl overflow-hidden select-none', className)}
      style={{ aspectRatio: '16/9' }}
      onMouseMove={showCtrl}
      onMouseLeave={() => playing && setShowControls(false)}>

      <video ref={videoRef} src={src} className="w-full h-full object-contain"
        preload="metadata" onClick={togglePlay} playsInline/>

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <Loader2 className="w-12 h-12 text-white animate-spin"/>
        </div>
      )}

      {!playing && !loading && (
        <button onClick={togglePlay} className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-all hover:scale-110">
            <Play className="w-10 h-10 text-white ml-1"/>
          </div>
        </button>
      )}

      {playing && muted && (
        <button onClick={toggleMute}
          className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 text-white text-xs font-semibold hover:bg-black/80 transition-colors">
          <VolumeX className="w-3.5 h-3.5"/> Tap to unmute
        </button>
      )}

      <div className={clsx('absolute inset-x-0 bottom-0 transition-opacity duration-300', showControls || !playing ? 'opacity-100' : 'opacity-0')}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none"/>
        <div className="relative px-4 pb-3 pt-8 space-y-2">
          {title && <p className="text-white text-sm font-semibold truncate opacity-90">{title}</p>}
          {/* Seek bar */}
          <div className="relative cursor-pointer h-3 flex items-center" onClick={seek}>
            <div className="w-full h-1.5 bg-white/30 rounded-full overflow-hidden hover:h-2.5 transition-all relative">
              <div className="absolute h-full bg-white/30 rounded-full" style={{ width: `${buffered}%` }}/>
              <div className="absolute h-full rounded-full transition-all" style={{ width: `${progress}%`, background: 'linear-gradient(90deg,var(--org-primary),var(--org-secondary,var(--org-primary)))' }}/>
            </div>
          </div>
          {/* Controls */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button onClick={() => skip(-10)} className="p-1.5 text-white/70 hover:text-white"><SkipBack className="w-4 h-4"/></button>
              <button onClick={togglePlay} className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white">
                {playing ? <Pause className="w-5 h-5"/> : <Play className="w-5 h-5 ml-0.5"/>}
              </button>
              <button onClick={() => skip(10)} className="p-1.5 text-white/70 hover:text-white"><SkipForward className="w-4 h-4"/></button>
              <div className="flex items-center gap-1.5 group/vol">
                <button onClick={toggleMute} className="p-1.5 text-white/70 hover:text-white">
                  {muted || volume === 0 ? <VolumeX className="w-4 h-4"/> : <Volume2 className="w-4 h-4"/>}
                </button>
                <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume}
                  onChange={e => changeVolume(Number(e.target.value))}
                  className="w-0 group-hover/vol:w-20 transition-all accent-white h-1 opacity-0 group-hover/vol:opacity-100"/>
              </div>
              <span className="text-white/80 text-xs font-mono">{fmtTime(currentTime)} / {fmtTime(duration)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <button onClick={() => setShowSpeed(!showSpeed)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-bold">
                  <Settings className="w-3 h-3"/> {speed}x
                </button>
                {showSpeed && (
                  <div className="absolute bottom-8 right-0 bg-black/90 rounded-xl overflow-hidden shadow-2xl z-10 min-w-[80px]">
                    {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(s => (
                      <button key={s} onClick={() => changeSpeed(s)}
                        className={clsx('w-full px-4 py-2 text-xs text-left transition-colors',
                          speed === s ? 'text-[var(--org-primary)] font-bold' : 'text-white/60 hover:text-white hover:bg-white/10')}>
                        {s}x{s === 1 ? ' (Normal)' : ''}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={fullscreen} className="p-1.5 text-white/70 hover:text-white"><Maximize className="w-4 h-4"/></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────
export default function VideoPlayer({ src, title, onTimeUpdate, onEnded, resumeFrom = 0, className }: Props) {
  if (!src) return (
    <div className={clsx('bg-gray-900 rounded-2xl flex items-center justify-center', className)} style={{ aspectRatio: '16/9' }}>
      <div className="text-center text-gray-500">
        <Play className="w-12 h-12 mx-auto mb-2 opacity-30"/>
        <p className="text-sm">No video source</p>
      </div>
    </div>
  );

  if (getVideoType(src) === 'youtube') {
    const videoId = getYouTubeId(src);
    if (!videoId) return (
      <div className={clsx('bg-gray-900 rounded-2xl flex items-center justify-center', className)} style={{ aspectRatio: '16/9' }}>
        <a href={src} target="_blank" rel="noreferrer" className="text-blue-400 underline text-sm flex items-center gap-2">
          <ExternalLink className="w-4 h-4"/> Open Video Link
        </a>
      </div>
    );
    return <YouTubePlayer videoId={videoId} title={title} resumeFrom={resumeFrom} onTimeUpdate={onTimeUpdate} className={className}/>;
  }

  return <NativePlayer src={src} title={title} onTimeUpdate={onTimeUpdate} onEnded={onEnded} resumeFrom={resumeFrom} className={className}/>;
}
