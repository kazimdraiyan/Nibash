export function WhyChooseUs() {
  const pillars = [
    {
      icon: "verified_user",
      title: "100% Verified Residences",
      description:
        "Every listing undergoes rigorous physical property inspections and deed verification before publication. Zero duplicate or ghost listings.",
      stat: "Zero Frauds",
    },
    {
      icon: "gavel",
      title: "Digital Legal Leases",
      description:
        "Execute legally binding lease contracts online under Bangladesh tenancy laws. Includes pre-agreed terms, rent schedules, and pet policies.",
      stat: "100% Compliant",
    },
    {
      icon: "account_balance_wallet",
      title: "Secure Escrow & Receipts",
      description:
        "Security deposits and rental payments are secured with automated digital receipts, instant dispute resolution, and traceable audit trails.",
      stat: "Automated Tracking",
    },
    {
      icon: "concierge",
      title: "Private Concierge Care",
      description:
        "From personalized viewing appointments to move-in coordination and maintenance requests, our luxury support team is at your disposal.",
      stat: "24/7 Dedicated",
    },
  ];

  return (
    <section className="relative py-28 bg-[#0c0e12] overflow-hidden border-t border-white/5">
      {/* Background silver glows */}
      <div className="pointer-events-none absolute top-1/2 right-1/4 w-[600px] h-[600px] rounded-full bg-radial from-slate-400/8 via-transparent to-transparent blur-3xl" />

      <div className="max-w-[1440px] mx-auto px-container-padding relative z-10">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full glass-panel-subtle border border-white/10 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#d4b068]" />
            <span className="font-label-sm text-[11px] uppercase tracking-[0.2em] text-[#cbd5e1]">
              Uncompromising Trust
            </span>
          </div>
          <h2 className="text-3xl md:text-5xl font-light text-[#f8f9fa] tracking-tight mb-4">
            Why Discerning Renters{" "}
            <span className="font-serif italic font-normal text-silver-gradient-text">
              Choose Nibash
            </span>
          </h2>
          <p className="text-[#94a3b8] text-base leading-relaxed">
            We eliminated informal verbal agreements, double-dealings, and untraceable payments
            to deliver an elevated residential rental standard.
          </p>
        </div>

        {/* 4 Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {pillars.map((item) => (
            <div
              key={item.title}
              className="group relative rounded-3xl p-8 glass-panel border border-white/10 hover:border-white/30 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_50px_-15px_rgba(0,0,0,0.85)] flex flex-col justify-between"
            >
              <div>
                <div className="w-14 h-14 rounded-2xl glass-panel-silver border border-white/15 flex items-center justify-center text-[#cbd5e1] mb-6 group-hover:scale-110 transition-transform duration-300 shadow-md">
                  <span className="material-symbols-outlined text-2xl">
                    {item.icon}
                  </span>
                </div>

                <h3 className="text-lg font-medium text-white mb-2 group-hover:text-[#e2e8f0] transition-colors">
                  {item.title}
                </h3>
                <p className="text-sm text-[#94a3b8] leading-relaxed font-normal mb-6">
                  {item.description}
                </p>
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                <span className="text-[11px] font-label-sm uppercase tracking-wider text-[#cbd5e1]">
                  Standard
                </span>
                <span className="text-xs font-semibold text-white/90">
                  {item.stat}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

