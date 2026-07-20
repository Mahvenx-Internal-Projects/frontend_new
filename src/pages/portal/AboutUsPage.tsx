import { useQuery } from '@tanstack/react-query';
import { GraduationCap, BookOpen, Users, Award, TrendingUp, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useOrgStore } from '../../store/orgStore';

const API_BASE = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? '' : 'https://lms.worksupport360.com';

export default function AboutUsPage() {
  const { org } = useOrgStore();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['org-settings-about', org?.id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/organizations/${org!.id}`);
      if (!res.ok) throw new Error('Failed to load');
      return res.json();
    },
    enabled: !!org?.id,
    staleTime: 0,
  });

  const primary   = org?.primaryColor   ?? '#6366f1';
  const secondary = org?.secondaryColor ?? '#8b5cf6';
  const template  = settings?.aboutUsTemplate ?? 'classic';
  const showLogo  = settings?.showLogoInAboutUs !== false;
  const content   = settings?.aboutUsContent;

  if (!org) return null;

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-gray-200 border-t-[var(--org-primary,#6366f1)] rounded-full animate-spin"/>
    </div>
  );

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: `'${org.themeFont ?? 'Inter'}', sans-serif` }}>
      {/* Simple top bar */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4"/> Back to Home
          </Link>
        </div>
      </div>

      <section className="py-16 md:py-24" style={{ background: `${primary}06` }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <p className="text-sm font-bold uppercase tracking-widest mb-1" style={{ color: primary }}>Who we are</p>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900">About {org.name}</h1>
          </div>

          {!content ? (
            <div className="bg-white rounded-3xl shadow-lg p-12 text-center max-w-2xl mx-auto">
              <p className="text-gray-400 italic">About Us content hasn't been added yet.</p>
            </div>
          ) : template === 'split' ? (
            <div className="grid md:grid-cols-2 gap-8 items-center bg-white rounded-3xl shadow-lg p-8 md:p-12">
              <div className="flex items-center justify-center">
                <div className="w-full aspect-square rounded-3xl flex items-center justify-center p-12"
                  style={{ background: `linear-gradient(135deg, ${primary}15, ${secondary}10)` }}>
                  {showLogo && org.logoUrl ? (
                    <img src={org.logoUrl} alt={org.name} className="w-32 h-32 rounded-2xl object-cover shadow-xl"/>
                  ) : <GraduationCap className="w-20 h-20" style={{ color: primary }}/>}
                </div>
              </div>
              <div className="prose prose-gray max-w-none text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: content }}/>
            </div>
          ) : template === 'timeline' ? (
            <div className="bg-white rounded-3xl shadow-lg p-8 md:p-12 max-w-3xl mx-auto">
              {showLogo && org.logoUrl && <div className="flex justify-center mb-8"><img src={org.logoUrl} alt={org.name} className="w-16 h-16 rounded-2xl object-cover shadow-lg"/></div>}
              <div className="space-y-6">
                {content.split(/<\/p>|<br\s*\/?>/i).map((p: string) => p.replace(/<[^>]+>/g, '').trim()).filter(Boolean).map((p: string, i: number, arr: string[]) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className="w-3 h-3 rounded-full" style={{ background: primary }}/>
                      {i < arr.length - 1 && <div className="w-0.5 flex-1 mt-1" style={{ background: `${primary}30` }}/>}
                    </div>
                    <p className="text-gray-700 leading-relaxed pb-2">{p}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : template === 'card' ? (
            <div className="bg-white rounded-3xl shadow-lg p-8 md:p-12 max-w-4xl mx-auto space-y-8">
              {showLogo && org.logoUrl && <div className="flex justify-center"><img src={org.logoUrl} alt={org.name} className="w-16 h-16 rounded-2xl object-cover shadow-lg"/></div>}
              <div className="prose prose-gray max-w-none text-gray-700 leading-relaxed text-center" dangerouslySetInnerHTML={{ __html: content }}/>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[{icon:BookOpen,label:'Courses'},{icon:Users,label:'Students'},{icon:Award,label:'Certified'},{icon:TrendingUp,label:'Growing'}].map(s => (
                  <div key={s.label} className="rounded-2xl p-4 text-center" style={{ background: `${primary}08`, border: `1px solid ${primary}20` }}>
                    <s.icon className="w-6 h-6 mx-auto mb-2" style={{ color: primary }}/>
                    <p className="text-xs font-semibold text-gray-600">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl shadow-lg p-8 md:p-12 max-w-4xl mx-auto">
              {showLogo && org.logoUrl && <div className="flex justify-center mb-8"><img src={org.logoUrl} alt={org.name} className="w-20 h-20 rounded-2xl object-cover shadow-lg"/></div>}
              <div className="prose prose-gray max-w-none text-gray-700 leading-relaxed text-center" dangerouslySetInnerHTML={{ __html: content }}/>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
