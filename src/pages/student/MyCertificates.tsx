import { useQuery } from '@tanstack/react-query';
import { useState, useRef } from 'react';
import { Award, Download, Shield, Calendar, Clock, X, Printer, ExternalLink, BookOpen } from 'lucide-react';
import { certsApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import clsx from 'clsx';

// ─── Certificate Preview (printable) ─────────────────────────
function CertificateView({ cert, onClose }: { cert: any; onClose?: () => void }) {
  const printRef = useRef<HTMLDivElement>(null);

  const issuedDate = new Date(cert.issuedAt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  const handlePrint = () => {
    const content = printRef.current?.innerHTML;
    if (!content) return;
    const win = window.open('', '_blank', 'width=1100,height=820');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>Certificate — ${cert.courseTitle}</title>
        <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Inter:wght@400;500;600&display=swap" rel="stylesheet"/>
        <style>
          * { margin:0; padding:0; box-sizing:border-box; }
          body { background:#fff; }
          @page { size: A4 landscape; margin: 0; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>${content}</body>
      </html>
    `);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 500);
  };

  const primary = '#1e40af';

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl">
        {/* Controls */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900">Certificate of Completion</h2>
            <p className="text-xs text-gray-400 mt-0.5">Certificate #{cert.certificateNumber}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors">
              <Printer className="w-4 h-4"/> Print / Save PDF
            </button>
            <a href={`/api/certificates/${cert.certificateNumber}/verify`} target="_blank" rel="noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-bold hover:bg-gray-200 transition-colors">
              <Shield className="w-4 h-4"/> Verify
            </a>
            {onClose && (
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5 text-gray-500"/>
              </button>
            )}
          </div>
        </div>

        {/* Certificate body */}
        <div className="p-6">
          <div ref={printRef}>
            <div style={{
              width: '100%', aspectRatio: '1.414/1',
              background: 'linear-gradient(135deg, #f8f9ff 0%, #eef2ff 30%, #f8f9ff 60%, #fffbf0 100%)',
              border: '12px double #1e40af',
              outline: '3px solid #c7d2fe',
              outlineOffset: '4px',
              fontFamily: "'Inter', sans-serif",
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '48px 64px',
            }}>
              {/* Corner ornaments */}
              {[
                { top: '16px', left: '16px', transform: 'none' },
                { top: '16px', right: '16px', transform: 'scaleX(-1)' },
                { bottom: '16px', left: '16px', transform: 'scaleY(-1)' },
                { bottom: '16px', right: '16px', transform: 'scale(-1,-1)' },
              ].map((pos, i) => (
                <svg key={i} width="48" height="48" viewBox="0 0 48 48" style={{ position: 'absolute', ...pos }}>
                  <path d="M2 2 L18 2 L18 6 L6 6 L6 18 L2 18 Z" fill="#1e40af" opacity="0.6"/>
                  <path d="M2 2 L10 2" stroke="#c7d2fe" strokeWidth="1" fill="none"/>
                  <path d="M2 2 L2 10" stroke="#c7d2fe" strokeWidth="1" fill="none"/>
                </svg>
              ))}

              {/* Watermark */}
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%,-50%) rotate(-30deg)',
                fontSize: '120px', fontWeight: '900', color: '#1e40af',
                opacity: '0.025', letterSpacing: '8px', userSelect: 'none',
                whiteSpace: 'nowrap', pointerEvents: 'none',
              }}>
                {cert.orgName}
              </div>

              {/* ── TOP: org branding ── */}
              <div style={{ textAlign: 'center', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '12px' }}>
                  {cert.orgLogoUrl ? (
                    <img src={cert.orgLogoUrl} alt={cert.orgName} style={{ height: '52px', objectFit: 'contain' }} />
                  ) : (
                    <div style={{
                      width: '52px', height: '52px', borderRadius: '14px',
                      background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(30,64,175,0.3)',
                    }}>
                      <span style={{ color: 'white', fontSize: '22px', fontWeight: '900' }}>
                        {cert.orgName?.[0] ?? 'E'}
                      </span>
                    </div>
                  )}
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: '#1e3a8a', fontFamily: "'Cinzel', serif", letterSpacing: '1px' }}>
                      {cert.orgName}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6b7280', letterSpacing: '3px', textTransform: 'uppercase', marginTop: '2px' }}>
                      Certificate of Achievement
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '0 auto', maxWidth: '500px' }}>
                  <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, transparent, #1e40af)' }}/>
                  <div style={{ fontSize: '16px', color: '#1e40af' }}>✦</div>
                  <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to left, transparent, #1e40af)' }}/>
                </div>
              </div>

              {/* ── MIDDLE: main content ── */}
              <div style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '8px', padding: '8px 0' }}>
                <div style={{ fontSize: '13px', letterSpacing: '5px', textTransform: 'uppercase', color: '#6b7280', fontWeight: '500' }}>
                  This is to certify that
                </div>
                <div style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontSize: '48px', fontWeight: '600', color: '#1e3a8a',
                  lineHeight: '1.1',
                  borderBottom: '2px solid #c7d2fe',
                  paddingBottom: '8px',
                  marginBottom: '4px',
                }}>
                  {cert.userName}
                </div>
                <div style={{ fontSize: '13px', letterSpacing: '3px', textTransform: 'uppercase', color: '#6b7280' }}>
                  has successfully completed
                </div>
                <div style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: '22px', fontWeight: '700', color: '#1e3a8a',
                  lineHeight: '1.3',
                  maxWidth: '600px',
                  margin: '0 auto',
                }}>
                  {cert.courseTitle}
                </div>
                {(cert.courseLevel || cert.courseLanguage) && (
                  <div style={{ fontSize: '12px', color: '#9ca3af', letterSpacing: '2px', textTransform: 'uppercase' }}>
                    {[cert.courseLevel, cert.courseLanguage].filter(Boolean).join(' · ')}
                  </div>
                )}
                {cert.totalWatchMinutes > 0 && (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    background: 'rgba(30,64,175,0.08)', border: '1px solid rgba(30,64,175,0.2)',
                    borderRadius: '20px', padding: '4px 16px',
                    fontSize: '12px', color: '#1e40af', fontWeight: '600',
                    margin: '4px auto 0',
                  }}>
                    ⏱ {cert.totalWatchMinutes >= 60
                      ? `${Math.floor(cert.totalWatchMinutes/60)}h ${cert.totalWatchMinutes%60}m`
                      : `${cert.totalWatchMinutes} min`} of learning completed
                  </div>
                )}
              </div>

              {/* ── BOTTOM: date + signature ── */}
              <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '24px', alignItems: 'flex-end' }}>
                {/* Left: date + cert # */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: '#9ca3af', marginBottom: '4px' }}>
                    Date of Issue
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#374151', fontFamily: "'Cinzel', serif" }}>
                    {issuedDate}
                  </div>
                  <div style={{ marginTop: '8px', borderTop: '1px solid #d1d5db', paddingTop: '6px' }}>
                    <div style={{ fontSize: '10px', color: '#9ca3af', letterSpacing: '1px', textTransform: 'uppercase' }}>Certificate No.</div>
                    <div style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: '700', color: '#1e40af', letterSpacing: '2px' }}>
                      #{cert.certificateNumber}
                    </div>
                  </div>
                </div>

                {/* Center: seal */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: '72px', height: '72px', borderRadius: '50%',
                    border: '3px solid #1e40af',
                    background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto',
                    boxShadow: '0 4px 16px rgba(30,64,175,0.4)',
                  }}>
                    <span style={{ fontSize: '30px' }}>🏆</span>
                  </div>
                  <div style={{ fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: '#6b7280', marginTop: '6px' }}>
                    Verified
                  </div>
                </div>

                {/* Right: signature */}
                <div style={{ textAlign: 'center' }}>
                  {cert.orgSignatureUrl ? (
                    <img src={cert.orgSignatureUrl} alt="Signature"
                      style={{ height: '48px', objectFit: 'contain', margin: '0 auto 4px', display: 'block' }} />
                  ) : (
                    <div style={{
                      height: '48px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                      fontFamily: "'Cormorant Garamond', Georgia, serif",
                      fontSize: '28px', fontStyle: 'italic', color: '#1e40af',
                      fontWeight: '600', letterSpacing: '1px',
                    }}>
                      {cert.authorizedBy?.split(',')[0] ?? cert.orgName?.split(' ')[0]}
                    </div>
                  )}
                  <div style={{ borderTop: '1px solid #d1d5db', paddingTop: '6px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#374151' }}>
                      {cert.authorizedBy ?? cert.orgName}
                    </div>
                    <div style={{ fontSize: '10px', color: '#9ca3af', letterSpacing: '1px', textTransform: 'uppercase', marginTop: '2px' }}>
                      {cert.authorizedTitle ?? 'Authorized Signatory'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────
export default function MyCertificates() {
  const { user } = useAuthStore();
  const [viewing, setViewing] = useState<any | null>(null);

  const { data: certs = [], isLoading } = useQuery({
    queryKey: ['certs', user?.id],
    queryFn: () => certsApi.getByUser(user!.id).then(r => r.data),
    enabled: !!user?.id,
  });

  const certList = certs as any[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title flex items-center gap-2">
          <Award className="w-6 h-6 text-amber-500"/> My Certificates
        </h1>
        <p className="page-sub">{certList.length} certificate{certList.length !== 1 ? 's' : ''} earned</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[...Array(4)].map((_,i) => <div key={i} className="h-48 bg-gray-100 animate-pulse rounded-2xl"/>)}
        </div>
      ) : certList.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center">
          <Award className="w-16 h-16 mx-auto mb-4 text-gray-200"/>
          <p className="font-bold text-gray-500 text-lg">No certificates yet</p>
          <p className="text-sm text-gray-400 mt-2">Complete a course to earn your certificate</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {certList.map((cert: any) => {
            const issuedDate = new Date(cert.issuedAt).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'long', year: 'numeric'
            });
            return (
              <div key={cert.id}
                className="relative rounded-2xl overflow-hidden border-2 border-blue-200 shadow-lg hover:shadow-xl transition-all hover:scale-[1.01] cursor-pointer group"
                style={{ background: 'linear-gradient(135deg, #f8f9ff 0%, #eef2ff 50%, #fffbf0 100%)' }}
                onClick={() => setViewing(cert)}>

                {/* Decorative top bar */}
                <div className="h-2" style={{ background: 'linear-gradient(90deg, #1e40af, #3b82f6, #06b6d4)' }}/>

                <div className="p-6">
                  <div className="flex items-start gap-4">
                    {/* Seal */}
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md"
                      style={{ background: 'linear-gradient(135deg, #1e40af, #3b82f6)' }}>
                      <span className="text-3xl">🏆</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-1">
                        {cert.orgName ?? 'EKSHA TECHNOLOGIES'}
                      </p>
                      <h3 className="font-black text-gray-900 leading-tight line-clamp-2">{cert.courseTitle}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Awarded to <span className="font-bold text-blue-700">{cert.userName}</span>
                      </p>
                    </div>
                  </div>

                  {/* Meta row */}
                  <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-blue-400"/>
                      {issuedDate}
                    </span>
                    {cert.totalWatchMinutes > 0 && (
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-purple-400"/>
                        {cert.totalWatchMinutes >= 60
                          ? `${Math.floor(cert.totalWatchMinutes/60)}h ${cert.totalWatchMinutes%60}m`
                          : `${cert.totalWatchMinutes}m`} studied
                      </span>
                    )}
                    <span className="font-mono text-blue-600 font-bold">#{cert.certificateNumber}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={e => { e.stopPropagation(); setViewing(cert); }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all"
                      style={{ background: 'linear-gradient(135deg, #1e40af, #3b82f6)' }}>
                      <Award className="w-3.5 h-3.5"/> View Certificate
                    </button>
                    <a href={`/api/certificates/${cert.certificateNumber}/verify`}
                      target="_blank" rel="noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-all">
                      <Shield className="w-3.5 h-3.5"/> Verify
                    </a>
                  </div>
                </div>

                {/* Hover overlay hint */}
                <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/5 transition-colors pointer-events-none rounded-2xl"/>
              </div>
            );
          })}
        </div>
      )}

      {/* Full certificate preview modal */}
      {viewing && <CertificateView cert={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
