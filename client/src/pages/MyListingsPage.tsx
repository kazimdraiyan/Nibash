import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../api/client";
import { PropertyCard } from "../components/PropertyCard";
import type { BackendListing } from "./ListingsPage";

export interface ListingWithApplications extends BackendListing {
  applicationCount: number;
  ongoing_contract_id?: number | null;
}

export function MyListingsPage() {
  const [listings, setListings] = useState<ListingWithApplications[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMyListingsAndApplications = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch the owner's listings
      const res = await apiClient.get<{ listings: BackendListing[] }>("/listings/my");
      const rawListings = res.listings || [];

      // 2. For each listing, fetch GET /api/applications/${listing.id} to get application count
      const listingsWithApps: ListingWithApplications[] = await Promise.all(
        rawListings.map(async (item) => {
          try {
            const appRes = await apiClient.get<{ applications: any[] }>(
              `/applications/${item.id}`
            );
            return {
              ...item,
              applicationCount: Array.isArray(appRes.applications)
                ? appRes.applications.length
                : 0,
            };
          } catch (appErr) {
            return {
              ...item,
              applicationCount: 0,
            };
          }
        })
      );

      setListings(listingsWithApps);
    } catch (err: any) {
      console.error("[MyListingsPage] Failed to load listings:", err);
      setError(err.message || "Failed to load your listings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyListingsAndApplications();
  }, []);

  const occupiedListings = listings.filter((l) => l.status === "occupied");
  const waitingListings = listings.filter((l) => l.status === "waiting");
  const approvedListings = listings.filter((l) => l.status === "approved");
  const otherListings = listings.filter(
    (l) => l.status !== "waiting" && l.status !== "approved" && l.status !== "occupied"
  );

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 min-h-[75vh]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              to="/listings"
              className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-xs">arrow_back</span>
              <span>All Apartments</span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-white tracking-tight">
              My Apartments & Listings
            </h1>
            {!loading && (
              <span className="text-xs font-semibold text-[#d4b068] bg-[#d4b068]/15 border border-[#d4b068]/30 px-2.5 py-0.5 rounded-full">
                {listings.length} {listings.length === 1 ? "Property" : "Properties"}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Manage your owned properties, track approval statuses, and review tenant applications.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={fetchMyListingsAndApplications}
            disabled={loading}
            className="px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-500/10 text-xs font-medium text-slate-300 hover:bg-slate-500/20  hover:text-white hover:border-slate-500 transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            title="Refresh Listings"
          >
            <span className={`material-symbols-outlined text-sm ${loading ? "animate-spin" : ""}`}>
              refresh
            </span>
            <span>Refresh</span>
          </button>

          <Link
            to="/owner/income"
            className="px-3.5 py-2.5 rounded-xl border border-slate-500/40 bg-slate-500/10 text-slate-300 hover:bg-slate-500/20 hover:text-white text-xs font-semibold uppercase tracking-wider transition text-center flex items-center gap-1.5 shadow-sm cursor-pointer"
            title="View Rental Income"
          >
            <span className="material-symbols-outlined text-base">payments</span>
            <span>Rental Income</span>
          </Link>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="py-24 text-center text-slate-400">
          <div className="w-10 h-10 rounded-full border-2 border-[#d4b068]/60 border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-sm text-white font-medium mb-1">Loading your properties...</p>
          <p className="text-xs text-slate-500">Checking approval statuses and tenant applications</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="p-5 bg-red-950/60 border border-red-800 text-red-300 rounded-xl flex flex-col items-center justify-center gap-3 my-8 text-center">
          <span className="material-symbols-outlined text-3xl text-red-400">error</span>
          <p className="text-sm font-medium">{error}</p>
          <button
            onClick={fetchMyListingsAndApplications}
            className="px-4 py-2 bg-red-800 hover:bg-red-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition"
          >
            Retry Loading
          </button>
        </div>
      )}

      {/* Empty State (Overall) */}
      {!loading && !error && listings.length === 0 && (
        <div className="py-20 text-center border border-dashed border-slate-800 bg-[#12151c]/30 rounded-2xl p-8 my-6 max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto mb-4 text-slate-400">
            <span className="material-symbols-outlined text-3xl">real_estate_agent</span>
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No Property Listings Yet</h3>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            You have not registered any apartment listings in the Nibash database. Publish your property to find verified tenants and receive lease applications.
          </p>
          <Link
            to="/listings/new"
            className="inline-flex items-center gap-2 bg-white text-slate-900 font-semibold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider hover:bg-slate-200 transition cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">add_circle</span>
            <span>Post a Listing</span>
          </Link>
        </div>
      )}

      {/* Sections: Ongoing Contracts, Waiting for Approval & Approved */}
      {!loading && !error && listings.length > 0 && (
        <div className="flex flex-col gap-12">
          {/* Section 0: Ongoing Contracts (Occupied Listings) */}
          <div>
            <div className="flex items-center gap-3 mb-5 pb-3 border-b border-slate-800">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Ongoing Contracts
              </h2>
              <span className="text-xs font-semibold text-slate-300 bg-slate-950/70 border border-slate-600/60 px-2.5 py-0.5 rounded-full">
                {occupiedListings.length}
              </span>
            </div>

            {occupiedListings.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-800 bg-[#12151c]/30 rounded-xl">
                No occupied listings with ongoing contracts
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {occupiedListings.map((item) => (
                  <PropertyCard key={item.id} listing={item} isOwn />
                ))}
              </div>
            )}
          </div>
          {/* Section 1: Waiting for Approval */}
          <div>
            <div className="flex items-center gap-3 mb-5 pb-3 border-b border-slate-800">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Waiting for Approval
              </h2>
              <span className="text-xs font-semibold text-slate-300 bg-slate-950/70 border border-slate-600/60 px-2.5 py-0.5 rounded-full">
                {waitingListings.length}
              </span>
            </div>

            {waitingListings.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-800 bg-[#12151c]/30 rounded-xl">
                No waiting listings
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {waitingListings.map((item) => (
                  <PropertyCard key={item.id} listing={item} isOwn />
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Approved */}
          <div>
            <div className="flex items-center gap-3 mb-5 pb-3 border-b border-slate-800">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Approved
              </h2>
              <span className="text-xs font-semibold text-slate-300 bg-slate-950/70 border border-slate-600/60 px-2.5 py-0.5 rounded-full">
                {approvedListings.length}
              </span>
            </div>

            {approvedListings.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-800 bg-[#12151c]/30 rounded-xl">
                No approved listings
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {approvedListings.map((item) => (
                  <PropertyCard key={item.id} listing={item} isOwn />
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Other statuses (e.g. unavailable/occupied) if any exist */}
          {otherListings.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-5 pb-3 border-b border-slate-800">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Other Apartments
                </h2>
                <span className="text-xs font-semibold text-rose-300 bg-rose-950/70 border border-rose-600/60 px-2.5 py-0.5 rounded-full">
                  {otherListings.length}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {otherListings.map((item) => (
                  <PropertyCard key={item.id} listing={item} isOwn />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
