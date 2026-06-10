import { useEffect, useState } from 'react';
import api from '../../services/api';

let loadingCount = 0;
const listeners: Set<(loading: boolean) => void> = new Set();

// Intercept axios to track in-flight requests
api.interceptors.request.use(cfg => {
  loadingCount++;
  listeners.forEach(fn => fn(loadingCount > 0));
  return cfg;
});
api.interceptors.response.use(
  r  => { loadingCount = Math.max(0, loadingCount - 1); listeners.forEach(fn => fn(loadingCount > 0)); return r; },
  e  => { loadingCount = Math.max(0, loadingCount - 1); listeners.forEach(fn => fn(loadingCount > 0)); return Promise.reject(e); }
);

export default function GlobalLoader() {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listeners.add(setLoading);
    return () => { listeners.delete(setLoading); };
  }, []);

  if (!loading) return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-0.5">
      <div className="h-full bg-gradient-to-r from-[var(--org-primary)] via-[var(--org-secondary,var(--org-primary))] to-[var(--org-primary)] animate-[loading_1.5s_ease-in-out_infinite]"/>
      <style>{`@keyframes loading{0%{transform:scaleX(0) translateX(0)}50%{transform:scaleX(0.7) translateX(40%)}100%{transform:scaleX(1) translateX(100%)}}`}</style>
    </div>
  );
}
