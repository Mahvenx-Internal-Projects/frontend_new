import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Phone, Mail, MapPin, GraduationCap, Send, Loader2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useOrgStore } from '../../store/orgStore';

const API_BASE = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? '' : 'https://lms.worksupport360.com';

function QuickContactForm({ orgId, primary }: { orgId: number; primary: string }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '' });
  const mut = useMutation({
    mutationFn: () => fetch(`${API_BASE}/api/enquiries/batch`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, phone: form.phone, email: form.email, courseInterest: form.message, organizationId: orgId }),
    }).then(r => r.json()),
    onSuccess: () => { toast.success('Message sent! We will get back to you.'); setForm({ name: '', phone: '', email: '', message: '' }); },
    onError: () => toast.error('Failed to send'),
  });
  return (
    <div className="space-y-3">
      <input className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-gray-50" placeholder="Your name *"
        value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}/>
      <input className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-gray-50" type="tel" placeholder="Phone number *"
        value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}/>
      <input className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-gray-50" type="email" placeholder="Email (optional)"
        value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}/>
      <textarea className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-gray-50 resize-none" rows={3}
        placeholder="Message or course you're interested in" value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}/>
      <button onClick={() => { if (!form.name || !form.phone) { toast.error('Name and phone required'); return; } mut.mutate(); }}
        disabled={mut.isPending}
        className="w-full py-3.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 shadow-lg" style={{ background: primary }}>
        {mut.isPending ? <><Loader2 className="w-4 h-4 animate-spin"/> Sending…</> : <><Send className="w-4 h-4"/> Send Message</>}
      </button>
    </div>
  );
}

export default function ContactUsPage() {
  const { org } = useOrgStore();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['org-settings-contact', org?.id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/organizations/${org!.id}`);
      if (!res.ok) throw new Error('Failed to load');
      return res.json();
    },
    enabled: !!org?.id,
    staleTime: 0,
  });

  const primary   = org?.primaryColor   ?? '#6366f1';
  const secondary = org?.secondaryColor ?? '#8b5cf6';
  const template  = settings?.contactUsTemplate ?? 'classic';
  const showLogo  = settings?.showLogoInContactUs !== false;

  if (!org) return null;

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-gray-200 border-t-[var(--org-primary,#6366f1)] rounded-full animate-spin"/>
    </div>
  );

  const InfoCards = () => (
    <div className="space-y-4">
      {showLogo && org.logoUrl && (
        <div className="flex items-center gap-3 mb-2">
          <img src={org.logoUrl} alt={org.name} className="w-10 h-10 rounded-xl object-cover shadow"/>
          <p className="font-bold text-gray-900">{org.name}</p>
        </div>
      )}
      {settings?.contactPhone && (
        <div className="flex items-start gap-4 bg-white rounded-2xl p-5 shadow-md">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: `${primary}15` }}><Phone className="w-6 h-6" style={{ color: primary }}/></div>
          <div><p className="font-bold text-gray-900">Phone</p><a href={`tel:${settings.contactPhone}`} className="text-gray-600 hover:opacity-80">{settings.contactPhone}</a></div>
        </div>
      )}
      {settings?.contactEmail && (
        <div className="flex items-start gap-4 bg-white rounded-2xl p-5 shadow-md">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: `${primary}15` }}><Mail className="w-6 h-6" style={{ color: primary }}/></div>
          <div><p className="font-bold text-gray-900">Email</p><a href={`mailto:${settings.contactEmail}`} className="text-gray-600 hover:opacity-80">{settings.contactEmail}</a></div>
        </div>
      )}
      {settings?.contactAddress && (
        <div className="flex items-start gap-4 bg-white rounded-2xl p-5 shadow-md">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: `${primary}15` }}><MapPin className="w-6 h-6" style={{ color: primary }}/></div>
          <div><p className="font-bold text-gray-900">Address</p><p className="text-gray-600 whitespace-pre-line">{settings.contactAddress}</p></div>
        </div>
      )}
      {org.website && (
        <div className="flex items-start gap-4 bg-white rounded-2xl p-5 shadow-md">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: `${primary}15` }}><GraduationCap className="w-6 h-6" style={{ color: primary }}/></div>
          <div><p className="font-bold text-gray-900">Website</p><a href={org.website} target="_blank" rel="noreferrer" className="text-gray-600 hover:opacity-80">{org.website}</a></div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: `'${org.themeFont ?? 'Inter'}', sans-serif` }}>
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4"/> Back to Home
          </Link>
        </div>
      </div>

      <section className="py-16 md:py-24" style={{ background: `linear-gradient(135deg, ${primary}08, ${secondary}06)` }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <p className="text-sm font-bold uppercase tracking-widest mb-1" style={{ color: primary }}>Get in touch</p>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900">Contact {org.name}</h1>
          </div>

          {template === 'minimal' ? (
            <div className="max-w-md mx-auto text-center space-y-6">
              {showLogo && org.logoUrl && <img src={org.logoUrl} alt={org.name} className="w-16 h-16 rounded-2xl object-cover shadow-lg mx-auto"/>}
              <div className="space-y-3">
                {settings?.contactPhone && <p className="text-gray-700"><Phone className="w-4 h-4 inline mr-2" style={{ color: primary }}/>{settings.contactPhone}</p>}
                {settings?.contactEmail && <p className="text-gray-700"><Mail className="w-4 h-4 inline mr-2" style={{ color: primary }}/>{settings.contactEmail}</p>}
                {settings?.contactAddress && <p className="text-gray-700 whitespace-pre-line"><MapPin className="w-4 h-4 inline mr-2" style={{ color: primary }}/>{settings.contactAddress}</p>}
              </div>
            </div>
          ) : template === 'split' ? (
            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto items-stretch">
              <div className="rounded-3xl overflow-hidden shadow-xl min-h-[300px]">
                {settings?.contactMapEmbed
                  ? <iframe src={settings.contactMapEmbed} width="100%" height="100%" style={{ border: 0, minHeight: 300 }} loading="lazy" referrerPolicy="no-referrer-when-downgrade"/>
                  : <div className="w-full h-full flex items-center justify-center" style={{ background: `${primary}10` }}><MapPin className="w-12 h-12" style={{ color: primary }}/></div>}
              </div>
              <InfoCards/>
            </div>
          ) : template === 'map-focus' ? (
            <div className="relative max-w-5xl mx-auto rounded-3xl overflow-hidden shadow-2xl">
              <div className="h-80">
                {settings?.contactMapEmbed
                  ? <iframe src={settings.contactMapEmbed} width="100%" height="100%" style={{ border: 0 }} loading="lazy" referrerPolicy="no-referrer-when-downgrade"/>
                  : <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${primary}20, ${secondary}15)` }}><MapPin className="w-16 h-16" style={{ color: primary }}/></div>}
              </div>
              <div className="absolute bottom-4 left-4 right-4 md:left-8 md:right-auto md:w-96 bg-white rounded-2xl shadow-xl p-5">
                {showLogo && org.logoUrl && <img src={org.logoUrl} alt={org.name} className="w-10 h-10 rounded-xl object-cover mb-3"/>}
                <div className="space-y-2 text-sm">
                  {settings?.contactPhone && <p className="flex items-center gap-2 text-gray-700"><Phone className="w-3.5 h-3.5" style={{ color: primary }}/>{settings.contactPhone}</p>}
                  {settings?.contactEmail && <p className="flex items-center gap-2 text-gray-700"><Mail className="w-3.5 h-3.5" style={{ color: primary }}/>{settings.contactEmail}</p>}
                  {settings?.contactAddress && <p className="flex items-start gap-2 text-gray-700"><MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: primary }}/><span className="whitespace-pre-line">{settings.contactAddress}</span></p>}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <InfoCards/>
              <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8">
                <h3 className="font-black text-gray-900 text-xl mb-5">Send a Message</h3>
                <QuickContactForm orgId={org.id} primary={primary}/>
              </div>
            </div>
          )}

          {settings?.contactMapEmbed && template !== 'map-focus' && template !== 'split' && (
            <div className="mt-8 rounded-3xl overflow-hidden shadow-xl max-w-4xl mx-auto">
              <iframe src={settings.contactMapEmbed} width="100%" height="300" style={{ border: 0 }} loading="lazy" referrerPolicy="no-referrer-when-downgrade"/>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
