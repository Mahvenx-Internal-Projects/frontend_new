import { useState } from 'react';
import {
  GraduationCap, ArrowRight, Play, Star, CheckCircle2, Smartphone,
  Apple, Check, Twitter, Github, Linkedin, BookOpen, Sparkles
} from 'lucide-react';
import clsx from 'clsx';
import type { TemplateProps } from './shared';
import { parseNavLinks, parseFooterLinks, parseSections, useCountUp } from './shared';

// ─── Continue-learning phone mockup ──────────────────────────────────────────
// A static illustrative card, not real user data — mirrors the reference
// design's "Continue learning" preview to sell the mobile-app section.
function ContinueLearningMock({ primary, accent, courseTitle }: { primary: string; accent: string; courseTitle: string }) {
  const items = [
    { label: 'Color theory', done: true },
    { label: 'Type scales', done: true },
    { label: 'Grids & layout', mins: 14 },
    { label: 'Motion basics', mins: 16 },
  ];
  return (
    <div className="relative mx-auto" style={{ width: 300 }}>
      <div className="rounded-[2.5rem] border-[10px] border-gray-100 shadow-2xl bg-white overflow-hidden">
        <div className="h-7 flex items-center justify-center">
          <div className="w-20 h-4 rounded-full bg-gray-100" />
        </div>
        <div className="px-6 pb-8 pt-2 space-y-4">
          <p className="text-xs text-gray-400 font-medium">Continue learning</p>
          <h3 className="text-xl font-bold text-gray-900 leading-snug">{courseTitle}</h3>
          <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: '52%', background: `linear-gradient(90deg, ${primary}, ${accent})` }} />
          </div>
          <div className="space-y-2.5 pt-2">
            {items.map(it => (
              <div key={it.label} className="flex items-center justify-between rounded-2xl border border-gray-100 px-4 py-3">
                <span className="text-sm text-gray-700 font-medium">{it.label}</span>
                {it.done
                  ? <Check className="w-4 h-4" style={{ color: primary }} />
                  : <span className="text-xs text-gray-400">{it.mins} min</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function RatingStars({ accent }: { accent: string }) {
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" style={{ color: accent }} />)}
    </div>
  );
}

export default function TemplateLumen({ config, org, stats, categories, courses, instructors, reviews,
  onCourseClick, onNavigate, isAuthenticated, activeCategory, setActiveCategory, search, setSearch }: TemplateProps) {

  const navLinks = parseNavLinks(config.navLinksJson);
  const footerLinks = parseFooterLinks(config.footerLinksJson);
  const sections = parseSections(config.sectionsConfig).filter(s => s.enabled).sort((a, b) => a.order - b.order);

  const p  = org.primaryColor   || '#6366f1';
  const s  = org.secondaryColor || '#8b5cf6';
  const ac = org.accentColor    || '#a78bfa';
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const totalCourses = stats?.totalCourses ?? courses.length;
  const featuredCourse = courses[0]?.title ?? 'Designing Interfaces';

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: `'${org.themeFont || 'Inter'}', sans-serif` }}>
      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-[72px] flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${p}, ${s})` }}>
              {org.logoUrl
                ? <img src={org.logoUrl} alt={org.name} className="w-full h-full object-cover rounded-2xl" />
                : <GraduationCap className="w-5.5 h-5.5 text-white" />}
            </div>
            <span className="text-lg font-bold text-gray-900 tracking-tight">
              {org.name?.split(' ')[0] ?? 'Lumen'}<span style={{ color: p }}>{org.name?.split(' ').slice(1).join(' ') || 'LMS'}</span>
            </span>
          </a>

          <div className="hidden md:flex items-center gap-8">
            {(navLinks.length > 0 ? navLinks : [
              { label: 'Home', url: '/' }, { label: 'Courses', url: '#courses' }, { label: 'Categories', url: '#categories' },
            ]).map(l => (
              <a key={l.label} href={l.url} className="text-[15px] text-gray-600 hover:text-gray-900 font-medium transition-colors">
                {l.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <button onClick={() => onNavigate('/dashboard')}
                className="text-sm font-semibold px-5 py-2.5 rounded-xl text-white shadow-sm hover:shadow-md transition-all"
                style={{ background: p }}>
                Dashboard
              </button>
            ) : (
              <>
                <button onClick={() => onNavigate('/login')} className="hidden sm:block text-[15px] font-medium text-gray-700 hover:text-gray-900">
                  Log in
                </button>
                <button onClick={() => onNavigate('/register')}
                  className="text-sm font-semibold px-5 py-2.5 rounded-xl text-white shadow-sm hover:shadow-md transition-all"
                  style={{ background: p }}>
                  Get started
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        {config.heroStyle === 'image' && config.heroImageUrl ? (
          <>
            {/* Custom background image, set in Homepage Editor → Hero tab */}
            <div className="absolute inset-0">
              <img src={config.heroImageUrl} alt="" className="w-full h-full object-cover" />
            </div>
            {/* Light gradient overlay so the headline stays readable over any photo */}
            <div className="absolute inset-0"
              style={{ background: `linear-gradient(135deg, ${p}26, rgba(255,255,255,0.55) 55%, rgba(255,255,255,0.85))` }} />
          </>
        ) : (
          <>
            <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${p}12, ${s}08, ${ac}10)` }} />
            {/* Decorative network/particle backdrop using subtle dots */}
            <svg className="absolute inset-0 w-full h-full opacity-40" preserveAspectRatio="none" viewBox="0 0 1200 600">
              <defs>
                <radialGradient id="lumen-dot" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor={p} stopOpacity="0.6" />
                  <stop offset="100%" stopColor={p} stopOpacity="0" />
                </radialGradient>
              </defs>
              {[...Array(40)].map((_, i) => {
                const x = (i * 173 + 50) % 1200;
                const y = (i * 97 + 40) % 600;
                return <circle key={i} cx={x} cy={y} r={1.6} fill={ac} opacity={0.5} />;
              })}
              <line x1="150" y1="120" x2="380" y2="220" stroke={p} strokeOpacity="0.15" strokeWidth="1" />
              <line x1="380" y1="220" x2="620" y2="160" stroke={p} strokeOpacity="0.15" strokeWidth="1" />
              <line x1="620" y1="160" x2="900" y2="300" stroke={s} strokeOpacity="0.15" strokeWidth="1" />
              <line x1="700" y1="80" x2="900" y2="300" stroke={s} strokeOpacity="0.15" strokeWidth="1" />
            </svg>
          </>
        )}

        <div className="relative max-w-7xl mx-auto px-6 pt-16 pb-24 md:pt-24 md:pb-32">
          <div className="max-w-3xl">
            {config.showAnnouncement && config.announcementText ? (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow-sm border border-gray-100 text-sm font-medium text-gray-700 mb-8">
                <Sparkles className="w-3.5 h-3.5" style={{ color: p }} />
                {config.announcementText}
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow-sm border border-gray-100 text-sm font-medium text-gray-700 mb-8">
                <Sparkles className="w-3.5 h-3.5" style={{ color: p }} />
                New cohort starting Monday
              </div>
            )}

            <h1 className="text-5xl md:text-7xl font-black text-gray-900 leading-[1.05] tracking-tight mb-6">
              {config.heroTitle?.split(' ').slice(0, -3).join(' ') || 'Learn skills that'}{' '}
              <span style={{ background: `linear-gradient(135deg, ${p}, ${s})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
                {config.heroTitle?.split(' ').slice(-3).join(' ') || 'move you forward.'}
              </span>
            </h1>

            <p className="text-lg text-gray-500 leading-relaxed mb-10 max-w-xl">
              {config.heroSubtitle ||
                `${totalCourses || '500'}+ hand-picked courses across development, design, data, business and creative crafts. Stream on web, iOS and Android — your progress follows you everywhere.`}
            </p>

            <div className="flex flex-wrap items-center gap-3 mb-8">
              <button onClick={() => onNavigate(config.heroButtonUrl || '/register')}
                className="inline-flex items-center gap-2 px-7 py-4 rounded-2xl text-white font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
                style={{ background: `linear-gradient(135deg, ${p}, ${s})` }}>
                {config.heroButtonText || 'Start learning free'} <ArrowRight className="w-4 h-4" />
              </button>
              <button onClick={() => document.getElementById('courses')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center gap-2 px-7 py-4 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold transition-colors">
                <Play className="w-4 h-4" /> Explore courses
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1.5">
                <RatingStars accent={ac} />
                <span className="font-semibold text-gray-800">4.9</span>
                <span>· {stats?.totalStudents ? `${stats.totalStudents}+` : '12k+'} reviews</span>
              </div>
              <span className="text-gray-300">·</span>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" style={{ color: p }} />
                7-day free trial
              </div>
            </div>
          </div>
        </div>
      </section>

      {sections.map(sec => (
        <div key={sec.id}>
          {sec.id === 'categories' && categories.length > 0 && (
            <section id="categories" className="py-20 bg-gray-50/60">
              <div className="max-w-7xl mx-auto px-6">
                <div className="text-center mb-12">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">Browse by category</h2>
                  <p className="text-gray-500">Find the path that fits where you're headed</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  {categories.map(cat => (
                    <button key={cat.id} onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                      className={clsx('p-5 rounded-2xl text-center border transition-all hover:-translate-y-0.5',
                        activeCategory === cat.id ? 'border-transparent text-white shadow-lg' : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-md')}
                      style={activeCategory === cat.id ? { background: `linear-gradient(135deg, ${p}, ${s})` } : {}}>
                      <div className="text-2xl mb-2">{cat.icon || '📘'}</div>
                      <p className={clsx('text-sm font-semibold', activeCategory === cat.id ? 'text-white' : 'text-gray-800')}>{cat.name}</p>
                      <p className={clsx('text-xs mt-0.5', activeCategory === cat.id ? 'text-white/70' : 'text-gray-400')}>{cat.courseCount} courses</p>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}

          {sec.id === 'courses' && courses.length > 0 && (
            <section id="courses" className="py-20 bg-white">
              <div className="max-w-7xl mx-auto px-6">
                <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-xs font-semibold text-gray-600 mb-3">
                      <BookOpen className="w-3.5 h-3.5" /> Course catalog
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Popular courses</h2>
                    <p className="text-gray-500">{courses.length} courses ready when you are</p>
                  </div>
                  <button onClick={() => onNavigate('/courses')}
                    className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-gray-100 transition-colors"
                    style={{ color: p }}>
                    View all courses <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {courses.slice(0, 8).map(c => {
                    const inst = (c as any).instructorName as string | undefined;
                    return (
                    <div key={c.id} onClick={() => onCourseClick(c.id)}
                      className="rounded-2xl border border-gray-100 hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 cursor-pointer overflow-hidden group bg-white">
                      <div className="aspect-video relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${p}18, ${ac}15)` }}>
                        {c.thumbnailUrl
                          ? <img src={c.thumbnailUrl} alt={c.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          : <div className="w-full h-full flex items-center justify-center"><BookOpen className="w-8 h-8" style={{ color: p }} /></div>}
                        {/* Play overlay on hover */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <div className="w-11 h-11 rounded-full bg-white/0 group-hover:bg-white/95 flex items-center justify-center scale-75 group-hover:scale-100 opacity-0 group-hover:opacity-100 transition-all">
                            <Play className="w-4 h-4 ml-0.5" style={{ color: p }} />
                          </div>
                        </div>
                        {c.isFree && (
                          <span className="absolute top-3 left-3 text-[10px] font-bold px-2 py-1 rounded-full bg-white/95 text-green-600 shadow-sm">FREE</span>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 mb-2 min-h-[2.5rem] group-hover:text-gray-700">{c.title}</h3>
                        {inst && (
                          <div className="flex items-center gap-1.5 mb-2.5">
                            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                              style={{ background: `linear-gradient(135deg, ${p}, ${s})` }}>
                              {inst.split(' ').map(w => w[0]).slice(0,2).join('')}
                            </div>
                            <span className="text-xs text-gray-500 truncate">{inst}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-2.5 border-t border-gray-50">
                          <span className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                            <Star className="w-3 h-3 fill-current" style={{ color: ac }} /> {c.averageRating?.toFixed(1) ?? '5.0'}
                            <span className="text-gray-300">·</span>
                            {(c as any).enrollmentCount ?? 0} enrolled
                          </span>
                          <span className="text-sm font-bold" style={{ color: c.isFree ? '#10b981' : p }}>
                            {c.isFree ? 'Free' : `₹${c.price}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  );})}
                </div>
              </div>
            </section>
          )}

          {sec.id === 'instructors' && instructors.length > 0 && (
            <section className="py-20 bg-gray-50/60 overflow-hidden">
              <div className="max-w-7xl mx-auto px-6">
                <div className="text-center mb-12 max-w-2xl mx-auto">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white shadow-sm text-xs font-semibold text-gray-600 mb-4">
                    <GraduationCap className="w-3.5 h-3.5" style={{ color: p }} /> Meet your instructors
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">Taught by people who build this for a living</h2>
                  <p className="text-gray-500">Real practitioners, not just presenters — every instructor here ships work in the field they teach.</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
                  {instructors.slice(0, 8).map((inst: any) => (
                    <div key={inst.id}
                      className="bg-white rounded-2xl p-5 text-center border border-gray-100 hover:shadow-xl hover:-translate-y-1 hover:rotate-[0.5deg] transition-all duration-300 group">
                      <div className="w-16 h-16 rounded-2xl mx-auto mb-3 overflow-hidden flex items-center justify-center text-white font-bold text-xl shadow-md"
                        style={{ background: `linear-gradient(135deg, ${p}, ${s})` }}>
                        {inst.avatarUrl
                          ? <img src={inst.avatarUrl} alt={`${inst.firstName} ${inst.lastName}`} className="w-full h-full object-cover" />
                          : <>{inst.firstName?.[0]}{inst.lastName?.[0]}</>}
                      </div>
                      <p className="font-semibold text-sm text-gray-900">{inst.firstName} {inst.lastName}</p>
                      {inst.bio && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{inst.bio}</p>}
                      <div className="flex items-center justify-center gap-2 mt-2 text-xs text-gray-400">
                        <span>{inst.courseCount} course{inst.courseCount !== 1 ? 's' : ''}</span>
                        {inst.studentCount > 0 && <><span className="text-gray-300">·</span><span>{inst.studentCount} students</span></>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>
      ))}

      {/* ── Student reviews ── */}
      {reviews && reviews.length > 0 && (
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-12 max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-xs font-semibold text-gray-600 mb-4">
                <Star className="w-3.5 h-3.5 fill-current" style={{ color: ac }} /> Student reviews
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">Loved by learners like you</h2>
              <p className="text-gray-500">Real feedback from students who finished a course here.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {reviews.slice(0, 6).map((r: any) => (
                <div key={r.id} className="bg-gray-50/80 rounded-2xl p-6 border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all">
                  <div className="flex items-center gap-0.5 mb-3">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5" style={{ color: i < r.rating ? ac : '#e5e7eb' }}
                        fill={i < r.rating ? 'currentColor' : 'none'} />
                    ))}
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed mb-5 line-clamp-4">"{r.review}"</p>
                  <div className="flex items-center gap-2.5 pt-4 border-t border-gray-100">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden"
                      style={{ background: `linear-gradient(135deg, ${p}, ${s})` }}>
                      {r.studentAvatar
                        ? <img src={r.studentAvatar} alt={r.studentName} className="w-full h-full object-cover" />
                        : r.studentName?.split(' ').map((w: string) => w[0]).slice(0,2).join('')}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-900 truncate">{r.studentName}</p>
                      <p className="text-xs text-gray-400 truncate">{r.courseTitle}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Mobile app promo ── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-xs font-semibold text-gray-600 mb-5">
              <Smartphone className="w-3.5 h-3.5" /> Mobile-first
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-5">
              Take every course<br/>with you on{' '}
              <span style={{ color: p }}>iOS &amp; Android</span>
            </h2>
            <p className="text-gray-500 text-lg leading-relaxed mb-8 max-w-md">
              Download lessons for offline viewing, scan QR codes from the web to resume on mobile, and pick up exactly where you left off.
            </p>
            <div className="flex flex-wrap gap-3">
              <button className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl text-white font-semibold shadow-md hover:shadow-lg transition-all"
                style={{ background: `linear-gradient(135deg, ${p}, ${s})` }}>
                <Apple className="w-4 h-4" /> Download for iOS
              </button>
              <button className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white border border-gray-200 hover:border-gray-300 text-gray-800 font-semibold transition-colors">
                <Smartphone className="w-4 h-4" /> Get it on Android
              </button>
            </div>
          </div>
          <div>
            <ContinueLearningMock primary={p} accent={ac} courseTitle={featuredCourse} />
          </div>
        </div>
      </section>

      {/* ── Final CTA band ── */}
      <section className="py-16" style={{ background: `linear-gradient(135deg, ${p}, ${s})` }}>
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Ready to start learning?</h2>
          <p className="text-white/80 mb-8 text-lg">Join thousands of learners building real skills, one course at a time.</p>
          <button onClick={() => onNavigate(config.heroButtonUrl || '/register')}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white font-bold shadow-xl hover:scale-105 transition-transform"
            style={{ color: p }}>
            Get started for free <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-100 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10">
            <div className="lg:col-span-2">
              <a href="/" className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${p}, ${s})` }}>
                  {org.logoUrl
                    ? <img src={org.logoUrl} alt={org.name} className="w-full h-full object-cover rounded-xl" />
                    : <GraduationCap className="w-4.5 h-4.5 text-white" />}
                </div>
                <span className="font-bold text-gray-900">{org.name}</span>
              </a>
              <p className="text-sm text-gray-500 leading-relaxed max-w-xs mb-5">
                {config.footerTagline || `Learn skills that move you forward. Anywhere, on any device.`}
              </p>
              <div className="flex items-center gap-3">
                {[
                  { Icon: Twitter, href: (config as any).socialTwitter },
                  { Icon: Github, href: (config as any).socialGithub },
                  { Icon: Linkedin, href: (config as any).socialLinkedin },
                ].map(({ Icon, href }, i) => (
                  <a key={i} href={href || '#'} target={href ? '_blank' : undefined} rel="noreferrer"
                    className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                    style={{ '--hover-bg': p } as any}
                    onMouseEnter={e => { e.currentTarget.style.background = p; e.currentTarget.style.borderColor = p; }}
                    onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.borderColor = ''; }}>
                    <Icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>

            {[
              { title: 'Learn', links: [{ l: 'Courses', to: '#courses' }, { l: 'Categories', to: '#categories' }, { l: 'Instructors', to: '#' }] },
              { title: 'Company', links: [{ l: 'About', to: '/about' }, { l: 'Contact', to: '/contact' }] },
              { title: 'Support', links: [{ l: 'Help center', to: '#' }, { l: 'Privacy', to: '#' }, { l: 'Terms', to: '#' }] },
            ].map(col => (
              <div key={col.title}>
                <p className="font-semibold text-gray-900 text-sm mb-4">{col.title}</p>
                <div className="space-y-2.5">
                  {col.links.map(({ l, to }) => (
                    <a key={l} href={to} className="block text-sm text-gray-500 hover:text-gray-800 transition-colors">{l}</a>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-14 pt-6 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-gray-400">
              {config.footerCopyright || `© ${new Date().getFullYear()} ${org.name}. All rights reserved.`}
            </p>
            
          </div>
        </div>
      </footer>
    </div>
  );
}
