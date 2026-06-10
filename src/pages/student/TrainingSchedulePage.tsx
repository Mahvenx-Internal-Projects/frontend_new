import { useQuery } from '@tanstack/react-query';
import { Calendar, Clock, Video, ExternalLink, CheckCircle2, Timer, BookOpen } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { liveClassApi } from '../../services/api';
import clsx from 'clsx';

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short', year:'numeric' });
}
function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12: true });
}

export default function TrainingSchedulePage() {
  const { user } = useAuthStore();

  const { data: classes = [], isLoading } = useQuery({
    queryKey: ['live-classes-student', user?.organizationId],
    queryFn: () => liveClassApi.getUpcoming(user!.organizationId).then(r => r.data),
    enabled: !!user,
  });

  const now = new Date();
  const upcoming = (classes as any[]).filter(c => new Date(c.scheduledAt) > now).sort((a,b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  const past     = (classes as any[]).filter(c => new Date(c.scheduledAt) <= now).sort((a,b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title flex items-center gap-2"><Calendar className="w-6 h-6" style={{color:'var(--org-primary)'}}/> Training Schedule</h1>
        <p className="page-sub">Upcoming live classes and past recordings</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_,i) => <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-2xl"/>)}</div>
      ) : (
        <>
          <section>
            <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wide mb-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/>
              Upcoming Classes ({upcoming.length})
            </h2>
            {upcoming.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center text-gray-400">
                <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30"/>
                <p>No upcoming classes scheduled</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcoming.map((cls: any) => <ClassCard key={cls.id} cls={cls} isUpcoming />)}
              </div>
            )}
          </section>

          {past.length > 0 && (
            <section>
              <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wide mb-3 flex items-center gap-2">
                <Video className="w-4 h-4 text-gray-400"/>
                Past Classes & Recordings ({past.length})
              </h2>
              <div className="space-y-3">
                {past.map((cls: any) => <ClassCard key={cls.id} cls={cls} isUpcoming={false} />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function ClassCard({ cls, isUpcoming }: { cls: any; isUpcoming: boolean }) {
  const minsUntil = Math.round((new Date(cls.scheduledAt).getTime() - Date.now()) / 60000);
  const isToday   = minsUntil > 0 && minsUntil < 1440;
  const isLive    = minsUntil >= -30 && minsUntil <= 30;

  return (
    <div className={clsx('bg-white rounded-2xl border-2 shadow-sm p-5 transition-all',
      isLive ? 'border-green-300 shadow-green-100' :
      isToday ? 'border-[var(--org-primary)]/30' : 'border-gray-100')}>
      <div className="flex items-start gap-4">
        <div className={clsx('w-14 h-14 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 text-white',
          isLive ? 'bg-green-500' : isUpcoming ? '' : 'bg-gray-400')}
          style={isUpcoming && !isLive ? {background:'linear-gradient(135deg,var(--org-primary),var(--org-secondary,var(--org-primary)))'} : {}}>
          <span className="text-xs font-bold">{new Date(cls.scheduledAt).toLocaleDateString('en-IN',{month:'short'})}</span>
          <span className="text-xl font-black leading-none">{new Date(cls.scheduledAt).getDate()}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {isLive && <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full animate-pulse">🔴 LIVE NOW</span>}
            {isToday && !isLive && <span className="text-xs bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">Today</span>}
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{cls.status ?? 'Scheduled'}</span>
          </div>
          <h3 className="font-bold text-gray-900">{cls.title}</h3>
          {cls.description && <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{cls.description}</p>}
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {fmtDate(cls.scheduledAt)} at {fmtTime(cls.scheduledAt)}</span>
            {cls.durationMins && <span className="flex items-center gap-1"><Timer className="w-3 h-3"/> {cls.durationMins} min</span>}
            {cls.instructorName && <span className="flex items-center gap-1"><BookOpen className="w-3 h-3"/> {cls.instructorName}</span>}
          </div>
        </div>

        <div className="flex flex-col gap-2 flex-shrink-0">
          {cls.meetingUrl && (
            <a href={cls.meetingUrl} target="_blank" rel="noreferrer"
              className={clsx('flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all',
                isLive ? 'bg-green-500 hover:bg-green-600' : 'hover:opacity-90')}
              style={!isLive ? {background:'linear-gradient(135deg,var(--org-primary),var(--org-secondary,var(--org-primary)))'} : {}}>
              <Video className="w-3.5 h-3.5"/>
              {isLive ? 'Join Now' : isUpcoming ? 'Join Link' : 'Recording'}
              <ExternalLink className="w-3 h-3"/>
            </a>
          )}
          {cls.recordingUrl && (
            <a href={cls.recordingUrl} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-purple-600 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-all">
              <Video className="w-3.5 h-3.5"/> Recording
            </a>
          )}
        </div>
      </div>
    </div>
  );
}