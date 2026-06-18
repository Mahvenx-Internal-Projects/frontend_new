import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  GraduationCap, BookOpen, Users, Award, Star, Menu, X,
  ChevronRight, Phone, Mail, MapPin, Clock, ArrowRight,
  Briefcase, Send, Gift, Calendar, CheckCircle, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useOrgStore } from '../../store/orgStore';
import { portalApi } from '../../services/portalApi';
import clsx from 'clsx';

const API_BASE = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? '' : 'https://api.worksupport360.com';

// ── Token helper ──────────────────────────────────────────────────────────────
const tok = () => localStorage.getItem('lms_token') ?? '';

// ── Scrolling banner ──────────────────────────────────────────────────────────
function ScrollingBanner({ text, primary }: { text: string; primary: string }) {
  const items = text.split('|').map(s => s.trim()).filter(Boolean);
  const doubled = [...items, ...items];
  return (
    <div className="overflow-hidden py-2.5 relative" style={{ background: primary }}>
      <div className="flex animate-marquee gap-16 whitespace-nowrap">
        {doubled.map((t, i) => (
          <span key={i} className="text-white text-sm font-medium flex items-center gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-white/60 flex-shrink-0"/>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Referral offer banner ─────────────────────────────────────────────────────
function ReferralBanner({ text, primary, secondary }: { text: string; primary: string; secondary: string }) {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;
  return (
    <div className="fixed top-0 right-4 z-50 mt-16 md:mt-20 hidden md:block">
      <div className="relative rounded-2xl shadow-2xl overflow-hidden max-w-[240px]"
        style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
        <button onClick={() => setVisible(false)}
          className="absolute top-2 right-2 p-1 rounded-full bg-white/20 hover:bg-white/30 text-white">
          <X className="w-3 h-3"/>
        </button>
        <div className="p-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-2">
            <Gift className="w-7 h-7 text-white"/>
          </div>
          <p className="text-white font-black text-lg leading-tight">Refer & Earn!</p>
          <p className="text-white/90 text-sm mt-1 leading-snug">{text}</p>
          <Link to="/register" className="mt-3 block bg-white rounded-xl py-2 text-xs font-bold"
            style={{ color: primary }}>
            Start Referring →
          </Link>
        </div>
        {/* Sparkle decoration */}
        <div className="absolute -top-3 -left-3 w-10 h-10 rounded-full bg-white/10"/>
        <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-white/10"/>
      </div>
    </div>
  );
}

// ── Enquiry modal ─────────────────────────────────────────────────────────────
function EnquiryModal({ batch, onClose, orgId, primary }: {
  batch: any; onClose: () => void; orgId: number; primary: string;
}) {
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const mut = useMutation({
    mutationFn: () => fetch(`${API_BASE}/api/enquiries/batch`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name, phone: form.phone, email: form.email,
        courseInterest: batch?.batchName ?? batch?.courseTitle,
        batchId: batch?.id ?? null, organizationId: orgId,
      }),
    }).then(r => r.json()),
    onSuccess: () => { toast.success('Enquiry sent! We will call you soon.'); onClose(); },
    onError:   () => toast.error('Failed, please try again'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-6" style={{ background: `linear-gradient(135deg, ${primary}15, ${primary}05)` }}>
          <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-xl hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500"/>
          </button>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: primary }}>
              <Calendar className="w-5 h-5 text-white"/>
            </div>
            <div>
              <h3 className="font-black text-gray-900 text-lg">Register Interest</h3>
              <p className="text-sm text-gray-500">{batch?.batchName ?? batch?.courseTitle ?? 'Course Batch'}</p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Full Name *</label>
            <input className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 bg-gray-50"
              placeholder="Your name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Phone Number *</label>
            <input className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 bg-gray-50"
              type="tel" placeholder="9876543210" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Email (optional)</label>
            <input className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 bg-gray-50"
              type="email" placeholder="you@email.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}/>
          </div>
          <button
            onClick={() => { if (!form.name || !form.phone) { toast.error('Name and phone required'); return; } mut.mutate(); }}
            disabled={mut.isPending}
            className="w-full py-3.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 shadow-lg"
            style={{ background: primary }}>
            {mut.isPending ? <><Loader2 className="w-4 h-4 animate-spin"/> Sending…</> : <><Send className="w-4 h-4"/> Send Enquiry</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PublicHomePage() {
  const { org }      = useOrgStore();
  const navigate     = useNavigate();
  const location     = useLocation();
  const [menuOpen, setMenuOpen]     = useState(false);
  const [enquiry, setEnquiry]       = useState<any>(null);
  const [section, setSection]       = useState<string>('home');
  const contactRef  = useRef<HTMLDivElement>(null);
  const aboutRef    = useRef<HTMLDivElement>(null);
  const coursesRef  = useRef<HTMLDivElement>(null);
  const batchesRef  = useRef<HTMLDivElement>(null);

  const primary   = org?.primaryColor   ?? '#6366f1';
  const secondary = org?.secondaryColor ?? '#8b5cf6';
  const accent    = (org as any)?.accentColor ?? '#f59e0b';

  // Fetch org details (includes feature flags)
  const { data: orgDetails } = useQuery({
    queryKey: ['org-details', org?.id],
    queryFn: () => portalApi.getOrgDetails(org!.id).then(r => r.data),
    enabled: !!org?.id,
  });

  const settings = orgDetails ?? org ?? {};

  // Fetch data
  const { data: courses = [] } = useQuery({
    queryKey: ['public-courses', org?.id],
    queryFn:  () => portalApi.getCourses(org!.id, 1, 8).then(r => (r.data as any).items ?? r.data),
    enabled:  !!org?.id && (settings as any).showAllCourses !== false,
  });

  const { data: batches = [] } = useQuery({
    queryKey: ['public-batches', org?.id],
    queryFn:  async () => {
      const r = await fetch(`${API_BASE}/api/batches?orgId=${org!.id}`);
      return r.json();
    },
    enabled: !!org?.id && !!(settings as any).showCourseBatches,
  });

  const { data: stats } = useQuery({
    queryKey: ['public-stats', org?.id],
    queryFn: () => portalApi.getStats(org!.id).then(r => r.data),
    enabled: !!org?.id,
  });

  // Custom menus
  const customMenus: any[] = (() => {
    try { return JSON.parse((settings as any).customMenuJson ?? '[]'); } catch { return []; }
  })();

  // Scroll to hash section
  useEffect(() => {
    const hash = location.hash.replace('#', '');
    if (hash === 'courses') coursesRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (hash === 'contact') contactRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (hash === 'about')   aboutRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (hash === 'batches') batchesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [location.hash]);

  const navLinks = [
    { label: 'Home',       href: '/' },
    ...(settings as any).showAllCourses !== false ? [{ label: 'All Courses', href: '#courses' }] : [],
    ...(settings as any).showCourseBatches ? [{ label: 'Course Batches', href: '#batches' }] : [],
    ...(settings as any).showAboutUs !== false ? [{ label: 'About Us', href: '#about' }] : [],
    ...(settings as any).showContactUs !== false ? [{ label: 'Contact Us', href: '#contact' }] : [],
    ...(settings as any).showOpenings ? [{ label: 'Openings', href: '#openings' }] : [],
    ...customMenus.map(m => ({ label: m.label, href: m.url })),
  ];

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: `'${org?.themeFont ?? 'Inter'}', sans-serif` }}>

      {/* ── Scrolling banner ── */}
      {(settings as any).showScrollingBanner && (settings as any).scrollingBannerText && (
        <ScrollingBanner text={(settings as any).scrollingBannerText} primary={primary}/>
      )}

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden shadow-md"
              style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
              {org?.logoUrl
                ? <img src={org.logoUrl} alt={org.name} className="w-full h-full object-cover"/>
                : <GraduationCap className="w-5 h-5 text-white"/>}
            </div>
            <span className="font-black text-gray-900 text-base hidden sm:block">{org?.name}</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(l => (
              <a key={l.label} href={l.href}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors">
                {l.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Link to="/login" className="text-sm font-semibold px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors text-gray-700 hidden sm:block">
              Login
            </Link>
            <Link to="/register"
              className="text-sm font-bold px-4 py-2 rounded-xl text-white shadow-md hover:shadow-lg transition-all"
              style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
              Get Started
            </Link>
            <button className="md:hidden p-2 rounded-xl hover:bg-gray-100" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X className="w-5 h-5"/> : <Menu className="w-5 h-5"/>}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 px-4 py-3 space-y-1 bg-white">
            {navLinks.map(l => (
              <a key={l.label} href={l.href} onClick={() => setMenuOpen(false)}
                className="block px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
                {l.label}
              </a>
            ))}
            <Link to="/login" onClick={() => setMenuOpen(false)} className="block px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Login</Link>
          </div>
        )}
      </nav>

      {/* Referral offer */}
      {(settings as any).showReferralOffer && (settings as any).referralOfferText && (
        <ReferralBanner text={(settings as any).referralOfferText} primary={primary} secondary={secondary}/>
      )}

      {/* ── Hero ── */}
      <section className="relative overflow-hidden py-20 md:py-32"
        style={{ background: `linear-gradient(135deg, ${primary}08 0%, ${secondary}06 50%, ${accent}05 100%)` }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-5"
            style={{ background: `radial-gradient(circle, ${primary}, transparent)`, transform: 'translate(30%, -30%)' }}/>
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full opacity-5"
            style={{ background: `radial-gradient(circle, ${secondary}, transparent)`, transform: 'translate(-30%, 30%)' }}/>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center relative">
          {org?.logoUrl && (
            <img src={org.logoUrl} alt={org.name} className="w-24 h-24 rounded-3xl object-cover mx-auto mb-6 shadow-2xl"/>
          )}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-gray-900 leading-tight mb-4">
            {org?.name ?? 'Learn. Grow. Succeed.'}
          </h1>
          {org?.tagline && (
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-8 leading-relaxed">
              {org.tagline}
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/register"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-white text-base shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all"
              style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
              Start Learning Free <ChevronRight className="w-5 h-5"/>
            </Link>
            {(settings as any).showCourseBatches && (
              <a href="#batches"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-gray-700 text-base border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all">
                <Calendar className="w-5 h-5"/> View Batches
              </a>
            )}
          </div>

          {/* Stats */}
          {stats && (
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
              {[
                { icon: BookOpen, label: 'Courses', value: (stats as any).totalCourses ?? '50+' },
                { icon: Users,    label: 'Students', value: (stats as any).totalStudents ?? '1000+' },
                { icon: Award,    label: 'Certificates', value: (stats as any).totalCertificates ?? '500+' },
                { icon: Star,     label: 'Rating', value: '4.8/5' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-2xl p-4 shadow-md border border-gray-100 text-center">
                  <s.icon className="w-6 h-6 mx-auto mb-1" style={{ color: primary }}/>
                  <p className="text-2xl font-black text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-400 font-medium">{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── All Courses ── */}
      {(settings as any).showAllCourses !== false && (courses as any[]).length > 0 && (
        <section ref={coursesRef} id="courses" className="py-16 md:py-24 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between mb-10">
              <div>
                <p className="text-sm font-bold uppercase tracking-widest mb-1" style={{ color: primary }}>Learn anything</p>
                <h2 className="text-3xl md:text-4xl font-black text-gray-900">All Courses</h2>
              </div>
              <Link to="/register" className="hidden md:flex items-center gap-1 text-sm font-semibold hover:opacity-80"
                style={{ color: primary }}>
                View all <ArrowRight className="w-4 h-4"/>
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {(courses as any[]).map((c: any) => (
                <div key={c.id} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
                  <div className="aspect-video overflow-hidden bg-gray-100 relative">
                    {c.thumbnailUrl
                      ? <img src={c.thumbnailUrl} alt={c.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
                      : <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${primary}30, ${secondary}20)` }}>
                          <BookOpen className="w-10 h-10" style={{ color: primary }}/>
                        </div>}
                    {c.isFree === false && c.price > 0 && (
                      <div className="absolute top-2 right-2 bg-white rounded-lg px-2 py-0.5 text-xs font-bold shadow" style={{ color: primary }}>
                        ₹{c.price}
                      </div>
                    )}
                    {c.isFree && (
                      <div className="absolute top-2 right-2 bg-green-500 text-white rounded-lg px-2 py-0.5 text-xs font-bold shadow">Free</div>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="font-bold text-gray-900 line-clamp-2 text-sm leading-snug mb-1">{c.title}</p>
                    <p className="text-xs text-gray-400 line-clamp-2 mb-3">{c.description}</p>
                    <Link to="/register"
                      className="block w-full text-center py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90"
                      style={{ background: primary }}>
                      Enroll Now
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Course Batches ── */}
      {(settings as any).showCourseBatches && (batches as any[]).filter(b => b.status === 'Active' || b.status === 'Upcoming').length > 0 && (
        <section ref={batchesRef} id="batches" className="py-16 md:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <p className="text-sm font-bold uppercase tracking-widest mb-1" style={{ color: primary }}>Enroll now</p>
              <h2 className="text-3xl md:text-4xl font-black text-gray-900">Course Batches</h2>
              <p className="text-gray-500 mt-2">Join our structured training programmes with expert instructors</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(batches as any[])
                .filter(b => b.status === 'Active' || b.status === 'Upcoming')
                .map((b: any) => (
                <div key={b.id} className="rounded-3xl overflow-hidden border border-gray-100 shadow-md hover:shadow-xl transition-all group">
                  <div className="p-1" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
                    <div className="bg-white rounded-[20px] p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <span className={clsx('text-xs font-bold px-2 py-0.5 rounded-full',
                            b.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700')}>
                            {b.status}
                          </span>
                          <h3 className="font-black text-gray-900 mt-2 text-lg leading-tight">{b.batchName}</h3>
                          {b.courseTitle && <p className="text-sm text-gray-500 mt-0.5">{b.courseTitle}</p>}
                        </div>
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ml-3"
                          style={{ background: `${primary}15` }}>
                          <Calendar className="w-6 h-6" style={{ color: primary }}/>
                        </div>
                      </div>
                      <div className="space-y-1.5 mb-4">
                        <p className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4 text-gray-400"/>
                          Starts: {new Date(b.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                        <p className="flex items-center gap-2 text-sm text-gray-600">
                          <CheckCircle className="w-4 h-4 text-gray-400"/>
                          Duration: {b.durationDays} days
                        </p>
                        {b.totalFee > 0 && (
                          <p className="flex items-center gap-2 text-sm font-bold" style={{ color: primary }}>
                            <span className="w-4 h-4 text-gray-400">₹</span>
                            Fee: ₹{b.totalFee.toLocaleString('en-IN')}
                          </p>
                        )}
                        {b.totalFee === 0 && (
                          <p className="flex items-center gap-2 text-sm font-bold text-green-600">
                            <CheckCircle className="w-4 h-4"/> Free Batch
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => setEnquiry(b)}
                        className="w-full py-3 rounded-2xl font-bold text-white text-sm shadow-md hover:shadow-lg hover:opacity-90 transition-all"
                        style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
                        Register Interest
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── About Us ── */}
      {(settings as any).showAboutUs !== false && (settings as any).aboutUsContent && (
        <section ref={aboutRef} id="about" className="py-16 md:py-24" style={{ background: `${primary}06` }}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-10">
              <p className="text-sm font-bold uppercase tracking-widest mb-1" style={{ color: primary }}>Who we are</p>
              <h2 className="text-3xl md:text-4xl font-black text-gray-900">About Us</h2>
            </div>
            <div className="bg-white rounded-3xl shadow-lg p-8 md:p-12">
              {org?.logoUrl && (
                <div className="flex justify-center mb-8">
                  <img src={org.logoUrl} alt={org.name} className="w-20 h-20 rounded-2xl object-cover shadow-lg"/>
                </div>
              )}
              <div className="prose prose-gray max-w-none text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: (settings as any).aboutUsContent ?? '' }}/>
            </div>
          </div>
        </section>
      )}

      {/* ── Openings ── */}
      {(settings as any).showOpenings && (settings as any).openingsContent && (
        <section id="openings" className="py-16 md:py-24 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-10">
              <p className="text-sm font-bold uppercase tracking-widest mb-1" style={{ color: primary }}>Join our team</p>
              <h2 className="text-3xl md:text-4xl font-black text-gray-900">Openings</h2>
            </div>
            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8 md:p-12">
              <div className="prose prose-gray max-w-none"
                dangerouslySetInnerHTML={{ __html: (settings as any).openingsContent ?? '' }}/>
            </div>
          </div>
        </section>
      )}

      {/* ── Custom pages ── */}
      {customMenus.filter(m => m.isPage && m.pageContent).map((m: any) => (
        <section key={m.label} id={m.url.replace('#', '')} className="py-16 md:py-24 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <h2 className="text-3xl font-black text-gray-900 mb-8 text-center">{m.label}</h2>
            <div className="bg-white rounded-3xl shadow-lg p-8"
              dangerouslySetInnerHTML={{ __html: m.pageContent }}/>
          </div>
        </section>
      ))}

      {/* ── Contact Us ── */}
      {(settings as any).showContactUs !== false && (
        <section ref={contactRef} id="contact" className="py-16 md:py-24" style={{ background: `linear-gradient(135deg, ${primary}08, ${secondary}06)` }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <p className="text-sm font-bold uppercase tracking-widest mb-1" style={{ color: primary }}>Get in touch</p>
              <h2 className="text-3xl md:text-4xl font-black text-gray-900">Contact Us</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Info */}
              <div className="space-y-6">
                {(settings as any).contactPhone && (
                  <div className="flex items-start gap-4 bg-white rounded-2xl p-5 shadow-md">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: `${primary}15` }}>
                      <Phone className="w-6 h-6" style={{ color: primary }}/>
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">Phone</p>
                      <a href={`tel:${(settings as any).contactPhone}`} className="text-gray-600 hover:opacity-80">{(settings as any).contactPhone}</a>
                    </div>
                  </div>
                )}
                {(settings as any).contactEmail && (
                  <div className="flex items-start gap-4 bg-white rounded-2xl p-5 shadow-md">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: `${primary}15` }}>
                      <Mail className="w-6 h-6" style={{ color: primary }}/>
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">Email</p>
                      <a href={`mailto:${(settings as any).contactEmail}`} className="text-gray-600 hover:opacity-80">{(settings as any).contactEmail}</a>
                    </div>
                  </div>
                )}
                {(settings as any).contactAddress && (
                  <div className="flex items-start gap-4 bg-white rounded-2xl p-5 shadow-md">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: `${primary}15` }}>
                      <MapPin className="w-6 h-6" style={{ color: primary }}/>
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">Address</p>
                      <p className="text-gray-600 whitespace-pre-line">{(settings as any).contactAddress}</p>
                    </div>
                  </div>
                )}
                {org?.website && (
                  <div className="flex items-start gap-4 bg-white rounded-2xl p-5 shadow-md">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: `${primary}15` }}>
                      <GraduationCap className="w-6 h-6" style={{ color: primary }}/>
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">Website</p>
                      <a href={org.website} target="_blank" rel="noreferrer" className="text-gray-600 hover:opacity-80">{org.website}</a>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick enquiry form */}
              <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8">
                <h3 className="font-black text-gray-900 text-xl mb-5">Send a Message</h3>
                <QuickContactForm orgId={org?.id ?? 0} primary={primary}/>
              </div>
            </div>

            {/* Map */}
            {(settings as any).contactMapEmbed && (
              <div className="mt-8 rounded-3xl overflow-hidden shadow-xl max-w-4xl mx-auto">
                <iframe src={(settings as any).contactMapEmbed} width="100%" height="300"
                  style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"/>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Footer ── */}
      <footer className="py-10 text-white" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {org?.logoUrl
                ? <img src={org.logoUrl} alt={org.name} className="w-9 h-9 rounded-xl object-cover"/>
                : <GraduationCap className="w-8 h-8 text-white"/>}
              <div>
                <p className="font-black text-white">{org?.name}</p>
                {org?.tagline && <p className="text-white/70 text-xs">{org.tagline}</p>}
              </div>
            </div>
            <div className="flex gap-4 flex-wrap justify-center">
              {navLinks.slice(1).map(l => (
                <a key={l.label} href={l.href} className="text-white/70 hover:text-white text-sm transition-colors">{l.label}</a>
              ))}
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-white/20 text-center text-white/60 text-xs">
            © {new Date().getFullYear()} {org?.name}. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Enquiry modal */}
      {enquiry && (
        <EnquiryModal batch={enquiry} onClose={() => setEnquiry(null)} orgId={org?.id ?? 0} primary={primary}/>
      )}
    </div>
  );
}

// ── Quick contact form ─────────────────────────────────────────────────────────
function QuickContactForm({ orgId, primary }: { orgId: number; primary: string }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '' });
  const mut = useMutation({
    mutationFn: () => fetch(`${API_BASE}/api/enquiries/batch`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, phone: form.phone, email: form.email,
        courseInterest: form.message, organizationId: orgId }),
    }).then(r => r.json()),
    onSuccess: () => { toast.success('Message sent! We will get back to you.'); setForm({ name:'', phone:'', email:'', message:'' }); },
    onError:   () => toast.error('Failed to send'),
  });
  return (
    <div className="space-y-3">
      <input className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 bg-gray-50"
        placeholder="Your name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}/>
      <input className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 bg-gray-50"
        type="tel" placeholder="Phone number *" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}/>
      <input className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 bg-gray-50"
        type="email" placeholder="Email (optional)" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}/>
      <textarea className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 bg-gray-50 resize-none"
        rows={3} placeholder="Message or course you're interested in"
        value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}/>
      <button
        onClick={() => { if (!form.name || !form.phone) { toast.error('Name and phone required'); return; } mut.mutate(); }}
        disabled={mut.isPending}
        className="w-full py-3.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 shadow-lg"
        style={{ background: primary }}>
        {mut.isPending ? <><Loader2 className="w-4 h-4 animate-spin"/> Sending…</> : <><Send className="w-4 h-4"/> Send Message</>}
      </button>
    </div>
  );
}
