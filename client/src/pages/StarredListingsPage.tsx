import { useState, useEffect } from "react";
import { apiClient } from "../api/client";
import { PropertyCard } from "../components/PropertyCard";
import type { BackendListing } from "./ListingsPage";

export function StarredListingsPage() {
  const [listings, setListings] = useState<BackendListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiClient
      .get<{ listings: BackendListing[] }>("/listings/starred")
      .then((res) => setListings(res.listings || []))
      .catch((err) => setError(err.message || "Failed to load starred listings."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 min-h-screen">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <span
            className="material-symbols-outlined text-2xl text-[#d4b068]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            grade
          </span>
          <h1 className="text-2xl font-bold text-white font-serif">
            Starred Listings
          </h1>
        </div>
        <p className="text-sm text-slate-400 ml-9">
          Your saved apartments — bookmarked for quick access.
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="py-24 text-center text-slate-400">
          <div className="w-8 h-8 rounded-full border-2 border-white/40 border-t-transparent animate-spin mx-auto mb-3" />
          <p className="text-sm">Loading starred listings...</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="p-4 bg-red-950/50 border border-red-800 text-red-300 rounded-xl text-sm text-center">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && listings.length === 0 && (
        <div className="py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center mx-auto mb-4">
            <span
              className="material-symbols-outlined text-3xl text-slate-500"
              style={{ fontVariationSettings: "'FILL' 0" }}
            >
              grade
            </span>
          </div>
          <h2 className="text-base font-semibold text-slate-200 mb-1">
            No starred listings yet
          </h2>
          <p className="text-sm text-slate-400 max-w-xs mx-auto">
            Browse apartments and click the star icon to save listings here for quick access.
          </p>
        </div>
      )}

      {/* Listings Grid */}
      {!loading && !error && listings.length > 0 && (
        <>
          <p className="text-xs text-slate-500 mb-5 font-mono">
            {listings.length} {listings.length === 1 ? "listing" : "listings"} starred
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {listings.map((listing) => (
              <PropertyCard
                key={listing.id}
                listing={listing}
                initialStarred={true}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
