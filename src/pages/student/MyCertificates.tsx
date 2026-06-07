import { useQuery } from '@tanstack/react-query';
import { Award, Download, ExternalLink, Calendar, BookOpen } from 'lucide-react';
import { certsApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import type { Certificate } from '../../types';

export default function MyCertificates() {
  const { user } = useAuthStore();

  const { data: certs = [], isLoading } = useQuery<Certificate[]>({
    queryKey: ['certs', user?.id],
    queryFn: () => certsApi.getByUser(user!.id).then(r => r.data),
    enabled: !!user?.id,
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">My Certificates</h1>
        <p className="page-sub">{certs.length} certificate{certs.length !== 1 ? 's' : ''} earned</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="card h-48 animate-pulse bg-gray-100" />)}
        </div>
      ) : certs.length === 0 ? (
        <div className="card p-16 text-center text-gray-400">
          <Award className="w-14 h-14 mx-auto mb-4 opacity-30" />
          <p className="font-semibold text-gray-500">No certificates yet</p>
          <p className="text-sm mt-1">Complete a course exam to earn your first certificate</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {(certs as Certificate[]).map(cert => (
            <div key={cert.id} className="certificate-bg rounded-2xl p-6 relative overflow-hidden">
              {/* Decorative circles */}
              <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-purple-200/30" />
              <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-purple-200/20" />

              <div className="relative">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center">
                    <Award className="w-7 h-7 text-amber-500" />
                  </div>
                  <span className="badge bg-purple-100 text-purple-700 text-xs font-mono">#{cert.certificateNumber}</span>
                </div>

                <p className="text-xs text-purple-500 font-semibold uppercase tracking-widest mb-1">Certificate of Completion</p>
                <h3 className="text-lg font-bold text-gray-900 leading-tight mb-2">{cert.courseTitle}</h3>
                <p className="text-sm text-gray-600">Awarded to <span className="font-semibold">{cert.userName}</span></p>

                <div className="flex items-center gap-1 text-xs text-gray-500 mt-3">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(cert.issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>

                <div className="flex gap-2 mt-4">
                  {cert.pdfUrl && (
                    <a href={cert.pdfUrl} download className="btn-secondary text-xs flex items-center gap-1">
                      <Download className="w-3.5 h-3.5" /> Download
                    </a>
                  )}
                  <a
                    href={`/api/certificates/${cert.certificateNumber}/verify`}
                    target="_blank" rel="noreferrer"
                    className="btn-ghost text-xs flex items-center gap-1 text-purple-600 hover:text-purple-700">
                    <ExternalLink className="w-3.5 h-3.5" /> Verify
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
