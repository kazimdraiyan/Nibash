import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../api/client";
import { getAreaName } from "../utils/areaLookup";
import type { BackendListing } from "./ListingsPage";

export interface ListingWithApplications extends BackendListing {
  applicationCount: number;
  ongoing_contract_id?: number | null;
}

function ApplicationCountBadge({ count }: { count: number }) {
  if (count === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-800/80 text-slate-400 border border-slate-700/80">
        <span className="material-symbols-outlined text-xs">folder_open</span>
        <span>No Applications</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#d4b068]/15 text-[#d4b068] border border-[#d4b068]/40 shadow-sm">
      <span className="material-symbols-outlined text-xs">group</span>
      <span>
        {count} {count === 1 ? "Application" : "Applications"}
      </span>
    </span>
  );
}

function MyListingCard({ item }: { item: ListingWithApplications }) {
  const [imgError, setImgError] = useState(false);
  const isOccupied = item.status === "occupied";
  const areaName = getAreaName(item.area_id);

  // Status mapping
  const rawStatus = item.status?.trim() || "approved";
  const statusDisplay = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase();
  const isApproved = statusDisplay.toLowerCase() === "approved";
  const isWaiting =
    statusDisplay.toLowerCase() === "waiting" || statusDisplay.toLowerCase() === "pending";

  // Price formatting
  const rawPrice =
    item.rent !== undefined && item.rent !== null && item.rent !== ""
      ? Number(item.rent)
      : (item as any).price !== undefined && (item as any).price !== null
      ? Number((item as any).price)
      : null;

  const priceFormatted =
    rawPrice !== null && !isNaN(rawPrice)
      ? `৳${rawPrice.toLocaleString()}`
      : null;

  // Image URL
  const imageUrl =
    item.images && Array.isArray(item.images) && item.images.length > 0 && item.images[0]?.url
      ? item.images[0].url
      : (item as any).imageUrl || null;

  const hasValidImage = Boolean(imageUrl && !imgError);

  const cardTarget = isOccupied && item.ongoing_contract_id
    ? `/contracts/${item.ongoing_contract_id}`
    : `/listings/${item.id}`;

  return (
    <div className="group relative rounded-2xl overflow-hidden glass-panel border border-white/10 hover:border-white/30 transition-all duration-500 hover:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.85)] flex flex-col cursor-pointer bg-[#12151c]/90 text-left">
      <Link to={cardTarget} className="flex flex-col flex-grow">
        {/* Property Image Container */}
        <div className="relative h-72 w-full overflow-hidden bg-[#0d1017] border-b border-white/5">
          {hasValidImage ? (
            <img
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
              src={imageUrl!}
              alt={item.title || "Luxury apartment"}
              loading="lazy"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-700">
              <span className="material-symbols-outlined text-5xl">apartment</span>
            </div>
          )}

          {/* Charcoal & Silver subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#090a0c] via-transparent to-black/35 pointer-events-none" />

          {/* Top Badges */}
          <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <span className="glass-panel-subtle px-3 py-1 rounded-full text-[11px] font-label-sm uppercase tracking-wider text-[#d4b068] border border-[#d4b068]/40 shadow-md">
                Your Listing
              </span>
              <span
                className={`glass-panel-subtle px-3 py-1 rounded-full text-[11px] font-label-sm uppercase tracking-wider shadow-md flex items-center gap-1.5 border ${
                  isApproved
                    ? "text-emerald-300 border-emerald-500/40 bg-emerald-950/50"
                    : isWaiting
                    ? "text-amber-300 border-amber-500/40 bg-amber-950/50"
                    : isOccupied
                    ? "text-emerald-300 border-emerald-500/40 bg-emerald-950/50"
                    : "text-slate-300 border-slate-700 bg-slate-800/60"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isApproved || isOccupied
                      ? "bg-emerald-400"
                      : isWaiting
                      ? "bg-amber-400 animate-pulse"
                      : "bg-slate-400"
                  }`}
                />
                Status: {isOccupied ? "Occupied" : statusDisplay}
              </span>
            </div>
          </div>

          {/* Floating Quick Price Tag */}
          {priceFormatted && (
            <div className="absolute bottom-3 left-3.5 z-10">
              <div className="text-[10px] text-[#94a3b8] font-label-sm uppercase tracking-wider mb-0.5">
                Monthly Rent
              </div>
              <div className="text-2xl font-serif text-white font-normal flex items-baseline gap-1">
                <span>{priceFormatted}</span>
                <span className="text-xs text-[#94a3b8] font-sans">/mo</span>
              </div>
            </div>
          )}
        </div>

        {/* Card Body Details */}
        <div className="p-5 flex flex-col justify-between flex-grow gap-4">
          <div>
            <h3 className="text-base font-medium text-white group-hover:text-[#e2e8f0] transition-colors line-clamp-1 mb-1">
              {item.title}
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-[#94a3b8]">
              <span className="material-symbols-outlined text-sm text-[#cbd5e1]">
                location_on
              </span>
              <span className="line-clamp-1">{areaName}</span>
            </div>
          </div>

          {/* Specs Grid */}
          <div className="grid grid-cols-3 gap-2 py-2.5 px-3 rounded-xl glass-panel-subtle border border-white/5 text-center">
            <div className="flex flex-col items-center">
              <span className="text-xs font-semibold text-white">{item.bedroom_count}</span>
              <span className="text-[10px] uppercase font-label-sm text-[#94a3b8]">
                Bedrooms
              </span>
            </div>
            <div className="flex flex-col items-center border-x border-white/10">
              <span className="text-xs font-semibold text-white">{item.bathroom_count}</span>
              <span className="text-[10px] uppercase font-label-sm text-[#94a3b8]">
                Baths
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xs font-semibold text-white">
                {item.on_which_floor ? `Floor ${item.on_which_floor}` : "Standard"}
              </span>
              <span className="text-[10px] uppercase font-label-sm text-[#94a3b8]">
                Floor Level
              </span>
            </div>
          </div>

          {/* Bottom CTA Row */}
          <div className="flex items-center justify-between pt-1 border-t border-white/5 gap-2">
            <div>
              {isOccupied && item.ongoing_contract_id ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 shadow-sm">
                  <span className="material-symbols-outlined text-xs">description</span>
                  <span>Contract #{item.ongoing_contract_id}</span>
                </span>
              ) : (
                <ApplicationCountBadge count={item.applicationCount} />
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {isOccupied && (
                <Link
                  to="/owner/income"
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs text-amber-400 hover:text-amber-300 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition flex items-center gap-1 font-medium"
                  title="View rental income for this property"
                >
                  <span className="material-symbols-outlined text-xs">payments</span>
                  <span className="hidden sm:inline">Income</span>
                </Link>
              )}
              <Link
                to={`/listings/${item.id}#tenant-history`}
                onClick={(e) => e.stopPropagation()}
                className="text-xs text-sky-400 hover:text-sky-300 px-2 py-1 rounded bg-sky-500/10 border border-sky-500/30 hover:bg-sky-500/20 transition flex items-center gap-1 font-medium"
                title="View tenant history for this property"
              >
                <span className="material-symbols-outlined text-xs">history</span>
                <span className="hidden sm:inline">Tenants</span>
              </Link>
              <Link
                to={`/listings/${item.id}/edit`}
                onClick={(e) => e.stopPropagation()}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-800 transition"
                title="Edit listing details"
              >
                Edit
              </Link>
              <span className="text-xs text-slate-300 group-hover:text-white font-medium flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </span>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
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
            className="px-3.5 py-2.5 rounded-xl border border-slate-700 bg-[#12151c] text-xs font-medium text-slate-300 hover:text-white hover:border-slate-500 transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            title="Refresh Listings"
          >
            <span className={`material-symbols-outlined text-sm ${loading ? "animate-spin" : ""}`}>
              refresh
            </span>
            <span>Refresh</span>
          </button>

          <Link
            to="/owner/income"
            className="px-3.5 py-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:text-white text-xs font-semibold uppercase tracking-wider transition text-center flex items-center gap-1.5 shadow-sm cursor-pointer"
            title="View Rental Income"
          >
            <span className="material-symbols-outlined text-base text-amber-400">payments</span>
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
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <h2 className="text-xl font-bold text-white tracking-tight">
                Ongoing Contracts
              </h2>
              <span className="text-xs font-semibold text-emerald-300 bg-emerald-950/70 border border-emerald-600/60 px-2.5 py-0.5 rounded-full">
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
                  <MyListingCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </div>
          {/* Section 1: Waiting for Approval */}
          <div>
            <div className="flex items-center gap-3 mb-5 pb-3 border-b border-slate-800">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <h2 className="text-xl font-bold text-white tracking-tight">
                Waiting for Approval
              </h2>
              <span className="text-xs font-semibold text-amber-300 bg-amber-950/70 border border-amber-600/60 px-2.5 py-0.5 rounded-full">
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
                  <MyListingCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Approved */}
          <div>
            <div className="flex items-center gap-3 mb-5 pb-3 border-b border-slate-800">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <h2 className="text-xl font-bold text-white tracking-tight">
                Approved
              </h2>
              <span className="text-xs font-semibold text-emerald-300 bg-emerald-950/70 border border-emerald-600/60 px-2.5 py-0.5 rounded-full">
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
                  <MyListingCard key={item.id} item={item} />
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
                  <MyListingCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
