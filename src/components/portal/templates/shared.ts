import { useState, useRef, useEffect } from 'react';
import type { HomePageConfig, HomePageSection, NavLink, FooterLink, SocialLink, CustomSection } from '../../../types';
import type { OrgTheme } from '../../../store/orgStore';
import type { PublicCourse, PublicCategory, OrgStats } from '../../../services/portalApi';

export interface TemplateProps {
  config: HomePageConfig;
  org: OrgTheme;
  stats: OrgStats | undefined;
  categories: PublicCategory[];
  courses: PublicCourse[];
  instructors: any[];
  onCourseClick: (id: number) => void;
  onNavigate: (path: string) => void;
  isAuthenticated: boolean;
  userName?: string;
  activeCategory: number | null;
  setActiveCategory: (id: number | null) => void;
  search: string;
  setSearch: (s: string) => void;
}

export function parseSections(json?: string): HomePageSection[] {
  try { return json ? JSON.parse(json) : []; } catch { return []; }
}
export function parseNavLinks(json?: string): NavLink[] {
  try { return json ? JSON.parse(json) : []; } catch { return []; }
}
export function parseFooterLinks(json?: string): FooterLink[] {
  try { return json ? JSON.parse(json) : []; } catch { return []; }
}
export function parseSocial(json?: string): SocialLink[] {
  try { return json ? JSON.parse(json) : []; } catch { return []; }
}
export function parseCustomSections(json?: string): CustomSection[] {
  try { return json ? JSON.parse(json) : []; } catch { return []; }
}

export const SOCIAL_ICONS: Record<string, string> = {
  youtube: '▶', instagram: '📷', twitter: '🐦', facebook: '👤',
  linkedin: '💼', whatsapp: '💬', telegram: '📨',
};

export function useCountUp(target: number) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        let cur = 0;
        const step = Math.max(target / 60, 1);
        const t = setInterval(() => {
          cur = Math.min(cur + step, target);
          setCount(Math.round(cur));
          if (cur >= target) clearInterval(t);
        }, 16);
      }
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [target]);
  return { count, ref };
}
