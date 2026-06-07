import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2, ArrowLeft, GraduationCap } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useOrgStore } from '../store/orgStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth, isAuthenticated, user } = useAuthStore();
  const { org } = useOrgStore();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const p = org?.primaryColor || '#f97316';
  const s = org?.secondaryColor || '#ea580c';

  useEffect(() => {
    if (isAuthenticated) navigate(user?.role === 'Student' ? '/dashboard/student' : '/dashboard/admin', { replace: true });
  }, [isAuthenticated]);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await authApi.login(form.email, form.password);
      setAuth(data.user, data.token);
      toast.success(`Welcome back, ${data.user.firstName}!`);
      navigate(data.user.role === 'Student' ? '/dashboard/student' : '/dashboard/admin', { replace: true });
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Invalid email or password');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-orange-50 p-4"
      style={{ fontFamily: `'${org?.themeFont || 'Poppins'}', sans-serif` }}>
      <div className="w-full max-w-md">
        {/* Back to home */}
        <button onClick={() => navigate('/')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to {org?.name ?? 'Home'}
        </button>

        {/* Logo + brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl shadow-xl mb-4"
            style={{ background: `linear-gradient(135deg, ${p}, ${s})` }}>
            {org?.logoUrl
              ? <img src={org.logoUrl} alt={org.name} className="w-10 h-10 object-contain" />
              : <GraduationCap className="w-9 h-9 text-white" />}
          </div>
          <h1 className="text-3xl font-black text-gray-900">{org?.name ?? 'LMS Portal'}</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to your account</p>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <form onSubmit={handle} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Email Address</label>
              <input
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:border-transparent bg-gray-50 placeholder-gray-400 transition-all"
                style={{ '--tw-ring-color': p } as any}
                type="email" placeholder="you@example.com" required
                value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Password</label>
              <div className="relative">
                <input
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:border-transparent bg-gray-50 pr-12 placeholder-gray-400 transition-all"
                  style={{ '--tw-ring-color': p } as any}
                  type={showPw ? 'text' : 'password'} placeholder="••••••••" required
                  value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold text-white text-sm shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: `linear-gradient(135deg, ${p}, ${s})` }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold hover:opacity-80 transition-opacity" style={{ color: p }}>
              Register free
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          © {new Date().getFullYear()} {org?.name ?? 'LMS Portal'}
        </p>
      </div>
    </div>
  );
}
