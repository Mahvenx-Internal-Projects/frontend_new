export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6 overflow-hidden relative">
      {/* Atmospheric background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-900/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-orange-900/20 rounded-full blur-3xl" />
        {/* Grid lines */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />
      </div>

      <div className="relative text-center max-w-lg">
        {/* Icon */}
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-red-950 border border-red-800/50 mb-8 shadow-2xl shadow-red-900/30">
          <svg className="w-12 h-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>

        {/* Status code */}
        <p className="text-8xl font-black text-red-900/40 mb-2 tracking-tighter select-none">403</p>

        <h1 className="text-3xl font-bold text-white mb-3 -mt-4">
          Access Denied
        </h1>
        <p className="text-gray-400 leading-relaxed mb-2">
          This learning portal is not registered for{' '}
          <code className="bg-gray-800 text-red-300 px-2 py-0.5 rounded text-sm font-mono">
            {window.location.host}
          </code>
        </p>
        <p className="text-gray-500 text-sm mb-8">
          Please contact your organization administrator to configure the correct portal URL.
        </p>

        {/* Divider */}
        <div className="flex items-center gap-4 my-8">
          <div className="flex-1 h-px bg-gray-800" />
          <span className="text-gray-600 text-xs uppercase tracking-widest">What can you do?</span>
          <div className="flex-1 h-px bg-gray-800" />
        </div>

        <div className="grid grid-cols-1 gap-3 text-left">
          {[
            { icon: '📋', title: 'Check the URL',      desc: 'Make sure you\'re visiting the correct portal address.' },
            { icon: '📧', title: 'Contact your admin', desc: 'Ask your organization admin for the correct portal link.' },
            { icon: '🔧', title: 'Admin setup',        desc: 'Set your PortalUrl in the organization settings.' },
          ].map(item => (
            <div key={item.title} className="flex items-start gap-3 bg-gray-900/60 border border-gray-800 rounded-xl p-4">
              <span className="text-xl flex-shrink-0">{item.icon}</span>
              <div>
                <p className="text-white font-medium text-sm">{item.title}</p>
                <p className="text-gray-500 text-xs mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-gray-700 text-xs mt-8">
          LMS Portal · Powered by Acme Learning Platform
        </p>
      </div>
    </div>
  );
}
