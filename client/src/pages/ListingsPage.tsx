import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../api/client";

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
}

export function ListingsPage() {
  const [listings, setListings] = useState<BackendListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

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

  const filtered = listings.filter((item) =>
    item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Link
            to="/listings/new"
            className="w-full sm:w-auto bg-white text-slate-900 font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-slate-200 transition text-center"
          >
            + Create Listing
          </Link>
        </div>
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
      {!loading && !error && filtered.length === 0 && (
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
            Add the First Property
          </Link>
        </div>
      )}

      {/* Listings Grid */}
      {!loading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="border border-slate-800 bg-[#12151c] rounded-xl p-5 flex flex-col justify-between hover:border-slate-700 transition"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[11px] font-mono uppercase bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                    Area #{item.area_id}
                  </span>
                  <span className="text-[11px] font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
                    {item.status}
                  </span>
                </div>

                <h2 className="text-lg font-semibold text-white mb-2 line-clamp-1">
                  {item.title}
                </h2>
                <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                  {item.description}
                </p>

                <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-800 text-center text-xs text-slate-300 mb-4">
                  <div>
                    <span className="font-semibold">{item.bedroom_count}</span> Beds
                  </div>
                  <div>
                    <span className="font-semibold">{item.bathroom_count}</span> Baths
                  </div>
                  <div>
                    Floor <span className="font-semibold">{item.on_which_floor}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-xs text-slate-500">ID: {item.id}</span>
                <Link
                  to={`/listings/${item.id}`}
                  className="bg-white text-slate-900 font-medium px-3.5 py-1.5 rounded text-xs hover:bg-slate-200 transition"
                >
                  View Details & Apply →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
