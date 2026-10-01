import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../api/client";

interface AreaStatResponse {
  id: number;
  name: string;
  listing_count: number;
  min_rent: number | null;
  image_url: string | null;
}

interface AreaItem {
  id: number | string;
  name: string;
  listingsCount: number;
  priceFrom: string;
  description: string;
  imageUrl: string;
}

const AREA_EDITORIAL: Record<string, { description: string; imageUrl: string }> = {
  Gulshan: {
    description: "Diplomatic enclaves, fine dining, and elite high-rise penthouses.",
    imageUrl:
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
  },
  Banani: {
    description: "Cosmopolitan avenues, modern architecture, and vibrant urban culture.",
    imageUrl:
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80",
  },
  Dhanmondi: {
    description: "Lakeside serenity, heritage tree-lined avenues, and premier schools.",
    imageUrl:
      "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=800&q=80",
  },
  "Baridhara DOHS": {
    description: "Unrivaled security, tranquil parks, and ambassadorial apartments.",
    imageUrl:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
  },
  Bashundhara: {
    description: "Master-planned residential township with wide avenues and peace.",
    imageUrl:
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80",
  },
  "Bashundhara R/A": {
    description: "Master-planned residential township with wide avenues and peace.",
    imageUrl:
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80",
  },
  Uttara: {
    description: "Modern gated sectors, rapid metro connectivity, and open green zones.",
    imageUrl:
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80",
  },
  "Uttara Sectors": {
    description: "Modern gated sectors, rapid metro connectivity, and open green zones.",
    imageUrl:
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80",
  },
  Mirpur: {
    description: "Vibrant neighborhoods with excellent connectivity and living options.",
    imageUrl:
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80",
  },
  Mohammadpur: {
    description: "Convenient residential community with bustling markets and schools.",
    imageUrl:
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80",
  },
  Azimpur: {
    description: "Historic heart of Dhaka with close proximity to university campuses.",
    imageUrl:
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80",
  },
  Khilkhet: {
    description: "Rapidly growing neighborhood with quick airport and expressway access.",
    imageUrl:
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80",
  },
  Tejgaon: {
    description: "Central commercial and residential hub with excellent transit links.",
    imageUrl:
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80",
  },
  Badda: {
    description: "Convenient urban living close to major business centers and waterways.",
    imageUrl:
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80",
  },
  Lalbagh: {
    description: "Historic district famous for heritage architecture and rich traditions.",
    imageUrl:
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80",
  },
};

const DEFAULT_EDITORIAL = {
  description: "Find your ideal apartment in this vibrant Dhaka neighborhood.",
  imageUrl:
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
};

export function PopularLocations() {
  const navigate = useNavigate();
  const [locations, setLocations] = useState<AreaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    apiClient
      .get<{ areas: AreaStatResponse[] }>("/areas/stats")
      .then((res) => {
        if (!isMounted) return;
        const formatted: AreaItem[] = (res.areas || []).map((area) => {
          const editorial = AREA_EDITORIAL[area.name] || DEFAULT_EDITORIAL;
          return {
            id: area.id,
            name: area.name,
            listingsCount: area.listing_count,
            priceFrom:
              area.min_rent !== null && area.min_rent !== undefined
                ? `৳${Number(area.min_rent).toLocaleString()}`
                : "Contact for price",
            description: editorial.description,
            imageUrl: area.image_url || editorial.imageUrl,
          };
        });
        setLocations(formatted);
      })
      .catch((err) => {
        console.error("Failed to fetch area stats:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="relative py-28 bg-[#090a0c] overflow-hidden">
      {/* Subtle radial silver glow */}
      <div className="pointer-events-none absolute top-1/3 left-0 w-[550px] h-[550px] rounded-full bg-radial from-slate-400/8 via-transparent to-transparent blur-3xl" />

      <div className="max-w-[1440px] mx-auto px-container-padding relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-light text-[#f8f9fa] tracking-tight">
              Explore By{" "}
              <span className="font-serif italic font-normal text-silver-gradient-text">
                Location
              </span>
            </h2>
            <p className="text-[#94a3b8] text-sm md:text-base max-w-xl mt-2 font-normal">
              Find your ideal apartment in Dhaka's most sought-after urban sanctuaries.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/listings")}
            className="hidden md:inline-flex items-center gap-2 font-label-sm text-xs uppercase tracking-widest text-[#cbd5e1] hover:text-white transition-colors cursor-pointer"
          >
            <span>View All Neighborhoods</span>
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((placeholder) => (
              <div
                key={placeholder}
                className="h-96 rounded-3xl bg-white/5 animate-pulse border border-white/10"
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && locations.length === 0 && (
          <div className="text-center py-16 text-[#94a3b8] glass-panel rounded-3xl border border-white/10">
            <span className="material-symbols-outlined text-4xl mb-2 text-[#cbd5e1]">
              location_city
            </span>
            <p className="text-base font-medium text-[#f8f9fa]">
              No active listings by area yet
            </p>
            <p className="text-sm mt-1">
              Check back soon as new properties are added.
            </p>
          </div>
        )}

        {/* Locations Grid */}
        {!loading && locations.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {locations.map((loc) => (
              <div
                key={loc.name}
                onClick={() =>
                  navigate(`/listings?area=${encodeURIComponent(loc.name)}`)
                }
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
                  <span className="glass-panel-silver px-3 py-1 rounded-full text-xs font-label-sm font-semibold text-[#f8fafc] border border-white/20">
                    {loc.listingsCount} {loc.listingsCount === 1 ? "Apartment" : "Apartments"}
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
                    <span>Explore Apartments</span>
                    <span className="material-symbols-outlined text-sm">north_east</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
