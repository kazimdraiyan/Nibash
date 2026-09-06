import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { BackendListing } from "../pages/ListingsPage";
import {
  hasUserApplied,
  getUserApplication,
  type StoredApplication,
} from "../utils/applicationStorage";
import { ApplicationInfoModal } from "./ApplicationInfoModal";

export function StatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase() || "";
  if (s === "waiting" || s === "pending") {
    return (
      <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-300 bg-amber-950/70 border border-amber-500/50 px-2 py-0.5 rounded flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        {status}
      </span>
    );
  }
  if (s === "approved") {
    return (
      <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300 bg-emerald-950/70 border border-emerald-500/50 px-2 py-0.5 rounded flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        {status}
      </span>
    );
  }
  if (s === "unavailable" || s === "occupied" || s === "rejected") {
    return (
      <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-300 bg-rose-950/70 border border-rose-500/50 px-2 py-0.5 rounded flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
        {status}
      </span>
    );
  }
  return (
    <span className="text-[11px] font-medium text-slate-300 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded">
      {status}
    </span>
  );
}

export function ActualListings() {
  const { user, token } = useAuth();
  const [listings, setListings] = useState<BackendListing[]>([]);
  const [myListings, setMyListings] = useState<BackendListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected application modal state
  const [selectedApp, setSelectedApp] = useState<{
    listing: BackendListing;
    application: StoredApplication | null;
  } | null>(null);

  // Existing public listings fetch from /listings (remains completely unchanged)
  useEffect(() => {
    async function fetchListings() {
      try {
        const data = await apiClient.get<{ listings: BackendListing[] }>("/listings");
        setListings(data.listings || []);
      } catch (err: any) {
        setError(err.message || "Failed to load listings.");
      } finally {
        setLoading(false);
      }
    }
    fetchListings();
  }, []);

  // Additional fetch for authenticated user's own listings from /listings/my
  useEffect(() => {
    async function fetchMyListings() {
      if (!token) return;
      try {
        const data = await apiClient.get<{ listings: BackendListing[] }>("/listings/my");
        setMyListings(data.listings || []);
      } catch (err: any) {
        console.error("Failed to load user's listings:", err);
      }
    }

    if (token) {
      fetchMyListings();
    } else {
      setMyListings([]);
    }
  }, [token]);

  if (loading) {
    return (
      <section className="py-20 bg-[#090a0c]">
        <div className="max-w-[1440px] mx-auto px-container-padding text-center">
          <div className="w-8 h-8 rounded-full border-2 border-white/40 border-t-transparent animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-400">Loading actual listings...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-20 bg-[#090a0c]">
        <div className="max-w-[1440px] mx-auto px-container-padding text-center">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      </section>
    );
  }

  if (listings.length === 0 && myListings.length === 0) {
    return (
      <section className="py-20 bg-[#090a0c]">
        <div className="max-w-[1440px] mx-auto px-container-padding text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Actual Listings</h2>
          <p className="text-sm text-slate-400">No approved listings from the database yet.</p>
        </div>
      </section>
    );
  }

  const handleOpenAppInfo = (item: BackendListing, app: StoredApplication | null) => {
    setSelectedApp({ listing: item, application: app });
  };

  // Filter out the owner's own listings if user is logged in
  const publicListings = user
    ? listings.filter((l) => Number(l.owner_id) !== Number(user.id))
    : listings;

  return (
    <section className="py-20 bg-[#090a0c] border-t border-slate-800">
      <div className="max-w-[1440px] mx-auto px-container-padding">
        {/* Section Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-800 border border-slate-700 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="font-label-sm text-[11px] uppercase tracking-[0.2em] text-slate-300">
              Live from Database
            </span>
          </div>
          <h2 className="text-3xl font-bold text-white mb-1">Actual Listings</h2>
          <p className="text-sm text-slate-400">
            Approved properties fetched from the backend.
          </p>
        </div>

        {/* My Listings - Only appears when user is logged in */}
        {Boolean(token && user) && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-widest text-[#d4b068]">
                  My Listings
                </h3>
                <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                  {myListings.length}
                </span>
              </div>
              <Link
                to="/listings/new"
                className="text-xs text-slate-400 hover:text-white transition"
              >
                + Post New
              </Link>
            </div>

            {myListings.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myListings.map((item) => (
                  <ListingCard
                    key={item.id}
                    item={item}
                    isOwn={true}
                    isApplied={false}
                    onOpenAppInfo={handleOpenAppInfo}
                  />
                ))}
              </div>
            ) : (
              <div className="border border-dashed border-slate-800 bg-[#12151c]/40 rounded-xl p-6 text-center">
                <p className="text-xs text-slate-400 mb-2">You haven't posted any property listings yet.</p>
                <Link
                  to="/listings/new"
                  className="inline-block bg-white text-slate-900 font-medium px-3.5 py-1.5 rounded-lg text-xs hover:bg-slate-200 transition"
                >
                  Post a Residence
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Public Listings Grid - Owners only discover other people's listings */}
        <div>
          {Boolean(token && user) && (
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
                Public Listings
              </h3>
              <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
                {publicListings.length}
              </span>
            </div>
          )}
          {publicListings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {publicListings.map((item) => {
                const isApplied = Boolean(user && hasUserApplied(user.id, item.id));
                return (
                  <ListingCard
                    key={item.id}
                    item={item}
                    isOwn={false}
                    isApplied={isApplied}
                    onOpenAppInfo={handleOpenAppInfo}
                  />
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 border border-dashed border-slate-800 rounded-xl">
              <p className="text-xs text-slate-400">No approved public listings available.</p>
            </div>
          )}
        </div>
      </div>

      {/* Application Details Modal */}
      {selectedApp && (
        <ApplicationInfoModal
          listing={selectedApp.listing}
          application={
            selectedApp.application || {
              listingId: selectedApp.listing.id,
              listingTitle: selectedApp.listing.title,
              appliedAt: new Date().toISOString(),
              status: "pending",
              applicantName: user?.name,
              applicantEmail: user?.email,
              applicantPhone: user?.phone,
            }
          }
          onClose={() => setSelectedApp(null)}
        />
      )}
    </section>
  );
}

function ListingCard({
  item,
  isOwn,
  isApplied,
  onOpenAppInfo,
}: {
  item: BackendListing;
  isOwn: boolean;
  isApplied: boolean;
  onOpenAppInfo: (item: BackendListing, app: StoredApplication | null) => void;
}) {
  const { user } = useAuth();
  const existingApp = isApplied && user ? getUserApplication(user.id, item.id) : null;

  const rentFormatted =
    item.rent !== undefined && item.rent !== null && item.rent !== "" && !isNaN(Number(item.rent))
      ? `৳${Number(item.rent).toLocaleString()} / month`
      : null;

  return (
    <Link
      to={`/listings/${item.id}`}
      className="border border-slate-800 bg-[#12151c] rounded-xl p-5 flex flex-col justify-between hover:border-slate-700 transition cursor-pointer group block text-left"
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[11px] font-mono uppercase bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
            Area #{item.area_id}
          </span>
          <div
            className="flex items-center gap-1.5"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            {isOwn && (
              <span className="text-[11px] font-medium text-[#d4b068] bg-[#d4b068]/10 border border-[#d4b068]/30 px-2 py-0.5 rounded">
                Your Listing
              </span>
            )}
            {isApplied && (
              <span className="text-[11px] font-medium text-emerald-300 bg-emerald-950/70 border border-emerald-600/50 px-2 py-0.5 rounded flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">done_all</span> Applied
              </span>
            )}
            <StatusBadge status={item.status} />
          </div>
        </div>

        <div className="mb-2">
          <h3 className="text-lg font-semibold text-white line-clamp-1 group-hover:text-[#d4b068] transition-colors">
            {item.title}
          </h3>
          {rentFormatted && (
            <p className="text-sm font-bold text-[#d4b068] font-mono mt-0.5">
              {rentFormatted}
            </p>
          )}
        </div>

        <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">{item.description}</p>

        <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-800 text-center text-xs text-slate-300 mb-4">
          <div><span className="font-semibold text-white">{item.bedroom_count}</span> Beds</div>
          <div><span className="font-semibold text-white">{item.bathroom_count}</span> Baths</div>
          <div>Floor <span className="font-semibold text-white">{item.on_which_floor}</span></div>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
        <span className="text-xs text-slate-500 font-mono">ID: #{item.id}</span>
        {isOwn ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#d4b068] bg-[#d4b068]/15 border border-[#d4b068]/30 px-2.5 py-1 rounded">
              Your Listing
            </span>
            <span className="text-xs text-slate-400 group-hover:text-white underline transition">
              View
            </span>
          </div>
        ) : isApplied ? (
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onOpenAppInfo(item, existingApp);
              }}
              className="bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 font-semibold px-3.5 py-1.5 rounded-lg text-xs transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <span className="material-symbols-outlined text-sm">assignment_turned_in</span>
              <span>Applied</span>
            </button>
            <span className="text-xs text-slate-400 group-hover:text-white transition">
              Details
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 group-hover:text-white transition">
              Details
            </span>
            <span className="bg-white text-slate-900 font-semibold px-4 py-1.5 rounded-lg text-xs group-hover:bg-slate-200 transition flex items-center gap-1">
              <span>Apply</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
