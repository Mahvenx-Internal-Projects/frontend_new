import { useEffect } from 'react';
import { useOrgStore } from '../store/orgStore';
import { portalApi } from '../services/portalApi';
import UnauthorizedPage from '../pages/portal/UnauthorizedPage';

interface Props { children: React.ReactNode; }

export default function OrgGate({ children }: Props) {
  const { loading, authorized, error, setOrg, setUnauthorized, setLoading } = useOrgStore();

  useEffect(() => {
    const currentUrl = `${window.location.protocol}//${window.location.host}`;
    setLoading(true);
    portalApi.getOrgByUrl(currentUrl)
      .then(r => {
        if (r.data.authorized) {
          const o = r.data.organization;
          setOrg({
            id:             o.id,
            name:           o.name,
            slug:           o.slug,
            logoUrl:        o.logoUrl,
            bannerUrl:      o.bannerUrl,
            tagline:        o.tagline,
            primaryColor:   o.primaryColor   || '#6366f1',
            secondaryColor: o.secondaryColor || '#8b5cf6',
            accentColor:    o.accentColor    || '#f59e0b',
            themeFont:      o.themeFont      || 'Poppins',
            website:        o.website,
            portalUrl:      o.portalUrl,
          });
        } else {
          setUnauthorized(r.data.message || 'Not authorized');
        }
      })
      .catch(err => {
        const msg = err.response?.data?.message || 'No organization found for this URL.';
        setUnauthorized(msg);
      });
  }, []);

  if (loading) return <BootLoader />;
  if (!authorized) return <UnauthorizedPage />;
  return <>{children}</>;
}

function BootLoader() {
  return (
    <div className="fixed inset-0 bg-white flex flex-col items-center justify-center gap-6">
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl">
          <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-400 border-2 border-white" />
      </div>
      <div className="flex gap-1.5">
        {[0, 1, 2].map(i => (
          <div key={i} className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
      <p className="text-sm text-gray-400 tracking-wide">Loading your learning portal…</p>
    </div>
  );
}
