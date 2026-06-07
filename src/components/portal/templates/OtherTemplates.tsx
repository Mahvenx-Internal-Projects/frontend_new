// TemplateBold - magazine style, bold typography, asymmetric layout
import { Search, Star, Users, Play } from 'lucide-react';
import type { TemplateProps } from './shared';

function BoldStatItem({ value, label, emoji }: { value: number; label: string; emoji: string }) {
  const { count, ref } = useCountUp(value);
  return (
    <div ref={ref} className="text-center p-6">
      <div className="text-2xl mb-1">{emoji}</div>
      <div className="text-4xl font-black">{count.toLocaleString()}+</div>
      <div className="text-xs font-black uppercase tracking-widest text-gray-500 mt-1">{label}</div>
    </div>
  );
}
function MinimalStatItem({ value, label }: { value: number; label: string }) {
  const { count, ref } = useCountUp(value);
  return (
    <div ref={ref}>
      <div className="text-3xl font-light text-gray-900">{count.toLocaleString()}</div>
      <div className="text-sm text-gray-400 mt-1">{label}</div>
    </div>
  );
}
function DarkStatItem({ value, label, emoji, primaryColor }: { value: number; label: string; emoji: string; primaryColor: string }) {
  const { count, ref } = useCountUp(value);
  return (
    <div ref={ref} className="text-center bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
      <div className="text-2xl mb-2">{emoji}</div>
      <div className="text-3xl font-black" style={{ color: primaryColor }}>{count.toLocaleString()}+</div>
      <div className="text-xs text-gray-500 uppercase tracking-widest mt-1">{label}</div>
    </div>
  );
}

import { parseNavLinks, parseFooterLinks, parseSocial, parseSections, SOCIAL_ICONS, useCountUp } from './shared';

export function TemplateBold({ config, org, stats, categories, courses, instructors,
  onCourseClick, onNavigate, isAuthenticated, activeCategory, setActiveCategory, search, setSearch }: TemplateProps) {
  const p = org.primaryColor || '#dc2626';
  const navLinks = parseNavLinks(config.navLinksJson);
  const footerLinks = parseFooterLinks(config.footerLinksJson);
  const social = parseSocial(config.footerSocialJson);
  const sections = parseSections(config.sectionsConfig).filter(s => s.enabled).sort((a, b) => a.order - b.order);

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: `'${org.themeFont || 'Outfit'}', sans-serif` }}>
      {config.showAnnouncement && config.announcementText && (
        <div className="bg-black text-white text-xs text-center py-2 font-bold tracking-widest uppercase">
          {config.announcementText}
        </div>
      )}
      <nav className="border-b-4 border-black bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <a href="/" className="font-black text-2xl text-black tracking-tighter">{org.name}</a>
          <div className="hidden md:flex gap-6">{navLinks.map(l => <a key={l.label} href={l.url} className="font-bold text-sm hover:text-red-600 uppercase tracking-wide transition-colors">{l.label}</a>)}</div>
          <div className="flex gap-2">
            {isAuthenticated
              ? <button onClick={() => onNavigate('/dashboard')} className="px-5 py-2.5 bg-black text-white font-black text-sm rounded-none">DASHBOARD →</button>
              : <>
                  <button onClick={() => onNavigate('/login')} className="px-4 py-2.5 border-2 border-black font-black text-sm rounded-none hover:bg-black hover:text-white transition-colors">LOGIN</button>
                  <button onClick={() => onNavigate('/register')} className="px-5 py-2.5 font-black text-sm text-white rounded-none" style={{ background: p }}>JOIN FREE →</button>
                </>}
          </div>
        </div>
      </nav>

      {/* Bold hero */}
      <section className="bg-black text-white py-24 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20"
          style={{ background: `repeating-linear-gradient(45deg, ${p} 0px, ${p} 2px, transparent 2px, transparent 20px)` }} />
        <div className="relative max-w-6xl mx-auto px-4">
          <div className="max-w-3xl">
            <div className="inline-block bg-white text-black px-3 py-1 text-xs font-black uppercase tracking-widest mb-6">
              #{stats?.totalCourses ?? 0} Courses Available
            </div>
            <h1 className="text-6xl md:text-8xl font-black leading-none mb-6 uppercase tracking-tighter">
              {(config.heroTitle || org.name).split(' ').map((w, i) => (
                <span key={i}>{i % 3 === 1 ? <span style={{ color: p }}>{w}</span> : w}{' '}</span>
              ))}
            </h1>
            <p className="text-xl text-gray-400 mb-8 max-w-xl">{config.heroSubtitle}</p>
            <div className="flex gap-3">
              {!isAuthenticated && (
                <button onClick={() => onNavigate(config.heroButtonUrl || '/register')}
                  className="px-10 py-4 font-black text-lg uppercase tracking-wider"
                  style={{ background: p }}>
                  {config.heroButtonText || 'START NOW'} →
                </button>
              )}
              <div className="flex bg-gray-900 border border-gray-700 rounded-none">
                <Search className="w-5 h-5 text-gray-500 m-3 self-center" />
                <input className="bg-transparent px-2 py-3 text-sm outline-none text-white placeholder-gray-600 w-48"
                  placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {sections.map(sec => (
        <div key={sec.id}>
          {sec.id === 'stats' && config.showStats && stats && (
            <section className="border-y-4 border-black py-8">
              <div className="max-w-7xl mx-auto px-4 grid grid-cols-4 divide-x-4 divide-black">
                {[
                  { v: stats.totalCourses, l: 'COURSES', e: '📚' },
                  { v: stats.totalStudents, l: 'STUDENTS', e: '🎓' },
                  { v: stats.totalInstructors, l: 'EXPERTS', e: '🏆' },
                  { v: stats.totalEnrollments, l: 'ENROLLED', e: '✅' },
                ].map(({ v, l, e }) => <BoldStatItem key={l} value={v} label={l} emoji={e} />)}
              </div>
            </section>
          )}

          {sec.id === 'categories' && (
            <section className="py-16 bg-gray-50 border-b-4 border-black">
              <div className="max-w-7xl mx-auto px-4">
                <h2 className="text-4xl font-black uppercase tracking-tight mb-8 border-l-8 pl-4" style={{ borderColor: p }}>BROWSE TOPICS</h2>
                <div className="flex flex-wrap gap-3">
                  <button onClick={() => setActiveCategory(null)}
                    className={`px-5 py-2.5 font-black text-sm uppercase border-2 border-black transition-all ${activeCategory === null ? 'text-white' : 'bg-white hover:bg-black hover:text-white'}`}
                    style={activeCategory === null ? { background: p, borderColor: p } : {}}>ALL</button>
                  {categories.map(cat => (
                    <button key={cat.id} onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                      className={`px-5 py-2.5 font-black text-sm uppercase border-2 border-black transition-all ${activeCategory === cat.id ? 'text-white' : 'bg-white hover:bg-black hover:text-white'}`}
                      style={activeCategory === cat.id ? { background: p, borderColor: p } : {}}>
                      {cat.icon} {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}

          {sec.id === 'courses' && (
            <section className="py-16">
              <div className="max-w-7xl mx-auto px-4">
                <h2 className="text-4xl font-black uppercase tracking-tight mb-8 border-l-8 pl-4" style={{ borderColor: p }}>TOP COURSES</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 border-2 border-black">
                  {courses.slice(0, 6).map((c, i) => (
                    <div key={c.id} onClick={() => onCourseClick(c.id)}
                      className={`p-6 cursor-pointer hover:bg-gray-50 transition-colors border-black ${i % 3 !== 2 ? 'border-r-2' : ''} ${i < 3 ? 'border-b-2' : ''}`}>
                      <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: p }}>{c.categoryName}</p>
                      <h3 className="font-black text-lg text-gray-900 leading-tight mb-3">{c.title}</h3>
                      <p className="text-sm text-gray-500 mb-4">{c.instructorName}</p>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />{c.averageRating.toFixed(1)}
                          <Users className="w-3.5 h-3.5 ml-1" />{c.enrollmentCount}
                        </div>
                        <span className="font-black text-base" style={{ color: c.isFree ? '#16a34a' : p }}>
                          {c.isFree ? 'FREE' : `₹${c.price}`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {sec.id === 'cta' && !isAuthenticated && (
            <section className="py-24 bg-black text-white text-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-5"
                style={{ backgroundImage: `repeating-linear-gradient(0deg, ${p} 0px, ${p} 2px, transparent 2px, transparent 40px)` }} />
              <div className="relative max-w-2xl mx-auto px-4">
                <h2 className="text-5xl font-black uppercase tracking-tight mb-4">START TODAY.</h2>
                <p className="text-gray-400 text-xl mb-8">No excuses. Just learning.</p>
                <button onClick={() => onNavigate('/register')}
                  className="px-12 py-5 font-black text-xl uppercase tracking-wider"
                  style={{ background: p }}>JOIN FOR FREE →</button>
              </div>
            </section>
          )}
        </div>
      ))}

      <footer className="bg-black text-gray-400 border-t-4 py-12" style={{ borderColor: p }}>
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between gap-6">
          <div>
            <p className="font-black text-white text-2xl uppercase tracking-tighter">{org.name}</p>
            <p className="text-sm mt-1 text-gray-500">{config.footerTagline}</p>
          </div>
          <div className="flex items-center gap-6">
            {footerLinks.map(l => <a key={l.label} href={l.url} className="text-sm font-bold uppercase hover:text-white transition-colors">{l.label}</a>)}
          </div>
        </div>
        <p className="text-center text-xs text-gray-700 mt-8">{config.footerCopyright}</p>
      </footer>
    </div>
  );
}

// TemplateMinimal - whitespace-heavy, elegant typography
export function TemplateMinimal({ config, org, stats, categories, courses, instructors,
  onCourseClick, onNavigate, isAuthenticated, activeCategory, setActiveCategory, search, setSearch }: TemplateProps) {
  const p = org.primaryColor || '#2563eb';
  const navLinks = parseNavLinks(config.navLinksJson);
  const footerLinks = parseFooterLinks(config.footerLinksJson);
  const sections = parseSections(config.sectionsConfig).filter(s => s.enabled).sort((a, b) => a.order - b.order);

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: `'${org.themeFont || 'DM Sans'}', sans-serif` }}>
      <nav className="max-w-6xl mx-auto px-8 h-20 flex items-center justify-between">
        <a href="/" className="font-semibold text-gray-900 text-lg">{org.name}</a>
        <div className="flex items-center gap-8">
          {navLinks.map(l => <a key={l.label} href={l.url} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">{l.label}</a>)}
          <div className="w-px h-4 bg-gray-200" />
          {isAuthenticated
            ? <button onClick={() => onNavigate('/dashboard')} className="text-sm font-semibold" style={{ color: p }}>Dashboard →</button>
            : <>
                <button onClick={() => onNavigate('/login')} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Login</button>
                <button onClick={() => onNavigate('/register')}
                  className="text-sm font-semibold px-5 py-2.5 rounded-full text-white" style={{ background: p }}>Get started</button>
              </>}
        </div>
      </nav>

      <section className="max-w-4xl mx-auto px-8 pt-24 pb-32 text-center">
        <p className="text-sm text-gray-400 uppercase tracking-widest mb-6">{org.name}</p>
        <h1 className="text-6xl md:text-7xl font-light text-gray-900 leading-[1.1] mb-8 tracking-tight">
          {config.heroTitle || `Learn ${org.name}`}
        </h1>
        <p className="text-xl text-gray-400 mb-12 max-w-lg mx-auto leading-relaxed">{config.heroSubtitle}</p>
        <div className="flex items-center justify-center gap-4">
          {!isAuthenticated && (
            <button onClick={() => onNavigate(config.heroButtonUrl || '/register')}
              className="px-8 py-3.5 rounded-full text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: p }}>{config.heroButtonText || 'Get started'}</button>
          )}
          <div className="flex items-center gap-2 text-sm text-gray-400 bg-gray-50 rounded-full px-4 py-3">
            <Search className="w-4 h-4" />
            <input className="bg-transparent outline-none w-40 placeholder-gray-400 text-sm"
              placeholder="Search courses…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </section>

      {sections.map(sec => (
        <div key={sec.id}>
          {sec.id === 'stats' && config.showStats && stats && (
            <section className="py-12 border-y border-gray-100">
              <div className="max-w-4xl mx-auto px-8 grid grid-cols-4 gap-8 text-center">
                {[
                  { v: stats.totalCourses, l: 'Courses' },
                  { v: stats.totalStudents, l: 'Students' },
                  { v: stats.totalInstructors, l: 'Instructors' },
                  { v: stats.totalEnrollments, l: 'Enrollments' },
                ].map(({ v, l }) => <MinimalStatItem key={l} value={v} label={l} />)}
              </div>
            </section>
          )}

          {sec.id === 'categories' && (
            <section className="py-24 bg-gray-50">
              <div className="max-w-6xl mx-auto px-8">
                <p className="text-xs text-gray-400 uppercase tracking-widest mb-3">Topics</p>
                <h2 className="text-4xl font-light text-gray-900 mb-12">What do you want to learn?</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-gray-200">
                  {categories.map(cat => (
                    <button key={cat.id} onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                      className={`bg-white p-8 text-left hover:bg-gray-50 transition-colors ${activeCategory === cat.id ? 'ring-2 ring-inset' : ''}`}
                      style={activeCategory === cat.id ? { outline: `2px solid ${p}`, outlineOffset: '2px' } : {}}>
                      <div className="text-3xl mb-3">{cat.icon || '📁'}</div>
                      <p className="font-semibold text-sm text-gray-900">{cat.name}</p>
                      <p className="text-xs text-gray-400 mt-1">{cat.courseCount} courses</p>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}

          {sec.id === 'courses' && (
            <section className="py-24">
              <div className="max-w-6xl mx-auto px-8">
                <h2 className="text-4xl font-light text-gray-900 mb-12">Popular courses</h2>
                <div className="space-y-px bg-gray-100">
                  {courses.slice(0, 6).map(c => (
                    <div key={c.id} onClick={() => onCourseClick(c.id)}
                      className="bg-white p-6 flex items-center gap-6 cursor-pointer hover:bg-gray-50 transition-colors">
                      <div className="w-16 h-16 rounded-xl flex-shrink-0 overflow-hidden bg-gray-100"
                        style={{ background: `${p}15` }}>
                        {c.thumbnailUrl && <img src={c.thumbnailUrl} className="w-full h-full object-cover" alt="" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-400 mb-0.5">{c.categoryName}</p>
                        <h3 className="font-semibold text-gray-900 truncate">{c.title}</h3>
                        <p className="text-sm text-gray-400">{c.instructorName}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-semibold" style={{ color: c.isFree ? '#16a34a' : p }}>
                          {c.isFree ? 'Free' : `₹${c.price}`}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{c.enrollmentCount} enrolled</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {sec.id === 'cta' && !isAuthenticated && (
            <section className="py-32 text-center bg-gray-50">
              <div className="max-w-xl mx-auto px-8">
                <h2 className="text-5xl font-light text-gray-900 mb-6">Begin your journey.</h2>
                <p className="text-gray-400 mb-10 text-lg">Join {stats?.totalStudents?.toLocaleString()} learners worldwide.</p>
                <button onClick={() => onNavigate('/register')}
                  className="px-10 py-4 rounded-full font-semibold text-white transition-all hover:opacity-90"
                  style={{ background: p }}>Create free account</button>
              </div>
            </section>
          )}
        </div>
      ))}

      <footer className="py-16 border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-8 flex flex-col md:flex-row justify-between items-start gap-6">
          <div>
            <p className="font-semibold text-gray-900">{org.name}</p>
            <p className="text-sm text-gray-400 mt-1">{config.footerTagline}</p>
          </div>
          <div className="flex gap-8">
            {footerLinks.map(l => <a key={l.label} href={l.url} className="text-sm text-gray-400 hover:text-gray-900 transition-colors">{l.label}</a>)}
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-8 mt-8 pt-8 border-t border-gray-100">
          <p className="text-xs text-gray-300">{config.footerCopyright}</p>
        </div>
      </footer>
    </div>
  );
}

// TemplateDark - premium dark, glass effects
export function TemplateDark({ config, org, stats, categories, courses, instructors,
  onCourseClick, onNavigate, isAuthenticated, activeCategory, setActiveCategory, search, setSearch }: TemplateProps) {
  const p = org.primaryColor || '#6366f1';
  const navLinks = parseNavLinks(config.navLinksJson);
  const footerLinks = parseFooterLinks(config.footerLinksJson);
  const social = parseSocial(config.footerSocialJson);
  const sections = parseSections(config.sectionsConfig).filter(s => s.enabled).sort((a, b) => a.order - b.order);

  return (
    <div className="min-h-screen bg-gray-950 text-white" style={{ fontFamily: `'${org.themeFont || 'Space Grotesk'}', sans-serif` }}>
      {config.showAnnouncement && config.announcementText && (
        <div className="text-center py-2 text-xs font-medium text-gray-300 border-b border-gray-800"
          style={{ background: `${p}20` }}>{config.announcementText}</div>
      )}
      <nav className="sticky top-0 z-50 bg-gray-950/90 backdrop-blur border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <a href="/" className="font-black text-xl"
            style={{ background: `linear-gradient(135deg, ${p}, ${org.secondaryColor || '#8b5cf6'})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {org.name}
          </a>
          <div className="hidden md:flex gap-6">{navLinks.map(l => <a key={l.label} href={l.url} className="text-sm text-gray-400 hover:text-white transition-colors">{l.label}</a>)}</div>
          <div className="flex gap-3">
            {isAuthenticated
              ? <button onClick={() => onNavigate('/dashboard')} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white"
                  style={{ background: `linear-gradient(135deg, ${p}, ${org.secondaryColor || '#8b5cf6'})` }}>Dashboard</button>
              : <>
                  <button onClick={() => onNavigate('/login')} className="px-4 py-2.5 text-sm text-gray-400 hover:text-white border border-gray-700 rounded-xl hover:border-gray-500 transition-colors">Login</button>
                  <button onClick={() => onNavigate('/register')}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold text-white"
                    style={{ background: `linear-gradient(135deg, ${p}, ${org.secondaryColor || '#8b5cf6'})` }}>Get Started</button>
                </>}
          </div>
        </div>
      </nav>

      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 50% 50%, ${p}25 0%, transparent 70%)` }} />
          <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full blur-3xl opacity-20" style={{ background: p }} />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-3xl opacity-15" style={{ background: org.secondaryColor || '#8b5cf6' }} />
        </div>
        <div className="relative text-center max-w-4xl px-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold mb-8 border"
            style={{ borderColor: `${p}50`, background: `${p}15`, color: p }}>
            ✨ {stats?.totalCourses ?? 0} Premium Courses
          </div>
          <h1 className="text-6xl md:text-7xl font-black leading-tight mb-6 tracking-tight">
            {config.heroTitle?.split(' ').map((w, i) => (
              <span key={i} style={i % 4 === 2 ? { background: `linear-gradient(135deg, ${p}, ${org.secondaryColor || '#8b5cf6'})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } : {}}>
                {w}{' '}
              </span>
            ))}
          </h1>
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">{config.heroSubtitle}</p>
          <div className="flex gap-4 justify-center">
            {!isAuthenticated && (
              <button onClick={() => onNavigate(config.heroButtonUrl || '/register')}
                className="px-8 py-4 rounded-2xl font-bold text-base hover:scale-105 transition-transform shadow-2xl"
                style={{ background: `linear-gradient(135deg, ${p}, ${org.secondaryColor || '#8b5cf6'})` }}>
                {config.heroButtonText || 'Start Learning'} →
              </button>
            )}
            <div className="flex items-center gap-2 bg-gray-900/80 border border-gray-700 rounded-2xl px-4 py-4 backdrop-blur">
              <Search className="w-4 h-4 text-gray-500" />
              <input className="bg-transparent outline-none text-sm text-white placeholder-gray-600 w-44"
                placeholder="Search courses…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </div>
      </section>

      {sections.map(sec => (
        <div key={sec.id}>
          {sec.id === 'stats' && config.showStats && stats && (
            <section className="py-16 border-y border-gray-800">
              <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  { v: stats.totalCourses, l: 'Courses', e: '📚' },
                  { v: stats.totalStudents, l: 'Students', e: '🎓' },
                  { v: stats.totalInstructors, l: 'Instructors', e: '👨‍💼' },
                  { v: stats.totalEnrollments, l: 'Enrollments', e: '🏆' },
                ].map(({ v, l, e }) => <DarkStatItem key={l} value={v} label={l} emoji={e} primaryColor={p} />)}
              </div>
            </section>
          )}

          {sec.id === 'categories' && (
            <section className="py-16">
              <div className="max-w-7xl mx-auto px-4">
                <h2 className="text-3xl font-black mb-8">Browse Topics</h2>
                <div className="flex flex-wrap gap-3">
                  <button onClick={() => setActiveCategory(null)}
                    className={`px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all ${activeCategory === null ? 'border-transparent text-white' : 'border-gray-700 text-gray-400 hover:border-gray-500'}`}
                    style={activeCategory === null ? { background: p } : {}}>All Courses</button>
                  {categories.map(cat => (
                    <button key={cat.id} onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                      className={`px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all ${activeCategory === cat.id ? 'border-transparent text-white' : 'border-gray-700 text-gray-400 hover:border-gray-500'}`}
                      style={activeCategory === cat.id ? { background: p } : {}}>
                      {cat.icon} {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}

          {sec.id === 'courses' && (
            <section className="py-16">
              <div className="max-w-7xl mx-auto px-4">
                <h2 className="text-3xl font-black mb-8">Popular Courses</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {courses.slice(0, 8).map(c => (
                    <div key={c.id} onClick={() => onCourseClick(c.id)}
                      className="bg-gray-900/80 border border-gray-800 rounded-2xl overflow-hidden cursor-pointer hover:border-gray-600 hover:-translate-y-1 transition-all group">
                      <div className="h-40 relative overflow-hidden" style={{ background: `${p}20` }}>
                        {c.thumbnailUrl && <img src={c.thumbnailUrl} alt={c.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity group-hover:scale-105" />}
                      </div>
                      <div className="p-4">
                        <p className="text-xs font-medium mb-1" style={{ color: p }}>{c.categoryName}</p>
                        <h3 className="font-bold text-sm text-white line-clamp-2 mb-2">{c.title}</h3>
                        <p className="text-xs text-gray-500 mb-3">{c.instructorName}</p>
                        <div className="flex justify-between items-center border-t border-gray-800 pt-3">
                          <span className="text-xs text-gray-500">{c.enrollmentCount} students</span>
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

          {sec.id === 'cta' && !isAuthenticated && (
            <section className="py-24 relative overflow-hidden">
              <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at center, ${p}20, transparent 70%)` }} />
              <div className="relative max-w-2xl mx-auto px-4 text-center">
                <h2 className="text-5xl font-black mb-6">Start Learning Today</h2>
                <p className="text-gray-400 text-lg mb-10">Join the community. Access all courses.</p>
                <button onClick={() => onNavigate('/register')}
                  className="px-12 py-5 rounded-2xl font-black text-xl hover:scale-105 transition-transform shadow-2xl"
                  style={{ background: `linear-gradient(135deg, ${p}, ${org.secondaryColor || '#8b5cf6'})` }}>
                  Create Free Account
                </button>
              </div>
            </section>
          )}
        </div>
      ))}

      <footer className="py-12 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between gap-6 mb-8">
            <div>
              <p className="font-black text-lg"
                style={{ background: `linear-gradient(135deg, ${p}, ${org.secondaryColor || '#8b5cf6'})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {org.name}
              </p>
              <p className="text-sm text-gray-500 mt-1">{config.footerTagline}</p>
              <div className="flex gap-3 mt-3">
                {social.map(s => <a key={s.platform} href={s.url} className="text-gray-500 hover:text-white text-lg">{SOCIAL_ICONS[s.platform] || '🔗'}</a>)}
              </div>
            </div>
            <div className="flex gap-6 flex-wrap">
              {footerLinks.map(l => <a key={l.label} href={l.url} className="text-sm text-gray-500 hover:text-white transition-colors">{l.label}</a>)}
            </div>
          </div>
          <p className="text-xs text-gray-700 border-t border-gray-800 pt-6">{config.footerCopyright}</p>
        </div>
      </footer>
    </div>
  );
}
