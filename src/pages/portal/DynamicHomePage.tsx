import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Settings, ExternalLink, Phone, Mail, MapPin, GraduationCap, Calendar, Clock, CheckCircle, Send, Gift, X, Loader2, BookOpen, Users, Award, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { useOrgStore } from '../../store/orgStore';
import { useAuthStore } from '../../store/authStore';
import { portalApi } from '../../services/portalApi';
import type { HomePageConfig } from '../../types';
import type { PublicCategory, PublicCourse, OrgStats } from '../../services/portalApi';
import type { TemplateProps } from '../../components/portal/templates/shared';
import clsx from 'clsx';

import TemplateModern from '../../components/portal/templates/TemplateModern';
import TemplateIndian from '../../components/portal/templates/TemplateIndian';
import TemplateLumen from '../../components/portal/templates/TemplateLumen';
import { TemplateBold, TemplateMinimal, TemplateDark } from '../../components/portal/templates/OtherTemplates';

const API_BASE = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? '' : 'https://api.worksupport360.com';

// ════════════════════════════════════════════════════════════════════════════
// Org-settings-driven sections — these wrap AROUND the existing template
// (banner above, batches/about/contact below) so the 5 templates keep
// rendering courses/categories/instructors exactly as before, while Org
// Settings toggles now actually take effect.
// ════════════════════════════════════════════════════════════════════════════

function ScrollingBanner({ text, primary }: { text: string; primary: string }) {
  const items = text.split('|').map(s => s.trim()).filter(Boolean);
  const doubled = [...items, ...items];
  return (
    <div className="overflow-hidden py-2.5 relative" style={{ background: primary }}>
      <div className="flex animate-marquee gap-16 whitespace-nowrap">
        {doubled.map((t, i) => (
          <span key={i} className="text-white text-sm font-medium flex items-center gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-white/60 flex-shrink-0"/>{t}
          </span>
        ))}
      </div>
    </div>
  );
}

function ReferralBanner({ text, primary, secondary }: { text: string; primary: string; secondary: string }) {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;
  return (
    <div className="fixed top-20 right-4 z-50 hidden md:block">
      <div className="relative rounded-2xl shadow-2xl overflow-hidden max-w-[240px]"
        style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
        <button onClick={() => setVisible(false)} className="absolute top-2 right-2 p-1 rounded-full bg-white/20 hover:bg-white/30 text-white">
          <X className="w-3 h-3"/>
        </button>
        <div className="p-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-2">
            <Gift className="w-7 h-7 text-white"/>
          </div>
          <p className="text-white font-black text-lg leading-tight">Refer & Earn!</p>
          <p className="text-white/90 text-sm mt-1 leading-snug">{text}</p>
          <Link to="/register" className="mt-3 block bg-white rounded-xl py-2 text-xs font-bold" style={{ color: primary }}>
            Start Referring →
          </Link>
        </div>
      </div>
    </div>
  );
}

function EnquiryModal({ batch, onClose, orgId, primary }: { batch: any; onClose: () => void; orgId: number; primary: string }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const mut = useMutation({
    mutationFn: () => fetch(`${API_BASE}/api/enquiries/batch`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, phone: form.phone, email: form.email,
        courseInterest: batch?.batchName ?? batch?.courseTitle, batchId: batch?.id ?? null, organizationId: orgId }),
    }).then(r => r.json()),
    onSuccess: () => { toast.success('Enquiry sent! We will call you soon.'); onClose(); },
    onError: () => toast.error('Failed, please try again'),
  });
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-6" style={{ background: `linear-gradient(135deg, ${primary}15, ${primary}05)` }}>
          <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-xl hover:bg-gray-100"><X className="w-5 h-5 text-gray-500"/></button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: primary }}><Calendar className="w-5 h-5 text-white"/></div>
            <div>
              <h3 className="font-black text-gray-900 text-lg">Register Interest</h3>
              <p className="text-sm text-gray-500">{batch?.batchName ?? batch?.courseTitle ?? 'Course Batch'}</p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <input className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-gray-50" placeholder="Your name *"
            value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}/>
          <input className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-gray-50" type="tel" placeholder="Phone number *"
            value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}/>
          <input className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-gray-50" type="email" placeholder="Email (optional)"
            value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}/>
          <button onClick={() => { if (!form.name || !form.phone) { toast.error('Name and phone required'); return; } mut.mutate(); }}
            disabled={mut.isPending}
            className="w-full py-3.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 shadow-lg" style={{ background: primary }}>
            {mut.isPending ? <><Loader2 className="w-4 h-4 animate-spin"/> Sending…</> : <><Send className="w-4 h-4"/> Send Enquiry</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function CourseBatchesSection({ orgId, primary, secondary }: { orgId: number; primary: string; secondary: string }) {
  const [enquiry, setEnquiry] = useState<any>(null);
  const { data: batches = [] } = useQuery({
    queryKey: ['public-batches', orgId],
    queryFn: async () => (await fetch(`${API_BASE}/api/batches?orgId=${orgId}`)).json(),
  });
  const active = (batches as any[]).filter(b => b.status === 'Active' || b.status === 'Upcoming');

  return (
    <section id="batches" className="py-16 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <p className="text-sm font-bold uppercase tracking-widest mb-1" style={{ color: primary }}>Enroll now</p>
          <h2 className="text-3xl md:text-4xl font-black text-gray-900">Course Batches</h2>
          <p className="text-gray-500 mt-2">Join our structured training programmes with expert instructors</p>
        </div>
        {active.length === 0 ? (
          <p className="text-center text-gray-400 italic">No active batches right now. Create one from Training Batches in your dashboard.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {active.map((b: any) => (
              <div key={b.id} className="rounded-3xl overflow-hidden border border-gray-100 shadow-md hover:shadow-xl transition-all">
                <div className="p-1" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
                  <div className="bg-white rounded-[20px] p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <span className={clsx('text-xs font-bold px-2 py-0.5 rounded-full', b.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700')}>{b.status}</span>
                        <h3 className="font-black text-gray-900 mt-2 text-lg leading-tight">{b.batchName}</h3>
                        {b.courseTitle && <p className="text-sm text-gray-500 mt-0.5">{b.courseTitle}</p>}
                      </div>
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ml-3" style={{ background: `${primary}15` }}>
                        <Calendar className="w-6 h-6" style={{ color: primary }}/>
                      </div>
                    </div>
                    <div className="space-y-1.5 mb-4">
                      <p className="flex items-center gap-2 text-sm text-gray-600"><Clock className="w-4 h-4 text-gray-400"/>Starts: {new Date(b.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      <p className="flex items-center gap-2 text-sm text-gray-600"><CheckCircle className="w-4 h-4 text-gray-400"/>Duration: {b.durationDays} days</p>
                      {b.totalFee > 0
                        ? <p className="flex items-center gap-2 text-sm font-bold" style={{ color: primary }}>₹ Fee: ₹{b.totalFee.toLocaleString('en-IN')}</p>
                        : <p className="flex items-center gap-2 text-sm font-bold text-green-600"><CheckCircle className="w-4 h-4"/> Free Batch</p>}
                    </div>
                    <button onClick={() => setEnquiry(b)}
                      className="w-full py-3 rounded-2xl font-bold text-white text-sm shadow-md hover:shadow-lg hover:opacity-90 transition-all"
                      style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
                      Register Interest
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {enquiry && <EnquiryModal batch={enquiry} onClose={() => setEnquiry(null)} orgId={orgId} primary={primary}/>}
    </section>
  );
}

function QuickContactForm({ orgId, primary }: { orgId: number; primary: string }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '' });
  const mut = useMutation({
    mutationFn: () => fetch(`${API_BASE}/api/enquiries/batch`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, phone: form.phone, email: form.email, courseInterest: form.message, organizationId: orgId }),
    }).then(r => r.json()),
    onSuccess: () => { toast.success('Message sent! We will get back to you.'); setForm({ name: '', phone: '', email: '', message: '' }); },
    onError: () => toast.error('Failed to send'),
  });
  return (
    <div className="space-y-3">
      <input className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-gray-50" placeholder="Your name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}/>
      <input className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-gray-50" type="tel" placeholder="Phone number *" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}/>
      <input className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-gray-50" type="email" placeholder="Email (optional)" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}/>
      <textarea className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-gray-50 resize-none" rows={3} placeholder="Message or course you're interested in" value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}/>
      <button onClick={() => { if (!form.name || !form.phone) { toast.error('Name and phone required'); return; } mut.mutate(); }} disabled={mut.isPending}
        className="w-full py-3.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 shadow-lg" style={{ background: primary }}>
        {mut.isPending ? <><Loader2 className="w-4 h-4 animate-spin"/> Sending…</> : <><Send className="w-4 h-4"/> Send Message</>}
      </button>
    </div>
  );
}

function AboutUsSection({ org, settings, primary, secondary }: any) {
  const template = settings.aboutUsTemplate ?? 'classic';
  const showLogo = settings.showLogoInAboutUs !== false;
  const content  = settings.aboutUsContent;

  const Wrapper = ({ children }: any) => (
    <section id="about" className="py-16 md:py-24" style={{ background: `${primary}06` }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10">
          <p className="text-sm font-bold uppercase tracking-widest mb-1" style={{ color: primary }}>Who we are</p>
          <h2 className="text-3xl md:text-4xl font-black text-gray-900">About Us</h2>
        </div>
        {children}
      </div>
    </section>
  );

  if (!content) return <Wrapper><div className="bg-white rounded-3xl shadow-lg p-12 text-center"><p className="text-gray-400 italic">Add your About Us content from Org Settings → Content tab.</p></div></Wrapper>;

  if (template === 'split') return (
    <Wrapper>
      <div className="grid md:grid-cols-2 gap-8 items-center bg-white rounded-3xl shadow-lg p-8 md:p-12">
        <div className="flex items-center justify-center">
          <div className="w-full aspect-square rounded-3xl flex items-center justify-center p-12" style={{ background: `linear-gradient(135deg, ${primary}15, ${secondary}10)` }}>
            {showLogo && org?.logoUrl ? <img src={org.logoUrl} alt={org.name} className="w-32 h-32 rounded-2xl object-cover shadow-xl"/> : <GraduationCap className="w-20 h-20" style={{ color: primary }}/>}
          </div>
        </div>
        <div className="prose prose-gray max-w-none text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: content }}/>
      </div>
    </Wrapper>
  );

  if (template === 'timeline') {
    const points = content.split(/<\/p>|<br\s*\/?>/i).map((p: string) => p.replace(/<[^>]+>/g, '').trim()).filter(Boolean);
    return (
      <Wrapper>
        <div className="bg-white rounded-3xl shadow-lg p-8 md:p-12 max-w-3xl mx-auto">
          {showLogo && org?.logoUrl && <div className="flex justify-center mb-8"><img src={org.logoUrl} alt={org.name} className="w-16 h-16 rounded-2xl object-cover shadow-lg"/></div>}
          <div className="space-y-6">
            {points.map((p: string, i: number) => (
              <div key={i} className="flex gap-4">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="w-3 h-3 rounded-full" style={{ background: primary }}/>
                  {i < points.length - 1 && <div className="w-0.5 flex-1 mt-1" style={{ background: `${primary}30` }}/>}
                </div>
                <p className="text-gray-700 leading-relaxed pb-2">{p}</p>
              </div>
            ))}
          </div>
        </div>
      </Wrapper>
    );
  }

  if (template === 'card') return (
    <Wrapper>
      <div className="bg-white rounded-3xl shadow-lg p-8 md:p-12 max-w-4xl mx-auto space-y-8">
        {showLogo && org?.logoUrl && <div className="flex justify-center"><img src={org.logoUrl} alt={org.name} className="w-16 h-16 rounded-2xl object-cover shadow-lg"/></div>}
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
    </Wrapper>
  );

  // classic (default)
  return (
    <Wrapper>
      <div className="bg-white rounded-3xl shadow-lg p-8 md:p-12 max-w-4xl mx-auto">
        {showLogo && org?.logoUrl && <div className="flex justify-center mb-8"><img src={org.logoUrl} alt={org.name} className="w-20 h-20 rounded-2xl object-cover shadow-lg"/></div>}
        <div className="prose prose-gray max-w-none text-gray-700 leading-relaxed text-center" dangerouslySetInnerHTML={{ __html: content }}/>
      </div>
    </Wrapper>
  );
}

function ContactUsSection({ org, settings, primary, secondary }: any) {
  const template = settings.contactUsTemplate ?? 'classic';
  const showLogo = settings.showLogoInContactUs !== false;

  const InfoCards = () => (
    <div className="space-y-4">
      {showLogo && org?.logoUrl && <div className="flex items-center gap-3 mb-2"><img src={org.logoUrl} alt={org.name} className="w-10 h-10 rounded-xl object-cover shadow"/><p className="font-bold text-gray-900">{org?.name}</p></div>}
      {settings.contactPhone && (
        <div className="flex items-start gap-4 bg-white rounded-2xl p-5 shadow-md">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: `${primary}15` }}><Phone className="w-6 h-6" style={{ color: primary }}/></div>
          <div><p className="font-bold text-gray-900">Phone</p><a href={`tel:${settings.contactPhone}`} className="text-gray-600 hover:opacity-80">{settings.contactPhone}</a></div>
        </div>
      )}
      {settings.contactEmail && (
        <div className="flex items-start gap-4 bg-white rounded-2xl p-5 shadow-md">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: `${primary}15` }}><Mail className="w-6 h-6" style={{ color: primary }}/></div>
          <div><p className="font-bold text-gray-900">Email</p><a href={`mailto:${settings.contactEmail}`} className="text-gray-600 hover:opacity-80">{settings.contactEmail}</a></div>
        </div>
      )}
      {settings.contactAddress && (
        <div className="flex items-start gap-4 bg-white rounded-2xl p-5 shadow-md">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: `${primary}15` }}><MapPin className="w-6 h-6" style={{ color: primary }}/></div>
          <div><p className="font-bold text-gray-900">Address</p><p className="text-gray-600 whitespace-pre-line">{settings.contactAddress}</p></div>
        </div>
      )}
    </div>
  );

  const Wrapper = ({ children }: any) => (
    <section id="contact" className="py-16 md:py-24" style={{ background: `linear-gradient(135deg, ${primary}08, ${secondary}06)` }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <p className="text-sm font-bold uppercase tracking-widest mb-1" style={{ color: primary }}>Get in touch</p>
          <h2 className="text-3xl md:text-4xl font-black text-gray-900">Contact Us</h2>
        </div>
        {children}
        {settings.contactMapEmbed && template !== 'map-focus' && (
          <div className="mt-8 rounded-3xl overflow-hidden shadow-xl max-w-4xl mx-auto">
            <iframe src={settings.contactMapEmbed} width="100%" height="300" style={{ border: 0 }} loading="lazy" referrerPolicy="no-referrer-when-downgrade"/>
          </div>
        )}
      </div>
    </section>
  );

  if (template === 'minimal') return (
    <Wrapper>
      <div className="max-w-md mx-auto text-center space-y-6">
        {showLogo && org?.logoUrl && <img src={org.logoUrl} alt={org.name} className="w-16 h-16 rounded-2xl object-cover shadow-lg mx-auto"/>}
        <div className="space-y-3">
          {settings.contactPhone && <p className="text-gray-700"><Phone className="w-4 h-4 inline mr-2" style={{ color: primary }}/>{settings.contactPhone}</p>}
          {settings.contactEmail && <p className="text-gray-700"><Mail className="w-4 h-4 inline mr-2" style={{ color: primary }}/>{settings.contactEmail}</p>}
          {settings.contactAddress && <p className="text-gray-700 whitespace-pre-line"><MapPin className="w-4 h-4 inline mr-2" style={{ color: primary }}/>{settings.contactAddress}</p>}
        </div>
      </div>
    </Wrapper>
  );

  if (template === 'split') return (
    <Wrapper>
      <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto items-stretch">
        <div className="rounded-3xl overflow-hidden shadow-xl min-h-[300px]">
          {settings.contactMapEmbed
            ? <iframe src={settings.contactMapEmbed} width="100%" height="100%" style={{ border: 0, minHeight: 300 }} loading="lazy" referrerPolicy="no-referrer-when-downgrade"/>
            : <div className="w-full h-full flex items-center justify-center" style={{ background: `${primary}10` }}><MapPin className="w-12 h-12" style={{ color: primary }}/></div>}
        </div>
        <InfoCards/>
      </div>
    </Wrapper>
  );

  // classic (default) — cards + form
  return (
    <Wrapper>
      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        <InfoCards/>
        <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8">
          <h3 className="font-black text-gray-900 text-xl mb-5">Send a Message</h3>
          <QuickContactForm orgId={org?.id ?? 0} primary={primary}/>
        </div>
      </div>
    </Wrapper>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Main page — unchanged template logic, with org-settings sections wrapped
// around it.
// ════════════════════════════════════════════════════════════════════════════
export default function DynamicHomePage() {
  const { org } = useOrgStore();
  const { user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const isAdmin = isAuthenticated && user && ['SuperAdmin','OrgAdmin'].includes(user.role);
  const primary   = org?.primaryColor   ?? '#6366f1';
  const secondary = org?.secondaryColor ?? '#8b5cf6';

  const { data: config, isLoading: configLoading } = useQuery<HomePageConfig>({
    queryKey: ['homepage-config', org?.id],
    queryFn: () => portalApi.getHomePage(org!.id).then(r => r.data),
    enabled: !!org?.id,
  });

  // Fresh org settings (always refetched — never trust a stale cached copy)
  const { data: settings } = useQuery({
    queryKey: ['org-settings-dynamic', org?.id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/organizations/${org!.id}`);
      if (!res.ok) throw new Error('Failed to load org settings');
      return res.json();
    },
    enabled: !!org?.id,
    staleTime: 0,
    refetchOnMount: true,
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
          {[0,1,2].map(i => <div key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ background: org.primaryColor || '#f97316', animationDelay: `${i*0.15}s` }} />)}
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
    lumen:   TemplateLumen,
  }[config.templateId] ?? TemplateModern;

  const s = settings ?? {};

  return (
    <div className="relative">
      {/* Admin floating edit button */}
      {isAdmin && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
          {/* <button onClick={() => navigate('/dashboard/homepage-editor')}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl text-white text-sm font-bold shadow-2xl hover:scale-105 transition-transform"
            style={{ background: `linear-gradient(135deg, ${org.primaryColor || '#f97316'}, ${org.secondaryColor || '#ea580c'})` }}>
            <Settings className="w-4 h-4" /> Edit Homepage
          </button>
          <button onClick={() => navigate('/dashboard/org-settings')}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-gray-800 text-white text-sm font-bold shadow-xl hover:scale-105 transition-transform">
            <Settings className="w-4 h-4" /> Org Settings
          </button>
          <button onClick={() => navigate('/dashboard/admin')}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-gray-900 text-white text-sm font-bold shadow-xl hover:scale-105 transition-transform">
            <ExternalLink className="w-4 h-4" /> Dashboard
          </button> */}
        </div>
      )}

      {/* ── Org Settings: scrolling banner (above template) ── */}
      {s.showScrollingBanner && s.scrollingBannerText && (
        <ScrollingBanner text={s.scrollingBannerText} primary={primary}/>
      )}

      {/* ── Org Settings: referral offer (floating) ── */}
      {s.showReferralOffer && s.referralOfferText && (
        <ReferralBanner text={s.referralOfferText} primary={primary} secondary={secondary}/>
      )}

      {/* ── Existing template: hero, categories, courses, instructors (UNCHANGED) ── */}
      <Template {...props} />

      {/* ── Org Settings: Course Batches ── */}
      {s.showCourseBatches && (
        <CourseBatchesSection orgId={org.id} primary={primary} secondary={secondary}/>
      )}

      {/* ── Org Settings: About Us ── */}
      {s.showAboutUs !== false && (
        <AboutUsSection org={org} settings={s} primary={primary} secondary={secondary}/>
      )}

      {/* ── Org Settings: Openings ── */}
      {s.showOpenings && s.openingsContent && (
        <section id="openings" className="py-16 md:py-24 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-10">
              <p className="text-sm font-bold uppercase tracking-widest mb-1" style={{ color: primary }}>Join our team</p>
              <h2 className="text-3xl md:text-4xl font-black text-gray-900">Openings</h2>
            </div>
            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8 md:p-12">
              <div className="prose prose-gray max-w-none" dangerouslySetInnerHTML={{ __html: s.openingsContent ?? '' }}/>
            </div>
          </div>
        </section>
      )}

      {/* ── Org Settings: Contact Us ── */}
      {s.showContactUs !== false && (
        <ContactUsSection org={org} settings={s} primary={primary} secondary={secondary}/>
      )}
    </div>
  );
}
