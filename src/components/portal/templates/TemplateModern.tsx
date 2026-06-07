import { Search, Star, Users, Clock, Play, ChevronRight, Award } from 'lucide-react';
import clsx from 'clsx';
import type { TemplateProps } from './shared';
import { parseNavLinks, parseFooterLinks, parseSocial, parseSections, parseCustomSections, SOCIAL_ICONS, useCountUp } from './shared';

function StatCard({ value, label, emoji }: { value: number; label: string; emoji: string }) {
  const { count, ref } = useCountUp(value);
  return (
    <div ref={ref} className="text-center p-6 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
      <div className="text-3xl mb-1">{emoji}</div>
      <div className="text-3xl font-black text-white">{count.toLocaleString()}+</div>
      <div className="text-white/70 text-sm uppercase tracking-widest mt-1">{label}</div>
    </div>
  );
}

export default function TemplateModern({ config, org, stats, categories, courses, instructors,
  onCourseClick, onNavigate, isAuthenticated, userName, activeCategory, setActiveCategory, search, setSearch }: TemplateProps) {

  const navLinks = parseNavLinks(config.navLinksJson);
  const footerLinks = parseFooterLinks(config.footerLinksJson);
  const social = parseSocial(config.footerSocialJson);
  const sections = parseSections(config.sectionsConfig).filter(s => s.enabled).sort((a, b) => a.order - b.order);

  const p = org.primaryColor || '#6366f1';
  const s = org.secondaryColor || '#8b5cf6';

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: `'${org.themeFont || 'Inter'}', sans-serif` }}>
      {/* Announcement */}
      {config.showAnnouncement && config.announcementText && (
        <div className="text-white text-xs text-center py-2 font-medium"
          style={{ background: `linear-gradient(90deg, ${p}, ${s})` }}>
          {config.announcementText}
        </div>
      )}

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            {org.logoUrl
              ? <img src={org.logoUrl} alt={org.name} className="h-9" />
              : <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black"
                  style={{ background: `linear-gradient(135deg, ${p}, ${s})` }}>{org.name[0]}</div>}
            <span className="font-black text-gray-900 text-lg hidden sm:block">{org.name}</span>
          </a>
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map(l => (
              <a key={l.label} href={l.url} target={l.isExternal ? '_blank' : undefined}
                className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors">{l.label}</a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <button onClick={() => onNavigate('/dashboard')}
                className="px-4 py-2 rounded-xl text-sm font-bold text-white shadow-md hover:scale-105 transition-transform"
                style={{ background: `linear-gradient(135deg, ${p}, ${s})` }}>Dashboard</button>
            ) : (
              <>
                <button onClick={() => onNavigate('/login')}
                  className="text-sm font-medium text-gray-700 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">Login</button>
                <button onClick={() => onNavigate('/register')}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-white shadow-md hover:scale-105 transition-transform"
                  style={{ background: `linear-gradient(135deg, ${p}, ${s})` }}>Get Started</button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden py-24"
        style={{ background: `linear-gradient(135deg, ${p}12 0%, ${s}18 100%)` }}>
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-6xl font-black text-gray-900 leading-[1.05] mb-6">
            {config.heroTitle || `Welcome to ${org.name}`}
          </h1>
          <p className="text-xl text-gray-500 mb-8 max-w-2xl mx-auto">{config.heroSubtitle}</p>
          <div className="flex bg-white rounded-2xl shadow-xl p-2 max-w-xl mx-auto mb-8 border border-gray-200">
            <Search className="w-5 h-5 text-gray-400 ml-2 self-center flex-shrink-0" />
            <input className="flex-1 px-3 py-2 text-sm outline-none bg-transparent" placeholder="Search courses…"
              value={search} onChange={e => setSearch(e.target.value)} />
            <button className="px-5 py-2 rounded-xl text-sm font-bold text-white"
              style={{ background: `linear-gradient(135deg, ${p}, ${s})` }}>Search</button>
          </div>
          {!isAuthenticated && (
            <div className="flex gap-3 justify-center">
              <button onClick={() => onNavigate(config.heroButtonUrl || '/register')}
                className="px-8 py-3.5 rounded-2xl font-bold text-white shadow-xl hover:scale-105 transition-transform"
                style={{ background: `linear-gradient(135deg, ${p}, ${s})` }}>
                {config.heroButtonText || 'Get Started'} →
              </button>
              <button onClick={() => onNavigate('/login')}
                className="px-8 py-3.5 rounded-2xl font-bold text-gray-700 bg-white border border-gray-200 hover:shadow-md transition-all">
                Sign In
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Dynamic sections */}
      {sections.map(sec => (
        <div key={sec.id}>
          {sec.id === 'stats' && config.showStats && stats && (
            <section className="py-16" style={{ background: `linear-gradient(135deg, ${p}, ${s})` }}>
              <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard value={stats.totalCourses}     label="Courses"     emoji="📚" />
                <StatCard value={stats.totalStudents}    label="Students"    emoji="🎓" />
                <StatCard value={stats.totalInstructors} label="Instructors" emoji="👨‍🏫" />
                <StatCard value={stats.totalEnrollments} label="Enrollments" emoji="📈" />
              </div>
            </section>
          )}

          {sec.id === 'categories' && (
            <section className="py-16 bg-white">
              <div className="max-w-7xl mx-auto px-4">
                <h2 className="text-3xl font-black text-gray-900 text-center mb-3">Browse by Topic</h2>
                <p className="text-gray-500 text-center mb-10">Explore {categories.length} topic areas</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  <button onClick={() => setActiveCategory(null)}
                    className={clsx('p-5 rounded-2xl border-2 text-center transition-all hover:shadow-md',
                      activeCategory === null ? 'border-[var(--org-primary)] shadow-lg' : 'border-gray-200 hover:border-gray-400')}>
                    <div className="text-3xl mb-2">🔥</div>
                    <p className="font-bold text-sm text-gray-800">All Courses</p>
                  </button>
                  {categories.map(cat => (
                    <button key={cat.id} onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                      className={clsx('p-5 rounded-2xl border-2 text-center transition-all hover:shadow-md',
                        activeCategory === cat.id ? 'text-white shadow-lg border-transparent' : 'border-gray-200 hover:border-gray-400')}
                      style={activeCategory === cat.id ? { background: `linear-gradient(135deg, ${p}, ${s})`, borderColor: 'transparent' } : {}}>
                      <div className="text-3xl mb-2">{cat.icon || '📁'}</div>
                      <p className={clsx('font-bold text-sm', activeCategory === cat.id ? 'text-white' : 'text-gray-800')}>{cat.name}</p>
                      <p className={clsx('text-xs mt-1', activeCategory === cat.id ? 'text-white/70' : 'text-gray-400')}>{cat.courseCount} courses</p>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}

          {sec.id === 'courses' && (
            <section className="py-16 bg-gray-50">
              <div className="max-w-7xl mx-auto px-4">
                <h2 className="text-3xl font-black text-gray-900 mb-2">{activeCategory ? 'Category Courses' : 'Popular Courses'}</h2>
                <p className="text-gray-500 mb-8">{courses.length} courses available</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {courses.slice(0, 8).map(c => (
                    <div key={c.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl border border-gray-100 hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                      onClick={() => onCourseClick(c.id)}>
                      <div className="h-40 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${p}20, ${s}30)` }}>
                        {c.thumbnailUrl ? <img src={c.thumbnailUrl} alt={c.title} className="w-full h-full object-cover" /> : null}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                            <Play className="w-5 h-5 ml-0.5" style={{ color: p }} />
                          </div>
                        </div>
                      </div>
                      <div className="p-4">
                        <p className="text-xs font-medium mb-1" style={{ color: p }}>{c.categoryName}</p>
                        <h3 className="font-bold text-sm text-gray-900 line-clamp-2 mb-2">{c.title}</h3>
                        <p className="text-xs text-gray-500 mb-3">{c.instructorName}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            {c.averageRating.toFixed(1)}
                            <Users className="w-3.5 h-3.5 ml-1" />{c.enrollmentCount}
                          </div>
                          <span className="font-bold text-sm" style={{ color: c.isFree ? '#10b981' : p }}>
                            {c.isFree ? 'Free' : `₹${c.price}`}
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
            <section className="py-16 bg-white">
              <div className="max-w-7xl mx-auto px-4">
                <h2 className="text-3xl font-black text-gray-900 text-center mb-3">Our Instructors</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-10">
                  {instructors.slice(0, 8).map((inst: any) => (
                    <div key={inst.id} className="text-center group">
                      <div className="w-20 h-20 rounded-2xl mx-auto mb-3 flex items-center justify-center text-white text-2xl font-black shadow-md group-hover:scale-105 transition-transform"
                        style={{ background: `linear-gradient(135deg, ${p}, ${s})` }}>
                        {inst.firstName[0]}{inst.lastName[0]}
                      </div>
                      <p className="font-bold text-sm text-gray-900">{inst.firstName} {inst.lastName}</p>
                      <p className="text-xs mt-0.5" style={{ color: p }}>{inst.courseCount} courses</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {sec.id === 'cta' && !isAuthenticated && (
            <section className="py-20 relative overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${p}, ${s})` }}>
              <div className="absolute inset-0 opacity-10"
                style={{ backgroundImage: 'radial-gradient(white 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
              <div className="relative max-w-3xl mx-auto px-4 text-center">
                <h2 className="text-4xl font-black text-white mb-4">Ready to start learning?</h2>
                <p className="text-white/80 text-lg mb-8">Join thousands of learners at {org.name}</p>
                <button onClick={() => onNavigate('/register')}
                  className="px-10 py-4 rounded-2xl font-bold text-lg bg-white hover:scale-105 transition-transform shadow-xl"
                  style={{ color: p }}>Create Free Account</button>
              </div>
            </section>
          )}
        </div>
      ))}

      {/* Footer */}
      <footer className="bg-gray-950 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between gap-8 mb-8">
            <div>
              <p className="font-black text-white text-xl">{org.name}</p>
              <p className="text-sm mt-1 text-gray-500">{config.footerTagline}</p>
              <div className="flex gap-3 mt-4">
                {social.map(s => (
                  <a key={s.platform} href={s.url} className="w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors text-lg">
                    {SOCIAL_ICONS[s.platform] || '🔗'}
                  </a>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-8">
              {footerLinks.map(l => (
                <a key={l.label} href={l.url} className="text-sm hover:text-white transition-colors">{l.label}</a>
              ))}
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6">
            <p className="text-xs text-gray-600 text-center">{config.footerCopyright}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
