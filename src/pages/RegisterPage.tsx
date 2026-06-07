import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useOrgStore } from '../store/orgStore';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const { org } = useOrgStore();
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '',
    organizationId: String(org?.id ?? '')
  });
  const [loading, setLoading] = useState(false);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.organizationId) { toast.error('Organization not detected'); return; }
    setLoading(true);
    try {
      const { data } = await authApi.register({ ...form, organizationId: Number(form.organizationId) });
      setAuth(data.user, data.token);
      navigate('/dashboard/student', { replace: true });
      toast.success(`Welcome to ${org?.name ?? 'the portal'}, ${data.user.firstName}!`);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex" style={{ fontFamily: 'var(--org-font, Poppins, sans-serif)' }}>
      {/* Left panel - brand */}
      <div className="hidden lg:flex lg:w-2/5 xl:w-1/2 relative flex-col justify-between p-12 overflow-hidden"
        style={{ background: `linear-gradient(145deg, var(--org-primary), var(--org-secondary))` }}>
        {/* Pattern */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-black/10 blur-2xl" />

        <div className="relative">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-white/70 hover:text-white text-sm font-medium transition-colors mb-12">
            <ArrowLeft className="w-4 h-4" /> Back to {org?.name ?? 'Home'}
          </button>
          {org?.logoUrl ? (
            <img src={org.logoUrl} alt={org.name} className="h-12 mb-4" />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-white font-black text-2xl mb-4 shadow-xl">
              {org?.name?.charAt(0) ?? 'L'}
            </div>
          )}
          <h1 className="text-3xl font-black text-white leading-tight">{org?.name ?? 'Learning Portal'}</h1>
          <p className="text-white/70 mt-2 text-sm">{org?.tagline ?? 'Start your learning journey today'}</p>
        </div>

        <div className="relative space-y-4">
          {[
            { emoji: '🎓', title: 'Expert-led courses', desc: 'Learn from industry professionals' },
            { emoji: '🏆', title: 'Earn certificates',  desc: 'Recognized credentials on completion' },
            { emoji: '🚀', title: 'Learn at your pace', desc: 'Access courses anytime, anywhere' },
          ].map(item => (
            <div key={item.title} className="flex items-start gap-3 bg-white/10 rounded-xl p-3.5 backdrop-blur-sm">
              <span className="text-xl flex-shrink-0">{item.emoji}</span>
              <div>
                <p className="text-white font-semibold text-sm">{item.title}</p>
                <p className="text-white/60 text-xs mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="relative text-white/40 text-xs">
          © {new Date().getFullYear()} {org?.name}. All rights reserved.
        </p>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile back */}
          <button onClick={() => navigate('/')} className="lg:hidden flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm font-medium mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to {org?.name ?? 'Home'}
          </button>

          <div className="mb-8">
            <h2 className="text-3xl font-black text-gray-900">Create account</h2>
            <p className="text-gray-500 mt-2 text-sm">
              Joining <span className="font-semibold" style={{ color: 'var(--org-primary)' }}>{org?.name ?? 'the portal'}</span> as a student
            </p>
          </div>

          <form onSubmit={handle} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">First name</label>
                <input className="w-full px-3.5 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--org-primary)] focus:border-transparent bg-white transition placeholder-gray-300"
                  placeholder="John" required value={form.firstName}
                  onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">Last name</label>
                <input className="w-full px-3.5 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--org-primary)] focus:border-transparent bg-white transition placeholder-gray-300"
                  placeholder="Doe" required value={form.lastName}
                  onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">Email address</label>
              <input className="w-full px-3.5 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--org-primary)] focus:border-transparent bg-white transition placeholder-gray-300"
                type="email" placeholder="you@example.com" required value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">Password</label>
              <div className="relative">
                <input className="w-full px-3.5 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--org-primary)] focus:border-transparent bg-white transition pr-11 placeholder-gray-300"
                  type={showPw ? 'text' : 'password'} placeholder="Min. 8 characters" required value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Hidden org field — auto-filled from detected org */}
            {org && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 text-sm text-green-700">
                <span className="text-green-500">✓</span>
                Registering under <strong>{org.name}</strong>
              </div>
            )}

            <button type="submit" disabled={loading || !form.organizationId}
              className="w-full py-3.5 rounded-xl font-bold text-white text-sm shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: `linear-gradient(135deg, var(--org-primary), var(--org-secondary))` }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create My Account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold hover:opacity-80 transition-opacity" style={{ color: 'var(--org-primary)' }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
