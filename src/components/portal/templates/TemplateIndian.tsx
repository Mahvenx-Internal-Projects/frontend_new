import { Search, Star, Users, Play, BookOpen } from 'lucide-react';
import clsx from 'clsx';
import type { TemplateProps } from './shared';
import { parseNavLinks, parseFooterLinks, parseSocial, parseSections, SOCIAL_ICONS, useCountUp } from './shared';

function StatPill({ value, label, emoji }: { value: number; label: string; emoji: string }) {
  const { count, ref } = useCountUp(value);
  return (
    <div ref={ref} className="bg-white rounded-2xl p-5 text-center shadow-md">
      <div className="text-3xl mb-2">{emoji}</div>
      <div className="text-3xl font-black text-gray-900">{count.toLocaleString()}+</div>
      <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider mt-1">{label}</div>
    </div>
  );
}

export default function TemplateIndian({ config, org, stats, categories, courses, instructors,
  onCourseClick, onNavigate, isAuthenticated, activeCategory, setActiveCategory, search, setSearch }: TemplateProps) {

  const navLinks = parseNavLinks(config.navLinksJson);
  const footerLinks = parseFooterLinks(config.footerLinksJson);
  const social = parseSocial(config.footerSocialJson);
  const sections = parseSections(config.sectionsConfig).filter(s => s.enabled).sort((a, b) => a.order - b.order);
  const p = org.primaryColor || '#f97316';
  const s = org.secondaryColor || '#ea580c';
  const ac = org.accentColor || '#fbbf24';

  return (
    <div className="min-h-screen" style={{ fontFamily: `'${org.themeFont || 'Poppins'}', sans-serif` }}>
      {/* Announcement ticker */}
      {config.showAnnouncement && config.announcementText && (
        <div className="overflow-hidden py-1.5 text-white text-xs font-semibold"
          style={{ background: `linear-gradient(90deg, ${p}, ${ac}, ${s})` }}>
          <div className="animate-marquee whitespace-nowrap px-4">
            {config.announcementText} &nbsp;&nbsp;•&nbsp;&nbsp; {config.announcementText}
          </div>
        </div>
      )}

      {/* Nav - tricolor inspired */}
      <nav className="sticky top-0 z-50 bg-white shadow-md border-b-4" style={{ borderColor: p }}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            {org.logoUrl
              ? <img src={org.logoUrl} alt={org.name} className="h-10" />
              : <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-md"
                  style={{ background: `linear-gradient(135deg, ${p}, ${ac})` }}>{org.name[0]}</div>}
            <div>
              <span className="font-black text-gray-900 text-base block">{org.name}</span>
              <span className="text-xs text-gray-400">Learning Portal</span>
            </div>
          </a>
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map(l => (
              <a key={l.label} href={l.url} className="text-sm font-semibold text-gray-700 hover:text-[var(--org-primary)] transition-colors">{l.label}</a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {isAuthenticated
              ? <button onClick={() => onNavigate('/dashboard')}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-md"
                  style={{ background: `linear-gradient(135deg, ${p}, ${s})` }}>Dashboard</button>
              : <>
                  <button onClick={() => onNavigate('/login')} className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">Login</button>
                  <button onClick={() => onNavigate('/register')}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-md"
                    style={{ background: `linear-gradient(135deg, ${p}, ${s})` }}>Free Register</button>
                </>}
          </div>
        </div>
      </nav>

      {/* Hero - diagonal split */}
      <section className="relative overflow-hidden py-20"
        style={{ background: `linear-gradient(135deg, ${p}10 0%, ${ac}15 50%, ${s}10 100%)` }}>
        {/* Decorative circles */}
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-10" style={{ background: p }} />
        <div className="absolute -bottom-16 -left-16 w-80 h-80 rounded-full opacity-10" style={{ background: ac }} />
        <div className="relative max-w-6xl mx-auto px-4 flex flex-col lg:flex-row items-center gap-12">
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold mb-5 border-2"
              style={{ borderColor: p, color: p, background: `${p}10` }}>
              🇮🇳 भारत का #1 Learning Platform
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 leading-tight mb-4">
              {config.heroTitle || 'Learn. Grow. Succeed.'}
            </h1>
            <p className="text-gray-600 text-lg mb-8 max-w-lg">{config.heroSubtitle}</p>
            <div className="flex bg-white rounded-2xl shadow-xl p-2 max-w-md mb-6 border border-gray-100">
              <Search className="w-5 h-5 text-gray-400 ml-2 self-center" />
              <input className="flex-1 px-3 py-2 text-sm outline-none bg-transparent" placeholder="कोर्स खोजें..."
                value={search} onChange={e => setSearch(e.target.value)} />
              <button className="px-5 py-2 rounded-xl text-sm font-bold text-white"
                style={{ background: `linear-gradient(135deg, ${p}, ${s})` }}>Search</button>
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => onNavigate(config.heroButtonUrl || '/register')}
                className="px-8 py-3.5 rounded-2xl font-bold text-white shadow-xl hover:scale-105 transition-transform text-base"
                style={{ background: `linear-gradient(135deg, ${p}, ${s})` }}>
                {config.heroButtonText || 'अभी शुरू करें'} 🚀
              </button>
              <button onClick={() => onNavigate('/login')}
                className="px-8 py-3.5 rounded-2xl font-bold text-gray-700 bg-white border-2 hover:shadow-md transition-all text-base"
                style={{ borderColor: p }}>
                Login
              </button>
            </div>
          </div>
          <div className="flex-shrink-0 hidden lg:block">
            <div className="w-64 h-64 rounded-3xl flex items-center justify-center shadow-2xl text-8xl"
              style={{ background: `linear-gradient(135deg, ${p}20, ${ac}30)`, border: `3px solid ${p}30` }}>
              📖
            </div>
          </div>
        </div>
      </section>

      {sections.map(sec => (
        <div key={sec.id}>
          {sec.id === 'stats' && config.showStats && stats && (
            <section className="py-14 bg-white">
              <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-5">
                <StatPill value={stats.totalCourses}     label="Courses"     emoji="📚" />
                <StatPill value={stats.totalStudents}    label="Students"    emoji="👩‍🎓" />
                <StatPill value={stats.totalInstructors} label="Experts"     emoji="🏆" />
                <StatPill value={stats.totalEnrollments} label="Enrollments" emoji="📊" />
              </div>
            </section>
          )}

          {sec.id === 'categories' && (
            <section className="py-16" style={{ background: `${p}06` }}>
              <div className="max-w-7xl mx-auto px-4">
                <div className="text-center mb-10">
                  <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full" style={{ background: `${p}15`, color: p }}>Topics</span>
                  <h2 className="text-3xl font-black text-gray-900 mt-3">अपना विषय चुनें</h2>
                  <p className="text-gray-500 mt-2">Choose from {categories.length} categories</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
                  {categories.map(cat => (
                    <button key={cat.id} onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                      className={clsx('p-4 rounded-2xl text-center transition-all hover:shadow-lg hover:-translate-y-0.5 border-2',
                        activeCategory === cat.id ? 'text-white border-transparent shadow-lg' : 'bg-white border-gray-100 hover:border-orange-200')}
                      style={activeCategory === cat.id ? { background: `linear-gradient(135deg, ${p}, ${s})` } : {}}>
                      <div className="text-3xl mb-2">{cat.icon || '📁'}</div>
                      <p className={clsx('font-bold text-xs', activeCategory === cat.id ? 'text-white' : 'text-gray-800')}>{cat.name}</p>
                      <p className={clsx('text-xs mt-0.5', activeCategory === cat.id ? 'text-white/70' : 'text-gray-400')}>{cat.courseCount}</p>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}

          {sec.id === 'courses' && (
            <section className="py-16 bg-white">
              <div className="max-w-7xl mx-auto px-4">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-3xl font-black text-gray-900">Top Courses</h2>
                    <p className="text-gray-500 text-sm mt-1">{courses.length} courses found</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {courses.slice(0, 8).map(c => (
                    <div key={c.id} onClick={() => onCourseClick(c.id)}
                      className="rounded-2xl overflow-hidden shadow-sm hover:shadow-xl border border-gray-100 cursor-pointer hover:-translate-y-1 transition-all duration-300">
                      <div className="h-40 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${p}20, ${ac}30)` }}>
                        {c.thumbnailUrl && <img src={c.thumbnailUrl} alt={c.title} className="w-full h-full object-cover" />}
                        <div className="absolute bottom-2 left-2">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white" style={{ background: p }}>
                            {c.level}
                          </span>
                        </div>
                      </div>
                      <div className="p-4 bg-white">
                        <p className="text-xs font-semibold mb-1" style={{ color: p }}>{c.categoryName}</p>
                        <h3 className="font-bold text-sm text-gray-900 line-clamp-2 mb-2">{c.title}</h3>
                        <p className="text-xs text-gray-500 mb-3">{c.instructorName}</p>
                        <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                          <div className="flex items-center gap-1.5 text-xs text-gray-400">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            {c.averageRating.toFixed(1)} · {c.enrollmentCount} students
                          </div>
                          <span className="font-black text-sm" style={{ color: c.isFree ? '#10b981' : p }}>
                            {c.isFree ? 'FREE' : `₹${c.price}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {sec.id === 'instructors' && instructors.length > 0 && (
            <section className="py-16" style={{ background: `${p}06` }}>
              <div className="max-w-7xl mx-auto px-4">
                <div className="text-center mb-10">
                  <h2 className="text-3xl font-black text-gray-900">हमारे Expert Instructors</h2>
                  <p className="text-gray-500 mt-2">Learn from industry professionals</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                  {instructors.slice(0, 8).map((inst: any) => (
                    <div key={inst.id} className="bg-white rounded-2xl p-5 text-center shadow-sm hover:shadow-md transition-shadow">
                      <div className="w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center text-white font-black text-xl shadow-md"
                        style={{ background: `linear-gradient(135deg, ${p}, ${ac})` }}>
                        {inst.firstName[0]}{inst.lastName[0]}
                      </div>
                      <p className="font-bold text-sm text-gray-900">{inst.firstName} {inst.lastName}</p>
                      <p className="text-xs" style={{ color: p }}>{inst.courseCount} courses</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {sec.id === 'cta' && !isAuthenticated && (
            <section className="py-20 text-center relative overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${p}, ${ac}, ${s})` }}>
              <div className="absolute inset-0 opacity-10"
                style={{ backgroundImage: 'radial-gradient(white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
              <div className="relative max-w-2xl mx-auto px-4">
                <div className="text-5xl mb-4">🎓</div>
                <h2 className="text-4xl font-black text-white mb-4">आज ही शुरू करें!</h2>
                <p className="text-white/80 text-lg mb-8">Join {stats?.totalStudents?.toLocaleString()}+ learners</p>
                <button onClick={() => onNavigate('/register')}
                  className="px-10 py-4 rounded-2xl font-black text-lg bg-white shadow-2xl hover:scale-105 transition-transform"
                  style={{ color: p }}>Free में Join करें 🚀</button>
              </div>
            </section>
          )}
        </div>
      ))}

      {/* Footer */}
      <footer className="bg-gray-950 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <p className="font-black text-white text-xl">{org.name}</p>
              <p className="text-sm mt-2 text-gray-500">{config.footerTagline}</p>
              <div className="flex gap-3 mt-4">
                {social.map(s => (
                  <a key={s.platform} href={s.url} className="w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center hover:bg-gray-700 text-lg">
                    {SOCIAL_ICONS[s.platform] || '🔗'}
                  </a>
                ))}
              </div>
            </div>
            <div className="md:col-span-2 flex flex-wrap gap-4">
              {footerLinks.map(l => (
                <a key={l.label} href={l.url} className="text-sm hover:text-white transition-colors">{l.label}</a>
              ))}
            </div>
          </div>
          {config.showFooterNewsletter && (
            <div className="border-t border-gray-800 pt-6 mb-6">
              <div className="flex gap-3 max-w-md">
                <input className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-orange-500"
                  placeholder="Your email address" />
                <button className="px-5 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: p }}>Subscribe</button>
              </div>
            </div>
          )}
          <p className="text-xs text-gray-600 text-center border-t border-gray-800 pt-4">{config.footerCopyright}</p>
        </div>
      </footer>
    </div>
  );
}
