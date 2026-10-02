import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiClient } from "../api/client";
import { useAuth } from "../context/AuthContext";
import {
  hasUserApplied,
  getUserApplication,
  type StoredApplication,
} from "../utils/applicationStorage";
import { ApplicationInfoModal } from "../components/ApplicationInfoModal";
import { PropertyCard } from "../components/PropertyCard";
import { DHAKA_AREAS, getAreaIdByName } from "../utils/areaLookup";
import type { ListingImage } from "../types/listing";

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
  images?: ListingImage[];
  amenities?: { id: number; name: string; description?: string }[];
  rating?: number | string | null;
  review_count?: number | null;
}

export function ListingsPage() {
  const { user, token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Search filter states synchronized with URL
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get("q") || "");
  const [areaName, setAreaName] = useState(
    () => searchParams.get("area") || searchParams.get("areaName") || ""
  );
  const [bedrooms, setBedrooms] = useState<number | null>(() => {
    const b = searchParams.get("bedrooms");
    return b ? parseInt(b, 10) : null;
  });
  const [maxRent, setMaxRent] = useState<number | null>(() => {
    const r = searchParams.get("maxRent");
    return r ? parseInt(r, 10) : null;
  });
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(() => {
    const a = searchParams.get("amenities");
    return a ? a.split(",").filter(Boolean) : [];
  });
  const [allAmenities, setAllAmenities] = useState<{ id: number; name: string }[]>([]);
  const [amenityPanelOpen, setAmenityPanelOpen] = useState(false);

  // Base listings data
  const [listings, setListings] = useState<BackendListing[]>([]);
  const [myListings, setMyListings] = useState<BackendListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Verifier review queue states
  const isVerifier = Boolean(user?.is_verifier);
  const viewParam = searchParams.get("view");
  const [verifierView, setVerifierView] = useState<"pending" | "approved">(() => {
    if (viewParam === "approved") return "approved";
    if (viewParam === "pending") return "pending";
    return isVerifier ? "pending" : "approved";
  });

  useEffect(() => {
    if (viewParam === "approved" || viewParam === "pending") {
      setVerifierView(viewParam);
    } else if (isVerifier) {
      setVerifierView("pending");
    } else {
      setVerifierView("approved");
    }
  }, [viewParam, isVerifier]);

  const [unverifiedListings, setUnverifiedListings] = useState<BackendListing[]>([]);
  const [unverifiedLoading, setUnverifiedLoading] = useState(false);
  const [unverifiedError, setUnverifiedError] = useState<string | null>(null);

  const fetchUnverified = useCallback(async () => {
    if (!token || !user?.is_verifier) return;
    setUnverifiedLoading(true);
    setUnverifiedError(null);
    try {
      const data = await apiClient.get<{ listings: BackendListing[] }>("/verify/listings");
      setUnverifiedListings(data.listings || []);
    } catch (err: any) {
      setUnverifiedError(err.message || "Failed to load unverified listings.");
    } finally {
      setUnverifiedLoading(false);
    }
  }, [token, user?.is_verifier]);

  useEffect(() => {
    if (isVerifier) {
      fetchUnverified();
    }
  }, [isVerifier, fetchUnverified]);

  // Search execution states
  const [searchResults, setSearchResults] = useState<BackendListing[] | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Selected application modal state
  const [selectedApp, setSelectedApp] = useState<{
    listing: BackendListing;
    application: StoredApplication | null;
  } | null>(null);

  // Keep URL parameters updated as filters change
  const updateUrlParams = useCallback(
    (q: string, area: string, beds: number | null, rent: number | null) => {
      const next = new URLSearchParams();
      if (q.trim()) next.set("q", q.trim());
      if (area.trim()) next.set("area", area.trim());
      if (beds !== null && !isNaN(beds)) next.set("bedrooms", beds.toString());
      if (rent !== null && !isNaN(rent)) next.set("maxRent", rent.toString());
      if (isVerifier) next.set("view", verifierView);
      setSearchParams(next, { replace: true });
    },
    [setSearchParams, isVerifier, verifierView]
  );

  // Sync state if URL changes externally (e.g. navigation or browser back/forward)
  useEffect(() => {
    const urlQ = searchParams.get("q") || "";
    const urlArea = searchParams.get("area") || searchParams.get("areaName") || "";
    const urlBeds = searchParams.get("bedrooms")
      ? parseInt(searchParams.get("bedrooms")!, 10)
      : null;
    const urlRent = searchParams.get("maxRent")
      ? parseInt(searchParams.get("maxRent")!, 10)
      : null;

    setSearchTerm(urlQ);
    setAreaName(urlArea);
    setBedrooms(urlBeds);
    setMaxRent(urlRent);
  }, [searchParams]);

  // Fetch initial base listings
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

  // Fetch all available amenities for the filter panel
  useEffect(() => {
    apiClient.get<{ amenities: { id: number; name: string }[] }>("/listings/amenities")
      .then((res) => setAllAmenities(res.amenities || []))
      .catch(() => {});
  }, []);

  // Fetch authenticated user's own listings
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

  // Check whether any search filter is active
  const isFilterActive = Boolean(
    searchTerm.trim() || areaName.trim() || bedrooms !== null || maxRent !== null || selectedAmenities.length > 0
  );

  // Debounced search query to backend with AbortController for race condition protection
  useEffect(() => {
    const trimmed = searchTerm.trim();
    const trimmedArea = areaName.trim();
    const hasFilters = Boolean(
      trimmed || trimmedArea || bedrooms !== null || maxRent !== null || selectedAmenities.length > 0
    );

    if (!hasFilters) {
      setSearchResults(null);
      setNextCursor(null);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    const abortController = new AbortController();
    let isActive = true;

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setSearchError(null);

      try {
        const params = new URLSearchParams();
        if (trimmed) params.set("q", trimmed);

        if (trimmedArea) {
          params.set("area", trimmedArea);
          const areaId = getAreaIdByName(trimmedArea);
          if (areaId !== null) {
            params.set("areaId", areaId.toString());
          }
        }

        if (bedrooms !== null && !isNaN(bedrooms)) {
          params.set("bedrooms", bedrooms.toString());
        }

        // Rent is always highest/max limit only
        if (maxRent !== null && !isNaN(maxRent)) {
          params.set("maxRent", maxRent.toString());
        }

        if (selectedAmenities.length > 0) {
          params.set("amenities", selectedAmenities.join(","));
        }

        const data = await apiClient.get<{ listings: BackendListing[]; nextCursor?: string | null }>(
          `/listings/search?${params.toString()}`,
          { signal: abortController.signal }
        );

        if (isActive) {
          setSearchResults(data.listings || []);
          setNextCursor(data.nextCursor || null);
        }
      } catch (err: any) {
        if (err.name === "AbortError" || !isActive) return;
        setSearchError(err.message || "Failed to search listings");
      } finally {
        if (isActive) {
          setIsSearching(false);
        }
      }
    }, 300);

    return () => {
      isActive = false;
      clearTimeout(timer);
      abortController.abort();
    };
  }, [searchTerm, areaName, bedrooms, maxRent, selectedAmenities]);

  const handleLoadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.set("q", searchTerm.trim());
      if (areaName.trim()) {
        params.set("area", areaName.trim());
        const areaId = getAreaIdByName(areaName.trim());
        if (areaId !== null) params.set("areaId", areaId.toString());
      }
      if (bedrooms !== null && !isNaN(bedrooms)) params.set("bedrooms", bedrooms.toString());
      if (maxRent !== null && !isNaN(maxRent)) params.set("maxRent", maxRent.toString());
      if (selectedAmenities.length > 0) params.set("amenities", selectedAmenities.join(","));
      params.set("cursor", nextCursor);

      const data = await apiClient.get<{ listings: BackendListing[]; nextCursor?: string | null }>(
        `/listings/search?${params.toString()}`
      );
      setSearchResults((prev) => [...(prev || []), ...(data.listings || [])]);
      setNextCursor(data.nextCursor || null);
    } catch (err: any) {
      console.error("Failed to load more listings:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Handlers for modifying filters
  const handleKeywordChange = (newVal: string) => {
    setSearchTerm(newVal);
    updateUrlParams(newVal, areaName, bedrooms, maxRent);
  };

  const handleAreaChange = (newArea: string) => {
    const val = newArea === "all" ? "" : newArea;
    setAreaName(val);
    updateUrlParams(searchTerm, val, bedrooms, maxRent);
  };

  const handleBedroomsChange = (newBedVal: string) => {
    const val = newBedVal === "all" ? null : parseInt(newBedVal, 10);
    setBedrooms(val);
    updateUrlParams(searchTerm, areaName, val, maxRent);
  };

  const handleMaxRentChange = (newRentVal: string) => {
    const val = newRentVal === "all" ? null : parseInt(newRentVal, 10);
    setMaxRent(val);
    updateUrlParams(searchTerm, areaName, bedrooms, val);
  };

  const handleClearAll = () => {
    setSearchTerm("");
    setAreaName("");
    setBedrooms(null);
    setMaxRent(null);
    setSelectedAmenities([]);
    updateUrlParams("", "", null, null);
  };

  const toggleAmenity = (name: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(name) ? prev.filter((a) => a !== name) : [...prev, name]
    );
  };

  const clearAmenities = () => setSelectedAmenities([]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateUrlParams(searchTerm, areaName, bedrooms, maxRent);
  };

  // Filter user's personal listings locally with the active filters
  const filteredMyListings = myListings.filter((item) => {
    const matchesText =
      !searchTerm.trim() ||
      item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const targetAreaId = getAreaIdByName(areaName);
    const matchesArea =
      !areaName.trim() || targetAreaId === null || Number(item.area_id) === targetAreaId;
    const matchesBed = bedrooms === null || Number(item.bedroom_count) === bedrooms;
    const matchesRent = maxRent === null || (item.rent != null && Number(item.rent) <= maxRent);
    const matchesAmenities =
      selectedAmenities.length === 0 ||
      selectedAmenities.every((name) =>
        item.amenities?.some((a) => a.name === name)
      );
    return matchesText && matchesArea && matchesBed && matchesRent && matchesAmenities;
  });

  // Base list of public listings: backend search results if filter active, otherwise default all listings
  const basePublicListings = searchResults !== null ? searchResults : listings;

  // Filter out user's own listings from public view when logged in
  const displayedPublicListings = user
    ? basePublicListings.filter((l) => Number(l.owner_id) !== Number(user.id))
    : basePublicListings;

  // Filter unverified listings locally for verifiers
  const displayedPendingListings = unverifiedListings.filter((item) => {
    const matchesText =
      !searchTerm.trim() ||
      item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const targetAreaId = getAreaIdByName(areaName);
    const matchesArea =
      !areaName.trim() || targetAreaId === null || Number(item.area_id) === targetAreaId;
    const matchesBed = bedrooms === null || Number(item.bedroom_count) === bedrooms;
    const matchesRent = maxRent === null || (item.rent != null && Number(item.rent) <= maxRent);
    return matchesText && matchesArea && matchesBed && matchesRent;
  });

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
        </div>
      </div>

      {/* Comprehensive Search & Filter Widget */}
      <form onSubmit={handleSearchSubmit} className="mb-8 flex flex-col gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          {/* Query Text Input */}
          <div className="sm:col-span-2 lg:col-span-4 relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <span className="material-symbols-outlined text-[20px]">search</span>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleKeywordChange(e.target.value)}
              placeholder="Search title, keywords, etc..."
              className="w-full bg-[#12151c] text-white border border-slate-700 rounded-xl pl-10 pr-10 py-3 text-sm focus:outline-none focus:border-white placeholder:text-slate-500 transition-colors shadow-sm"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => handleKeywordChange("")}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white transition-colors"
                title="Clear keyword"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
          </div>

          {/* Area / Location Selector (Frontend Area Names) */}
          <div className="sm:col-span-1 lg:col-span-3 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <span className="material-symbols-outlined text-[18px]">location_on</span>
            </div>
            <select
              value={areaName || "all"}
              onChange={(e) => handleAreaChange(e.target.value)}
              className="w-full bg-[#12151c] text-white border border-slate-700 rounded-xl pl-9 pr-8 py-3 text-sm focus:outline-none focus:border-white transition-colors appearance-none cursor-pointer shadow-sm"
            >
              <option value="all" className="bg-[#12151c] text-white">All Areas</option>
              {DHAKA_AREAS.map((area) => (
                <option key={area.id} value={area.name} className="bg-[#12151c] text-white">
                  {area.name}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-500">
              <span className="material-symbols-outlined text-sm">expand_more</span>
            </div>
          </div>

          {/* Bedrooms Selector */}
          <div className="sm:col-span-1 lg:col-span-2 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <span className="material-symbols-outlined text-[18px]">bed</span>
            </div>
            <select
              value={bedrooms !== null ? bedrooms.toString() : "all"}
              onChange={(e) => handleBedroomsChange(e.target.value)}
              className="w-full bg-[#12151c] text-white border border-slate-700 rounded-xl pl-9 pr-8 py-3 text-sm focus:outline-none focus:border-white transition-colors appearance-none cursor-pointer shadow-sm"
            >
              <option value="all" className="bg-[#12151c] text-white">Any Bedrooms</option>
              <option value="1" className="bg-[#12151c] text-white">1 Bedroom</option>
              <option value="2" className="bg-[#12151c] text-white">2 Bedrooms</option>
              <option value="3" className="bg-[#12151c] text-white">3 Bedrooms</option>
              <option value="4" className="bg-[#12151c] text-white">4 Bedrooms</option>
              <option value="5" className="bg-[#12151c] text-white">5+ Bedrooms</option>
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-500">
              <span className="material-symbols-outlined text-sm">expand_more</span>
            </div>
          </div>

          {/* Max Rent Filter Dropdown (Always Highest, No Minimum) */}
          <div className="sm:col-span-2 lg:col-span-3 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <span className="material-symbols-outlined text-[18px]">payments</span>
            </div>
            <select
              value={maxRent !== null ? maxRent.toString() : "all"}
              onChange={(e) => handleMaxRentChange(e.target.value)}
              className="w-full bg-[#12151c] text-white border border-slate-700 rounded-xl pl-9 pr-8 py-3 text-sm focus:outline-none focus:border-white transition-colors appearance-none cursor-pointer shadow-sm"
            >
              <option value="all" className="bg-[#12151c] text-white">Any Budget</option>
              <option value="30000" className="bg-[#12151c] text-white">Up to ৳30,000 /mo</option>
              <option value="50000" className="bg-[#12151c] text-white">Up to ৳50,000 /mo</option>
              <option value="75000" className="bg-[#12151c] text-white">Up to ৳75,000 /mo</option>
              <option value="100000" className="bg-[#12151c] text-white">Up to ৳100,000 /mo</option>
              <option value="150000" className="bg-[#12151c] text-white">Up to ৳150,000 /mo</option>
              <option value="200000" className="bg-[#12151c] text-white">Up to ৳200,000 /mo</option>
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-500">
              <span className="material-symbols-outlined text-sm">expand_more</span>
            </div>
          </div>
        </div>

        {/* Amenity Multi-select Panel */}
        {allAmenities.length > 0 && (
          <div className="border border-slate-700 rounded-xl bg-[#12151c] overflow-hidden">
            {/* Panel header / toggle */}
            <button
              type="button"
              onClick={() => setAmenityPanelOpen((o) => !o)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-slate-400">hotel_class</span>
                <span className="font-medium">Filter by Amenities</span>
                {selectedAmenities.length > 0 && (
                  <span className="bg-slate-700/60 text-slate-300 border border-slate-600/60 text-[11px] font-mono px-2 py-0.5 rounded-full">
                    {selectedAmenities.length} selected
                  </span>
                )}
              </div>
              <span className="material-symbols-outlined text-sm text-slate-500">
                {amenityPanelOpen ? "expand_less" : "expand_more"}
              </span>
            </button>

            {amenityPanelOpen && (
              <div className="px-4 pb-4 border-t border-slate-800">
                <div className="flex flex-wrap gap-2 pt-3 max-h-40 overflow-y-auto">
                  {allAmenities.map((amenity) => {
                    const isSelected = selectedAmenities.includes(amenity.name);
                    return (
                      <button
                        key={amenity.id}
                        type="button"
                        onClick={() => toggleAmenity(amenity.name)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-slate-700/60 text-slate-100 border-slate-500"
                            : "bg-transparent text-slate-400 border-slate-700 hover:border-slate-500 hover:text-slate-200"
                        }`}
                      >
                        {isSelected && (
                          <span className="material-symbols-outlined text-[13px]">check</span>
                        )}
                        {amenity.name}
                      </button>
                    );
                  })}
                </div>
                {selectedAmenities.length > 0 && (
                  <button
                    type="button"
                    onClick={clearAmenities}
                    className="mt-3 text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                    Clear amenity filters
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {isFilterActive && (

          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="text-slate-400 font-medium">Active Filters:</span>

            {searchTerm.trim() && (
              <span className="inline-flex items-center gap-1.5 bg-slate-800 text-slate-200 border border-slate-700 px-2.5 py-1 rounded-full">
                <span>Keyword: "{searchTerm.trim()}"</span>
                <button
                  type="button"
                  onClick={() => handleKeywordChange("")}
                  className="hover:text-white"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              </span>
            )}

            {areaName.trim() && (
              <span className="inline-flex items-center gap-1.5 bg-slate-800 text-slate-200 border border-slate-700 px-2.5 py-1 rounded-full">
                <span>Area: {areaName.trim()}</span>
                <button
                  type="button"
                  onClick={() => handleAreaChange("all")}
                  className="hover:text-white"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              </span>
            )}

            {bedrooms !== null && (
              <span className="inline-flex items-center gap-1.5 bg-slate-800 text-slate-200 border border-slate-700 px-2.5 py-1 rounded-full">
                <span>{bedrooms} {bedrooms === 1 ? "Bedroom" : "Bedrooms"}</span>
                <button
                  type="button"
                  onClick={() => handleBedroomsChange("all")}
                  className="hover:text-white"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              </span>
            )}

            {maxRent !== null && (
              <span className="inline-flex items-center gap-1.5 bg-slate-800 text-slate-200 border border-slate-700 px-2.5 py-1 rounded-full">
                <span>Max Rent: ৳{maxRent.toLocaleString()}</span>
                <button
                  type="button"
                  onClick={() => handleMaxRentChange("all")}
                  className="hover:text-white"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              </span>
            )}

            {selectedAmenities.map((name) => (
              <span
                key={name}
                className="inline-flex items-center gap-1.5 bg-slate-800 text-slate-200 border border-slate-700 px-2.5 py-1 rounded-full"
              >
                <span className="material-symbols-outlined text-[13px]">hotel_class</span>
                <span>{name}</span>
                <button
                  type="button"
                  onClick={() => toggleAmenity(name)}
                  className="hover:text-white"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              </span>
            ))}

            <button
              type="button"
              onClick={handleClearAll}
              className="hover:underline text-slate-400 font-medium ml-1 cursor-pointer"
            >
              Reset all filters
            </button>
          </div>
        )}
      </form>

      {/* Verifier Review Queue Switcher */}
      {isVerifier && (
        <div className="mb-8 p-4 sm:p-5 rounded-2xl bg-[#12151c] border border-slate-700/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0">
              <span className="material-symbols-outlined text-2xl">verified_user</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-label-sm tracking-wider font-semibold text-slate-300">
                  Verifier Review Mode
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-300 font-mono font-medium border border-slate-600/50">
                  {unverifiedListings.length} awaiting review
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#090a0c] border border-white/10 self-start sm:self-center shrink-0">
            <button
              type="button"
              onClick={() => {
                setVerifierView("pending");
                const next = new URLSearchParams(searchParams);
                next.set("view", "pending");
                setSearchParams(next, { replace: true });
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-label-sm uppercase tracking-wider font-medium transition cursor-pointer flex items-center gap-1.5 ${
                verifierView === "pending"
                  ? "bg-slate-700/80 text-slate-100 border border-slate-600 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>Pending Review</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10 font-mono">
                {unverifiedListings.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setVerifierView("approved");
                const next = new URLSearchParams(searchParams);
                next.set("view", "approved");
                setSearchParams(next, { replace: true });
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-label-sm uppercase tracking-wider font-medium transition cursor-pointer flex items-center gap-1.5 ${
                verifierView === "approved"
                  ? "bg-white/15 text-white border border-white/20 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>All Approved</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {isVerifier && verifierView === "pending" ? (
        <div>
          {unverifiedLoading ? (
            <div className="py-20 text-center text-slate-400 border border-dashed border-slate-800 rounded-xl my-4">
              <div className="w-8 h-8 rounded-full border-2 border-amber-400/40 border-t-transparent animate-spin mx-auto mb-3" />
              <p className="text-sm">Fetching unverified listings...</p>
            </div>
          ) : unverifiedError ? (
            <div className="p-6 bg-red-950/40 border border-red-800 text-red-300 rounded-xl my-4 text-center flex flex-col items-center gap-3">
              <span className="material-symbols-outlined text-3xl text-red-400">error</span>
              <p className="text-sm">{unverifiedError}</p>
              <button
                type="button"
                onClick={fetchUnverified}
                className="px-4 py-1.5 bg-red-800 hover:bg-red-700 text-white rounded text-xs font-medium cursor-pointer"
              >
                Retry Fetch
              </button>
            </div>
          ) : displayedPendingListings.length > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
                    Listings Pending Verification
                  </h2>
                  <span className="text-xs text-slate-300 bg-slate-950/70 border border-slate-800/60 px-2 py-0.5 rounded font-mono">
                    {displayedPendingListings.length}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayedPendingListings.map((item) => (
                  <PropertyCard
                    key={item.id}
                    listing={item}
                    isOwn={false}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="py-20 text-center border border-dashed border-slate-800 rounded-2xl p-8 my-4">
              <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">
                task_alt
              </span>
              <h3 className="text-lg font-medium text-white mb-1">No Pending Listings</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                {isFilterActive
                  ? "No unverified listings match your active filters."
                  : "All listings have been reviewed! There are currently no listings awaiting verification."}
              </p>
              {isFilterActive && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="inline-block bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded text-xs cursor-pointer transition"
                >
                  Reset All Filters
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Initial Database Loading State */}
          {loading && (
            <div className="py-20 text-center text-slate-400">
              <div className="w-8 h-8 rounded-full border-2 border-white/40 border-t-transparent animate-spin mx-auto mb-3" />
              <p className="text-sm">Fetching properties from database...</p>
            </div>
          )}

          {/* Initial Database Error State */}
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

          {!loading && !error && (
            <>
          {/* User's Personal Listings Section (if logged in) */}
          {Boolean(token && user) && (
            <div className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-semibold uppercase tracking-widest">
                    My Listings
                  </h2>
                  <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
                    {filteredMyListings.length}
                  </span>
                </div>
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
                  <p className="text-xs text-slate-400 mb-2">
                    {isFilterActive
                      ? "None of your personal listings match the active filters."
                      : "You haven't posted any property listings yet."}
                  </p>
                  {!isFilterActive && (
                    <Link
                      to="/listings/new"
                      className="inline-block bg-white text-slate-900 font-medium px-3.5 py-1.5 rounded-lg text-xs hover:bg-slate-200 transition"
                    >
                      Post an Apartment
                    </Link>
                  )}
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
                  {!isSearching && !searchError ? displayedPublicListings.length : 0}
                </span>
              </div>
            )}

            {/* In-Flight Search Loading State */}
            {isSearching ? (
              <div className="py-20 text-center text-slate-400 border border-dashed border-slate-800 rounded-xl my-4">
                <div className="w-8 h-8 rounded-full border-2 border-white/40 border-t-transparent animate-spin mx-auto mb-3" />
                <p className="text-sm">Searching properties...</p>
              </div>
            ) : searchError ? (
              /* Search API Failure State */
              <div className="p-6 bg-red-950/40 border border-red-800 text-red-300 rounded-xl my-4 text-center flex flex-col items-center gap-3">
                <span className="material-symbols-outlined text-3xl text-red-400">error</span>
                <p className="text-sm">{searchError}</p>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="px-4 py-1.5 bg-red-800 hover:bg-red-700 text-white rounded text-xs font-medium cursor-pointer"
                >
                  Clear Filters
                </button>
              </div>
            ) : displayedPublicListings.length > 0 ? (
              <>
              {/* Public Listings Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayedPublicListings.map((item) => {
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

              {/* Keyset Pagination Load More Button */}
              {nextCursor && (
                <div className="mt-8 text-center">
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm transition cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    {loadingMore ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-transparent animate-spin" />
                        <span>Loading more...</span>
                      </>
                    ) : (
                      <span>Load More Listings</span>
                    )}
                  </button>
                </div>
              )}
            </>
            ) : (
              /* Empty Search Results State */
              <div className="py-20 text-center border border-dashed border-slate-800 rounded-2xl p-8 my-4">
                <span className="material-symbols-outlined text-4xl text-slate-500 mb-2">
                  apartment
                </span>
                <h3 className="text-lg font-medium text-white mb-1">No Listings Found</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                  {isFilterActive
                    ? "No apartments match your selected criteria. Try adjusting your keyword, area, bedrooms, or budget."
                    : "There are currently no approved property listings in the database."}
                </p>
                {isFilterActive ? (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="inline-block bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded text-xs cursor-pointer transition"
                  >
                    Reset All Filters
                  </button>
                ) : !isVerifier ? (
                  <Link
                    to="/listings/new"
                    className="inline-block bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded text-xs"
                  >
                    Post a Listing
                  </Link>
                ) : null}
              </div>
            )}
          </div>
        </>
      )}
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
