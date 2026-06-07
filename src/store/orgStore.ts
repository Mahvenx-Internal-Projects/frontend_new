import { create } from 'zustand';

export interface OrgTheme {
  id: number;
  name: string;
  slug: string;
  logoUrl?: string;
  bannerUrl?: string;
  tagline?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  themeFont: string;
  website?: string;
  portalUrl?: string;
  currency?: string;
  razorpayKeyId?: string;
}

interface OrgState {
  org: OrgTheme | null;
  authorized: boolean;
  loading: boolean;
  error: string | null;
  setOrg: (org: OrgTheme) => void;
  setUnauthorized: (msg: string) => void;
  setLoading: (v: boolean) => void;
}

export const useOrgStore = create<OrgState>()((set) => ({
  org: null,
  authorized: false,
  loading: true,
  error: null,
  setOrg: (org) => {
    // Apply CSS variables globally
    const root = document.documentElement;
    root.style.setProperty('--org-primary',   org.primaryColor   || '#6366f1');
    root.style.setProperty('--org-secondary', org.secondaryColor || '#8b5cf6');
    root.style.setProperty('--org-accent',    org.accentColor    || '#f59e0b');
    if (org.themeFont) {
      // Inject font if not loaded
      const fontId = `org-font-${org.slug}`;
      if (!document.getElementById(fontId)) {
        const link = document.createElement('link');
        link.id = fontId;
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${org.themeFont.replace(' ', '+')}:wght@300;400;500;600;700;800&display=swap`;
        document.head.appendChild(link);
      }
      root.style.setProperty('--org-font', `'${org.themeFont}', 'Inter', sans-serif`);
    }
    set({ org, authorized: true, loading: false, error: null });
  },
  setUnauthorized: (msg) => set({ authorized: false, loading: false, error: msg }),
  setLoading: (v) => set({ loading: v }),
}));
