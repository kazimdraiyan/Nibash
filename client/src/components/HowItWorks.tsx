export function HowItWorks() {
  const steps = [
    {
      step: "01",
      title: "Search & Curate",
      subtitle: "Filter verified residences tailored to your lifestyle",
      description:
        "Browse high-definition architectural photography, precise floor plans, verified pricing breakdown, and 3D virtual walkthroughs without misleading advertisements.",
      icon: "travel_explore",
      highlight: "100% Authentic Imagery",
    },
    {
      step: "02",
      title: "Inspect & Apply",
      subtitle: "Seamless private viewings & verified identity",
      description:
        "Book private viewings with our dedicated leasing concierge and submit rental applications verified via secure National ID (NID) integration.",
      icon: "fingerprint",
      highlight: "NID-Protected Identity",
    },
    {
      step: "03",
      title: "Sign & Move In",
      subtitle: "Legally structured online agreements & escrow",
      description:
        "Execute government-compliant digital tenancy contracts with electronic signatures, instant rent receipts, and security deposit escrow safeguards.",
      icon: "history_edu",
      highlight: "Instant Digital Contracts",
    },
  ];

  return (
    <section className="relative py-28 bg-[#0c0e12] overflow-hidden border-t border-white/5">
      {/* Background silver glow */}
      <div className="pointer-events-none absolute -bottom-20 right-10 w-[600px] h-[600px] rounded-full bg-radial from-slate-300/8 via-transparent to-transparent blur-3xl" />

      <div className="max-w-[1440px] mx-auto px-container-padding relative z-10">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full glass-panel-subtle border border-white/10 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#d4b068]" />
            <span className="font-label-sm text-[11px] uppercase tracking-[0.2em] text-[#cbd5e1]">
              Effortless Onboarding
            </span>
          </div>
          <h2 className="text-3xl md:text-5xl font-light text-[#f8f9fa] tracking-tight mb-4">
            How Renting On{" "}
            <span className="font-serif italic font-normal text-silver-gradient-text">
              Nibash Works
            </span>
          </h2>
          <p className="text-[#94a3b8] text-base leading-relaxed">
            From discovering your ideal sanctuary to signing legal agreements,
            we have elevated every step of residential leasing.
          </p>
        </div>

        {/* 3 Step Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Subtle connection line on desktop */}
          <div className="hidden md:block absolute top-1/3 left-[15%] right-[15%] h-[1px] bg-gradient-to-r from-white/5 via-white/25 to-white/5 pointer-events-none" />

          {steps.map((item) => (
            <div
              key={item.step}
              className="group relative rounded-3xl p-8 glass-panel border border-white/10 hover:border-white/30 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] flex flex-col justify-between"
            >
              <div>
                {/* Step indicator and Icon */}
                <div className="flex items-center justify-between mb-8">
                  <span className="text-4xl font-serif text-[#cbd5e1] font-normal">
                    {item.step}
                  </span>
                  <div className="w-14 h-14 rounded-2xl glass-panel-silver border border-white/15 flex items-center justify-center text-[#f8fafc] group-hover:scale-110 transition-transform duration-300 shadow-md">
                    <span className="material-symbols-outlined text-2xl text-[#cbd5e1]">
                      {item.icon}
                    </span>
                  </div>
                </div>

                <h3 className="text-xl font-medium text-white mb-2 group-hover:text-[#e2e8f0] transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs font-label-sm uppercase tracking-wider text-[#cbd5e1] mb-4">
                  {item.subtitle}
                </p>
                <p className="text-sm text-[#94a3b8] leading-relaxed mb-6 font-normal">
                  {item.description}
                </p>
              </div>

              {/* Bottom pill */}
              <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                <span className="text-xs text-[#94a3b8] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#d4b068]" />
                  {item.highlight}
                </span>
                <span className="material-symbols-outlined text-sm text-[#cbd5e1] opacity-0 group-hover:opacity-100 transition-opacity">
                  check_circle
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

