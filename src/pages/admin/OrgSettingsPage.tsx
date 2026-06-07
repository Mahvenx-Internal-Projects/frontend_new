import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Palette, Globe, Link2, Type, Eye, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { orgsApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useOrgStore } from '../../store/orgStore';
import clsx from 'clsx';

const PRESET_THEMES = [
  { name: 'Saffron India', primary: '#f97316', secondary: '#ea580c', accent: '#fbbf24', font: 'Plus Jakarta Sans', mode: 'light' },
  { name: 'Ocean Blue',    primary: '#2563eb', secondary: '#1d4ed8', accent: '#06b6d4', font: 'DM Sans',           mode: 'light' },
  { name: 'Forest Green',  primary: '#16a34a', secondary: '#15803d', accent: '#84cc16', font: 'Nunito',            mode: 'light' },
  { name: 'Royal Purple',  primary: '#7c3aed', secondary: '#6d28d9', accent: '#a855f7', font: 'Outfit',            mode: 'light' },
  { name: 'Crimson',       primary: '#dc2626', secondary: '#b91c1c', accent: '#f59e0b', font: 'Poppins',           mode: 'light' },
  { name: 'Midnight Dark', primary: '#6366f1', secondary: '#4f46e5', accent: '#f59e0b', font: 'Space Grotesk',     mode: 'dark' },
  { name: 'Rose Gold',     primary: '#e11d48', secondary: '#be123c', accent: '#fb923c', font: 'Cormorant Garamond', mode: 'light' },
  { name: 'Teal Modern',   primary: '#0d9488', secondary: '#0f766e', accent: '#f59e0b', font: 'Albert Sans',       mode: 'light' },
];

const FONTS = ['Plus Jakarta Sans', 'Poppins', 'DM Sans', 'Nunito', 'Outfit', 'Space Grotesk', 'Albert Sans', 'Cormorant Garamond', 'Playfair Display', 'Inter'];

export default function OrgSettingsPage() {
  const { user } = useAuthStore();
  const { org, setOrg } = useOrgStore();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'theme' | 'general' | 'payment'>('theme');
  const [previewTheme, setPreviewTheme] = useState<typeof PRESET_THEMES[0] | null>(null);

  const { data: orgData } = useQuery({
    queryKey: ['org-detail', user?.organizationId],
    queryFn: () => orgsApi.get(user!.organizationId).then(r => r.data),
    enabled: !!user?.organizationId,
  });

  const [form, setForm] = useState({
    name: '', tagline: '', website: '', portalUrl: '',
    primaryColor: '#f97316', secondaryColor: '#ea580c', accentColor: '#fbbf24',
    themeFont: 'Plus Jakarta Sans', themeMode: 'light',
    logoUrl: '', bannerUrl: '',
    razorpayKeyId: '', razorpayKeySecret: '', currency: 'INR',
  });

  useEffect(() => {
    if (orgData) {
      setForm({
        name:           orgData.name || '',
        tagline:        orgData.tagline || '',
        website:        orgData.website || '',
        portalUrl:      orgData.portalUrl || '',
        primaryColor:   orgData.primaryColor || '#f97316',
        secondaryColor: orgData.secondaryColor || '#ea580c',
        accentColor:    orgData.accentColor || '#fbbf24',
        themeFont:      orgData.themeFont || 'Plus Jakarta Sans',
        themeMode:      orgData.themeMode || 'light',
        logoUrl:        orgData.logoUrl || '',
        bannerUrl:      orgData.bannerUrl || '',
        razorpayKeyId:  orgData.razorpayKeyId || '',
        razorpayKeySecret: orgData.razorpayKeySecret || '',
        currency:       orgData.currency || 'INR',
      });
    }
  }, [orgData]);

  const current = previewTheme || { primary: form.primaryColor, secondary: form.secondaryColor, accent: form.accentColor, font: form.themeFont };

  const saveMut = useMutation({
    mutationFn: () => orgsApi.update(user!.organizationId, {
      name: form.name, tagline: form.tagline, website: form.website, portalUrl: form.portalUrl,
      primaryColor: form.primaryColor, secondaryColor: form.secondaryColor, accentColor: form.accentColor,
      themeFont: form.themeFont, logoUrl: form.logoUrl, bannerUrl: form.bannerUrl,
      razorpayKeyId: form.razorpayKeyId,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-detail'] });
      // Update global org theme
      if (org) {
        setOrg({ ...org, primaryColor: form.primaryColor, secondaryColor: form.secondaryColor, accentColor: form.accentColor, themeFont: form.themeFont, name: form.name, tagline: form.tagline });
      }
      toast.success('Organization settings saved!');
      setPreviewTheme(null);
    },
    onError: () => toast.error('Failed to save'),
  });

  const applyPreset = (preset: typeof PRESET_THEMES[0]) => {
    setPreviewTheme(preset);
    setForm(f => ({
      ...f,
      primaryColor: preset.primary,
      secondaryColor: preset.secondary,
      accentColor: preset.accent,
      themeFont: preset.font,
      themeMode: preset.mode,
    }));
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organization Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Customize your portal's look, feel and payment options</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
          <Save className="w-4 h-4" /> {saveMut.isPending ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-1">
        {([['theme','🎨 Theme & Branding'], ['general','⚙️ General'], ['payment','💳 Payment']] as const).map(([t, label]) => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={clsx('px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
              activeTab === t ? 'border-[var(--org-primary)] text-[var(--org-primary)]' : 'border-transparent text-gray-500 hover:text-gray-800')}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'theme' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: settings */}
          <div className="lg:col-span-2 space-y-6">
            {/* Preset themes */}
            <div className="card p-5">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Palette className="w-4 h-4" /> Quick Theme Presets</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {PRESET_THEMES.map(preset => {
                  const isActive = form.primaryColor === preset.primary && form.themeFont === preset.font;
                  return (
                    <button key={preset.name} onClick={() => applyPreset(preset)}
                      className={clsx('relative rounded-xl p-3 border-2 transition-all text-left hover:shadow-md',
                        isActive ? 'border-gray-900 shadow-lg' : 'border-gray-200 hover:border-gray-400')}>
                      {/* Color swatches */}
                      <div className="flex gap-1 mb-2">
                        <div className="w-5 h-5 rounded-full shadow-sm" style={{ background: preset.primary }} />
                        <div className="w-5 h-5 rounded-full shadow-sm" style={{ background: preset.secondary }} />
                        <div className="w-5 h-5 rounded-full shadow-sm" style={{ background: preset.accent }} />
                        {preset.mode === 'dark' && <span className="ml-auto text-xs">🌙</span>}
                      </div>
                      <p className="text-xs font-semibold text-gray-700">{preset.name}</p>
                      <p className="text-xs text-gray-400">{preset.font}</p>
                      {isActive && (
                        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gray-900 flex items-center justify-center">
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom colors */}
            <div className="card p-5">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Type className="w-4 h-4" /> Custom Colors & Font</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                {[
                  { label: 'Primary Color', key: 'primaryColor' as const },
                  { label: 'Secondary Color', key: 'secondaryColor' as const },
                  { label: 'Accent Color', key: 'accentColor' as const },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <label className="label">{label}</label>
                    <div className="flex items-center gap-2">
                      <input type="color" className="w-10 h-10 rounded-lg cursor-pointer border border-gray-200"
                        value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                      <input className="input flex-1 font-mono text-sm" value={form[key]}
                        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <label className="label">Theme Font</label>
                <select className="input" value={form.themeFont} onChange={e => setForm(f => ({ ...f, themeFont: e.target.value }))}>
                  {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>

            {/* Logos */}
            <div className="card p-5">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Eye className="w-4 h-4" /> Branding Assets</h2>
              <div className="space-y-3">
                <div>
                  <label className="label">Logo URL</label>
                  <input className="input" placeholder="https://cdn.example.com/logo.png" value={form.logoUrl}
                    onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Banner / Hero Image URL</label>
                  <input className="input" placeholder="https://cdn.example.com/banner.jpg" value={form.bannerUrl}
                    onChange={e => setForm(f => ({ ...f, bannerUrl: e.target.value }))} />
                </div>
              </div>
            </div>
          </div>

          {/* Right: Live preview */}
          <div className="space-y-4">
            <div className="card overflow-hidden sticky top-4">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Eye className="w-4 h-4" /> Live Preview</p>
              </div>
              <div className="p-4 space-y-3" style={{ fontFamily: `'${current.font}', sans-serif` }}>
                {/* Mini navbar */}
                <div className="rounded-xl overflow-hidden shadow-sm">
                  <div className="flex items-center justify-between px-3 py-2"
                    style={{ background: `linear-gradient(135deg, ${current.primary}, ${current.secondary || current.primary})` }}>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-lg bg-white/20 flex items-center justify-center text-white text-xs font-black">
                        {form.name.charAt(0) || 'L'}
                      </div>
                      <span className="text-white text-xs font-bold truncate max-w-[80px]">{form.name || 'Portal Name'}</span>
                    </div>
                    <div className="flex gap-1">
                      <div className="px-2 py-0.5 rounded-md bg-white/20 text-white text-xs">Login</div>
                    </div>
                  </div>
                  {/* Hero */}
                  <div className="p-3 text-center"
                    style={{ background: `linear-gradient(135deg, ${current.primary}15, ${(current as any).accent || current.primary}20)` }}>
                    <p className="font-black text-sm" style={{ color: current.primary }}>{form.name || 'Your Academy'}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{form.tagline || 'Learn without limits'}</p>
                    <button className="mt-2 text-xs px-3 py-1 rounded-lg text-white font-semibold"
                      style={{ background: `linear-gradient(135deg, ${current.primary}, ${current.secondary || current.primary})` }}>
                      Get Started
                    </button>
                  </div>
                </div>

                {/* Category cards */}
                <div className="grid grid-cols-3 gap-1.5">
                  {['💻 Tech', '📊 Data', '🎨 Design'].map(c => (
                    <div key={c} className="rounded-lg border-2 p-2 text-center text-xs transition-all cursor-pointer"
                      style={{ borderColor: `${current.primary}40` }}>
                      <p className="font-medium text-gray-700">{c}</p>
                    </div>
                  ))}
                </div>

                {/* Font sample */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Font: {current.font}</p>
                  <p className="font-bold text-sm text-gray-800" style={{ fontFamily: `'${current.font}', sans-serif` }}>
                    The quick brown fox
                  </p>
                  <p className="text-xs text-gray-500" style={{ fontFamily: `'${current.font}', sans-serif` }}>
                    Learn, grow and succeed with us
                  </p>
                </div>

                <div className="flex gap-2">
                  <div className="flex-1 h-2 rounded-full" style={{ background: current.primary }} />
                  <div className="flex-1 h-2 rounded-full" style={{ background: current.secondary || current.primary }} />
                  <div className="flex-1 h-2 rounded-full" style={{ background: (current as any).accent || current.primary }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'general' && (
        <div className="card p-6 max-w-2xl space-y-4">
          <div><label className="label">Organization Name *</label>
            <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div><label className="label">Tagline</label>
            <input className="input" placeholder="Your inspiring tagline…" value={form.tagline} onChange={e => setForm(f => ({ ...f, tagline: e.target.value }))} /></div>
          <div><label className="label">Website</label>
            <input className="input" placeholder="https://yoursite.com" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} /></div>
          <div>
            <label className="label flex items-center gap-2"><Link2 className="w-3.5 h-3.5" /> Portal URL</label>
            <input className="input font-mono" placeholder="http://localhost:5173" value={form.portalUrl}
              onChange={e => setForm(f => ({ ...f, portalUrl: e.target.value }))} />
            <p className="text-xs text-gray-400 mt-1">The browser URL where your portal is hosted. Used for org identification on page load.</p>
          </div>
          <div><label className="label">Currency</label>
            <select className="input" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
              <option value="INR">INR — Indian Rupee (₹)</option>
              <option value="USD">USD — US Dollar ($)</option>
              <option value="EUR">EUR — Euro (€)</option>
              <option value="GBP">GBP — British Pound (£)</option>
            </select>
          </div>
        </div>
      )}

      {activeTab === 'payment' && (
        <div className="card p-6 max-w-2xl space-y-5">
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <span className="text-xl">💳</span>
            <div>
              <p className="text-sm font-semibold text-amber-800">Razorpay Payment Gateway</p>
              <p className="text-xs text-amber-700 mt-0.5">Add your Razorpay keys to enable paid course purchases. Get keys from <a href="https://dashboard.razorpay.com" target="_blank" rel="noreferrer" className="underline">dashboard.razorpay.com</a></p>
            </div>
          </div>
          <div><label className="label">Razorpay Key ID</label>
            <input className="input font-mono" placeholder="rzp_live_xxxxxxxxxx" value={form.razorpayKeyId}
              onChange={e => setForm(f => ({ ...f, razorpayKeyId: e.target.value }))} /></div>
          <div><label className="label">Razorpay Key Secret</label>
            <input className="input font-mono" type="password" placeholder="Your secret key" value={form.razorpayKeySecret}
              onChange={e => setForm(f => ({ ...f, razorpayKeySecret: e.target.value }))} />
            <p className="text-xs text-gray-400 mt-1">Stored securely. Never shared with frontend.</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 space-y-1">
            <p className="font-semibold text-gray-700 mb-2">Supported Payment Methods via Razorpay:</p>
            {['UPI (Google Pay, PhonePe, Paytm)','Credit & Debit Cards','Net Banking','EMI','Wallets'].map(m => (
              <div key={m} className="flex items-center gap-2"><span className="text-green-500">✓</span>{m}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
