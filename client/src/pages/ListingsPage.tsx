import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../api/client";
import { useAuth } from "../context/AuthContext";
import {
  hasUserApplied,
  getUserApplication,
  type StoredApplication,
} from "../utils/applicationStorage";
import { ApplicationInfoModal } from "../components/ApplicationInfoModal";
import { StatusBadge } from "../components/ActualListings";

export interface BackendListing {
  id: number | string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  bedroom_count: number;
  bathroom_count: number;
  on_which_floor: number;
  area_id: number;
  owner_id: number;
  status: string;
  created_at?: string;
  rent?: number | string | null;
  electricity_bill?: number | string | null;
  water_bill?: number | string | null;
  service_charge?: number | string | null;
  monthly_due_date?: number | string | null;
  pet_allowed?: boolean | null;
  security_deposit?: number | string | null;
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
          <h2 className="text-lg font-semibold text-white line-clamp-1 group-hover:text-[#d4b068] transition-colors">
            {item.title}
          </h2>
          {rentFormatted && (
            <p className="text-sm font-bold text-[#d4b068] font-mono mt-0.5">
              {rentFormatted}
            </p>
          )}
        </div>

        <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
          {item.description}
        </p>

        <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-800 text-center text-xs text-slate-300 mb-4">
          <div>
            <span className="font-semibold text-white">{item.bedroom_count}</span> Beds
          </div>
          <div>
            <span className="font-semibold text-white">{item.bathroom_count}</span> Baths
          </div>
          <div>
            Floor <span className="font-semibold text-white">{item.on_which_floor}</span>
          </div>
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

export function ListingsPage() {
  const { user, token } = useAuth();
  const [listings, setListings] = useState<BackendListing[]>([]);
  const [myListings, setMyListings] = useState<BackendListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Application details modal state
  const [selectedApp, setSelectedApp] = useState<{
    listing: BackendListing;
    application: StoredApplication | null;
  } | null>(null);

  const fetchListings = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<{ listings: BackendListing[] }>("/listings");
      setListings(data.listings || []);
    } catch (err: any) {
      setError(err.message || "Failed to load listings from database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, []);

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

  const filtered = listings.filter(
    (item) =>
      item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMyListings = myListings.filter(
    (item) =>
      item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenAppInfo = (item: BackendListing, app: StoredApplication | null) => {
    setSelectedApp({ listing: item, application: app });
  };

  return (
    <div className="max-w-6xl mx-auto py-10 px-4">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Browse Residences</h1>
          <p className="text-sm text-slate-400">
            Real approved properties stored in PostgreSQL database.
          </p>
        </div>
        <Link
          to="/listings/new"
          className="w-full sm:w-auto bg-white text-slate-900 font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-slate-200 transition text-center"
        >
          + Post a Listing
        </Link>
      </div>

      {/* Search Filter */}
      <div className="mb-6">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search listings by title or description..."
          className="w-full max-w-md bg-[#12151c] text-white border border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-white placeholder:text-slate-500"
        />
      </div>

      {/* Loading State */}
      {loading && (
        <div className="py-20 text-center text-slate-400">
          <div className="w-8 h-8 rounded-full border-2 border-white/40 border-t-transparent animate-spin mx-auto mb-3" />
          <p className="text-sm">Fetching properties from database...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="p-4 bg-red-950/50 border border-red-800 text-red-300 rounded-lg flex flex-col items-center justify-center gap-3 my-8 text-center">
          <p className="text-sm">{error}</p>
          <button
            onClick={fetchListings}
            className="px-4 py-1.5 bg-red-800 hover:bg-red-700 text-white rounded text-xs font-medium cursor-pointer"
          >
            Retry Fetch
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filtered.length === 0 && (!token || filteredMyListings.length === 0) && (
        <div className="py-20 text-center border border-dashed border-slate-800 rounded-2xl p-8 my-4">
          <span className="material-symbols-outlined text-4xl text-slate-500 mb-2">
            apartment
          </span>
          <h3 className="text-lg font-medium text-white mb-1">No Listings Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
            {searchTerm
              ? "No residences match your current search query."
              : "There are currently no approved property listings in the database."}
          </p>
          <Link
            to="/listings/new"
            className="inline-block bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded text-xs"
          >
            Post a Listing
          </Link>
        </div>
      )}

      {/* Listings Content */}
      {!loading && !error && (filtered.length > 0 || (Boolean(token && user) && filteredMyListings.length > 0)) && (
        <>
          {/* My Listings Section (only appears when user is logged in) */}
          {Boolean(token && user) && (
            <div className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-semibold uppercase tracking-widest text-[#d4b068]">
                    My Listings
                  </h2>
                  <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
                    {filteredMyListings.length}
                  </span>
                </div>
                <Link
                  to="/listings/new"
                  className="text-xs text-slate-400 hover:text-white transition"
                >
                  + Post New
                </Link>
              </div>

              {filteredMyListings.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredMyListings.map((item) => (
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

          {/* Public Listings Section */}
          <div>
            {Boolean(token && user) && (
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
                  Public Listings
                </h2>
                <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
                  {filtered.length}
                </span>
              </div>
            )}
            {filtered.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((item) => {
                  const isOwn = Boolean(user && item.owner_id === user.id);
                  const isApplied = Boolean(user && hasUserApplied(user.id, item.id));
                  return (
                    <ListingCard
                      key={item.id}
                      item={item}
                      isOwn={isOwn}
                      isApplied={isApplied}
                      onOpenAppInfo={handleOpenAppInfo}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 border border-dashed border-slate-800 rounded-xl">
                <p className="text-xs text-slate-400">No public listings match your query.</p>
              </div>
            )}
          </div>
        </>
      )}

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
    </div>
  );
}
