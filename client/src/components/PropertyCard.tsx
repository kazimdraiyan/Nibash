import { useState } from "react";
import type { Listing } from "../types/listing";

interface PropertyCardProps {
  listing: Listing;
  onSelect?: (listing: Listing) => void;
}

export function PropertyCard({ listing, onSelect }: PropertyCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);

  return (
    <div
      onClick={() => onSelect?.(listing)}
      className="group relative rounded-2xl overflow-hidden glass-panel border border-white/10 hover:border-white/30 transition-all duration-500 hover:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.85)] flex flex-col cursor-pointer"
    >
      {/* Property Image Container with Aspect Ratio */}
      <div className="relative h-72 w-full overflow-hidden">
        <img
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          src={listing.imageUrl}
          alt={listing.imageAlt || listing.title || "Luxury residence"}
          loading="lazy"
        />

        {/* Charcoal & Silver subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#090a0c] via-transparent to-black/35 pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            {listing.verified && (
              <span className="glass-panel-subtle px-3 py-1 rounded-full text-[11px] font-label-sm uppercase tracking-wider text-white border border-white/15 flex items-center gap-1.5 shadow-md">
                <span className="material-symbols-outlined text-[14px] text-[#cbd5e1]">
                  verified
                </span>
                Verified
              </span>
            )}
            {listing.propertyType && (
              <span className="glass-panel-subtle px-2.5 py-1 rounded-full text-[11px] font-label-sm uppercase tracking-wider text-[#cbd5e1] border border-white/15 shadow-md">
                {listing.propertyType}
              </span>
            )}
          </div>

          {/* Interactive Favorite Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsFavorite(!isFavorite);
            }}
            aria-label="Save listing"
            className={`w-9 h-9 rounded-full glass-panel-subtle border border-white/20 flex items-center justify-center transition-all duration-300 hover:scale-110 cursor-pointer ${
              isFavorite
                ? "bg-white/20 text-[#d4b068] border-[#d4b068]/50 shadow-[0_0_15px_rgba(212,175,85,0.4)]"
                : "text-white/80 hover:text-white"
            }`}
          >
            <span
              className="material-symbols-outlined text-[18px]"
              style={{
                fontVariationSettings: isFavorite ? "'FILL' 1" : "'FILL' 0",
              }}
            >
              favorite
            </span>
          </button>
        </div>

        {/* Floating Quick Price Tag */}
        <div className="absolute bottom-3 left-3.5 z-10">
          <div className="text-[10px] text-[#94a3b8] font-label-sm uppercase tracking-wider mb-0.5">
            Monthly Rent
          </div>
          <div className="text-2xl font-serif text-white font-normal flex items-baseline gap-1">
            <span>৳{listing.price.toLocaleString()}</span>
            <span className="text-xs text-[#94a3b8] font-sans">/mo</span>
          </div>
        </div>
      </div>

      {/* Card Body Details */}
      <div className="p-5 flex flex-col justify-between flex-grow gap-4">
        <div>
          <h3 className="text-base font-medium text-white group-hover:text-[#e2e8f0] transition-colors line-clamp-1 mb-1">
            {listing.title || `Residence in ${listing.location}`}
          </h3>
          <div className="flex items-center gap-1.5 text-xs text-[#94a3b8]">
            <span className="material-symbols-outlined text-sm text-[#cbd5e1]">
              location_on
            </span>
            <span className="line-clamp-1">{listing.location}</span>
          </div>
        </div>

        {/* Specs Grid */}
        <div className="grid grid-cols-3 gap-2 py-2.5 px-3 rounded-xl glass-panel-subtle border border-white/5 text-center">
          <div className="flex flex-col items-center">
            <span className="text-xs font-semibold text-white">{listing.beds}</span>
            <span className="text-[10px] uppercase font-label-sm text-[#94a3b8]">
              Bedrooms
            </span>
          </div>
          <div className="flex flex-col items-center border-x border-white/10">
            <span className="text-xs font-semibold text-white">{listing.baths}</span>
            <span className="text-[10px] uppercase font-label-sm text-[#94a3b8]">
              Baths
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xs font-semibold text-white">{listing.sqft}</span>
            <span className="text-[10px] uppercase font-label-sm text-[#94a3b8]">
              Sq Ft
            </span>
          </div>
        </div>

        {/* Bottom CTA Row */}
        <div className="flex items-center justify-between pt-1 border-t border-white/5">
          <div className="flex items-center gap-1 text-xs text-[#d4b068]">
            <span>★</span>
            <span className="font-semibold text-white">
              {listing.rating || "4.9"}
            </span>
            <span className="text-[#94a3b8] text-[11px] font-sans">(Verified)</span>
          </div>

          <div className="inline-flex items-center gap-1 text-xs font-label-sm uppercase tracking-wider text-[#cbd5e1] group-hover:text-white group-hover:translate-x-1 transition-all">
            <span>Explore</span>
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </div>
        </div>
      </div>
    </div>
  );
}


