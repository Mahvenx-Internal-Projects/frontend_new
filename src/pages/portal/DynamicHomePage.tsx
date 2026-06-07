import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Settings, ExternalLink } from 'lucide-react';
import { useOrgStore } from '../../store/orgStore';
import { useAuthStore } from '../../store/authStore';
import { portalApi } from '../../services/portalApi';
import type { HomePageConfig } from '../../types';
import type { PublicCategory, PublicCourse, OrgStats } from '../../services/portalApi';
import type { TemplateProps } from '../../components/portal/templates/shared';

import TemplateModern from '../../components/portal/templates/TemplateModern';
import TemplateIndian from '../../components/portal/templates/TemplateIndian';
import { TemplateBold, TemplateMinimal, TemplateDark } from '../../components/portal/templates/OtherTemplates';

export default function DynamicHomePage() {
  const { org } = useOrgStore();
  const { user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const isAdmin = isAuthenticated && user && ['SuperAdmin','OrgAdmin'].includes(user.role);

  const { data: config, isLoading: configLoading } = useQuery<HomePageConfig>({
    queryKey: ['homepage-config', org?.id],
    queryFn: () => portalApi.getHomePage(org!.id).then(r => r.data),
    enabled: !!org?.id,
  });

  const { data: stats } = useQuery<OrgStats>({
    queryKey: ['portal-stats', org?.id],
    queryFn: () => portalApi.getStats(org!.id).then(r => r.data),
    enabled: !!org?.id,
  });

  const { data: categories = [] } = useQuery<PublicCategory[]>({
    queryKey: ['portal-categories', org?.id],
    queryFn: () => portalApi.getCategories(org!.id).then(r => r.data),
    enabled: !!org?.id,
  });

  const { data: coursesData } = useQuery({
    queryKey: ['portal-courses', org?.id, activeCategory, search],
    queryFn: () => portalApi.getCourses(org!.id, {
      categoryId: activeCategory ?? undefined,
      search: search || undefined,
      size: 12,
    }).then(r => r.data),
    enabled: !!org?.id,
    placeholderData: (prev: any) => prev,
  });

  const { data: instructors = [] } = useQuery({
    queryKey: ['portal-instructors', org?.id],
    queryFn: () => portalApi.getInstructors(org!.id).then(r => r.data),
    enabled: !!org?.id,
  });

  // Inject custom HTML into page (runs after mount)
  useEffect(() => {
    if ((config as any)?.customHtml) {
      const div = document.createElement('div');
      div.id = 'lms-custom-html';
      div.innerHTML = (config as any).customHtml;
      document.body.appendChild(div);
      // Execute any scripts
      div.querySelectorAll('script').forEach(old => {
        const s = document.createElement('script');
        if (old.src) s.src = old.src;
        else s.textContent = old.textContent;
        document.body.appendChild(s);
      });
      return () => { document.getElementById('lms-custom-html')?.remove(); };
    }
  }, [(config as any)?.customHtml]);

  if (!org) return null;

  if (configLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ fontFamily: `'${org.themeFont || 'Poppins'}', sans-serif` }}>
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-white font-black text-2xl shadow-xl animate-pulse"
          style={{ background: `linear-gradient(135deg, ${org.primaryColor || '#f97316'}, ${org.secondaryColor || '#ea580c'})` }}>
          {org.name[0]}
        </div>
        <div className="flex gap-1.5 justify-center">
          {[0,1,2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full animate-bounce"
              style={{ background: org.primaryColor || '#f97316', animationDelay: `${i*0.15}s` }} />
          ))}
        </div>
        <p className="text-sm text-gray-400">Loading {org.name}…</p>
      </div>
    </div>
  );

  const props: TemplateProps = {
    config: config!,
    org,
    stats,
    categories: categories as PublicCategory[],
    courses: ((coursesData as any)?.items ?? []) as PublicCourse[],
    instructors: instructors as any[],
    onCourseClick: (id) => navigate(`/course/${id}`),
    onNavigate: navigate,
    isAuthenticated,
    userName: user?.firstName,
    activeCategory,
    setActiveCategory,
    search,
    setSearch,
  };

  if (!config) return null;

  const Template = {
    indian:  TemplateIndian,
    bold:    TemplateBold,
    minimal: TemplateMinimal,
    dark:    TemplateDark,
  }[config.templateId] ?? TemplateModern;
  

  return (
    <div className="relative">
      {/* Admin floating edit button */}
      {isAdmin && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
          <button
            onClick={() => navigate('/dashboard/homepage-editor')}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl text-white text-sm font-bold shadow-2xl hover:scale-105 transition-transform"
            style={{ background: `linear-gradient(135deg, ${org.primaryColor || '#f97316'}, ${org.secondaryColor || '#ea580c'})` }}>
            <Settings className="w-4 h-4" />
            Edit Homepage
          </button>
          <button
            onClick={() => navigate('/dashboard/admin')}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-gray-900 text-white text-sm font-bold shadow-xl hover:scale-105 transition-transform">
            <ExternalLink className="w-4 h-4" />
            Dashboard
          </button>
        </div>
      )}
      <Template {...props} />
    </div>
  );
}
