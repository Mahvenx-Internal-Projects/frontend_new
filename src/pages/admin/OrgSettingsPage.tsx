import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Plus, Trash2, Eye, EyeOff, Loader2, Globe, Phone, Mail, MapPin, FileText, Gift, Radio } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { useOrgStore } from '../../store/orgStore';
import { uploadApi } from '../../services/api';
import clsx from 'clsx';
import { AboutUsTemplatePicker, ContactUsTemplatePicker } from './TemplatePicker';

const API_BASE = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? '' : 'https://lms.worksupport360.com';

const tok = () => localStorage.getItem('lms_token') ?? '';

const TABS = [
  { id: 'branding',  label: 'Branding' },
  { id: 'homepage',  label: 'Homepage Features' },
  { id: 'content',   label: 'About & Contact' },
  { id: 'menus',     label: 'Custom Menus' },
  { id: 'enquiries', label: 'Enquiries' },
];

export default function OrgSettingsPage() {
  const { user }  = useAuthStore();
  const { org, setOrg } = useOrgStore();
  const qc        = useQueryClient();
  const [tab, setTab]   = useState('branding');
  const [saving, setSaving] = useState(false);

  const orgId = user?.organizationId ?? org?.id;

  const { data: settings, isLoading } = useQuery({
    queryKey: ['org-settings', orgId],
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/api/organizations/${orgId}`, {
        headers: { Authorization: `Bearer ${tok()}` }
      });
      return r.json();
    },
    enabled: !!orgId,
  });

  const [form, setForm] = useState<any>({});
  useEffect(() => { if (settings) setForm(settings); }, [settings]);
  const f = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));
  const tog = (k: string) => f(k, !form[k]);

  const [customMenus, setCustomMenus] = useState<any[]>([]);
  useEffect(() => {
    try { setCustomMenus(JSON.parse(settings?.customMenuJson ?? '[]')); } catch { setCustomMenus([]); }
  }, [settings?.customMenuJson]);

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...form, customMenuJson: JSON.stringify(customMenus) };
      const r = await fetch(`${API_BASE}/api/organizations/${orgId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error();
      setOrg({ ...org!, ...payload });
      qc.invalidateQueries({ queryKey: ['org-settings'] });
      toast.success('Settings saved!');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const [logoUploading, setLogoUploading] = useState(false);
  const uploadLogo = async (file: File) => {
    setLogoUploading(true);
    try {
      const res = await uploadApi.image(file, 'logos');
      f('logoUrl', res.data.url);
      toast.success('Logo uploaded');
    } catch { toast.error('Upload failed'); }
    finally { setLogoUploading(false); }
  };

  const { data: enquiries = [] } = useQuery({
    queryKey: ['enquiries', orgId],
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/api/enquiries?orgId=${orgId}`, {
        headers: { Authorization: `Bearer ${tok()}` }
      });
      return r.json();
    },
    enabled: !!orgId && tab === 'enquiries',
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-gray-300"/></div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Organization Settings</h1>
          <p className="page-sub">Manage branding, homepage features, and content</p>
        </div>
        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving ? <><Loader2 className="w-4 h-4 animate-spin"/> Saving…</> : <><Save className="w-4 h-4"/> Save All</>}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={clsx('flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              tab === t.id ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700')}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Branding tab ── */}
      {tab === 'branding' && (
        <div className="space-y-5">
          <div className="card p-6 space-y-5">
            <h3 className="font-bold text-gray-900">Organization Identity</h3>

            {/* Logo */}
            <div>
              <label className="label">Logo</label>
              <div className="flex items-center gap-4">
                {form.logoUrl && <img src={form.logoUrl} alt="Logo" className="w-16 h-16 rounded-xl object-cover border border-gray-200"/>}
                <div>
                  <label className="btn-secondary cursor-pointer">
                    {logoUploading ? <><Loader2 className="w-4 h-4 animate-spin"/> Uploading…</> : 'Upload Logo'}
                    <input type="file" accept="image/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) uploadLogo(f); }}/>
                  </label>
                  {form.logoUrl && <button className="ml-2 text-xs text-red-500 hover:underline" onClick={() => f('logoUrl', '')}>Remove</button>}
                </div>
              </div>
              <input className="input mt-2" placeholder="Or paste logo URL" value={form.logoUrl ?? ''} onChange={e => f('logoUrl', e.target.value)}/>
            </div>

            <div>
              <label className="label">Organization Name</label>
              <input className="input" value={form.name ?? ''} onChange={e => f('name', e.target.value)}/>
            </div>
            <div>
              <label className="label">Tagline</label>
              <input className="input" placeholder="Your inspiring tagline" value={form.tagline ?? ''} onChange={e => f('tagline', e.target.value)}/>
            </div>
            <div>
              <label className="label">Website</label>
              <input className="input" type="url" placeholder="https://example.com" value={form.website ?? ''} onChange={e => f('website', e.target.value)}/>
            </div>
            <div>
              <label className="label">Portal URL</label>
              <input className="input" placeholder="https://yourportal.com" value={form.portalUrl ?? ''} onChange={e => f('portalUrl', e.target.value)}/>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Primary Color</label>
                <div className="flex gap-2">
                  <input type="color" className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer"
                    value={form.primaryColor ?? '#6366f1'} onChange={e => f('primaryColor', e.target.value)}/>
                  <input className="input flex-1" value={form.primaryColor ?? '#6366f1'} onChange={e => f('primaryColor', e.target.value)}/>
                </div>
              </div>
              <div>
                <label className="label">Secondary Color</label>
                <div className="flex gap-2">
                  <input type="color" className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer"
                    value={form.secondaryColor ?? '#8b5cf6'} onChange={e => f('secondaryColor', e.target.value)}/>
                  <input className="input flex-1" value={form.secondaryColor ?? '#8b5cf6'} onChange={e => f('secondaryColor', e.target.value)}/>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Homepage Features tab ── */}
      {tab === 'homepage' && (
        <div className="space-y-4">
          <div className="card p-6 space-y-5">
            <h3 className="font-bold text-gray-900">Feature Toggles</h3>
            <p className="text-sm text-gray-500">Enable or disable sections on your public homepage</p>

            {[
              { key: 'showAllCourses',    label: 'All Courses section',    desc: 'Show course catalog on homepage' },
              { key: 'showCourseBatches', label: 'Course Batches section', desc: 'Show training batch cards with Register Interest button' },
              { key: 'showAboutUs',       label: 'About Us section',       desc: 'Show About Us content on homepage' },
              { key: 'showContactUs',     label: 'Contact Us section',     desc: 'Show contact details and enquiry form' },
              { key: 'showOpenings',      label: 'Openings / Jobs section', desc: 'Show career openings on homepage' },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:bg-gray-50">
                <div>
                  <p className="font-semibold text-sm text-gray-800">{item.label}</p>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
                <button onClick={() => tog(item.key)}
                  className={clsx('w-12 h-6 rounded-full transition-colors relative',
                    form[item.key] ? 'bg-green-500' : 'bg-gray-300')}>
                  <span className={clsx('absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform',
                    form[item.key] ? 'translate-x-7' : 'translate-x-1')}/>
                </button>
              </div>
            ))}
          </div>

          {/* Scrolling Banner */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 flex items-center gap-2"><Radio className="w-4 h-4"/> Scrolling Banner</h3>
                <p className="text-xs text-gray-500 mt-0.5">Continuous scrolling text at the top of the page</p>
              </div>
              <button onClick={() => tog('showScrollingBanner')}
                className={clsx('w-12 h-6 rounded-full transition-colors relative', form.showScrollingBanner ? 'bg-green-500' : 'bg-gray-300')}>
                <span className={clsx('absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform', form.showScrollingBanner ? 'translate-x-7' : 'translate-x-1')}/>
              </button>
            </div>
            {form.showScrollingBanner && (
              <div>
                <label className="label">Banner Text <span className="font-normal text-gray-400">(separate items with |)</span></label>
                <input className="input" placeholder="Admissions Open | New Batch Starting | Enroll Now"
                  value={form.scrollingBannerText ?? ''} onChange={e => f('scrollingBannerText', e.target.value)}/>
                <p className="text-xs text-gray-400 mt-1">Example: "New Batch Starting Jan 2025 | Limited Seats | Call Now"</p>
              </div>
            )}
          </div>

          {/* Referral Offer */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 flex items-center gap-2"><Gift className="w-4 h-4"/> Referral Offer Banner</h3>
                <p className="text-xs text-gray-500 mt-0.5">Floating card on right side highlighting referral reward</p>
              </div>
              <button onClick={() => tog('showReferralOffer')}
                className={clsx('w-12 h-6 rounded-full transition-colors relative', form.showReferralOffer ? 'bg-green-500' : 'bg-gray-300')}>
                <span className={clsx('absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform', form.showReferralOffer ? 'translate-x-7' : 'translate-x-1')}/>
              </button>
            </div>
            {form.showReferralOffer && (
              <div>
                <label className="label">Offer Text</label>
                <input className="input" placeholder="Earn ₹2500 for each referral who enrolls"
                  value={form.referralOfferText ?? ''} onChange={e => f('referralOfferText', e.target.value)}/>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Content tab ── */}
      {tab === 'content' && (
        <div className="space-y-5">
          {/* About Us */}
          <div className="card p-6 space-y-4">
            <h3 className="font-bold text-gray-900">About Us</h3>

            <AboutUsTemplatePicker
              value={form.aboutUsTemplate ?? 'classic'}
              onChange={(v) => f('aboutUsTemplate', v)}
              primary={form.primaryColor ?? '#6366f1'}
            />

            <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50">
              <div>
                <p className="text-sm font-semibold text-gray-800">Show logo in About Us section</p>
                <p className="text-xs text-gray-500">Displays your organization logo above the content</p>
              </div>
              <button onClick={() => tog('showLogoInAboutUs')}
                className={clsx('w-12 h-6 rounded-full transition-colors relative', form.showLogoInAboutUs !== false ? 'bg-green-500' : 'bg-gray-300')}>
                <span className={clsx('absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform', form.showLogoInAboutUs !== false ? 'translate-x-7' : 'translate-x-1')}/>
              </button>
            </div>

            <p className="text-xs text-gray-500 pt-1">Write your About Us content below. Supports HTML.</p>
            <textarea className="input resize-none font-mono text-xs" rows={8}
              placeholder="<p>We are a leading training institution...</p>"
              value={form.aboutUsContent ?? ''} onChange={e => f('aboutUsContent', e.target.value)}/>
            {form.aboutUsContent && (
              <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                <p className="text-xs font-semibold text-gray-500 mb-2">Preview:</p>
                <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: form.aboutUsContent }}/>
              </div>
            )}
          </div>

          {/* Openings */}
          <div className="card p-6 space-y-4">
            <h3 className="font-bold text-gray-900">Openings / Careers Content</h3>
            <p className="text-xs text-gray-500">Job openings, trainer positions, etc. Supports HTML.</p>
            <textarea className="input resize-none font-mono text-xs" rows={6}
              placeholder="<h3>We are hiring!</h3><p>Apply for...</p>"
              value={form.openingsContent ?? ''} onChange={e => f('openingsContent', e.target.value)}/>
          </div>

          {/* Contact */}
          <div className="card p-6 space-y-4">
            <h3 className="font-bold text-gray-900">Contact Us</h3>

            <ContactUsTemplatePicker
              value={form.contactUsTemplate ?? 'classic'}
              onChange={(v) => f('contactUsTemplate', v)}
              primary={form.primaryColor ?? '#6366f1'}
            />

            <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50">
              <div>
                <p className="text-sm font-semibold text-gray-800">Show logo in Contact Us section</p>
                <p className="text-xs text-gray-500">Displays your organization logo near contact details</p>
              </div>
              <button onClick={() => tog('showLogoInContactUs')}
                className={clsx('w-12 h-6 rounded-full transition-colors relative', form.showLogoInContactUs !== false ? 'bg-green-500' : 'bg-gray-300')}>
                <span className={clsx('absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform', form.showLogoInContactUs !== false ? 'translate-x-7' : 'translate-x-1')}/>
              </button>
            </div>

            <p className="text-xs text-gray-500 pt-1">Fill in your contact details below.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label flex items-center gap-1"><Phone className="w-3 h-3"/> Phone</label>
                <input className="input" placeholder="+91 9876543210" value={form.contactPhone ?? ''} onChange={e => f('contactPhone', e.target.value)}/>
              </div>
              <div>
                <label className="label flex items-center gap-1"><Mail className="w-3 h-3"/> Email</label>
                <input className="input" type="email" placeholder="info@example.com" value={form.contactEmail ?? ''} onChange={e => f('contactEmail', e.target.value)}/>
              </div>
            </div>
            <div>
              <label className="label flex items-center gap-1"><MapPin className="w-3 h-3"/> Address</label>
              <textarea className="input resize-none" rows={3} placeholder="123 Main Street, City, State 123456"
                value={form.contactAddress ?? ''} onChange={e => f('contactAddress', e.target.value)}/>
            </div>
            <div>
              <label className="label flex items-center gap-1"><Globe className="w-3 h-3"/> Google Maps Embed URL</label>
              <input className="input" placeholder="https://www.google.com/maps/embed?pb=..."
                value={form.contactMapEmbed ?? ''} onChange={e => f('contactMapEmbed', e.target.value)}/>
              <p className="text-xs text-gray-400 mt-1">Go to Google Maps → Share → Embed a map → copy the src URL from the iframe code</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Custom Menus tab ── */}
      {tab === 'menus' && (
        <div className="space-y-4">
          <div className="card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900">Custom Navigation Menus</h3>
                <p className="text-xs text-gray-500 mt-0.5">Add extra menu items — either links or full pages with content</p>
              </div>
              <button className="btn-secondary text-sm" onClick={() => setCustomMenus(m => [...m, { label: '', url: '#new-page', isPage: true, pageContent: '' }])}>
                <Plus className="w-4 h-4"/> Add Menu
              </button>
            </div>

            {customMenus.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-6">No custom menus yet — add one above</p>
            )}

            {customMenus.map((m, i) => (
              <div key={i} className="border border-gray-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <div>
                      <label className="label text-xs">Menu Label</label>
                      <input className="input text-sm" placeholder="e.g. Gallery" value={m.label}
                        onChange={e => setCustomMenus(ms => ms.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}/>
                    </div>
                    <div>
                      <label className="label text-xs">URL or Anchor</label>
                      <input className="input text-sm" placeholder="#gallery or https://..."
                        value={m.url}
                        onChange={e => setCustomMenus(ms => ms.map((x, j) => j === i ? { ...x, url: e.target.value } : x))}/>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 pt-5">
                    <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
                      <input type="checkbox" checked={m.isPage}
                        onChange={e => setCustomMenus(ms => ms.map((x, j) => j === i ? { ...x, isPage: e.target.checked } : x))}/>
                      Has content
                    </label>
                    <button onClick={() => setCustomMenus(ms => ms.filter((_, j) => j !== i))}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-400">
                      <Trash2 className="w-4 h-4"/>
                    </button>
                  </div>
                </div>
                {m.isPage && (
                  <div>
                    <label className="label text-xs">Page Content (HTML supported)</label>
                    <textarea className="input resize-none font-mono text-xs" rows={4}
                      placeholder="<p>Your page content here...</p>"
                      value={m.pageContent ?? ''}
                      onChange={e => setCustomMenus(ms => ms.map((x, j) => j === i ? { ...x, pageContent: e.target.value } : x))}/>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Enquiries tab ── */}
      {tab === 'enquiries' && (
        <div className="card overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">Batch Enquiries</h3>
            <p className="text-sm text-gray-500 mt-0.5">People who submitted enquiries from your homepage</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                  <th className="px-5 py-3 text-left">Name</th>
                  <th className="px-5 py-3 text-left">Phone</th>
                  <th className="px-5 py-3 text-left">Email</th>
                  <th className="px-5 py-3 text-left">Interested In</th>
                  <th className="px-5 py-3 text-left">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(enquiries as any[]).length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-400">No enquiries yet</td></tr>
                ) : (enquiries as any[]).map((e: any) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-800">{e.name}</td>
                    <td className="px-5 py-3 text-gray-600"><a href={`tel:${e.phone}`} className="hover:underline">{e.phone}</a></td>
                    <td className="px-5 py-3 text-gray-600">{e.email ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-600">{e.batchName ?? e.courseInterest ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-400 text-xs">
                      {new Date(e.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Save button at bottom */}
      {tab !== 'enquiries' && (
        <div className="flex justify-end pt-2">
          <button className="btn-primary px-8" onClick={save} disabled={saving}>
            {saving ? <><Loader2 className="w-4 h-4 animate-spin"/> Saving…</> : <><Save className="w-4 h-4"/> Save Settings</>}
          </button>
        </div>
      )}
    </div>
  );
}
