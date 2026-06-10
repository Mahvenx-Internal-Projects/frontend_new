import { useState, useRef, useCallback } from 'react';
import { Upload, X, CheckCircle2, AlertCircle, Film, Image, FileText, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import api from '../../services/api';

export type UploadType = 'image' | 'video' | 'file';

interface Props {
  type: UploadType;
  folder?: string;
  onUploaded: (url: string, key: string) => void;
  onError?: (msg: string) => void;
  accept?: string;
  label?: string;
  currentUrl?: string;
  className?: string;
}

interface UploadState {
  status: 'idle' | 'uploading' | 'done' | 'error';
  progress: number;   // 0-100
  url: string;
  error: string;
  fileName: string;
  fileSize: string;
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

const ACCEPT: Record<UploadType, string> = {
  image: 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml',
  video: 'video/mp4,video/mov,video/avi,video/mkv,video/webm',
  file:  '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.txt',
};

const ICON: Record<UploadType, React.ReactNode> = {
  image: <Image className="w-8 h-8" />,
  video: <Film className="w-8 h-8" />,
  file:  <FileText className="w-8 h-8" />,
};

export default function FileUpload({ type, folder, onUploaded, onError, accept, label, currentUrl, className }: Props) {
  const [state, setState] = useState<UploadState>({
    status: 'idle', progress: 0, url: currentUrl || '', error: '', fileName: '', fileSize: '',
  });
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const xhrRef   = useRef<XMLHttpRequest | null>(null);

  const upload = useCallback(async (file: File) => {
    setState(s => ({ ...s, status: 'uploading', progress: 0, error: '', fileName: file.name, fileSize: fmtSize(file.size) }));

    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('lms_token');

    // Use XHR for upload progress (axios onUploadProgress works too but XHR is cleaner)
    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        setState(s => ({ ...s, progress: pct }));
      }
    });

    const result = await new Promise<{ url: string; key: string } | null>((resolve) => {
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch {
            resolve(null);
          }
        } else {
          try {
            const err = JSON.parse(xhr.responseText);
            setState(s => ({ ...s, status: 'error', error: err.message ?? `Upload failed (${xhr.status})` }));
          } catch {
            setState(s => ({ ...s, status: 'error', error: `Upload failed (${xhr.status})` }));
          }
          resolve(null);
        }
      };
      xhr.onerror = () => {
        setState(s => ({ ...s, status: 'error', error: 'Network error. Check your connection.' }));
        resolve(null);
      };
      xhr.onabort = () => {
        setState(s => ({ ...s, status: 'idle', progress: 0, fileName: '', fileSize: '' }));
        resolve(null);
      };

      // For video uploads, go DIRECTLY to backend to bypass Vite proxy 413 limit
      const isVideo = type === 'video';
      const backendBase = isVideo ? 'https://localhost:7001' : '';
      const endpoint = `${backendBase}/api/upload/${type}${folder ? `?folder=${folder}` : ''}`;
      xhr.open('POST', endpoint);
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
    });

    if (result) {
      setState(s => ({ ...s, status: 'done', progress: 100, url: result.url }));
      onUploaded(result.url, result.key);
    }
  }, [type, folder, onUploaded]);

  const handleFile = (file: File) => {
    if (type === 'image' && file.size > 10 * 1024 * 1024) {
      setState(s => ({ ...s, status: 'error', error: 'Image must be under 10MB' }));
      return;
    }
    if (type === 'video' && file.size > 2 * 1024 * 1024 * 1024) {
      setState(s => ({ ...s, status: 'error', error: 'Video must be under 2GB' }));
      return;
    }
    upload(file);
  };

  const cancel = () => {
    xhrRef.current?.abort();
  };

  const reset = () => {
    setState({ status: 'idle', progress: 0, url: '', error: '', fileName: '', fileSize: '' });
    if (inputRef.current) inputRef.current.value = '';
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const p = 'var(--org-primary)';

  return (
    <div className={clsx('space-y-2', className)}>
      {label && <label className="label">{label}</label>}

      {/* Drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onClick={() => state.status === 'idle' || state.status === 'error' ? inputRef.current?.click() : undefined}
        className={clsx(
          'relative border-2 border-dashed rounded-2xl transition-all',
          state.status === 'done' ? 'border-green-400 bg-green-50' :
          state.status === 'error' ? 'border-red-300 bg-red-50' :
          dragging ? 'border-[var(--org-primary)] bg-[var(--org-primary)]/5 scale-[1.01]' :
          'border-gray-300 bg-gray-50 hover:border-[var(--org-primary)] hover:bg-[var(--org-primary)]/5',
          (state.status === 'idle' || state.status === 'error') && 'cursor-pointer'
        )}
      >
        <div className="p-6 flex flex-col items-center gap-3 text-center">
          {/* Status-based icon */}
          {state.status === 'idle' && (
            <>
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400">
                {ICON[type]}
              </div>
              <div>
                <p className="font-semibold text-gray-700">
                  <span style={{ color: p }}>Click to upload</span> or drag & drop
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {type === 'image' && 'JPG, PNG, GIF, WebP — max 10MB'}
                  {type === 'video' && 'MP4, MOV, AVI, MKV, WebM — max 2GB'}
                  {type === 'file'  && 'PDF, DOC, PPT, XLS, ZIP — max 100MB'}
                </p>
              </div>
            </>
          )}

          {state.status === 'uploading' && (
            <>
              {/* File info */}
              <div className="flex items-center gap-3 w-full max-w-sm">
                <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                  {type === 'video' ? <Film className="w-5 h-5 text-blue-500" /> :
                   type === 'image' ? <Image className="w-5 h-5 text-green-500" /> :
                   <FileText className="w-5 h-5 text-amber-500" />}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-semibold text-gray-800 truncate">{state.fileName}</p>
                  <p className="text-xs text-gray-400">{state.fileSize}</p>
                </div>
                <button onClick={e => { e.stopPropagation(); cancel(); }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Progress bar */}
              <div className="w-full max-w-sm space-y-1.5">
                <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${state.progress}%`, background: `linear-gradient(90deg, var(--org-primary), var(--org-secondary, var(--org-primary)))` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Uploading…
                  </span>
                  <span className="font-semibold" style={{ color: p }}>{state.progress}%</span>
                </div>
              </div>
            </>
          )}

          {state.status === 'done' && (
            <>
              <CheckCircle2 className="w-12 h-12 text-green-500" />
              <div>
                <p className="font-semibold text-green-700">Upload complete!</p>
                <p className="text-xs text-gray-500 mt-1 truncate max-w-64">{state.fileName}</p>
              </div>
              {type === 'image' && state.url && (
                <img src={state.url} alt="Preview" className="h-24 rounded-xl object-cover shadow-sm mt-1" />
              )}
              <button onClick={e => { e.stopPropagation(); reset(); }}
                className="text-xs text-gray-400 hover:text-gray-600 underline mt-1">
                Upload different file
              </button>
            </>
          )}

          {state.status === 'error' && (
            <>
              <AlertCircle className="w-12 h-12 text-red-400" />
              <div>
                <p className="font-semibold text-red-600">Upload failed</p>
                <p className="text-xs text-red-500 mt-1">{state.error}</p>
              </div>
              <button onClick={e => { e.stopPropagation(); reset(); }}
                className="text-xs text-blue-500 hover:text-blue-700 underline mt-1">
                Try again
              </button>
            </>
          )}
        </div>
      </div>

      {/* Current URL input (shows existing URL, allows manual entry) */}
      {state.status === 'done' && state.url && (
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
          <span className="text-xs text-gray-400 flex-shrink-0">URL:</span>
          <input className="flex-1 text-xs text-gray-600 bg-transparent outline-none truncate font-mono"
            value={state.url} readOnly />
          <button onClick={() => { navigator.clipboard.writeText(state.url); }}
            className="text-xs text-blue-500 hover:text-blue-700 flex-shrink-0">Copy</button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept || ACCEPT[type]}
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
    </div>
  );
}
