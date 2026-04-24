import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="border-b sticky top-0 bg-white/80 backdrop-blur-md z-50">
        <div className="container h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight">VechilePart</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium">
            <a href="#features" className="text-slate-600 hover:text-primary">Features</a>
            <a href="#about" className="text-slate-600 hover:text-primary">About</a>
            <Link href="/register" className="btn btn-primary">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 md:py-32 overflow-hidden">
        <div className="container relative">
          <div className="max-w-2xl">
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
              Modern <span className="text-primary italic">Automotive</span> Care & Management.
            </h1>
            <p className="text-lg text-slate-600 mb-10 leading-relaxed">
              The all-in-one platform for vehicle services and parts retail. 
              Streamlined inventory, automated financial records, and AI-powered 
              vehicle diagnostics for a smarter experience.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/register" className="btn btn-primary px-8 py-4 text-lg">
                Register Now
              </Link>
              <button className="btn bg-white border border-slate-200 hover:bg-slate-50 px-8 py-4 text-lg">
                View Parts
              </button>
            </div>
          </div>
          
          <div className="absolute top-0 right-0 -z-10 opacity-10 blur-3xl">
            <div className="w-[500px] h-[500px] bg-primary rounded-full"></div>
          </div>
        </div>
      </section>

      {/* Features Preview */}
      <section id="features" className="py-20 bg-slate-50">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Everything you need</h2>
            <p className="text-slate-500">Built for efficiency and premium customer service.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { 
                title: 'Inventory Sync', 
                desc: 'Real-time tracking of parts with automated vendor invoicing.',
                icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4'
              },
              { 
                title: 'Staff Portal', 
                desc: 'Efficient customer registration and vehicle history management.',
                icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z'
              },
              { 
                title: 'AI Insights', 
                desc: 'Predictive maintenance using AI to analyze vehicle usage patterns.',
                icon: 'M9.663 17h4.674a1 1 0 00.922-.617l2.105-5.26a1 1 0 00-.922-1.37h-3.412l.62-4.654a1 1 0 00-1.888-.364l-4.22 8.44A1 1 0 008.995 14h3.04l-1.3 2.166a1 1 0 00.928 1.834z'
              }
            ].map((f, i) => (
              <div key={i} className="card hover:shadow-lg transition-all border-none">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-6">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={f.icon} />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-2">{f.title}</h3>
                <p className="text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
