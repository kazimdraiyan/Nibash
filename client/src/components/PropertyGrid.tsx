import { useState } from "react";
import { PropertyCard } from "./PropertyCard";
import type { Listing } from "../types/listing";

export function PropertyGrid({ listings }: { listings: Listing[] }) {
  const [activeTab, setActiveTab] = useState<string>("All");
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);

  const filterTabs = [
    "All",
    "Penthouse",
    "Apartment",
    "Duplex",
    "Studio",
  ];

  const filteredListings =
    activeTab === "All"
      ? listings
      : listings.filter((l) => l.propertyType === activeTab);

  return (
    <section id="featured-properties" className="relative py-24 bg-[#090a0c] overflow-hidden">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] rounded-full bg-radial from-slate-400/8 via-transparent to-transparent blur-3xl" />

      <div className="max-w-[1440px] mx-auto px-container-padding relative z-10">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full glass-panel-subtle border border-white/10 mb-3.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d4b068]" />
              <span className="font-label-sm text-[11px] uppercase tracking-[0.2em] text-[#e2e8f0]">
                Exclusive Portfolio
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-light text-[#f8f9fa] tracking-tight">
              Featured{" "}
              <span className="font-serif italic font-normal text-silver-gradient-text">
                Luxury Residences
              </span>
            </h2>
            <p className="text-sm md:text-base text-[#94a3b8] max-w-xl mt-2 font-normal">
              Explore meticulously verified homes crafted for refined living across Dhaka's premier neighborhoods.
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl glass-panel-subtle border border-white/10 overflow-x-auto max-w-full">
            {filterTabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl text-xs font-label-sm uppercase tracking-wider transition-all duration-300 whitespace-nowrap cursor-pointer ${
                  activeTab === tab
                    ? "glass-button-silver text-[#090a0c] font-semibold"
                    : "text-[#94a3b8] hover:text-white hover:bg-white/5"
                }`}
              >
                {tab === "All" ? "All Residences" : `${tab}s`}
              </button>
            ))}
          </div>
        </div>

        {/* Property Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredListings.map((listing) => (
            <PropertyCard
              key={listing.id}
              listing={listing}
              onSelect={(item) => setSelectedListing(item)}
            />
          ))}
        </div>

        {/* Empty state if filter yields nothing */}
        {filteredListings.length === 0 && (
          <div className="glass-panel rounded-2xl p-12 text-center my-8">
            <span className="material-symbols-outlined text-4xl text-[#cbd5e1] mb-2">
              real_estate_agent
            </span>
            <h3 className="text-lg font-medium text-white mb-1">
              No residences found in this category
            </h3>
            <p className="text-sm text-[#94a3b8] mb-4">
              Explore our other categories or request a bespoke property inquiry.
            </p>
            <button
              type="button"
              onClick={() => setActiveTab("All")}
              className="glass-button-silver px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider text-[#090a0c] font-semibold cursor-pointer"
            >
              Reset Category
            </button>
          </div>
        )}
      </div>

      {/* Quick View Modal */}
      {selectedListing && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md transition-opacity animate-fadeIn"
          onClick={() => setSelectedListing(null)}
        >
          <div
            className="relative max-w-2xl w-full rounded-3xl overflow-hidden glass-panel-silver border border-white/20 p-6 sm:p-8 max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setSelectedListing(null)}
              className="absolute top-5 right-5 w-10 h-10 rounded-full glass-panel-subtle border border-white/20 text-white flex items-center justify-center hover:bg-white/10 transition-colors z-20 cursor-pointer"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            {/* Modal Image */}
            <div className="relative h-64 sm:h-72 w-full rounded-2xl overflow-hidden mb-6">
              <img
                src={selectedListing.imageUrl}
                alt={selectedListing.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#090a0c] via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                <div>
                  <span className="text-xs text-[#cbd5e1] uppercase tracking-wider font-label-sm">
                    {selectedListing.propertyType}
                  </span>
                  <h3 className="text-2xl font-serif text-white">
                    {selectedListing.title}
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-xs text-[#94a3b8] block">Rent / mo</span>
                  <span className="text-2xl font-bold text-white">
                    ৳{selectedListing.price.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Specs */}
            <div className="grid grid-cols-4 gap-3 py-3 px-4 rounded-xl glass-panel-subtle border border-white/10 text-center mb-6">
              <div>
                <span className="block text-sm font-semibold text-white">
                  {selectedListing.beds}
                </span>
                <span className="text-[11px] text-[#94a3b8] uppercase">Bedrooms</span>
              </div>
              <div className="border-l border-white/10">
                <span className="block text-sm font-semibold text-white">
                  {selectedListing.baths}
                </span>
                <span className="text-[11px] text-[#94a3b8] uppercase">Bathrooms</span>
              </div>
              <div className="border-l border-white/10">
                <span className="block text-sm font-semibold text-white">
                  {selectedListing.sqft}
                </span>
                <span className="text-[11px] text-[#94a3b8] uppercase">Sq Ft</span>
              </div>
              <div className="border-l border-white/10">
                <span className="block text-sm font-semibold text-white">
                  Floor {selectedListing.floor || 6}
                </span>
                <span className="text-[11px] text-[#94a3b8] uppercase">Elevator</span>
              </div>
            </div>

            {/* Highlights Tags */}
            {selectedListing.tags && (
              <div className="mb-6">
                <span className="text-xs font-label-sm uppercase tracking-wider text-[#cbd5e1] block mb-2">
                  Key Residence Features
                </span>
                <div className="flex flex-wrap gap-2">
                  {selectedListing.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 rounded-full text-xs glass-panel-subtle border border-white/10 text-white/90"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Modal CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  alert("Viewing request sent! Our luxury leasing concierge will contact you within 2 hours.");
                  setSelectedListing(null);
                }}
                className="flex-1 glass-button-silver text-[#090a0c] font-label-sm text-xs uppercase tracking-widest py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 cursor-pointer font-semibold"
              >
                <span className="material-symbols-outlined text-base">calendar_month</span>
                <span>Schedule Private Viewing</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  alert("Digital lease application started. Log in or create an account to finalize your lease agreement.");
                  setSelectedListing(null);
                }}
                className="glass-button-outline text-white font-label-sm text-xs uppercase tracking-widest py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">description</span>
                <span>Apply Online</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}


