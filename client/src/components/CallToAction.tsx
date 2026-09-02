import { Link } from "react-router-dom";

export function CallToAction() {
  return (
    <section className="relative py-28 bg-[#090a0c] overflow-hidden">
      <div className="max-w-[1440px] mx-auto px-container-padding relative z-10">
        <div className="relative rounded-3xl overflow-hidden glass-panel-silver border border-white/20 p-10 sm:p-16 lg:p-20 text-center shadow-[0_30px_90px_-20px_rgba(0,0,0,0.85)]">
          {/* Ambient radial silver lighting behind content */}
          <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-radial from-slate-400/10 via-transparent to-transparent blur-3xl" />

          {/* Geometric subtle lines */}
          <div className="pointer-events-none absolute inset-0 opacity-[0.04] bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:32px_32px]" />

          <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center gap-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full glass-panel-subtle border border-white/10">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d4b068] animate-ping" />
              <span className="font-label-sm text-[11px] uppercase tracking-[0.2em] text-[#cbd5e1]">
                Start Your Journey
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-light text-white tracking-tight leading-tight">
              Ready to Experience{" "}
              <span className="font-serif italic font-normal text-silver-gradient-text block sm:inline">
                Elevated Living?
              </span>
            </h2>

            <p className="text-sm sm:text-base md:text-lg text-[#94a3b8] max-w-xl font-normal leading-relaxed">
              Whether you are searching for an extraordinary home or listing a premium residential property,
              Nibash delivers security, transparency, and refined ease.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 w-full sm:w-auto">
              <a
                href="#featured-properties"
                className="w-full sm:w-auto glass-button-silver text-[#090a0c] font-label-sm text-xs uppercase tracking-widest py-4 px-8 rounded-xl flex items-center justify-center gap-2 shadow-xl hover:scale-105 transition-all cursor-pointer font-semibold"
              >
                <span>Find Your Next Home</span>
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </a>

              <Link
                to="/register"
                className="w-full sm:w-auto glass-button-outline text-white font-label-sm text-xs uppercase tracking-widest py-4 px-8 rounded-xl flex items-center justify-center gap-2 hover:border-white/40 cursor-pointer"
              >
                <span>List a Property</span>
                <span className="material-symbols-outlined text-base">add_business</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

