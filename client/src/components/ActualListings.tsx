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
import { PropertyCard } from "./PropertyCard";

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

  // Existing public listings fetch from /listings
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
      <section id="featured-properties" className="py-20 bg-[#090a0c]">
        <div className="max-w-[1440px] mx-auto px-container-padding text-center">
          <div className="w-8 h-8 rounded-full border-2 border-white/40 border-t-transparent animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-400">Loading apartments...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section id="featured-properties" className="py-20 bg-[#090a0c]">
        <div className="max-w-[1440px] mx-auto px-container-padding text-center">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      </section>
    );
  }

  if (listings.length === 0 && myListings.length === 0) {
    return (
      <section id="featured-properties" className="py-20 bg-[#090a0c]">
        <div className="max-w-[1440px] mx-auto px-container-padding text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Apartments</h2>
          <p className="text-sm text-slate-400">No approved apartments from the database yet.</p>
        </div>
      </section>
    );
  }

  const handleOpenAppInfo = (item: BackendListing) => {
    const app = user ? getUserApplication(user.id, item.id) : null;
    setSelectedApp({ listing: item, application: app });
  };

  // Filter out the owner's own listings if user is logged in
  const publicListings = user
    ? listings.filter((l) => Number(l.owner_id) !== Number(user.id))
    : listings;

  return (
    <section id="featured-properties" className="py-20 bg-[#090a0c] border-t border-slate-800">
      <div className="max-w-[1440px] mx-auto px-container-padding">
        {/* Section Header - Removed "Live from database" chip */}
        <div className="mb-10">
          <h2 className="text-3xl font-bold text-white mb-1">Available Apartments</h2>
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
                  <PropertyCard
                    key={item.id}
                    listing={item}
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
                  Post an Apartment
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
                  <PropertyCard
                    key={item.id}
                    listing={item}
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
            selectedApp.application ||
            (user ? getUserApplication(user.id, selectedApp.listing.id) : null) || {
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
