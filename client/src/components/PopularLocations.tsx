export function PopularLocations() {
  const locations = [
    {
      name: "Gulshan 1 & 2",
      city: "Dhaka North",
      listingsCount: 142,
      priceFrom: "৳75,000",
      description: "Diplomatic enclaves, fine dining, and elite high-rise penthouses.",
      imageUrl:
        "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
    },
    {
      name: "Banani",
      city: "Dhaka North",
      listingsCount: 98,
      priceFrom: "৳60,000",
      description: "Cosmopolitan avenues, modern architecture, and vibrant urban culture.",
      imageUrl:
        "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80",
    },
    {
      name: "Dhanmondi",
      city: "Dhaka South",
      listingsCount: 115,
      priceFrom: "৳50,000",
      description: "Lakeside serenity, heritage tree-lined avenues, and premier schools.",
      imageUrl:
        "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=800&q=80",
    },
    {
      name: "Baridhara DOHS",
      city: "Dhaka North",
      listingsCount: 46,
      priceFrom: "৳110,000",
      description: "Unrivaled security, tranquil parks, and ambassadorial residences.",
      imageUrl:
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
    },
    {
      name: "Bashundhara R/A",
      city: "Dhaka North",
      listingsCount: 180,
      priceFrom: "৳35,000",
      description: "Master-planned residential township with wide avenues and peace.",
      imageUrl:
        "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80",
    },
    {
      name: "Uttara Sectors",
      city: "Dhaka North",
      listingsCount: 124,
      priceFrom: "৳40,000",
      description: "Modern gated sectors, rapid metro connectivity, and open green zones.",
      imageUrl:
        "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80",
    },
  ];

  return (
    <section className="relative py-28 bg-[#090a0c] overflow-hidden">
      {/* Subtle radial silver glow */}
      <div className="pointer-events-none absolute top-1/3 left-0 w-[550px] h-[550px] rounded-full bg-radial from-slate-400/8 via-transparent to-transparent blur-3xl" />

      <div className="max-w-[1440px] mx-auto px-container-padding relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full glass-panel-subtle border border-white/10 mb-3.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d4b068]" />
              <span className="font-label-sm text-[11px] uppercase tracking-[0.2em] text-[#cbd5e1]">
                Prime Neighborhoods
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-light text-[#f8f9fa] tracking-tight">
              Explore By{" "}
              <span className="font-serif italic font-normal text-silver-gradient-text">
                Prestigious Location
              </span>
            </h2>
            <p className="text-[#94a3b8] text-sm md:text-base max-w-xl mt-2 font-normal">
              Find your ideal residence in Dhaka's most sought-after urban sanctuaries.
            </p>
          </div>

          <a
            href="#featured-properties"
            className="hidden md:inline-flex items-center gap-2 font-label-sm text-xs uppercase tracking-widest text-[#cbd5e1] hover:text-white transition-colors"
          >
            <span>View All Neighborhoods</span>
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </a>
        </div>

        {/* Locations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {locations.map((loc) => (
            <div
              key={loc.name}
              className="group relative rounded-3xl overflow-hidden glass-panel border border-white/10 hover:border-white/30 transition-all duration-500 hover:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.85)] cursor-pointer h-96 flex flex-col justify-end p-6"
            >
              {/* Background Image with Zoom */}
              <img
                src={loc.imageUrl}
                alt={loc.name}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                loading="lazy"
              />

              {/* Charcoal & Silver Gradient Overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#090a0c] via-[#090a0c]/70 to-black/35 group-hover:via-[#14171f]/60 transition-colors duration-500" />

              {/* Top Meta Badges */}
              <div className="absolute top-5 left-5 right-5 flex items-center justify-between z-10">
                <span className="glass-panel-subtle px-3 py-1 rounded-full text-xs font-label-sm uppercase tracking-wider text-white/90 border border-white/15">
                  {loc.city}
                </span>
                <span className="glass-panel-silver px-3 py-1 rounded-full text-xs font-label-sm font-semibold text-[#f8fafc] border border-white/20">
                  {loc.listingsCount} Residences
                </span>
              </div>

              {/* Content */}
              <div className="relative z-10 flex flex-col gap-2">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-2xl font-serif text-white group-hover:text-[#e2e8f0] transition-colors">
                    {loc.name}
                  </h3>
                  <span className="text-xs text-[#cbd5e1] font-label-sm">
                    From {loc.priceFrom}/mo
                  </span>
                </div>
                <p className="text-xs text-[#94a3b8] line-clamp-2 leading-relaxed font-normal">
                  {loc.description}
                </p>

                <div className="pt-2 flex items-center gap-1 text-xs font-label-sm uppercase tracking-widest text-[#cbd5e1] group-hover:text-white group-hover:translate-x-1 transition-transform">
                  <span>Explore Residences</span>
                  <span className="material-symbols-outlined text-sm">north_east</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

