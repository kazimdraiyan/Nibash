import { useState, useEffect, useRef, useCallback } from "react";
import { mockListings } from "../data/mockListings";

export function Hero() {
  // Search filter states
  const [location, setLocation] = useState("Gulshan, Dhaka");
  const [propertyType, setPropertyType] = useState("All Types");
  const [priceRange, setPriceRange] = useState("৳60,000 - ৳120,000");

  // The 3 showcase properties
  const showcaseItems = mockListings.slice(0, 3);
  const itemCount = showcaseItems.length;

  // Unbounded continuous activeIndex that never overflows or disappears
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [cardSpacing, setCardSpacing] = useState(340);

  // Responsive offset tracking for card spacing
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setCardSpacing(275);
      } else if (window.innerWidth < 1024) {
        setCardSpacing(310);
      } else {
        setCardSpacing(340);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Touch swipe handling
  const touchStartX = useRef<number | null>(null);

  // Debounced manual navigation handlers to prevent rapid-click stutter
  const lastActionTime = useRef(0);

  const goToNext = useCallback(() => {
    const now = Date.now();
    if (now - lastActionTime.current < 400) return;
    lastActionTime.current = now;
    setActiveIndex((prev) => prev + 1);
  }, []);

  const goToPrev = useCallback(() => {
    const now = Date.now();
    if (now - lastActionTime.current < 400) return;
    lastActionTime.current = now;
    setActiveIndex((prev) => prev - 1);
  }, []);

  // Jump to specific dot with shortest slide direction
  const goToSlideIndex = useCallback(
    (targetDotIndex: number) => {
      const currentDot = ((activeIndex % itemCount) + itemCount) % itemCount;
      if (targetDotIndex === currentDot) return;
      let diff = targetDotIndex - currentDot;
      if (diff === 2) diff = -1;
      if (diff === -2) diff = 1;
      setActiveIndex((prev) => prev + diff);
    },
    [activeIndex, itemCount]
  );

  // Continuous auto-swipe every 4.5 seconds with rock-solid timer cleanup
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      goToNext();
    }, 4500);
    return () => clearInterval(interval);
  }, [isPaused, goToNext]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const element = document.getElementById("featured-properties");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        goToPrev();
      } else {
        goToNext();
      }
    }
    touchStartX.current = null;
  };

  // Normalized active index (0, 1, 2) for dots
  const activeDotIndex = ((activeIndex % itemCount) + itemCount) % itemCount;

  // Stable 7-slot offset window centered around activeIndex: [-3, -2, -1, 0, 1, 2, 3]
  const windowOffsets = [-3, -2, -1, 0, 1, 2, 3];


  return (
    <div className="relative min-h-[92vh] flex items-center justify-center overflow-hidden bg-[#090a0c] pt-8 pb-20">
      {/* Ambient background glows with subtle silver and cool metallic radial gradients */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-[650px] h-[650px] rounded-full bg-radial from-slate-300/10 via-slate-500/5 to-transparent blur-3xl opacity-60 animate-ambient-glow" />
      <div className="pointer-events-none absolute top-1/4 right-0 w-[600px] h-[600px] rounded-full bg-radial from-white/8 via-slate-400/5 to-transparent blur-3xl opacity-50" />
      <div className="pointer-events-none absolute -bottom-32 left-1/3 w-[500px] h-[500px] rounded-full bg-radial from-slate-400/8 to-transparent blur-3xl opacity-40" />

      {/* Subtle fine architectural grid */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.035] bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:64px_64px]" />

      <div className="relative z-10 max-w-[1440px] w-full mx-auto px-container-padding grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Column: Headline, Description & Glass Search Widget */}
        <div className="lg:col-span-6 flex flex-col gap-8">
          {/* Tagline pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-panel-subtle border border-white/10 w-fit shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#d4b068] animate-pulse" />
            <span className="font-label-sm text-[11px] uppercase tracking-[0.2em] text-[#e2e8f0]">
              Curated Luxury Living
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight text-[#f8f9fa] leading-[1.12]">
            Find a Place That{" "}
            <span className="font-serif italic font-normal text-silver-gradient-text block sm:inline">
              Feels Like Home.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-[#94a3b8] max-w-xl font-normal leading-relaxed">
            Discover and rent handpicked luxury residences, panoramic sky penthouses,
            and bespoke homes with verified authenticity and seamless digital contracts.
          </p>

          {/* Prominent Glass-style Property Search Component */}
          <form
            onSubmit={handleSearch}
            className="glass-search-bar rounded-2xl p-4 sm:p-5 flex flex-col gap-4 relative overflow-hidden"
          >
            {/* Subtle silver top border highlight */}
            <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/40 to-transparent" />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Location input */}
              <div className="glass-panel-subtle rounded-xl p-3 hover:border-white/30 transition-colors group">
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-sm text-[#cbd5e1]">
                    location_on
                  </span>
                  <span className="font-label-sm text-[11px] uppercase tracking-wider text-[#94a3b8]">
                    Location
                  </span>
                </div>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-transparent text-sm font-medium text-[#f8f9fa] focus:outline-none cursor-pointer"
                >
                  <option value="Gulshan, Dhaka" className="bg-[#12151c] text-white">
                    Gulshan, Dhaka
                  </option>
                  <option value="Banani, Dhaka" className="bg-[#12151c] text-white">
                    Banani, Dhaka
                  </option>
                  <option value="Dhanmondi, Dhaka" className="bg-[#12151c] text-white">
                    Dhanmondi, Dhaka
                  </option>
                  <option value="Baridhara, Dhaka" className="bg-[#12151c] text-white">
                    Baridhara DOHS
                  </option>
                  <option value="Uttara, Dhaka" className="bg-[#12151c] text-white">
                    Uttara, Dhaka
                  </option>
                  <option value="Bashundhara R/A" className="bg-[#12151c] text-white">
                    Bashundhara R/A
                  </option>
                </select>
              </div>

              {/* Property type selector */}
              <div className="glass-panel-subtle rounded-xl p-3 hover:border-white/30 transition-colors group">
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-sm text-[#cbd5e1]">
                    apartment
                  </span>
                  <span className="font-label-sm text-[11px] uppercase tracking-wider text-[#94a3b8]">
                    Property Type
                  </span>
                </div>
                <select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  className="w-full bg-transparent text-sm font-medium text-[#f8f9fa] focus:outline-none cursor-pointer"
                >
                  <option value="All Types" className="bg-[#12151c] text-white">
                    All Residences
                  </option>
                  <option value="Penthouse" className="bg-[#12151c] text-white">
                    Sky Penthouse
                  </option>
                  <option value="Apartment" className="bg-[#12151c] text-white">
                    Luxury Apartment
                  </option>
                  <option value="Duplex" className="bg-[#12151c] text-white">
                    Sovereign Duplex
                  </option>
                  <option value="Studio" className="bg-[#12151c] text-white">
                    Studio Loft
                  </option>
                </select>
              </div>

              {/* Price range selector */}
              <div className="glass-panel-subtle rounded-xl p-3 hover:border-white/30 transition-colors group">
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-sm text-[#cbd5e1]">
                    payments
                  </span>
                  <span className="font-label-sm text-[11px] uppercase tracking-wider text-[#94a3b8]">
                    Price Range
                  </span>
                </div>
                <select
                  value={priceRange}
                  onChange={(e) => setPriceRange(e.target.value)}
                  className="w-full bg-transparent text-sm font-medium text-[#f8f9fa] focus:outline-none cursor-pointer"
                >
                  <option value="৳30,000 - ৳60,000" className="bg-[#12151c] text-white">
                    ৳30k - ৳60k /mo
                  </option>
                  <option value="৳60,000 - ৳120,000" className="bg-[#12151c] text-white">
                    ৳60k - ৳120k /mo
                  </option>
                  <option value="৳120,000+" className="bg-[#12151c] text-white">
                    ৳120,000+ /mo
                  </option>
                </select>
              </div>
            </div>

            {/* Bottom row: Search CTA and Quick Trending Chips */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
              <div className="flex items-center gap-2 text-xs text-[#94a3b8] overflow-x-auto w-full sm:w-auto">
                <span className="text-[#cbd5e1] font-medium">Trending:</span>
                <button
                  type="button"
                  onClick={() => setLocation("Gulshan, Dhaka")}
                  className="hover:text-white transition-colors underline cursor-pointer"
                >
                  Gulshan 2
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => setLocation("Banani, Dhaka")}
                  className="hover:text-white transition-colors underline cursor-pointer"
                >
                  Banani
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => setLocation("Baridhara, Dhaka")}
                  className="hover:text-white transition-colors underline cursor-pointer"
                >
                  Baridhara
                </button>
              </div>

              {/* Luminous Silver CTA with Subtle Gold Glow on Hover */}
              <button
                type="submit"
                className="w-full sm:w-auto min-w-[160px] glass-button-silver py-3.5 px-6 rounded-xl flex items-center justify-center gap-2.5 cursor-pointer font-label-sm text-xs uppercase tracking-widest"
              >
                <span className="material-symbols-outlined text-lg">search</span>
                <span>Search Homes</span>
              </button>
            </div>
          </form>

          {/* Social Proof / Metrics Row */}
          <div className="grid grid-cols-3 gap-6 pt-2 border-t border-white/10">
            <div>
              <div className="text-2xl lg:text-3xl font-light text-[#f8f9fa] font-serif">
                1,200<span className="text-[#cbd5e1] font-sans">+</span>
              </div>
              <p className="text-xs text-[#94a3b8] uppercase tracking-wider font-label-sm mt-0.5">
                Verified Residences
              </p>
            </div>
            <div>
              <div className="text-2xl lg:text-3xl font-light text-[#f8f9fa] font-serif">
                100<span className="text-[#cbd5e1] font-sans">%</span>
              </div>
              <p className="text-xs text-[#94a3b8] uppercase tracking-wider font-label-sm mt-0.5">
                Digital Leases
              </p>
            </div>
            <div>
              <div className="text-2xl lg:text-3xl font-light text-[#f8f9fa] font-serif">
                4.96<span className="text-[#d4b068] text-xl ml-1">★</span>
              </div>
              <p className="text-xs text-[#94a3b8] uppercase tracking-wider font-label-sm mt-0.5">
                Tenant Satisfaction
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Stable Horizontal Image Swiping Carousel */}
        {/* Layout: ← [ Property Image Carousel ] → */}
        <div className="lg:col-span-6 flex flex-col items-center">
          <div className="relative w-full max-w-[560px] sm:max-w-[620px] mx-auto h-[480px] sm:h-[530px] flex items-center justify-center">
            {/* Left Arrow Button (Vertically Centered on Left Side) */}
            <button
              type="button"
              onClick={goToPrev}
              aria-label="Previous property"
              className="absolute -left-3 sm:-left-6 lg:-left-7 top-1/2 -translate-y-1/2 z-40 w-11 h-11 sm:w-12 sm:h-12 rounded-full glass-panel-silver border border-white/25 flex items-center justify-center text-white hover:text-white hover:border-white/60 hover:scale-110 active:scale-95 transition-all duration-300 cursor-pointer shadow-[0_10px_30px_rgba(0,0,0,0.8)] group"
            >
              <span className="material-symbols-outlined text-lg sm:text-xl group-hover:-translate-x-0.5 transition-transform">
                west
              </span>
            </button>

            {/* Stable Property Image Carousel Viewport */}
            <div
              className="relative w-full h-full overflow-hidden rounded-3xl"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
            >
              {/* Subtle edge fade gradient to enhance depth */}
              <div className="pointer-events-none absolute inset-y-0 left-0 w-12 sm:w-16 bg-gradient-to-r from-[#090a0c] via-[#090a0c]/50 to-transparent z-25" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-12 sm:w-16 bg-gradient-to-l from-[#090a0c] via-[#090a0c]/50 to-transparent z-25" />

              {/* Continuous, Indestructible Relative-Offset Horizontal Slider */}
              {windowOffsets.map((relOffset) => {
                const k = activeIndex + relOffset;
                const listing = showcaseItems[((k % itemCount) + itemCount) % itemCount];
                const isCenter = relOffset === 0;
                const isVisible = Math.abs(relOffset) <= 1;

                return (
                  <div
                    key={k}
                    onClick={() => {
                      if (!isCenter) {
                        setActiveIndex((prev) => prev + relOffset);
                      }
                    }}
                    className={`absolute w-[300px] sm:w-[370px] lg:w-[395px] h-[430px] sm:h-[480px] lg:h-[500px] rounded-3xl overflow-hidden glass-panel-silver p-2.5 sm:p-3 select-none ${
                      isCenter ? "cursor-default" : "cursor-pointer"
                    }`}
                    style={{
                      left: "50%",
                      top: "50%",
                      transform: `translate(calc(-50% + ${relOffset * cardSpacing}px), -50%) scale(${
                        isCenter ? 1 : 0.86
                      })`,
                      zIndex: isCenter ? 30 : 20 - Math.abs(relOffset),
                      opacity: isVisible ? (isCenter ? 1 : 0.55) : 0,
                      filter: isVisible
                        ? isCenter
                          ? "blur(0px)"
                          : "blur(0.5px)"
                        : "blur(2px)",
                      boxShadow: isCenter
                        ? "0 30px 75px -15px rgba(0, 0, 0, 0.95), 0 0 0 1px rgba(255, 255, 255, 0.22), 0 0 30px rgba(255, 255, 255, 0.08)"
                        : "0 15px 35px -10px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(226, 232, 240, 0.08)",
                      transition:
                        "transform 0.8s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.8s ease, filter 0.8s ease, box-shadow 0.8s ease",
                      pointerEvents: isVisible ? "auto" : "none",
                      willChange: "transform, opacity",
                    }}
                  >
                    <div className="relative w-full h-full rounded-2xl overflow-hidden group">
                      <img
                        src={listing.imageUrl}
                        alt={listing.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        draggable={false}
                        onError={(e) => {
                          // Fallback to guaranteed Unsplash URL if network fails
                          e.currentTarget.src =
                            "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80";
                        }}
                      />

                      {/* Dark gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#090a0c] via-[#090a0c]/25 to-transparent pointer-events-none" />

                      {/* Top Badges */}
                      <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between z-10">
                        <div className="glass-panel-subtle px-3 py-1 rounded-full flex items-center gap-1.5 border border-white/15 shadow-md">
                          <span className="material-symbols-outlined text-sm text-[#cbd5e1]">
                            verified
                          </span>
                          <span className="font-label-sm text-[11px] uppercase tracking-wider text-white">
                            Verified Residence
                          </span>
                        </div>

                        <div className="glass-panel-subtle px-2.5 py-1 rounded-full flex items-center gap-1 border border-white/15 shadow-md">
                          <span className="text-[#d4b068] text-xs">★</span>
                          <span className="text-xs font-semibold text-white">
                            {listing.rating}
                          </span>
                        </div>
                      </div>

                      {/* Bottom Details Overlay */}
                      <div className="absolute bottom-3 left-3 right-3 z-10">
                        <div className="glass-search-bar rounded-xl p-3.5 border border-white/15 backdrop-blur-xl">
                          <div className="text-[11px] text-[#cbd5e1] font-label-sm uppercase tracking-widest mb-0.5">
                            {listing.propertyType} • {listing.location}
                          </div>
                          <h3 className="text-base sm:text-lg font-medium text-white line-clamp-1 mb-2">
                            {listing.title}
                          </h3>

                          {/* Specs row */}
                          <div className="grid grid-cols-3 gap-1.5 py-1.5 border-y border-white/10 text-center mb-2.5">
                            <div>
                              <span className="block text-xs font-semibold text-white">
                                {listing.beds} Beds
                              </span>
                            </div>
                            <div className="border-x border-white/10">
                              <span className="block text-xs font-semibold text-white">
                                {listing.baths} Baths
                              </span>
                            </div>
                            <div>
                              <span className="block text-xs font-semibold text-white">
                                {listing.sqft} sqft
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-[10px] text-[#94a3b8] uppercase tracking-wider block font-label-sm">
                                Monthly Rent
                              </span>
                              <div className="text-lg sm:text-xl font-bold text-white">
                                ৳{listing.price.toLocaleString()}
                              </div>
                            </div>

                            <a
                              href="#featured-properties"
                              className="glass-button-silver px-3.5 py-1.5 rounded-lg text-xs font-semibold text-[#090a0c] flex items-center gap-1 hover:gap-1.5 transition-all cursor-pointer"
                            >
                              <span>Details</span>
                              <span className="material-symbols-outlined text-sm">
                                north_east
                              </span>
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Arrow Button (Vertically Centered on Right Side) */}
            <button
              type="button"
              onClick={goToNext}
              aria-label="Next property"
              className="absolute -right-3 sm:-right-6 lg:-right-8 top-1/2 -translate-y-1/2 z-40 w-11 h-11 sm:w-12 sm:h-12 rounded-full glass-panel-silver border border-white/25 flex items-center justify-center text-white hover:text-white hover:border-white/60 hover:scale-110 active:scale-95 transition-all duration-300 cursor-pointer shadow-[0_10px_30px_rgba(0,0,0,0.8)] group"
            >
              <span className="material-symbols-outlined text-lg sm:text-xl group-hover:translate-x-0.5 transition-transform">
                east
              </span>
            </button>

            {/* Stable Trust Badge 1 (Top Right) */}
            <div className="absolute -top-3 right-4 sm:right-8 glass-panel-subtle px-4 py-2.5 rounded-2xl border border-white/15 flex items-center gap-3 z-35 shadow-xl hidden sm:flex">
              <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-[#cbd5e1]">
                <span className="material-symbols-outlined text-lg">gavel</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-white">
                  Legally Structured
                </span>
                <span className="block text-[11px] text-[#94a3b8]">
                  Online Lease Contracts
                </span>
              </div>
            </div>

            {/* Stable Trust Badge 2 (Bottom Left) */}
            <div className="absolute -bottom-3 left-2 sm:left-4 glass-panel-subtle px-4 py-2.5 rounded-2xl border border-white/15 flex items-center gap-3 z-35 shadow-xl">
              <div className="w-9 h-9 rounded-xl bg-[#d4b068]/15 border border-[#d4b068]/30 flex items-center justify-center text-[#ebd6a5]">
                <span className="material-symbols-outlined text-lg">shield</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-white">
                  Escrow Protected
                </span>
                <span className="block text-[11px] text-[#94a3b8]">
                  Automated Rent Receipts
                </span>
              </div>
            </div>
          </div>

          {/* Indicator Dots Below Images (Clean 3 dots for the 3 residences, NO arrows below) */}
          <div className="flex items-center justify-center gap-2 mt-7">
            {showcaseItems.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => goToSlideIndex(idx)}
                className={`h-1.5 rounded-full transition-all duration-400 cursor-pointer ${
                  activeDotIndex === idx
                    ? "w-8 bg-white shadow-[0_0_12px_rgba(255,255,255,0.7)]"
                    : "w-2 bg-white/20 hover:bg-white/40"
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}



