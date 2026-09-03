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

export function ActualListings() {
  const { user } = useAuth();
  const [listings, setListings] = useState<BackendListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected application modal state
  const [selectedApp, setSelectedApp] = useState<{
    listing: BackendListing;
    application: StoredApplication | null;
  } | null>(null);

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

  if (listings.length === 0) {
    return (
      <section className="py-20 bg-[#090a0c]">
        <div className="max-w-[1440px] mx-auto px-container-padding text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Actual Listings</h2>
          <p className="text-sm text-slate-400">No approved listings from the database yet.</p>
        </div>
      </section>
    );
  }

  const myListings = user ? listings.filter((l) => l.owner_id === user.id) : [];
  const otherListings = user ? listings.filter((l) => l.owner_id !== user.id) : listings;

  const handleOpenAppInfo = (item: BackendListing, app: StoredApplication | null) => {
    setSelectedApp({ listing: item, application: app });
  };

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

        {/* My Listings */}
        {myListings.length > 0 && (
          <div className="mb-10">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-[#d4b068] mb-4">
              My Listings
            </h3>
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
          </div>
        )}

        {/* Other Listings */}
        {otherListings.length > 0 && (
          <div>
            {myListings.length > 0 && (
              <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-400 mb-4">
                Other Listings
              </h3>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {otherListings.map((item) => {
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
          </div>
        )}
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

  return (
    <div className="border border-slate-800 bg-[#12151c] rounded-xl p-5 flex flex-col justify-between hover:border-slate-700 transition">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[11px] font-mono uppercase bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
            Area #{item.area_id}
          </span>
          <div className="flex items-center gap-1.5">
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
            <span className="text-[11px] font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
              {item.status}
            </span>
          </div>
        </div>

        <h3 className="text-lg font-semibold text-white mb-2 line-clamp-1">{item.title}</h3>
        <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">{item.description}</p>

        <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-800 text-center text-xs text-slate-300 mb-4">
          <div><span className="font-semibold">{item.bedroom_count}</span> Beds</div>
          <div><span className="font-semibold">{item.bathroom_count}</span> Baths</div>
          <div>Floor <span className="font-semibold">{item.on_which_floor}</span></div>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
        <span className="text-xs text-slate-500 font-mono">ID: #{item.id}</span>
        {isOwn ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#d4b068] bg-[#d4b068]/15 border border-[#d4b068]/30 px-2.5 py-1 rounded">
              Your Listing
            </span>
            <Link
              to={`/listings/${item.id}`}
              className="text-xs text-slate-400 hover:text-white underline transition"
            >
              View
            </Link>
          </div>
        ) : isApplied ? (
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => onOpenAppInfo(item, existingApp)}
              className="bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 font-semibold px-3.5 py-1.5 rounded-lg text-xs transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <span className="material-symbols-outlined text-sm">assignment_turned_in</span>
              <span>Applied</span>
            </button>
            <Link
              to={`/listings/${item.id}`}
              className="text-xs text-slate-400 hover:text-white transition"
            >
              Details
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link
              to={`/listings/${item.id}`}
              className="text-xs text-slate-400 hover:text-white transition"
            >
              Details
            </Link>
            <Link
              to={`/listings/${item.id}#apply-section`}
              state={{ autoApply: true }}
              className="bg-white text-slate-900 font-semibold px-4 py-1.5 rounded-lg text-xs hover:bg-slate-200 transition flex items-center gap-1 cursor-pointer"
            >
              <span>Apply</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
