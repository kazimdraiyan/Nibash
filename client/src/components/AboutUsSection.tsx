import { Link } from "react-router-dom";

export function AboutUsSection() {
  return (
    <section id="about-us" className="relative py-28 bg-[#090a0c] overflow-hidden border-t border-white/5">
      {/* Ambient background silver glow */}
      <div className="pointer-events-none absolute top-1/3 right-0 w-[550px] h-[550px] rounded-full bg-radial from-slate-400/8 via-transparent to-transparent blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 left-10 w-[500px] h-[500px] rounded-full bg-radial from-slate-300/5 via-transparent to-transparent blur-3xl" />

      <div className="max-w-[1440px] mx-auto px-container-padding relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Narrative */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-panel-silver border border-white/15 w-fit">
              <span className="material-symbols-outlined text-xs text-[#cbd5e1]">
                info
              </span>
              <span className="font-label-sm text-[11px] uppercase tracking-wider text-[#cbd5e1] font-semibold">
                About Nibash
              </span>
            </div>

            <h2 className="text-3xl md:text-4xl lg:text-5xl font-light text-[#f8f9fa] tracking-tight leading-[1.15]">
              Redefining Urban Renting with{" "}
              <span className="font-serif italic font-normal text-silver-gradient-text block sm:inline">
                Integrity & Precision.
              </span>
            </h2>

            <p className="text-sm md:text-base text-[#94a3b8] leading-relaxed max-w-2xl font-normal">
              Nibash was conceived and engineered to resolve Bangladesh&apos;s fragmented residential rental landscape.
              By bridging physical verification, verified ownership records, and legally-binding digital tenancy contracts,
              we eliminate the ambiguity of traditional leases.
            </p>

            <p className="text-sm md:text-base text-[#94a3b8] leading-relaxed max-w-2xl font-normal">
              Built from the ground up with modern engineering standards, our platform ensures every apartment listing,
              payment schedule, and tenant agreement is authentic, traceable, and secure.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4">
              <Link
                to="/about"
                className="glass-button-silver inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl font-label-sm text-xs uppercase tracking-widest cursor-pointer shadow-lg hover:shadow-xl transition-all"
              >
                <span>About Us</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
              <Link
                to="/about"
                className="glass-button-outline inline-flex items-center gap-2 px-5 py-3.5 rounded-xl font-label-sm text-xs uppercase tracking-widest hover:text-white transition-all cursor-pointer"
              >
                <span>Meet the Developers</span>
                <span className="material-symbols-outlined text-sm">group</span>
              </Link>
            </div>
          </div>

          {/* Right Column: Platform Values Card */}
          <div className="lg:col-span-5">
            <div className="glass-panel rounded-3xl p-8 border border-white/10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full pointer-events-none" />

              <h3 className="text-xs uppercase tracking-widest font-label-sm text-[#cbd5e1] mb-6">
                Platform Foundations
              </h3>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl glass-panel-silver border border-white/20 flex items-center justify-center shrink-0 text-[#cbd5e1]">
                    <span className="material-symbols-outlined text-xl">verified</span>
                  </div>
                  <div>
                    <h4 className="text-base font-medium text-white mb-1">
                      Verified Authenticity
                    </h4>
                    <p className="text-xs text-[#94a3b8] leading-relaxed">
                      Every property listing is verified through physical checks and title deeds by authorized verifiers.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl glass-panel-silver border border-white/20 flex items-center justify-center shrink-0 text-[#cbd5e1]">
                    <span className="material-symbols-outlined text-xl">description</span>
                  </div>
                  <div>
                    <h4 className="text-base font-medium text-white mb-1">
                      Digital Tenancy Contracts
                    </h4>
                    <p className="text-xs text-[#94a3b8] leading-relaxed">
                      Legally structured electronic contracts signed directly on the platform with audit-ready records.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl glass-panel-silver border border-white/20 flex items-center justify-center shrink-0 text-[#cbd5e1]">
                    <span className="material-symbols-outlined text-xl">security</span>
                  </div>
                  <div>
                    <h4 className="text-base font-medium text-white mb-1">
                      Transparent Finances
                    </h4>
                    <p className="text-xs text-[#94a3b8] leading-relaxed">
                      Streamlined rent schedules, deposit escrow safeguards, and real-time payment history for landlords and tenants.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
