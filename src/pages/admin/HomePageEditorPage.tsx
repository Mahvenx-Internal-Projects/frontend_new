import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Eye, EyeOff, Plus, Trash2, GripVertical, ChevronDown, ChevronUp, Globe, Layout } from 'lucide-react';
import toast from 'react-hot-toast';
import { homePageApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import type { HomePageConfig, HomePageSection, NavLink, FooterLink, SocialLink } from '../../types';
import clsx from 'clsx';

const TEMPLATES = [
  { id: 'modern',  name: 'Modern',   emoji: '🌟', desc: 'Clean, professional with glass effects' },
  { id: 'indian',  name: 'Indian',   emoji: '🇮🇳', desc: 'Vibrant, bilingual, energetic' },
  { id: 'bold',    name: 'Bold',     emoji: '💥', desc: 'Magazine-style, strong typography' },
  { id: 'minimal', name: 'Minimal',  emoji: '⬜', desc: 'Clean whitespace, elegant' },
  { id: 'dark',    name: 'Dark',     emoji: '🌙', desc: 'Premium dark with glass effects' },
];

const SECTION_LABELS: Record<string, string> = {
  stats: '📊 Stats Bar',
  categories: '🗂️ Categories',
  courses: '📚 Courses Grid',
  instructors: '👨‍🏫 Instructors',
  cta: '🎯 Call to Action',
};

const SOCIAL_PLATFORMS = ['youtube', 'instagram', 'twitter', 'facebook', 'linkedin', 'whatsapp', 'telegram'];

export default function HomePageEditorPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'template' | 'hero' | 'sections' | 'nav' | 'footer' | 'custom'>('template');
  const [previewMode, setPreviewMode] = useState(false);

  const { data: config } = useQuery<HomePageConfig>({
    queryKey: ['homepage-config-admin', user?.organizationId],
    queryFn: () => homePageApi.get(user!.organizationId).then(r => r.data),
    enabled: !!user?.organizationId,
  });

  const [form, setForm] = useState<Partial<HomePageConfig>>({
    templateId: 'modern',
    heroTitle: '',
    heroSubtitle: '',
    heroButtonText: 'Get Started',
    heroButtonUrl: '/register',
    heroStyle: 'gradient',
    showStats: true,
    showAnnouncement: false,
    announcementText: '',
    showFooterNewsletter: false,
    footerTagline: '',
    footerCopyright: '',
    customHtml: '' as string,
  });

  const [sections, setSections] = useState<HomePageSection[]>([
    { id: 'stats', enabled: true, order: 1 },
    { id: 'categories', enabled: true, order: 2 },
    { id: 'courses', enabled: true, order: 3 },
    { id: 'instructors', enabled: true, order: 4 },
    { id: 'cta', enabled: true, order: 5 },
  ]);

  const [navLinks, setNavLinks] = useState<NavLink[]>([]);
  const [footerLinks, setFooterLinks] = useState<FooterLink[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);

  useEffect(() => {
    if (config) {
      setForm({
        templateId: config.templateId,
        heroTitle: config.heroTitle || '',
        heroSubtitle: config.heroSubtitle || '',
        heroButtonText: config.heroButtonText || 'Get Started',
        heroButtonUrl: config.heroButtonUrl || '/register',
        heroStyle: config.heroStyle || 'gradient',
        showStats: config.showStats,
        showAnnouncement: config.showAnnouncement,
        announcementText: config.announcementText || '',
        showFooterNewsletter: config.showFooterNewsletter,
        footerTagline: config.footerTagline || '',
        footerCopyright: config.footerCopyright || '',
        customHtml: (config as any).customHtml ?? '',
      });
      try { if (config.sectionsConfig) setSections(JSON.parse(config.sectionsConfig)); } catch {}
      try { if (config.navLinksJson)   setNavLinks(JSON.parse(config.navLinksJson)); } catch {}
      try { if (config.footerLinksJson) setFooterLinks(JSON.parse(config.footerLinksJson)); } catch {}
      try { if (config.footerSocialJson) setSocialLinks(JSON.parse(config.footerSocialJson)); } catch {}
    }
  }, [config]);

  const saveMut = useMutation({
    mutationFn: () => homePageApi.save(user!.organizationId, {
      ...form,
      sectionsConfig: JSON.stringify(sections),
      navLinksJson: JSON.stringify(navLinks),
      footerLinksJson: JSON.stringify(footerLinks),
      footerSocialJson: JSON.stringify(socialLinks),
      customSectionsJson: config?.customSectionsJson,
        customHtml: form.customHtml,
      statsCustom: config?.statsCustom,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['homepage-config'] });
      qc.invalidateQueries({ queryKey: ['homepage-config-admin'] });
      toast.success('Homepage saved! Changes live on portal.');
    },
    onError: () => toast.error('Failed to save'),
  });

  const moveSection = (idx: number, dir: -1 | 1) => {
    const next = [...sections];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    next.forEach((s, i) => { s.order = i + 1; });
    setSections(next);
  };

  type TabId = 'template'|'hero'|'sections'|'nav'|'footer'|'custom';
  const tabs: [TabId, string][] = [
    ['template', '🎨 Template'],
    ['hero', '🦸 Hero'],
    ['sections', '📐 Sections'],
    ['nav', '🔗 Navigation'],
    ['footer', '📄 Footer'],
    ['custom', '🖥️ Custom HTML'],
  ];

  return (
    <div className="max-w-5xl space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Layout className="w-6 h-6" style={{ color: 'var(--org-primary)' }} /> Homepage Editor
          </h1>
          <p className="text-sm text-gray-500 mt-1">Edit your public homepage — changes apply instantly</p>
        </div>
        <div className="flex gap-3">
          <a href="/" target="_blank" rel="noreferrer"
            className="btn-secondary flex items-center gap-2">
            <Globe className="w-4 h-4" /> Preview Site
          </a>
          <button className="btn-primary flex items-center gap-2" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            <Save className="w-4 h-4" /> {saveMut.isPending ? 'Saving…' : 'Save & Publish'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-0.5 flex-wrap">
        {tabs.map(([t, label]) => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={clsx('px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
              activeTab === t ? 'border-[var(--org-primary)] text-[var(--org-primary)]' : 'border-transparent text-gray-500 hover:text-gray-800')}>
            {label}
          </button>
        ))}
      </div>

      {/* ─── TEMPLATE ──────────────────────────────────────────── */}
      {activeTab === 'template' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Select a homepage template for your organization. Each has a unique visual style.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TEMPLATES.map(t => (
              <button key={t.id} onClick={() => setForm(f => ({ ...f, templateId: t.id }))}
                className={clsx('card p-5 text-left transition-all hover:shadow-md border-2',
                  form.templateId === t.id ? 'border-[var(--org-primary)] shadow-lg' : 'border-transparent hover:border-gray-200')}>
                <div className="text-4xl mb-3">{t.emoji}</div>
                <div className="flex items-center justify-between mb-1">
                  <p className="font-bold text-gray-900">{t.name}</p>
                  {form.templateId === t.id && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white" style={{ background: 'var(--org-primary)' }}>Active</span>
                  )}
                </div>
                <p className="text-xs text-gray-500">{t.desc}</p>
                {/* Mini preview */}
                <div className="mt-3 rounded-lg overflow-hidden border border-gray-200 h-20 flex flex-col">
                  <div className="h-6 flex items-center px-2 gap-1" style={{ background: 'var(--org-primary)' }}>
                    <div className="w-2 h-2 rounded-full bg-white/60" />
                    <div className="flex-1 h-1 bg-white/30 rounded" />
                    <div className="w-8 h-2 rounded bg-white/40" />
                  </div>
                  <div className="flex-1 p-2 bg-gray-50 space-y-1">
                    <div className="h-2 bg-gray-300 rounded w-2/3" />
                    <div className="h-1.5 bg-gray-200 rounded w-1/2" />
                    <div className="h-3 rounded w-16 mt-1" style={{ background: 'var(--org-primary)' }} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── HERO ──────────────────────────────────────────────── */}
      {activeTab === 'hero' && (
        <div className="card p-6 space-y-4">
          <div>
            <label className="label">Hero Title *</label>
            <input className="input" value={form.heroTitle} onChange={e => setForm(f => ({ ...f, heroTitle: e.target.value }))}
              placeholder="भारत की सबसे बड़ी लर्निंग अकैडमी" />
          </div>
          <div>
            <label className="label">Hero Subtitle</label>
            <textarea className="input" rows={2} value={form.heroSubtitle}
              onChange={e => setForm(f => ({ ...f, heroSubtitle: e.target.value }))}
              placeholder="A short description shown below the title" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Button Text</label>
              <input className="input" value={form.heroButtonText}
                onChange={e => setForm(f => ({ ...f, heroButtonText: e.target.value }))} />
            </div>
            <div>
              <label className="label">Button URL</label>
              <input className="input" value={form.heroButtonUrl}
                onChange={e => setForm(f => ({ ...f, heroButtonUrl: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Hero Style</label>
            <select className="input" value={form.heroStyle} onChange={e => setForm(f => ({ ...f, heroStyle: e.target.value }))}>
              <option value="gradient">Gradient Background</option>
              <option value="image">Custom Background Image</option>
              <option value="split">Split Layout</option>
            </select>
          </div>

          {/* Announcement */}
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center gap-3 mb-3">
              <input type="checkbox" id="showAnn" checked={form.showAnnouncement}
                onChange={e => setForm(f => ({ ...f, showAnnouncement: e.target.checked }))} />
              <label htmlFor="showAnn" className="text-sm font-medium text-gray-700 cursor-pointer">Show announcement banner</label>
            </div>
            {form.showAnnouncement && (
              <input className="input" placeholder="🎉 New course available! — Enroll now"
                value={form.announcementText} onChange={e => setForm(f => ({ ...f, announcementText: e.target.value }))} />
            )}
          </div>
        </div>
      )}

      {/* ─── SECTIONS ──────────────────────────────────────────── */}
      {activeTab === 'sections' && (
        <div className="card p-6 space-y-3">
          <p className="text-sm text-gray-500 mb-4">Enable/disable sections and drag to reorder them.</p>
          {sections.sort((a, b) => a.order - b.order).map((sec, idx) => (
            <div key={sec.id} className={clsx('flex items-center gap-3 p-4 rounded-xl border-2 transition-all',
              sec.enabled ? 'border-gray-200 bg-white' : 'border-dashed border-gray-200 bg-gray-50 opacity-60')}>
              <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
              <span className="text-lg">{SECTION_LABELS[sec.id]?.split(' ')[0]}</span>
              <span className="flex-1 font-medium text-sm text-gray-800">{SECTION_LABELS[sec.id]?.split(' ').slice(1).join(' ')}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => moveSection(idx, -1)} disabled={idx === 0}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 transition-colors">
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button onClick={() => moveSection(idx, 1)} disabled={idx === sections.length - 1}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 transition-colors">
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
              <button onClick={() => setSections(prev => prev.map(s => s.id === sec.id ? { ...s, enabled: !s.enabled } : s))}
                className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                  sec.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                {sec.enabled ? <><Eye className="w-3.5 h-3.5" /> Visible</> : <><EyeOff className="w-3.5 h-3.5" /> Hidden</>}
              </button>
            </div>
          ))}

          <div className="flex items-center gap-3 mt-2">
            <input type="checkbox" id="showStats" checked={form.showStats}
              onChange={e => setForm(f => ({ ...f, showStats: e.target.checked }))} />
            <label htmlFor="showStats" className="text-sm font-medium text-gray-700 cursor-pointer">Show stats bar inside stats section</label>
          </div>
        </div>
      )}

      {/* ─── NAVIGATION ────────────────────────────────────────── */}
      {activeTab === 'nav' && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-semibold text-gray-900">Navigation Links</h3>
              <p className="text-xs text-gray-500">Links shown in the top navbar</p>
            </div>
            <button onClick={() => setNavLinks(prev => [...prev, { label: 'New Link', url: '#' }])}
              className="btn-secondary text-xs"><Plus className="w-3.5 h-3.5" /> Add Link</button>
          </div>
          {navLinks.map((link, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <input className="input flex-1" placeholder="Label" value={link.label}
                onChange={e => setNavLinks(prev => prev.map((l, j) => j === i ? { ...l, label: e.target.value } : l))} />
              <input className="input flex-1" placeholder="URL or #anchor" value={link.url}
                onChange={e => setNavLinks(prev => prev.map((l, j) => j === i ? { ...l, url: e.target.value } : l))} />
              <button onClick={() => setNavLinks(prev => prev.filter((_, j) => j !== i))}
                className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      )}

      {/* ─── CUSTOM HTML ──────────────────────────────────────── */}
      {(activeTab as string) === 'custom' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-700">
            <p className="font-bold mb-1">⚠️ Custom HTML</p>
            <p>Paste any custom HTML, CSS, or JavaScript. This will be injected into your homepage. Use for announcements, custom banners, third-party widgets, etc.</p>
          </div>
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-gray-700">Custom HTML Block</label>
              <div className="flex gap-2">
                <button className="btn-secondary text-xs" onClick={() => setForm(f => ({ ...f, customHtml: '' }))}>Clear</button>
                <button className="btn-secondary text-xs" onClick={() => {
                  const preview = window.open('', '_blank');
                  if (preview) {
                    preview.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Preview</title></head><body>${form.customHtml ?? ''}</body></html>`);
                    preview.document.close();
                  }
                }}>Preview</button>
              </div>
            </div>
            <textarea
              className="w-full h-96 font-mono text-sm bg-gray-900 text-green-400 border border-gray-700 rounded-xl p-4 outline-none resize-y focus:border-[var(--org-primary)]"
              placeholder="<!-- Paste your HTML here -->"
              value={form.customHtml ?? ''}
              onChange={e => setForm(f => ({ ...f, customHtml: e.target.value }))}
              spellCheck={false}
            />
            <p className="text-xs text-gray-400">This HTML is injected directly into the page. Supports inline CSS and JavaScript.</p>
          </div>
        </div>
      )}

      {/* ─── FOOTER ────────────────────────────────────────────── */}
      {activeTab === 'footer' && (
        <div className="space-y-4">
          <div className="card p-5 space-y-4">
            <h3 className="font-semibold text-gray-900">Footer Content</h3>
            <div>
              <label className="label">Tagline</label>
              <input className="input" value={form.footerTagline}
                onChange={e => setForm(f => ({ ...f, footerTagline: e.target.value }))} />
            </div>
            <div>
              <label className="label">Copyright text</label>
              <input className="input" value={form.footerCopyright}
                onChange={e => setForm(f => ({ ...f, footerCopyright: e.target.value }))} />
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="newsletter" checked={form.showFooterNewsletter}
                onChange={e => setForm(f => ({ ...f, showFooterNewsletter: e.target.checked }))} />
              <label htmlFor="newsletter" className="text-sm font-medium text-gray-700 cursor-pointer">Show newsletter subscribe form</label>
            </div>
          </div>

          <div className="card p-5 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">Footer Links</h3>
              <button onClick={() => setFooterLinks(prev => [...prev, { label: 'Link', url: '#' }])}
                className="btn-secondary text-xs"><Plus className="w-3.5 h-3.5" /> Add</button>
            </div>
            {footerLinks.map((link, i) => (
              <div key={i} className="flex gap-2">
                <input className="input flex-1" placeholder="Label" value={link.label}
                  onChange={e => setFooterLinks(prev => prev.map((l, j) => j === i ? { ...l, label: e.target.value } : l))} />
                <input className="input flex-1" placeholder="URL" value={link.url}
                  onChange={e => setFooterLinks(prev => prev.map((l, j) => j === i ? { ...l, url: e.target.value } : l))} />
                <button onClick={() => setFooterLinks(prev => prev.filter((_, j) => j !== i))}
                  className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>

          <div className="card p-5 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">Social Links</h3>
              <button onClick={() => setSocialLinks(prev => [...prev, { platform: 'youtube', url: '#' }])}
                className="btn-secondary text-xs"><Plus className="w-3.5 h-3.5" /> Add</button>
            </div>
            {socialLinks.map((s, i) => (
              <div key={i} className="flex gap-2">
                <select className="input w-40" value={s.platform}
                  onChange={e => setSocialLinks(prev => prev.map((sl, j) => j === i ? { ...sl, platform: e.target.value } : sl))}>
                  {SOCIAL_PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <input className="input flex-1" placeholder="Profile URL" value={s.url}
                  onChange={e => setSocialLinks(prev => prev.map((sl, j) => j === i ? { ...sl, url: e.target.value } : sl))} />
                <button onClick={() => setSocialLinks(prev => prev.filter((_, j) => j !== i))}
                  className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
