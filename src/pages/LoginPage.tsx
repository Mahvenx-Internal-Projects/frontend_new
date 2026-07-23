import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2, ArrowLeft, GraduationCap } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../services/api';
import { useAuthStore } from '../store/authStore';

import { useOrgStore } from '../store/orgStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth, isAuthenticated, _hydrated, user } = useAuthStore();
  const { org } = useOrgStore();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
const [forgotStep, setForgotStep] = useState(1);

const [email, setEmail] = useState("");
const [otp, setOtp] = useState("");
const [newPassword, setNewPassword] = useState("");
const [confirmPassword, setConfirmPassword] = useState("");
const [otpError, setOtpError] = useState("");
const [showNewPassword, setShowNewPassword] = useState(false);
const [showConfirmPassword, setShowConfirmPassword] = useState(false);

const [forgotLoading, setForgotLoading] = useState(false);
const handleForgotPassword = async () => {
  if (!email) {
    toast.error("Please enter your email.");
    return;
  }

  setForgotLoading(true);

  try {
    await authApi.forgotPassword(email);

    toast.success("OTP sent successfully.");

    setForgotStep(2);
  } catch (err: any) {
    toast.error(
      err.response?.data?.message ?? "Failed to send OTP."
    );
  } finally {
    setForgotLoading(false);
  }
};
const handleVerifyOtp = async () => {

    if (!otp) {
        toast.error("Please enter OTP");
        return;
    }

    setForgotLoading(true);

   try {

  await authApi.verifyOtp(email, otp);

  setOtpError("");

  toast.success("OTP verified successfully.");

  setForgotStep(3);

} catch (err: any) {

  const message =
    err.response?.data?.message ?? "Invalid OTP";

  setOtpError(message);

    } finally {

        setForgotLoading(false);

    }

};
const handleResetPassword = async () => {

  if (!newPassword || !confirmPassword) {
    toast.error("Please enter password.");
    return;
  }

  if (newPassword !== confirmPassword) {
    toast.error("Passwords do not match.");
    return;
  }

  setForgotLoading(true);

  try {

    await authApi.resetPassword(
      email,
      otp,
      newPassword
    );

    toast.success("Password reset successfully.");

    setShowForgotModal(false);

    setForgotStep(1);

    setEmail("");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");

  } catch (err: any) {

    toast.error(
      err.response?.data?.message ??
      "Password reset failed."
    );

  } finally {

    setForgotLoading(false);

  }

};

  const p = org?.primaryColor || '#6366f1';
  const s = org?.secondaryColor || '#8b5cf6';

  // ✅ Wait for zustand to finish reading localStorage before redirecting
  useEffect(() => {
    if (_hydrated && isAuthenticated) {
      navigate(user?.role === 'Student' ? '/dashboard/student' : '/dashboard/admin', { replace: true });
    }
  }, [_hydrated, isAuthenticated]);

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

  // ✅ While hydrating and token exists — show loading, don't render login form
  if (!_hydrated && localStorage.getItem('lms_token')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[var(--org-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-3"/>
          <p className="text-sm text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-indigo-50 p-4"
      style={{ fontFamily: `'${org?.themeFont || 'Inter'}', sans-serif` }}>
      <div className="w-full max-w-md">
        <button onClick={() => navigate('/')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to {org?.name ?? 'Home'}
        </button>

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

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <form onSubmit={handle} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Email Address</label>
              <input
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:border-transparent bg-gray-50 placeholder-gray-400 transition-all"
                type="email" placeholder="you@example.com" required autoFocus
                value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Password</label>
              <div className="relative">
                <input
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:border-transparent bg-gray-50 pr-12 placeholder-gray-400 transition-all"
                  type={showPw ? 'text' : 'password'} placeholder="••••••••" required
                  value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

           <div className="flex justify-end">
 <button
    type="button"
    onClick={() => {
        setShowForgotModal(true);
        setForgotStep(1);
    }}
>
    Forgot Password?
</button>
</div>

<button
  type="submit"
  disabled={loading}
  className="w-full py-3.5 rounded-xl font-bold text-white text-sm shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
  style={{ background: `linear-gradient(135deg, ${p}, ${s})` }}
>
  {loading ? (
    <>
      <Loader2 className="w-4 h-4 animate-spin" />
      Signing in…
    </>
  ) : (
    "Sign In"
  )}
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
      {showForgotModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
    <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-gray-100 p-8 relative">

      {/* Close Button */}
      <button
        onClick={() => {
          setShowForgotModal(false);
          setForgotStep(1);
          setEmail("");
        }}
        className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 text-xl transition"
      >
        ✕
      </button>

      {/* STEP 1 */}
      {forgotStep === 1 && (
        <>
          <div className="text-center mb-7">

            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg"
              style={{
                background: `linear-gradient(135deg, ${p}, ${s})`,
              }}
            >
              <GraduationCap className="w-8 h-8 text-white" />
            </div>

            <h2 className="text-3xl font-bold text-gray-900">
              Forgot Password
            </h2>

            <p className="text-gray-500 text-sm mt-2">
              Enter your registered email address.
              <br />
              We'll send you a One Time Password (OTP).
            </p>

          </div>

          <div className="space-y-5">

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                Email Address
              </label>

              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm
                placeholder-gray-400
                focus:outline-none
                focus:ring-2
                focus:ring-indigo-500
                focus:border-transparent
                transition-all"
              />
            </div>

            <div className="flex gap-3 pt-2">

              <button
                type="button"
                onClick={() => {
                  setShowForgotModal(false);
                  setEmail("");
                }}
                className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-100 transition"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={forgotLoading}
                className="flex-1 py-3 rounded-xl text-white font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-60"
                style={{
                  background: `linear-gradient(135deg, ${p}, ${s})`,
                }}
              >
                {forgotLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  "Send OTP"
                )}
              </button>

            </div>

          </div>
        </>
      )}

      {/* STEP 2 */}
     {forgotStep === 2 && (
  <>
    <div className="text-center mb-7">

      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg"
        style={{
          background: `linear-gradient(135deg, ${p}, ${s})`,
        }}
      >
        📩
      </div>

      <h2 className="text-3xl font-bold text-gray-900">
        Verify OTP
      </h2>

      <p className="text-gray-500 text-sm mt-2">
        We've sent a 6-digit OTP to
      </p>

      <p className="font-semibold text-gray-700 mt-1">
        {email}
      </p>

    </div>

    <div className="space-y-5">

      <div>

        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
          Enter OTP
        </label>

        <input
          type="text"
          maxLength={6}
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          placeholder="Enter 6-digit OTP"
          className="w-full text-center tracking-[8px] text-xl font-bold
          px-4 py-3 rounded-xl border border-gray-200 bg-gray-50
          focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {otpError && (
  <p className="mt-2 text-sm text-red-600 font-medium">
    {otpError}
  </p>
)}

      </div>

      <div className="flex justify-between items-center">

        <button
          type="button"
          onClick={() => setForgotStep(1)}
          className="text-sm text-gray-500 hover:text-gray-800"
        >
          ← Back
        </button>

        <button
          type="button"
          className="text-sm font-medium"
          style={{ color: p }}
        >
          Resend OTP
        </button>

      </div>

      <button
        type="button"
        onClick={handleVerifyOtp}
        disabled={forgotLoading}
        className="w-full py-3 rounded-xl text-white font-bold shadow-lg"
        style={{
          background: `linear-gradient(135deg, ${p}, ${s})`,
        }}
      >
        Verify OTP
      </button>

    </div>
  </>
)}

      {/* STEP 3 */}
     {forgotStep === 3 && (
  <>
    <div className="text-center mb-7">

      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg"
        style={{
          background: `linear-gradient(135deg, ${p}, ${s})`,
        }}
      >
        🔒
      </div>

      <h2 className="text-3xl font-bold text-gray-900">
        Reset Password
      </h2>

      <p className="text-gray-500 text-sm mt-2">
        Create a new password for your account.
      </p>

    </div>

    <div className="space-y-5">

      <div>
        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
          New Password
        </label>

       <div className="relative">

  <input
    type={showNewPassword ? "text" : "password"}
    placeholder="Enter new password"
    value={newPassword}
    onChange={(e) => setNewPassword(e.target.value)}
    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 pr-12"
  />

  <button
    type="button"
    onClick={() => setShowNewPassword(!showNewPassword)}
    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
  >
    {showNewPassword ? (
      <EyeOff className="w-5 h-5" />
    ) : (
      <Eye className="w-5 h-5" />
    )}
  </button>

</div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
          Confirm Password
        </label>

       <div className="relative">

  <input
    type={showConfirmPassword ? "text" : "password"}
    placeholder="Confirm password"
    value={confirmPassword}
    onChange={(e) => setConfirmPassword(e.target.value)}
    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 pr-12"
  />

  <button
    type="button"
    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
  >
    {showConfirmPassword ? (
      <EyeOff className="w-5 h-5" />
    ) : (
      <Eye className="w-5 h-5" />
    )}
  </button>

</div>
      </div>

      <div className="flex justify-between">

        <button
          type="button"
          onClick={() => setForgotStep(2)}
          className="text-sm text-gray-500 hover:text-gray-800"
        >
          ← Back
        </button>

      </div>

      <button
        type="button"
        onClick={handleResetPassword}
        disabled={forgotLoading}
        className="w-full py-3 rounded-xl text-white font-bold shadow-lg"
        style={{
          background: `linear-gradient(135deg, ${p}, ${s})`,
        }}
      >
        {forgotLoading ? (
          <Loader2 className="w-5 h-5 animate-spin mx-auto" />
        ) : (
          "Reset Password"
        )}
      </button>

    </div>
  </>
)}

    </div>
  </div>
)}
    </div>

  );
}
