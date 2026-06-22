import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

// Auto-logout after a fixed period of no user activity. Resets on any
// mouse, keyboard, scroll, or touch event. Runs only while the user is
// actually authenticated — does nothing on the login/register/public pages.
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'] as const;

export function useIdleLogout() {
  const { isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        logout();
        navigate('/login', { replace: true });
        // Use a gentle, non-blocking notice rather than a jarring alert.
        // If you have a toast system, swap this for toast.error(...).
        console.info('Session ended after 30 minutes of inactivity.');
      }, IDLE_TIMEOUT_MS);
    };

    resetTimer();
    ACTIVITY_EVENTS.forEach(evt => window.addEventListener(evt, resetTimer, { passive: true }));

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach(evt => window.removeEventListener(evt, resetTimer));
    };
  }, [isAuthenticated, logout, navigate]);
}