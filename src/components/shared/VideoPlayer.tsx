import { useRef, useState, useEffect } from 'react';
import {
  Play, Pause, Volume2, VolumeX, Maximize,
  SkipBack, SkipForward, Settings, Loader2
} from 'lucide-react';
import clsx from 'clsx';

interface Props {
  src: string;
  title?: string;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  resumeFrom?: number;    // seconds to resume from
  className?: string;
}

function fmtTime(s: number) {
  if (isNaN(s)) return '0:00';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  return `${m}:${String(sec).padStart(2,'0')}`;
}

export default function VideoPlayer({ src, title, onTimeUpdate, onEnded, resumeFrom = 0, className }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying]     = useState(false);
  const [muted, setMuted]         = useState(false);
  const [volume, setVolume]       = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration]   = useState(0);
  const [buffered, setBuffered]   = useState(0);
  const [loading, setLoading]     = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [speed, setSpeed]         = useState(1);
  const [showSpeed, setShowSpeed] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const p = 'var(--org-primary)';

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    v.addEventListener('loadedmetadata', () => {
      setDuration(v.duration);
      setLoading(false);
      if (resumeFrom > 0) v.currentTime = resumeFrom;
    });
    v.addEventListener('waiting',  () => setLoading(true));
    v.addEventListener('canplay',  () => setLoading(false));
    v.addEventListener('playing',  () => setLoading(false));
    v.addEventListener('progress', () => {
      if (v.buffered.length > 0)
        setBuffered((v.buffered.end(v.buffered.length - 1) / v.duration) * 100);
    });
    v.addEventListener('timeupdate', () => {
      setCurrentTime(v.currentTime);
      onTimeUpdate?.(v.currentTime, v.duration);
    });
    v.addEventListener('ended', () => {
      setPlaying(false);
      onEnded?.();
    });
    v.addEventListener('error', () => setLoading(false));
  }, [src]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (playing) { v.pause(); setPlaying(false); }
    else { v.play(); setPlaying(true); }
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
    v.volume = val;
    setVolume(val);
    setMuted(val === 0);
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    if (muted) { v.muted = false; v.volume = volume || 0.8; setMuted(false); }
    else { v.muted = true; setMuted(true); }
  };

  const changeSpeed = (s: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = s;
    setSpeed(s);
    setShowSpeed(false);
  };

  const fullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  };

  const showControlsTemporarily = () => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (playing) {
      hideTimer.current = setTimeout(() => setShowControls(false), 3000);
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className={clsx('relative bg-black rounded-2xl overflow-hidden select-none group', className)}
      onMouseMove={showControlsTemporarily}
      onMouseLeave={() => playing && setShowControls(false)}
      style={{ aspectRatio: '16/9' }}
    >
      {/* Video element — preload=metadata for fast start, no autoplay */}
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-contain"
        preload="metadata"
        onClick={togglePlay}
        playsInline
      />

      {/* Buffering spinner */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
          <Loader2 className="w-12 h-12 text-white animate-spin" />
        </div>
      )}

      {/* Big play button (center) — shows when paused */}
      {!playing && !loading && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-all hover:scale-110">
            <Play className="w-10 h-10 text-white ml-1" />
          </div>
        </button>
      )}

      {/* Controls overlay */}
      <div className={clsx(
        'absolute inset-x-0 bottom-0 transition-opacity duration-300',
        showControls || !playing ? 'opacity-100' : 'opacity-0'
      )}>
        {/* Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

        <div className="relative px-4 pb-4 pt-8 space-y-2">
          {/* Title */}
          {title && <p className="text-white text-sm font-semibold truncate opacity-90">{title}</p>}

          {/* Seek bar */}
          <div className="relative group/seek cursor-pointer" onClick={seek}>
            {/* Track */}
            <div className="h-1.5 bg-white/30 rounded-full overflow-hidden hover:h-2.5 transition-all">
              {/* Buffered */}
              <div className="absolute h-full bg-white/30 rounded-full" style={{ width: `${buffered}%` }} />
              {/* Progress */}
              <div className="absolute h-full rounded-full transition-all"
                style={{ width: `${progress}%`, background: `linear-gradient(90deg, var(--org-primary), var(--org-secondary, var(--org-primary)))` }} />
            </div>
            {/* Thumb */}
            <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md opacity-0 group-hover/seek:opacity-100 transition-opacity pointer-events-none"
              style={{ left: `${progress}%`, transform: 'translate(-50%, -50%)' }} />
          </div>

          {/* Controls row */}
          <div className="flex items-center justify-between gap-3">
            {/* Left: play, skip, volume */}
            <div className="flex items-center gap-2">
              <button onClick={() => skip(-10)} className="p-1.5 text-white/70 hover:text-white transition-colors" title="-10s">
                <SkipBack className="w-4 h-4" />
              </button>
              <button onClick={togglePlay} className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-all">
                {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>
              <button onClick={() => skip(10)} className="p-1.5 text-white/70 hover:text-white transition-colors" title="+10s">
                <SkipForward className="w-4 h-4" />
              </button>

              {/* Volume */}
              <div className="flex items-center gap-1.5 group/vol">
                <button onClick={toggleMute} className="p-1.5 text-white/70 hover:text-white transition-colors">
                  {muted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <input
                  type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume}
                  onChange={e => changeVolume(Number(e.target.value))}
                  className="w-0 group-hover/vol:w-20 transition-all duration-200 accent-white h-1 opacity-0 group-hover/vol:opacity-100"
                />
              </div>

              {/* Time */}
              <span className="text-white/80 text-xs font-mono">
                {fmtTime(currentTime)} / {fmtTime(duration)}
              </span>
            </div>

            {/* Right: speed, fullscreen */}
            <div className="flex items-center gap-2">
              {/* Speed */}
              <div className="relative">
                <button onClick={() => setShowSpeed(!showSpeed)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-all">
                  <Settings className="w-3 h-3" /> {speed}x
                </button>
                {showSpeed && (
                  <div className="absolute bottom-8 right-0 bg-black/90 rounded-xl overflow-hidden shadow-2xl z-10 min-w-[80px]">
                    {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(s => (
                      <button key={s} onClick={() => changeSpeed(s)}
                        className={clsx('w-full px-4 py-2 text-xs text-left transition-colors',
                          speed === s ? 'text-white font-bold' : 'text-white/60 hover:text-white hover:bg-white/10')}
                        style={speed === s ? { color: 'var(--org-primary)' } : {}}>
                        {s}x {s === 1 ? '(Normal)' : ''}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button onClick={fullscreen} className="p-1.5 text-white/70 hover:text-white transition-colors">
                <Maximize className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
