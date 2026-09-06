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
import { PropertyCard } from "../components/PropertyCard";

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
  imageUrl?: string;
  imageAlt?: string;
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

  // Filter public listings so user's own listings are separated when logged in
  const publicListings = user
    ? filtered.filter((l) => Number(l.owner_id) !== Number(user.id))
    : filtered;

  const handleOpenAppInfo = (item: BackendListing) => {
    const app = user ? getUserApplication(user.id, item.id) : null;
    setSelectedApp({ listing: item, application: app });
  };

  return (
    <div className="max-w-6xl mx-auto py-10 px-4">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Browse Apartments</h1>
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
      {!loading && !error && publicListings.length === 0 && (!token || filteredMyListings.length === 0) && (
        <div className="py-20 text-center border border-dashed border-slate-800 rounded-2xl p-8 my-4">
          <span className="material-symbols-outlined text-4xl text-slate-500 mb-2">
            apartment
          </span>
          <h3 className="text-lg font-medium text-white mb-1">No Listings Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
            {searchTerm
              ? "No apartments match your current search query."
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
      {!loading && !error && (publicListings.length > 0 || (Boolean(token && user) && filteredMyListings.length > 0)) && (
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

          {/* Public Listings Section */}
          <div>
            {Boolean(token && user) && (
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
                  Public Listings
                </h2>
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
    </div>
  );
}
