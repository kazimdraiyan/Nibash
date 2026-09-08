import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { apiClient } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { BackendListing } from "./ListingsPage";
import {
  hasUserApplied,
  getUserApplication,
  saveUserApplication,
} from "../utils/applicationStorage";
import { getAreaName } from "../utils/areaLookup";

interface Review {
  rating: number;
  description: string;
  created_at: string;
  average_rating?: number;
}

interface Application {
  tenant_id: number;
  listing_id: number;
  status: string;
  applied_at: string;
  name?: string;
  email?: string;
  phone?: string;
}

interface OwnerInfo {
  id: number;
  name?: string;
  email?: string;
  phone?: string;
}

function formatDueDate(day: number | string) {
  const d = typeof day === "string" ? parseInt(day, 10) : day;
  if (isNaN(d)) return `${day}th of each month`;
  const j = d % 10;
  const k = d % 100;
  let suffix = "th";
  if (j === 1 && k !== 11) suffix = "st";
  else if (j === 2 && k !== 12) suffix = "nd";
  else if (j === 3 && k !== 13) suffix = "rd";
  return `${d}${suffix} of each month`;
}

export function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const autoAppliedRef = useRef(false);

  const [listing, setListing] = useState<BackendListing | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Owner details state
  const [owner, setOwner] = useState<OwnerInfo | null>(null);
  const [ownerLoading, setOwnerLoading] = useState(false);

  // Application state
  const [isTenant, setIsTenant] = useState<boolean>(() => {
    if (!user) return false;
    return localStorage.getItem(`nibash_tenant_${user.id}`) === "true";
  });
  const [appliedRefresh, setAppliedRefresh] = useState(0);
  const isApplied = Boolean(user && id && (hasUserApplied(user.id, id) || appliedRefresh > 0));
  const existingApp = user && id ? getUserApplication(user.id, id) : null;

  const [showTenantForm, setShowTenantForm] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyIncome, setApplyIncome] = useState("");
  const [applyContact, setApplyContact] = useState("");
  const [applySuccess, setApplySuccess] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);

  // Delete state
  const [deleting, setDeleting] = useState(false);

  // Photo gallery state
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [failedImages, setFailedImages] = useState<Record<number, boolean>>({});
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Compute available photos from listing
  const photoList = (listing?.images && Array.isArray(listing.images) && listing.images.length > 0)
    ? listing.images
    : listing?.imageUrl
    ? [{ id: 0, url: listing.imageUrl }]
    : [];

  useEffect(() => {
    setSelectedPhotoIndex(0);
    setFailedImages({});
  }, [id]);

  const handlePrevPhoto = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (photoList.length <= 1) return;
    setSelectedPhotoIndex((prev) => (prev === 0 ? photoList.length - 1 : prev - 1));
  }, [photoList.length]);

  const handleNextPhoto = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (photoList.length <= 1) return;
    setSelectedPhotoIndex((prev) => (prev === photoList.length - 1 ? 0 : prev + 1));
  }, [photoList.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLightboxOpen) {
        if (e.key === "ArrowLeft") handlePrevPhoto();
        if (e.key === "ArrowRight") handleNextPhoto();
        if (e.key === "Escape") setIsLightboxOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLightboxOpen, handlePrevPhoto, handleNextPhoto]);

  const fetchDetails = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch listing details
      const listingRes = await apiClient.get<{ listing: BackendListing }>(`/listings/${id}`);
      setListing(listingRes.listing);

      // Fetch owner details
      const ownerId = listingRes.listing.owner_id;
      setOwnerLoading(true);
      if (user && user.id === ownerId) {
        setOwner({
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
        });
        setOwnerLoading(false);
      } else {
        try {
          const res = await apiClient.get<{ user?: any; owner?: any }>(`/users/${ownerId}`);
          const ownerData = res.user || res.owner;
          if (ownerData) {
            setOwner({
              id: ownerId,
              name: ownerData.name,
              email: ownerData.email,
              phone: ownerData.phone,
            });
          } else {
            setOwner({ id: ownerId });
          }
        } catch {
          // Gracefully fallback to available listing owner ID
          setOwner({ id: ownerId });
        } finally {
          setOwnerLoading(false);
        }
      }

      // 2. Fetch reviews for this listing
      try {
        const reviewsRes = await apiClient.get<{ reviews: Review[] }>(`/reviews/listings/${id}`);
        setReviews(reviewsRes.reviews || []);
      } catch {
        setReviews([]);
      }

      // 3. If current logged-in user is the owner, fetch applicants
      if (user && listingRes.listing.owner_id === user.id) {
        try {
          const appsRes = await apiClient.get<{ applications: Application[] }>(`/applications/${id}`);
          setApplications(appsRes.applications || []);
        } catch {
          setApplications([]);
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to load apartment details.");
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  useEffect(() => {
    if (!loading && window.location.hash === "#apply-section") {
      setTimeout(() => {
        const el = document.getElementById("apply-section");
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [loading]);

  useEffect(() => {
    if (user) {
      setIsTenant(localStorage.getItem(`nibash_tenant_${user.id}`) === "true");
    }
  }, [user]);

  // Auto-reload on success popup dismissal / timeout
  useEffect(() => {
    if (showSuccessModal) {
      const timer = setTimeout(() => {
        setShowSuccessModal(false);
        fetchDetails();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessModal, fetchDetails]);

  const handleDirectApply = async () => {
    if (!id || !user || applying || isApplied) return;
    setApplying(true);
    setApplyError(null);
    setApplySuccess(null);

    try {
      await apiClient.post<{ message: string }>("/applications", {
        listingId: parseInt(id, 10),
      });
      if (user) {
        localStorage.setItem(`nibash_tenant_${user.id}`, "true");
        saveUserApplication(user.id, {
          listingId: id,
          listingTitle: listing?.title || `Apartment #${id}`,
          appliedAt: new Date().toISOString(),
          status: "pending",
          applicantName: user.name,
          applicantEmail: user.email,
          applicantPhone: user.phone,
        });
        setIsTenant(true);
        setAppliedRefresh((prev) => prev + 1);
      }
      setShowSuccessModal(true);
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("tenant_profile_required")) {
        setShowTenantForm(true);
      } else if (msg.includes("already applied to this listing")) {
        if (user) {
          saveUserApplication(user.id, {
            listingId: id,
            listingTitle: listing?.title || `Apartment #${id}`,
            appliedAt: new Date().toISOString(),
            status: "pending",
            applicantName: user.name,
            applicantEmail: user.email,
            applicantPhone: user.phone,
          });
          setAppliedRefresh((prev) => prev + 1);
        }
      } else {
        setApplyError(msg || "Failed to submit application.");
      }
    } finally {
      setApplying(false);
    }
  };

  // Trigger direct apply if navigated here with autoApply: true and not already applied
  useEffect(() => {
    if (
      !loading &&
      (location.state as any)?.autoApply &&
      !autoAppliedRef.current &&
      user &&
      listing &&
      listing.owner_id !== user.id &&
      !isApplied
    ) {
      autoAppliedRef.current = true;
      handleDirectApply();
    }
  }, [loading, location.state, user, listing, isApplied]);

  const handleSubmitTenantForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || applying || isApplied) return;

    const inc = parseFloat(applyIncome);
    if (isNaN(inc) || inc <= 0) {
      setApplyError("Please enter a valid monthly income.");
      return;
    }

    if (!/^01\d{9}$/.test(applyContact.trim())) {
      setApplyError("Emergency contact must be an 11-digit Bangladeshi number starting with 01.");
      return;
    }

    setApplying(true);
    setApplyError(null);
    setApplySuccess(null);

    try {
      await apiClient.post<{ message: string }>("/applications", {
        listingId: parseInt(id, 10),
        monthly_income: inc,
        emergency_contact: applyContact.trim(),
      });
      if (user) {
        localStorage.setItem(`nibash_tenant_${user.id}`, "true");
        saveUserApplication(user.id, {
          listingId: id,
          listingTitle: listing?.title || `Apartment #${id}`,
          appliedAt: new Date().toISOString(),
          status: "pending",
          monthlyIncome: inc,
          emergencyContact: applyContact.trim(),
          applicantName: user.name,
          applicantEmail: user.email,
          applicantPhone: user.phone,
        });
        setIsTenant(true);
        setAppliedRefresh((prev) => prev + 1);
      }
      setShowSuccessModal(true);
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("already applied to this listing")) {
        if (user) {
          saveUserApplication(user.id, {
            listingId: id,
            listingTitle: listing?.title || `Apartment #${id}`,
            appliedAt: new Date().toISOString(),
            status: "pending",
            applicantName: user.name,
            applicantEmail: user.email,
            applicantPhone: user.phone,
          });
          setAppliedRefresh((prev) => prev + 1);
        }
      } else {
        setApplyError(msg || "Failed to submit application.");
      }
    } finally {
      setApplying(false);
    }
  };

  const handleRejectApplicant = async (tenantId: number) => {
    if (!id || !user) return;
    try {
      await apiClient.put(`/applications/${id}/${tenantId}`, { status: "rejected" });
      setApplications((prev) =>
        prev.map((app) => (app.tenant_id === tenantId ? { ...app, status: "rejected" } : app))
      );
    } catch (err: any) {
      alert(err.message || "Failed to reject applicant.");
    }
  };

  const handleDeleteListing = async () => {
    if (!id || !user) return;
    const confirmDelete = window.confirm(
      "Are you sure you want to mark this listing as unavailable? This will archive the property."
    );
    if (!confirmDelete) return;

    setDeleting(true);
    try {
      await apiClient.delete(`/listings/${id}`);
      navigate("/my-listings");
    } catch (err: any) {
      alert(err.message || "Failed to delete listing.");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400">
        <div className="w-8 h-8 rounded-full border-2 border-white/40 border-t-transparent animate-spin mx-auto mb-3" />
        <p className="text-sm">Loading apartment specification...</p>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center">
        <div className="p-4 bg-red-950/50 border border-red-800 text-red-300 rounded-lg mb-4 text-sm">
          {error || "Apartment not found."}
        </div>
        <Link
          to="/listings"
          className="inline-block bg-slate-800 text-white px-4 py-2 rounded text-xs hover:bg-slate-700"
        >
          ← Back to Listings
        </Link>
      </div>
    );
  }

  const isOwner = Boolean(user && Number(user.id) === Number(listing.owner_id));

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      {/* Back Link & Actions */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <Link to="/listings" className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
          ← Back to Listings
        </Link>

        {isOwner && (
          <div className="flex items-center gap-2">
            <Link
              to={`/listings/${id}/edit`}
              className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded text-xs font-medium"
            >
              Edit Listing
            </Link>
            <button
              type="button"
              onClick={handleDeleteListing}
              disabled={deleting}
              className="bg-red-900/60 hover:bg-red-900 text-red-200 border border-red-800 px-3 py-1.5 rounded text-xs font-medium cursor-pointer"
            >
              {deleting ? "Deleting..." : "Delete Listing"}
            </button>
          </div>
        )}
      </div>

      {/* Photo Gallery Banner */}
      <div className="mb-8 rounded-2xl overflow-hidden border border-slate-800 bg-[#12151c] shadow-2xl">
        {photoList.length > 0 ? (
          <div>
            {/* Primary Featured Image */}
            <div
              className="relative w-full aspect-[16/9] sm:aspect-[21/9] max-h-[500px] bg-[#090a0c] overflow-hidden group cursor-pointer"
              onClick={() => setIsLightboxOpen(true)}
            >
              {!failedImages[selectedPhotoIndex] ? (
                <img
                  src={photoList[selectedPhotoIndex].url}
                  alt={`${listing.title} photo ${selectedPhotoIndex + 1}`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.01]"
                  onError={() =>
                    setFailedImages((prev) => ({ ...prev, [selectedPhotoIndex]: true }))
                  }
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-[#090a0c]">
                  <svg className="w-12 h-12 mb-2 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-xs font-medium">Image preview unavailable</p>
                </div>
              )}

              {/* Gradient Vignette for UI controls contrast */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

              {/* Top Bar: Photo count & Fullscreen trigger */}
              <div className="absolute top-4 inset-x-4 flex items-center justify-between pointer-events-none">
                <span className="bg-black/75 backdrop-blur-md text-white border border-white/15 text-xs font-mono px-3 py-1 rounded-full shadow-md flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>{selectedPhotoIndex + 1} / {photoList.length}</span>
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsLightboxOpen(true);
                  }}
                  className="pointer-events-auto bg-black/75 hover:bg-black text-white border border-white/15 text-xs px-3 py-1.5 rounded-full backdrop-blur-md transition shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                  <span className="hidden sm:inline">View Fullscreen</span>
                </button>
              </div>

              {/* Prev / Next Arrows (when more than 1 image) */}
              {photoList.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handlePrevPhoto}
                    aria-label="Previous photo"
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/65 hover:bg-black/95 text-white border border-white/20 backdrop-blur-md flex items-center justify-center transition opacity-90 sm:opacity-0 group-hover:opacity-100 cursor-pointer shadow-lg"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    onClick={handleNextPhoto}
                    aria-label="Next photo"
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/65 hover:bg-black/95 text-white border border-white/20 backdrop-blur-md flex items-center justify-center transition opacity-90 sm:opacity-0 group-hover:opacity-100 cursor-pointer shadow-lg"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail Strip (when more than 1 image) */}
            {photoList.length > 1 && (
              <div className="p-3 sm:p-4 bg-[#0d1017] border-t border-slate-800 flex items-center gap-2.5 overflow-x-auto">
                {photoList.map((photo, idx) => {
                  const isSelected = idx === selectedPhotoIndex;
                  return (
                    <button
                      key={photo.id || idx}
                      type="button"
                      onClick={() => setSelectedPhotoIndex(idx)}
                      className={`relative flex-shrink-0 w-20 sm:w-24 aspect-[4/3] rounded-lg overflow-hidden border transition-all cursor-pointer ${
                        isSelected
                          ? "ring-2 ring-white border-white scale-[1.02] opacity-100 shadow-md"
                          : "border-slate-800 opacity-60 hover:opacity-100 hover:border-slate-600"
                      }`}
                    >
                      <img
                        src={photo.url}
                        alt={`Thumbnail ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {idx === 0 && (
                        <span className="absolute bottom-1 left-1 bg-black/80 backdrop-blur-xs text-amber-300 border border-amber-500/30 text-[9px] font-mono px-1 rounded">
                          Cover
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Clean Fallback when listing has no photos */
          <div className="w-full py-16 px-6 flex flex-col items-center justify-center text-center bg-gradient-to-b from-[#12151c] to-[#0d1017]">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center text-slate-400 mb-3 shadow-inner">
              <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-slate-200 mb-1">No Photos Uploaded</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              The property owner hasn't uploaded interior or exterior photographs for this listing yet.
            </p>
          </div>
        )}
      </div>

      {/* Main Specs Banner: Property Information */}
      <div className="border border-slate-800 bg-[#12151c] rounded-2xl p-6 sm:p-8 mb-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            {/* Area Name using Area Lookup */}
            <span className="text-xs font-mono uppercase bg-slate-800 text-slate-300 px-2.5 py-1 rounded">
              {getAreaName(listing.area_id)}
            </span>
            {/* Status Chip: Only visible to the listing owner */}
            {isOwner && (
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded border capitalize ${
                  listing.status?.toLowerCase() === "waiting" ||
                  listing.status?.toLowerCase() === "pending"
                    ? "text-amber-300 bg-amber-950/60 border-amber-800/60"
                    : "text-emerald-400 bg-emerald-950/60 border-emerald-800/60"
                }`}
              >
                Status: {listing.status}
              </span>
            )}
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">{listing.title}</h1>
        <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed mb-6">
          {listing.description}
        </p>

        {/* Lease Terms Section */}
        {((listing.rent !== undefined && listing.rent !== null && listing.rent !== "") ||
          (listing.electricity_bill !== undefined && listing.electricity_bill !== null && listing.electricity_bill !== "") ||
          (listing.water_bill !== undefined && listing.water_bill !== null && listing.water_bill !== "") ||
          (listing.service_charge !== undefined && listing.service_charge !== null && listing.service_charge !== "") ||
          (listing.security_deposit !== undefined && listing.security_deposit !== null && listing.security_deposit !== "") ||
          (listing.monthly_due_date !== undefined && listing.monthly_due_date !== null && listing.monthly_due_date !== "") ||
          (listing.pet_allowed !== undefined && listing.pet_allowed !== null)) && (
          <div className="mb-6 p-5 sm:p-6 rounded-xl bg-[#090a0c] border border-slate-800">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#d4b068] mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-base">receipt_long</span>
              <span>Lease Terms</span>
            </h2>

            <div className="divide-y divide-slate-800/70 text-xs sm:text-sm">
              {listing.rent !== undefined && listing.rent !== null && listing.rent !== "" && !isNaN(Number(listing.rent)) && (
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-slate-400 font-medium">Rent</span>
                  <span className="text-white font-mono font-bold">
                    ৳{Number(listing.rent).toLocaleString()} / month
                  </span>
                </div>
              )}

              {listing.electricity_bill !== undefined && listing.electricity_bill !== null && listing.electricity_bill !== "" && !isNaN(Number(listing.electricity_bill)) && (
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-slate-400 font-medium">Electricity bill</span>
                  <span className="text-slate-200 font-mono">
                    ৳{Number(listing.electricity_bill).toLocaleString()}
                  </span>
                </div>
              )}

              {listing.water_bill !== undefined && listing.water_bill !== null && listing.water_bill !== "" && !isNaN(Number(listing.water_bill)) && (
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-slate-400 font-medium">Water bill</span>
                  <span className="text-slate-200 font-mono">
                    ৳{Number(listing.water_bill).toLocaleString()}
                  </span>
                </div>
              )}

              {listing.service_charge !== undefined && listing.service_charge !== null && listing.service_charge !== "" && !isNaN(Number(listing.service_charge)) && (
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-slate-400 font-medium">Service charge</span>
                  <span className="text-slate-200 font-mono">
                    ৳{Number(listing.service_charge).toLocaleString()}
                  </span>
                </div>
              )}

              {listing.security_deposit !== undefined && listing.security_deposit !== null && listing.security_deposit !== "" && !isNaN(Number(listing.security_deposit)) && (
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-slate-400 font-medium">Security deposit</span>
                  <span className="text-slate-200 font-mono">
                    ৳{Number(listing.security_deposit).toLocaleString()}
                  </span>
                </div>
              )}

              {listing.monthly_due_date !== undefined && listing.monthly_due_date !== null && listing.monthly_due_date !== "" && (
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-slate-400 font-medium">Monthly due date</span>
                  <span className="text-slate-200 font-medium">
                    {formatDueDate(listing.monthly_due_date)}
                  </span>
                </div>
              )}

              {listing.pet_allowed !== undefined && listing.pet_allowed !== null && (
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-slate-400 font-medium">Pet allowed</span>
                  <span className="text-slate-200 font-medium">
                    {listing.pet_allowed ? "Yes" : "No"}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Specs Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-[#090a0c] border border-slate-800 text-center">
          <div>
            <span className="block text-xs uppercase text-slate-500 mb-0.5 font-medium">Bedrooms</span>
            <span className="text-lg font-bold text-white">{listing.bedroom_count}</span>
          </div>
          <div>
            <span className="block text-xs uppercase text-slate-500 mb-0.5 font-medium">Bathrooms</span>
            <span className="text-lg font-bold text-white">{listing.bathroom_count}</span>
          </div>
          <div>
            <span className="block text-xs uppercase text-slate-500 mb-0.5 font-medium">Floor</span>
            <span className="text-lg font-bold text-white">{listing.on_which_floor}</span>
          </div>
          <div>
            <span className="block text-xs uppercase text-slate-500 mb-0.5 font-medium">Coordinates</span>
            <span className="text-xs font-mono text-slate-300">
              {Number(listing.latitude).toFixed(2)}, {Number(listing.longitude).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Owner Information Section - Clearly distinguished from Property Information */}
      <div className="border border-slate-800 bg-[#12151c] rounded-2xl p-6 sm:p-8 mb-8">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-5">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-xl text-[#d4b068]">
              shield_person
            </span>
            <h2 className="text-lg font-bold text-white">Owner Information</h2>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#d4b068]/15 text-[#d4b068] border border-[#d4b068]/30">
            <span className="material-symbols-outlined text-xs">verified</span>
            <span>Registered Owner</span>
          </span>
        </div>

        {ownerLoading ? (
          <div className="py-4 text-center text-xs text-slate-400">
            Loading owner information...
          </div>
        ) : owner ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div className="p-4 rounded-xl bg-[#090a0c] border border-slate-800">
              <span className="text-xs uppercase tracking-wider text-slate-400 block mb-1">
                Owner Reference
              </span>
              <span className="font-mono font-medium text-white">
                Owner #{owner.id}
              </span>
            </div>

            {owner.name && (
              <div className="p-4 rounded-xl bg-[#090a0c] border border-slate-800">
                <span className="text-xs uppercase tracking-wider text-slate-400 block mb-1">
                  Owner Name
                </span>
                <span className="font-medium text-white">
                  {owner.name}
                </span>
              </div>
            )}

            {owner.email && (
              <div className="p-4 rounded-xl bg-[#090a0c] border border-slate-800">
                <span className="text-xs uppercase tracking-wider text-slate-400 block mb-1">
                  Email
                </span>
                <span className="font-mono text-white text-xs">
                  {owner.email}
                </span>
              </div>
            )}

            {owner.phone && (
              <div className="p-4 rounded-xl bg-[#090a0c] border border-slate-800">
                <span className="text-xs uppercase tracking-wider text-slate-400 block mb-1">
                  Phone
                </span>
                <span className="font-mono text-white text-xs">
                  {owner.phone}
                </span>
              </div>
            )}

            <div className="p-4 rounded-xl bg-[#090a0c] border border-slate-800">
              <span className="text-xs uppercase tracking-wider text-slate-400 block mb-1">
                Verification Status
              </span>
              <span className="text-emerald-400 flex items-center gap-1 text-xs font-semibold">
                <span className="material-symbols-outlined text-sm">verified_user</span>
                Verified Property Owner
              </span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400">Owner information is currently unavailable.</p>
        )}
      </div>

      {/* Two Column Section: Applications / Apply and Reviews */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Applications for Owner OR Apply for Tenant */}
        <div className="lg:col-span-7">
          {isOwner ? (
            <div className="border border-slate-800 bg-[#12151c] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">Applications Received</h2>
                <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                  {applications.length}
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-6">
                Review tenants who applied for this apartment. Propose a lease contract or reject.
              </p>

              {applications.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                  No applications received yet for this apartment.
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {applications.map((app) => (
                    <div
                      key={app.tenant_id}
                      className="p-4 rounded-xl bg-[#090a0c] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-white text-sm">
                            {app.name || `Tenant #${app.tenant_id}`}
                          </span>
                          <span
                            className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded ${
                              app.status === "approved"
                                ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                                : app.status === "rejected"
                                ? "bg-rose-950 text-rose-300 border border-rose-800"
                                : "bg-amber-950 text-amber-300 border border-amber-800"
                            }`}
                          >
                            {app.status}
                          </span>
                        </div>
                        {app.email && <p className="text-xs text-slate-400 font-mono">{app.email}</p>}
                        {app.phone && <p className="text-xs text-slate-400 font-mono">{app.phone}</p>}
                        <p className="text-[11px] text-slate-500 mt-1">
                          Applied: {new Date(app.applied_at).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {app.status === "pending" && (
                          <>
                            <Link
                              to={`/contracts/new?listingId=${id}&tenantId=${app.tenant_id}`}
                              className="bg-[#d4b068] hover:bg-[#c39f57] text-black font-semibold px-3 py-1.5 rounded-lg text-xs transition"
                            >
                              Propose Contract
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleRejectApplicant(app.tenant_id)}
                              className="bg-red-950 hover:bg-red-900 border border-red-800 text-red-200 px-3 py-1.5 rounded-lg text-xs transition cursor-pointer"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div id="apply-section" className="border border-slate-800 bg-[#12151c] rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-1">Apply for this Apartment</h2>
              <p className="text-xs text-slate-400 mb-6">
                Submit your rental application directly to the owner.
              </p>

              {applySuccess && (
                <div className="p-3 mb-4 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs">
                  {applySuccess}
                </div>
              )}
              {applyError && (
                <div className="p-3 mb-4 rounded bg-red-950/60 border border-red-800 text-red-300 text-xs">
                  {applyError}
                </div>
              )}

              {!user ? (
                <div className="p-4 text-center border border-slate-800 rounded-xl">
                  <p className="text-xs text-slate-400 mb-3">
                    You must be logged in to apply for this property.
                  </p>
                  <Link
                    to="/login"
                    state={{ from: { pathname: `/listings/${id}` } }}
                    className="inline-block bg-white text-slate-900 px-4 py-2 rounded text-xs font-medium"
                  >
                    Log In to Apply
                  </Link>
                </div>
              ) : isApplied ? (
                <div className="flex flex-col gap-4">
                  <div className="p-5 rounded-2xl bg-[#090a0c] border border-emerald-800/60 shadow-lg">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-emerald-400 text-xl">
                          check_circle
                        </span>
                        <span className="text-sm font-bold text-white">
                          Application Submitted
                        </span>
                      </div>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                        {existingApp?.status || "Pending Review"}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed mb-4">
                      You have already submitted an application for this apartment. The property owner will review your credentials and propose a lease agreement.
                    </p>

                    <div className="flex flex-col gap-2.5 pt-3 border-t border-slate-800 text-xs">
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Application Status</span>
                        <span className="text-emerald-400 font-semibold uppercase font-mono text-[11px]">
                          {existingApp?.status || "Applied (Pending)"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Applied On</span>
                        <span className="text-white font-medium">
                          {existingApp?.appliedAt ? new Date(existingApp.appliedAt).toLocaleDateString() : "Recently"}
                        </span>
                      </div>
                      {existingApp?.monthlyIncome && (
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Reported Income</span>
                          <span className="text-slate-200 font-mono">
                            ৳{Number(existingApp.monthlyIncome).toLocaleString()} / mo
                          </span>
                        </div>
                      )}
                      {existingApp?.emergencyContact && (
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Emergency Contact</span>
                          <span className="text-slate-200 font-mono">
                            {existingApp.emergencyContact}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : showTenantForm ? (
                <form onSubmit={handleSubmitTenantForm} className="flex flex-col gap-4">
                  <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/50 text-amber-200 text-xs flex items-start gap-2">
                    <span className="material-symbols-outlined text-amber-400 text-base shrink-0 mt-0.5">info</span>
                    <span>Please enter your tenant profile details to complete your application.</span>
                  </div>

                  <div>
                    <label
                      htmlFor="apply-income"
                      className="block text-xs uppercase font-medium text-slate-400 mb-1"
                    >
                      Monthly Income (BDT) *
                    </label>
                    <input
                      id="apply-income"
                      type="number"
                      min="1000"
                      required
                      value={applyIncome}
                      onChange={(e) => setApplyIncome(e.target.value)}
                      placeholder="e.g. 80000"
                      className="w-full bg-[#12151c] text-white border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white focus:ring-1 focus:ring-white/20 placeholder:text-slate-500"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="apply-contact"
                      className="block text-xs uppercase font-medium text-slate-400 mb-1"
                    >
                      Emergency Contact (11 digits) *
                    </label>
                    <input
                      id="apply-contact"
                      type="tel"
                      required
                      maxLength={11}
                      value={applyContact}
                      onChange={(e) => setApplyContact(e.target.value)}
                      placeholder="01XXXXXXXXX"
                      className="w-full bg-[#12151c] text-white border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white focus:ring-1 focus:ring-white/20 placeholder:text-slate-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={applying}
                    className="w-full bg-white text-slate-900 font-semibold py-3 px-4 rounded-xl hover:bg-slate-200 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm flex items-center justify-center gap-2 mt-1 shadow-sm"
                  >
                    {applying ? (
                      <>
                        <span className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                        <span>Submitting Application...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit Application</span>
                        <span className="material-symbols-outlined text-base">arrow_forward</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="p-4 rounded-xl bg-[#090a0c] border border-slate-800">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-emerald-400 text-lg">verified</span>
                      <span className="text-sm font-semibold text-white">
                        {isTenant ? "Verified Tenant Profile" : "Rental Application"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {isTenant
                        ? "Your profile is registered with tenant credentials. Click Apply to instantly submit your application to the landlord."
                        : "Click Apply to submit your application for this apartment."}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={isTenant ? handleDirectApply : () => setShowTenantForm(true)}
                    disabled={applying}
                    className="w-full bg-white text-slate-900 font-semibold py-3 px-4 rounded-xl hover:bg-slate-200 transition disabled:opacity-50 cursor-pointer text-sm flex items-center justify-center gap-2 shadow-sm"
                  >
                    {applying ? (
                      <>
                        <span className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                        <span>Applying...</span>
                      </>
                    ) : (
                      <>
                        <span>Apply for this Apartment</span>
                        <span className="material-symbols-outlined text-base">arrow_forward</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Reviews */}
        <div className="lg:col-span-5">
          <div className="border border-slate-800 bg-[#12151c] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Tenant Reviews</h2>
              {reviews.length > 0 && (
                <span className="text-xs bg-slate-800 text-amber-300 px-2 py-0.5 rounded font-medium">
                  ★ {reviews[0]?.average_rating ? Number(reviews[0].average_rating).toFixed(1) : "N/A"}
                </span>
              )}
            </div>

            {reviews.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                No verified tenant reviews yet for this listing.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {reviews.map((rev, idx) => (
                  <div key={idx} className="p-3 bg-[#090a0c] border border-slate-800/80 rounded-xl">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex text-amber-400 text-xs">
                        {"★".repeat(rev.rating)}
                        {"☆".repeat(5 - rev.rating)}
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {new Date(rev.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{rev.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#12151c] border border-slate-700 rounded-2xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-3xl">check_circle</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Applied Successfully</h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Your rental application has been submitted to the property owner.
            </p>
            <button
              type="button"
              onClick={() => {
                setShowSuccessModal(false);
                window.location.reload();
              }}
              className="w-full bg-white text-slate-900 font-semibold py-2.5 px-4 rounded-xl hover:bg-slate-200 transition text-sm cursor-pointer shadow-md"
            >
              OK
            </button>
          </div>
        </div>
      )}
      {/* Lightbox Modal */}
      {isLightboxOpen && photoList.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 select-none animate-fadeIn"
          onClick={() => setIsLightboxOpen(false)}
        >
          {/* Lightbox Top Bar */}
          <div
            className="flex items-center justify-between w-full max-w-6xl mx-auto text-white z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="text-sm font-semibold truncate max-w-xs sm:max-w-md text-white">
                {listing.title}
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Photo {selectedPhotoIndex + 1} of {photoList.length}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
              aria-label="Close fullscreen gallery"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Lightbox Main Image & Navigation */}
          <div
            className="relative flex-1 flex items-center justify-center my-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {!failedImages[selectedPhotoIndex] ? (
              <img
                src={photoList[selectedPhotoIndex].url}
                alt={`${listing.title} photo ${selectedPhotoIndex + 1}`}
                className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl"
                onError={() =>
                  setFailedImages((prev) => ({ ...prev, [selectedPhotoIndex]: true }))
                }
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-400 p-8 rounded-xl bg-slate-900/60 border border-slate-800">
                <svg className="w-12 h-12 mb-2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm font-medium">Image unavailable</p>
              </div>
            )}

            {photoList.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrevPhoto}
                  className="absolute left-2 sm:left-6 w-12 h-12 rounded-full bg-black/70 hover:bg-white text-white hover:text-black border border-white/20 flex items-center justify-center transition cursor-pointer shadow-xl"
                  aria-label="Previous image"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={handleNextPhoto}
                  className="absolute right-2 sm:right-6 w-12 h-12 rounded-full bg-black/70 hover:bg-white text-white hover:text-black border border-white/20 flex items-center justify-center transition cursor-pointer shadow-xl"
                  aria-label="Next image"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
          </div>

          {/* Lightbox Bottom Thumbnail Bar */}
          {photoList.length > 1 && (
            <div
              className="w-full max-w-4xl mx-auto flex items-center justify-center gap-2 overflow-x-auto py-2 z-10"
              onClick={(e) => e.stopPropagation()}
            >
              {photoList.map((photo, idx) => (
                <button
                  key={photo.id || idx}
                  type="button"
                  onClick={() => setSelectedPhotoIndex(idx)}
                  className={`w-14 sm:w-16 aspect-[4/3] rounded-md overflow-hidden border transition cursor-pointer flex-shrink-0 ${
                    idx === selectedPhotoIndex
                      ? "ring-2 ring-white border-white scale-105 opacity-100"
                      : "border-white/20 opacity-50 hover:opacity-100"
                  }`}
                >
                  <img
                    src={photo.url}
                    alt={`Thumbnail ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
