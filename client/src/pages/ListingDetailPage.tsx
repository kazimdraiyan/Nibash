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
  monthly_income?: number | string | null;
  emergency_contact?: string | null;
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
  const [myApplication, setMyApplication] = useState<{
    status: string;
    applied_at: string;
    contract_id?: number | null;
    contract_status?: string | null;
    monthly_income?: number | string | null;
    emergency_contact?: string | null;
  } | null>(null);
  const [appliedRefresh, setAppliedRefresh] = useState(0);
  const isApplied = Boolean(
    user && id && (myApplication || hasUserApplied(user.id, id) || appliedRefresh > 0),
  );
  const existingApp = user && id ? getUserApplication(user.id, id) : null;
  const effectiveApp = myApplication
    ? {
        status: myApplication.status,
        appliedAt: myApplication.applied_at,
        monthlyIncome: myApplication.monthly_income,
        emergencyContact: myApplication.emergency_contact,
        contractId: myApplication.contract_id,
        contractStatus: myApplication.contract_status,
      }
    : existingApp
      ? {
          status: existingApp.status,
          appliedAt: existingApp.appliedAt,
          monthlyIncome: existingApp.monthlyIncome,
          emergencyContact: existingApp.emergencyContact,
          contractId: null as number | null,
          contractStatus: null as string | null,
        }
      : null;

  const [showTenantForm, setShowTenantForm] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyIncome, setApplyIncome] = useState("");
  const [applyContact, setApplyContact] = useState("");
  const [applySuccess, setApplySuccess] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [rejectingTenantId, setRejectingTenantId] = useState<number | null>(null);

  // Delete state
  const [deleting, setDeleting] = useState(false);

  // Photo gallery state
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [failedImages, setFailedImages] = useState<Record<number, boolean>>({});
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Compute available photos from listing
  const photoList =
    listing?.images &&
    Array.isArray(listing.images) &&
    listing.images.length > 0
      ? listing.images
      : listing?.imageUrl
        ? [{ id: 0, url: listing.imageUrl }]
        : [];

  useEffect(() => {
    setSelectedPhotoIndex(0);
    setFailedImages({});
  }, [id]);

  const handlePrevPhoto = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (photoList.length <= 1) return;
      setSelectedPhotoIndex((prev) =>
        prev === 0 ? photoList.length - 1 : prev - 1,
      );
    },
    [photoList.length],
  );

  const handleNextPhoto = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (photoList.length <= 1) return;
      setSelectedPhotoIndex((prev) =>
        prev === photoList.length - 1 ? 0 : prev + 1,
      );
    },
    [photoList.length],
  );

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
      const listingRes = await apiClient.get<{ listing: BackendListing }>(
        `/listings/${id}`,
      );
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
          const res = await apiClient.get<{ user?: any; owner?: any }>(
            `/users/${ownerId}`,
          );
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
        const reviewsRes = await apiClient.get<{ reviews: Review[] }>(
          `/reviews/listings/${id}`,
        );
        setReviews(reviewsRes.reviews || []);
      } catch {
        setReviews([]);
      }

      // 3. If current logged-in user is the owner, fetch applicants
      if (user && listingRes.listing.owner_id === user.id) {
        try {
          const appsRes = await apiClient.get<{ applications: Application[] }>(
            `/applications/${id}`,
          );
          setApplications(appsRes.applications || []);
        } catch {
          setApplications([]);
        }
      }

      // 4. If current logged-in user is a prospective tenant, fetch their live application status
      if (user && listingRes.listing.owner_id !== user.id) {
        try {
          const myAppsRes = await apiClient.get<{ applications: any[] }>(
            "/applications/my",
          );
          const matched = myAppsRes.applications?.find(
            (a: any) => String(a.listing_id) === String(id),
          );
          if (matched) {
            setMyApplication(matched);
            saveUserApplication(user.id, {
              listingId: id,
              listingTitle: listingRes.listing.title || `Apartment #${id}`,
              appliedAt: matched.applied_at,
              status: matched.status,
              monthlyIncome: matched.monthly_income,
              emergencyContact: matched.emergency_contact,
            });
          } else {
            setMyApplication(null);
          }
        } catch {
          // Fallback gracefully
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
      setApplyError(
        "Emergency contact must be an 11-digit Bangladeshi number starting with 01.",
      );
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
    if (!id || !user || rejectingTenantId !== null) return;
    if (!window.confirm("Are you sure you want to reject this applicant?")) return;
    setRejectingTenantId(tenantId);
    try {
      await apiClient.put(`/applications/${id}/${tenantId}`, {
        status: "rejected",
      });
      setApplications((prev) =>
        prev.map((app) =>
          app.tenant_id === tenantId ? { ...app, status: "rejected" } : app,
        ),
      );
    } catch (err: any) {
      alert(err.message || "Failed to reject applicant.");
    } finally {
      setRejectingTenantId(null);
    }
  };

  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const handleVerify = async () => {
    if (!id) return;
    setVerifying(true);
    setVerifyError(null);
    try {
      await apiClient.post(`/verify/listings/${id}/verify`);
      navigate("/verify");
    } catch (err: any) {
      setVerifyError(err.message || "Failed to verify listing.");
      setVerifying(false);
    }
  };

  const handleDeleteListing = async () => {
    if (!id || !user) return;
    const confirmDelete = window.confirm(
      "Are you sure you want to mark this listing as unavailable? This will archive the property.",
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
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Back Link */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <Link
          to="/listings"
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          <span>Back to Listings</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* MAIN COLUMN: Photo Gallery, Description, Lease Terms & Details, Owner Information, Applications (if owner), Reviews */}
        <div className="contents lg:flex lg:flex-col lg:col-span-7 xl:col-span-8 lg:gap-8">
          {/* 1. Photo Gallery (order-1 on mobile) */}
          <div className="order-1 rounded-2xl overflow-hidden border border-slate-800 bg-[#12151c]">
            {photoList.length > 0 ? (
              <div>
                {/* Primary Featured Image */}
                <div
                  className="relative w-full aspect-[16/9] sm:aspect-[21/9] lg:aspect-[16/10] max-h-[480px] overflow-hidden group cursor-pointer bg-[#090a0c]"
                  onClick={() => setIsLightboxOpen(true)}
                >
                  {!failedImages[selectedPhotoIndex] ? (
                    <img
                      src={photoList[selectedPhotoIndex].url}
                      alt={`${listing.title} photo ${selectedPhotoIndex + 1}`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.01]"
                      onError={() =>
                        setFailedImages((prev) => ({
                          ...prev,
                          [selectedPhotoIndex]: true,
                        }))
                      }
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                      <svg
                        className="w-12 h-12 mb-2 text-slate-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <p className="text-xs font-medium">
                        Image preview unavailable
                      </p>
                    </div>
                  )}

                  {/* Top Bar: Photo count & Fullscreen trigger */}
                  <div className="absolute top-3 inset-x-3 sm:top-4 sm:inset-x-4 flex items-center justify-between pointer-events-none">
                    <span className="bg-black/75 backdrop-blur-md text-white border border-white/15 text-xs font-mono px-3 py-1 rounded-full shadow-md flex items-center gap-1.5">
                      <svg
                        className="w-3.5 h-3.5 text-slate-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <span>
                        {selectedPhotoIndex + 1} / {photoList.length}
                      </span>
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsLightboxOpen(true);
                      }}
                      className="pointer-events-auto bg-black/75 hover:bg-black text-white border border-white/15 text-xs px-3 py-1.5 rounded-full backdrop-blur-md transition shadow-md flex items-center gap-1.5 cursor-pointer"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                        />
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
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/65 hover:bg-black/95 text-white border border-white/20 backdrop-blur-md flex items-center justify-center transition opacity-90 sm:opacity-0 group-hover:opacity-100 cursor-pointer shadow-lg"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M15 19l-7-7 7-7"
                          />
                        </svg>
                      </button>

                      <button
                        type="button"
                        onClick={handleNextPhoto}
                        aria-label="Next photo"
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/65 hover:bg-black/95 text-white border border-white/20 backdrop-blur-md flex items-center justify-center transition opacity-90 sm:opacity-0 group-hover:opacity-100 cursor-pointer shadow-lg"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M9 5l7 7-7 7"
                          />
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
                  <svg
                    className="w-8 h-8 text-slate-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-slate-200 mb-1">
                  No Photos Uploaded
                </h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  The property owner hasn't uploaded interior or exterior
                  photographs for this listing yet.
                </p>
              </div>
            )}
          </div>

          {/* 2. Description (order-3 on mobile) */}
          <div className="order-3 border border-slate-800 bg-[#12151c] rounded-2xl p-6 sm:p-7">
            <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-lg text-[#d4b068]">
                description
              </span>
              <span>About this Property</span>
            </h2>
            <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
              {listing.description}
            </p>
          </div>

          {/* 3. Detailed Lease Terms & Financial Information (order-4 on mobile) */}
          {((listing.rent !== undefined &&
            listing.rent !== null &&
            listing.rent !== "") ||
            (listing.electricity_bill !== undefined &&
              listing.electricity_bill !== null &&
              listing.electricity_bill !== "") ||
            (listing.water_bill !== undefined &&
              listing.water_bill !== null &&
              listing.water_bill !== "") ||
            (listing.service_charge !== undefined &&
              listing.service_charge !== null &&
              listing.service_charge !== "") ||
            (listing.security_deposit !== undefined &&
              listing.security_deposit !== null &&
              listing.security_deposit !== "") ||
            (listing.monthly_due_date !== undefined &&
              listing.monthly_due_date !== null &&
              listing.monthly_due_date !== "") ||
            (listing.pet_allowed !== undefined &&
              listing.pet_allowed !== null)) && (
            <div className="order-4 border border-slate-800 bg-[#12151c] rounded-2xl p-6 sm:p-7">
              <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-lg text-[#d4b068]">
                  receipt_long
                </span>
                <span>Lease Terms & Details</span>
              </h2>

              <div className="divide-y divide-slate-800/80 text-sm">
                {listing.rent !== undefined &&
                  listing.rent !== null &&
                  listing.rent !== "" &&
                  !isNaN(Number(listing.rent)) && (
                    <div className="flex items-center justify-between py-3">
                      <span className="text-slate-400 font-medium">
                        Monthly Rent
                      </span>
                      <span className="text-white font-mono font-bold text-base">
                        ৳{Number(listing.rent).toLocaleString()} / month
                      </span>
                    </div>
                  )}

                {listing.electricity_bill !== undefined &&
                  listing.electricity_bill !== null &&
                  listing.electricity_bill !== "" &&
                  !isNaN(Number(listing.electricity_bill)) && (
                    <div className="flex items-center justify-between py-3">
                      <span className="text-slate-400 font-medium">
                        Electricity bill
                      </span>
                      <span className="text-slate-200 font-mono">
                        ৳{Number(listing.electricity_bill).toLocaleString()}
                      </span>
                    </div>
                  )}

                {listing.water_bill !== undefined &&
                  listing.water_bill !== null &&
                  listing.water_bill !== "" &&
                  !isNaN(Number(listing.water_bill)) && (
                    <div className="flex items-center justify-between py-3">
                      <span className="text-slate-400 font-medium">
                        Water bill
                      </span>
                      <span className="text-slate-200 font-mono">
                        ৳{Number(listing.water_bill).toLocaleString()}
                      </span>
                    </div>
                  )}

                {listing.service_charge !== undefined &&
                  listing.service_charge !== null &&
                  listing.service_charge !== "" &&
                  !isNaN(Number(listing.service_charge)) && (
                    <div className="flex items-center justify-between py-3">
                      <span className="text-slate-400 font-medium">
                        Service charge
                      </span>
                      <span className="text-slate-200 font-mono">
                        ৳{Number(listing.service_charge).toLocaleString()}
                      </span>
                    </div>
                  )}

                {listing.security_deposit !== undefined &&
                  listing.security_deposit !== null &&
                  listing.security_deposit !== "" &&
                  !isNaN(Number(listing.security_deposit)) && (
                    <div className="flex items-center justify-between py-3">
                      <span className="text-slate-400 font-medium">
                        Security deposit
                      </span>
                      <span className="text-slate-200 font-mono">
                        ৳{Number(listing.security_deposit).toLocaleString()}
                      </span>
                    </div>
                  )}

                {listing.monthly_due_date !== undefined &&
                  listing.monthly_due_date !== null &&
                  listing.monthly_due_date !== "" && (
                    <div className="flex items-center justify-between py-3">
                      <span className="text-slate-400 font-medium">
                        Monthly due date
                      </span>
                      <span className="text-slate-200 font-medium">
                        {formatDueDate(listing.monthly_due_date)}
                      </span>
                    </div>
                  )}

                {listing.pet_allowed !== undefined &&
                  listing.pet_allowed !== null && (
                    <div className="flex items-center justify-between py-3">
                      <span className="text-slate-400 font-medium">
                        Pet policy
                      </span>
                      <span
                        className={`font-medium px-2.5 py-0.5 rounded-full text-xs ${
                          listing.pet_allowed
                            ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800"
                            : "bg-slate-800 text-slate-300"
                        }`}
                      >
                        {listing.pet_allowed ? "Pets Allowed" : "No Pets"}
                      </span>
                    </div>
                  )}
              </div>
            </div>
          )}

          {/* 4. Owner Information Section (order-6 on mobile) */}
          <div className="order-6 border border-slate-800 bg-[#12151c] rounded-2xl p-6 sm:p-7">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-5">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-xl text-[#d4b068]">
                  shield_person
                </span>
                <h2 className="text-base font-bold text-white">
                  Owner Information
                </h2>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#d4b068]/15 text-[#d4b068] border border-[#d4b068]/30">
                <span className="material-symbols-outlined text-xs">
                  verified
                </span>
                <span>Registered Owner</span>
              </span>
            </div>

            {ownerLoading ? (
              <div className="py-4 text-center text-xs text-slate-400">
                Loading owner information...
              </div>
            ) : owner ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 text-sm">
                <div className="p-3.5 rounded-xl bg-[#090a0c] border border-slate-800">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 block mb-1">
                    Owner Reference
                  </span>
                  <span className="font-mono font-medium text-white">
                    Owner #{owner.id}
                  </span>
                </div>

                {owner.name && (
                  <div className="p-3.5 rounded-xl bg-[#090a0c] border border-slate-800">
                    <span className="text-[11px] uppercase tracking-wider text-slate-400 block mb-1">
                      Owner Name
                    </span>
                    <span className="font-medium text-white">{owner.name}</span>
                  </div>
                )}

                {owner.email && (
                  <div className="p-3.5 rounded-xl bg-[#090a0c] border border-slate-800">
                    <span className="text-[11px] uppercase tracking-wider text-slate-400 block mb-1">
                      Email
                    </span>
                    <span className="font-mono text-white text-xs truncate block">
                      {owner.email}
                    </span>
                  </div>
                )}

                {owner.phone && (
                  <div className="p-3.5 rounded-xl bg-[#090a0c] border border-slate-800">
                    <span className="text-[11px] uppercase tracking-wider text-slate-400 block mb-1">
                      Phone
                    </span>
                    <span className="font-mono text-white text-xs">
                      {owner.phone}
                    </span>
                  </div>
                )}

                <div className="p-3.5 rounded-xl bg-[#090a0c] border border-slate-800">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 block mb-1">
                    Verification Status
                  </span>
                  <span className="text-emerald-400 flex items-center gap-1 text-xs font-semibold">
                    <span className="material-symbols-outlined text-sm">
                      verified_user
                    </span>
                    Verified Property Owner
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                Owner information is currently unavailable.
              </p>
            )}
          </div>

          {/* 5. If Owner: Applications Received (order-7 on mobile) */}
          {isOwner && (
            <div className="order-7 border border-slate-800 bg-[#12151c] rounded-2xl p-6 sm:p-7">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg text-[#d4b068]">
                    group
                  </span>
                  <span>Applications Received</span>
                </h2>
                <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full font-mono border border-slate-700">
                  {applications.length}
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-6">
                Review tenants who applied for this apartment. Propose a lease
                contract or reject.
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
                      className="p-5 rounded-xl bg-[#090a0c] border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-5"
                    >
                      <div className="space-y-2.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-white text-base">
                            {app.name || `Tenant #${app.tenant_id}`}
                          </span>
                          <span className="text-xs text-slate-500 font-mono">
                            (ID: #{app.tenant_id})
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

                        {/* Tenant Details Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                          {app.email && (
                            <div className="flex items-center gap-1.5 text-slate-400">
                              <span className="material-symbols-outlined text-xs text-slate-500">mail</span>
                              <span className="font-mono text-slate-300">{app.email}</span>
                            </div>
                          )}
                          {app.phone && (
                            <div className="flex items-center gap-1.5 text-slate-400">
                              <span className="material-symbols-outlined text-xs text-slate-500">call</span>
                              <span className="font-mono text-slate-300">{app.phone}</span>
                            </div>
                          )}
                          {app.monthly_income !== undefined && app.monthly_income !== null && app.monthly_income !== "" && !isNaN(Number(app.monthly_income)) && (
                            <div className="flex items-center gap-1.5 text-slate-400">
                              <span className="material-symbols-outlined text-xs text-slate-500">payments</span>
                              <span>Monthly Income: <strong className="text-slate-200 font-mono">৳{Number(app.monthly_income).toLocaleString()}</strong></span>
                            </div>
                          )}
                          {app.emergency_contact && (
                            <div className="flex items-center gap-1.5 text-slate-400">
                              <span className="material-symbols-outlined text-xs text-slate-500">contact_phone</span>
                              <span>Emergency Contact: <strong className="text-slate-200 font-mono">{app.emergency_contact}</strong></span>
                            </div>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-500">
                          Applied: {new Date(app.applied_at).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2.5 self-start md:self-center shrink-0">
                        {app.status === "pending" && (
                          <>
                            <Link
                              to={`/contracts/new?listingId=${id}&tenantId=${app.tenant_id}`}
                              className="bg-[#d4b068] hover:bg-[#c39f57] text-black font-semibold px-3.5 py-1.5 rounded-lg text-xs transition"
                            >
                              Propose Contract
                            </Link>
                            <button
                              type="button"
                              disabled={rejectingTenantId === app.tenant_id}
                              onClick={() =>
                                handleRejectApplicant(app.tenant_id)
                              }
                              className="bg-red-950 hover:bg-red-900 border border-red-800 text-red-200 px-3.5 py-1.5 rounded-lg text-xs transition cursor-pointer disabled:opacity-50"
                            >
                              {rejectingTenantId === app.tenant_id ? "Rejecting..." : "Reject"}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 6. Tenant Reviews (order-8 on mobile) */}
          <div className="order-8 border border-slate-800 bg-[#12151c] rounded-2xl p-6 sm:p-7">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-lg text-amber-400">
                  star
                </span>
                <span>Tenant Reviews</span>
              </h2>
              {reviews.length > 0 && (
                <span className="text-xs bg-slate-800 text-amber-300 px-2.5 py-1 rounded-full font-medium border border-slate-700">
                  ★{" "}
                  {reviews[0]?.average_rating
                    ? Number(reviews[0].average_rating).toFixed(1)
                    : "N/A"}
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
                  <div
                    key={idx}
                    className="p-3.5 bg-[#090a0c] border border-slate-800/80 rounded-xl"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex text-amber-400 text-xs">
                        {"★".repeat(rev.rating)}
                        {"☆".repeat(5 - rev.rating)}
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {new Date(rev.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {rev.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* SIDEBAR COLUMN: Information Card + Actions Card */}
        <aside className="contents lg:flex lg:flex-col lg:col-span-5 xl:col-span-4 lg:sticky lg:top-6 lg:gap-6">
          {/* 1. Listing Information Card (order-2 on mobile) */}
          <div className="order-2 border border-slate-800 bg-[#12151c] rounded-2xl p-6 shadow-xl">
            {/* Area Badge & Status */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase bg-slate-800 text-slate-300 px-2.5 py-1 rounded">
                  {getAreaName(listing.area_id)}
                </span>
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
              <span className="text-xs font-mono text-slate-500">
                Ref #{listing.id}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-xl sm:text-2xl font-bold text-white mb-4 leading-snug">
              {listing.title}
            </h1>

            {/* Price Display */}
            {listing.rent !== undefined &&
              listing.rent !== null &&
              listing.rent !== "" &&
              !isNaN(Number(listing.rent)) && (
                <div className="p-4 rounded-xl bg-[#090a0c] border border-slate-800/90 mb-5">
                  <span className="block text-[11px] uppercase tracking-wider text-slate-400 mb-0.5">
                    Monthly Rent
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-bold font-mono text-white">
                      ৳{Number(listing.rent).toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      / month
                    </span>
                  </div>
                </div>
              )}

            {/* Key Property Specs */}
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-[#090a0c] border border-slate-800 text-center">
              <div className="p-2">
                <span className="block text-[10px] uppercase tracking-wider text-slate-400 mb-0.5 font-medium">
                  Bedrooms
                </span>
                <span className="text-base font-bold text-white">
                  {listing.bedroom_count}
                </span>
              </div>
              <div className="p-2">
                <span className="block text-[10px] uppercase tracking-wider text-slate-400 mb-0.5 font-medium">
                  Bathrooms
                </span>
                <span className="text-base font-bold text-white">
                  {listing.bathroom_count}
                </span>
              </div>
              <div className="p-2 border-t border-slate-800/80">
                <span className="block text-[10px] uppercase tracking-wider text-slate-400 mb-0.5 font-medium">
                  Floor
                </span>
                <span className="text-base font-bold text-white">
                  {listing.on_which_floor}
                </span>
              </div>
              <div className="p-2 border-t border-slate-800/80">
                <span className="block text-[10px] uppercase tracking-wider text-slate-400 mb-0.5 font-medium">
                  Coordinates
                </span>
                <span className="text-xs font-mono text-slate-300 block truncate">
                  {Number(listing.latitude).toFixed(2)},{" "}
                  {Number(listing.longitude).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Actions Card (order-5 on mobile) */}
          <div className="order-5 border border-slate-800 bg-[#12151c] rounded-2xl p-6 shadow-xl">
            {user?.is_verifier ? (
              <div>
                <h3 className="text-sm font-bold text-white mb-2">
                  Verifier Controls
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Review this listing and confirm its authenticity.
                </p>
                {verifyError && (
                  <div className="p-3 mb-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs">
                    {verifyError}
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={verifying}
                  className="w-full bg-white text-slate-900 font-semibold py-3 px-4 rounded-xl hover:bg-slate-200 transition disabled:opacity-50 cursor-pointer text-sm"
                >
                  {verifying ? "Verifying..." : "Mark as Verified"}
                </button>
              </div>
            ) : isOwner ? (
              <div>
                <h3 className="text-sm font-bold text-white mb-2">
                  Owner Controls
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Manage this listing or update information.
                </p>
                <div className="flex flex-col gap-2.5">
                  <Link
                    to={`/listings/${id}/edit`}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-2.5 px-4 rounded-xl text-xs transition text-center border border-slate-700"
                  >
                    Edit Listing Details
                  </Link>
                  <button
                    type="button"
                    onClick={handleDeleteListing}
                    disabled={deleting}
                    className="w-full bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-200 py-2.5 px-4 rounded-xl text-xs transition cursor-pointer disabled:opacity-50"
                  >
                    {deleting ? "Deleting..." : "Delete Listing"}
                  </button>
                </div>
              </div>
            ) : (
              <div id="apply-section">
                <h3 className="text-base font-bold text-white mb-1">
                  Apply for this Apartment
                </h3>
                <p className="text-xs text-slate-400 mb-5">
                  Submit your rental application directly to the owner.
                </p>

                {applySuccess && (
                  <div className="p-3 mb-4 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs">
                    {applySuccess}
                  </div>
                )}
                {applyError && (
                  <div className="p-3 mb-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs">
                    {applyError}
                  </div>
                )}

                {!user ? (
                  <div className="p-4 text-center border border-slate-800 rounded-xl bg-[#090a0c]">
                    <p className="text-xs text-slate-400 mb-3">
                      You must be logged in to apply for this property.
                    </p>
                    <Link
                      to="/login"
                      state={{ from: { pathname: `/listings/${id}` } }}
                      className="inline-block w-full bg-white hover:bg-slate-200 text-slate-900 font-semibold py-2.5 px-4 rounded-xl text-xs transition shadow-sm text-center"
                    >
                      Log In to Apply
                    </Link>
                  </div>
                ) : isApplied ? (
                  <div className={`p-4 rounded-xl bg-[#090a0c] border shadow-lg ${
                    effectiveApp?.contractStatus === "proposed"
                      ? "border-[#d4b068]/70"
                      : effectiveApp?.contractStatus === "signed" || effectiveApp?.status === "approved"
                      ? "border-emerald-800/60"
                      : effectiveApp?.status === "rejected"
                      ? "border-rose-800/60"
                      : "border-slate-800"
                  }`}>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`material-symbols-outlined text-xl ${
                          effectiveApp?.contractStatus === "proposed"
                            ? "text-[#d4b068]"
                            : effectiveApp?.contractStatus === "signed" || effectiveApp?.status === "approved"
                            ? "text-emerald-400"
                            : effectiveApp?.status === "rejected"
                            ? "text-rose-400"
                            : "text-amber-400"
                        }`}>
                          {effectiveApp?.contractStatus === "proposed"
                            ? "edit_document"
                            : effectiveApp?.contractStatus === "signed" || effectiveApp?.status === "approved"
                            ? "check_circle"
                            : effectiveApp?.status === "rejected"
                            ? "cancel"
                            : "schedule"}
                        </span>
                        <span className="text-sm font-bold text-white">
                          {effectiveApp?.contractStatus === "proposed"
                            ? "Contract Proposed!"
                            : effectiveApp?.contractStatus === "signed"
                            ? "Lease Agreement Active"
                            : effectiveApp?.status === "approved"
                            ? "Application Approved"
                            : effectiveApp?.status === "rejected"
                            ? "Application Declined"
                            : "Application Submitted"}
                        </span>
                      </div>
                      <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded ${
                        effectiveApp?.contractStatus === "proposed"
                          ? "bg-amber-950 text-amber-300 border border-amber-800"
                          : effectiveApp?.contractStatus === "signed" || effectiveApp?.status === "approved"
                          ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                          : effectiveApp?.status === "rejected"
                          ? "bg-rose-950 text-rose-300 border border-rose-800"
                          : "bg-slate-800 text-slate-300 border border-slate-700"
                      }`}>
                        {effectiveApp?.contractStatus === "proposed"
                          ? "Action Required"
                          : effectiveApp?.contractStatus === "signed"
                          ? "Signed"
                          : effectiveApp?.status || "Pending"}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed mb-4">
                      {effectiveApp?.contractStatus === "proposed"
                        ? "Great news! The property owner has reviewed your application and proposed a lease agreement. Please review the terms and sign the digital contract."
                        : effectiveApp?.contractStatus === "signed"
                        ? "You have signed the lease contract for this apartment. Your tenancy agreement is active."
                        : effectiveApp?.status === "approved"
                        ? "Your application has been approved by the landlord. A lease agreement is being prepared."
                        : effectiveApp?.status === "rejected"
                        ? "The property owner was unable to accept your application for this apartment."
                        : "You have submitted an application for this apartment. The property owner will review your credentials and propose a lease agreement."}
                    </p>

                    {/* Direct Contract Action Button */}
                    {effectiveApp?.contractId && effectiveApp?.contractStatus === "proposed" && (
                      <Link
                        to={`/contracts/${effectiveApp.contractId}`}
                        className="mb-4 w-full bg-[#d4b068] hover:bg-[#c39f57] text-black font-semibold py-2.5 px-4 rounded-xl text-xs transition text-center flex items-center justify-center gap-2 shadow-sm"
                      >
                        <span className="material-symbols-outlined text-sm">draw</span>
                        <span>Review & Sign Lease Contract</span>
                      </Link>
                    )}

                    {effectiveApp?.contractId && effectiveApp?.contractStatus === "signed" && (
                      <Link
                        to={`/contracts/${effectiveApp.contractId}`}
                        className="mb-4 w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-2 px-4 rounded-xl text-xs transition text-center flex items-center justify-center gap-1.5"
                      >
                        <span>View Signed Contract</span>
                        <span className="material-symbols-outlined text-xs">arrow_forward</span>
                      </Link>
                    )}

                    <div className="flex flex-col gap-2 pt-3 border-t border-slate-800 text-xs">
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Application Status</span>
                        <span className="text-white font-semibold uppercase font-mono text-[11px]">
                          {effectiveApp?.status || "Pending"}
                        </span>
                      </div>
                      {effectiveApp?.contractStatus && (
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Contract Status</span>
                          <span className={`font-semibold uppercase font-mono text-[11px] ${
                            effectiveApp.contractStatus === "signed" ? "text-emerald-400" : "text-[#d4b068]"
                          }`}>
                            {effectiveApp.contractStatus === "signed" ? "Signed" : "Proposed (Pending Signature)"}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Applied On</span>
                        <span className="text-white font-medium">
                          {effectiveApp?.appliedAt
                            ? new Date(
                                effectiveApp.appliedAt,
                              ).toLocaleDateString()
                            : "Recently"}
                        </span>
                      </div>
                      {effectiveApp?.monthlyIncome && (
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Reported Income</span>
                          <span className="text-slate-200 font-mono">
                            ৳
                            {Number(effectiveApp.monthlyIncome).toLocaleString()}{" "}
                            / mo
                          </span>
                        </div>
                      )}
                      {effectiveApp?.emergencyContact && (
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Emergency Contact</span>
                          <span className="text-slate-200 font-mono">
                            {effectiveApp.emergencyContact}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : showTenantForm ? (
                  <form
                    onSubmit={handleSubmitTenantForm}
                    className="flex flex-col gap-4"
                  >
                    <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/50 text-amber-200 text-xs flex items-start gap-2">
                      <span className="material-symbols-outlined text-amber-400 text-base shrink-0 mt-0.5">
                        info
                      </span>
                      <span>
                        Please enter your tenant profile details to complete
                        your application.
                      </span>
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
                          <span className="material-symbols-outlined text-base">
                            arrow_forward
                          </span>
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="p-4 rounded-xl bg-[#090a0c] border border-slate-800">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="material-symbols-outlined text-emerald-400 text-lg">
                          verified
                        </span>
                        <span className="text-sm font-semibold text-white">
                          {isTenant
                            ? "Verified Tenant Profile"
                            : "Rental Application"}
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
                      onClick={
                        isTenant
                          ? handleDirectApply
                          : () => setShowTenantForm(true)
                      }
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
                          <span className="material-symbols-outlined text-base">
                            arrow_forward
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#12151c] border border-slate-700 rounded-2xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-3xl">
                check_circle
              </span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              Applied Successfully
            </h3>
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
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
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
                  setFailedImages((prev) => ({
                    ...prev,
                    [selectedPhotoIndex]: true,
                  }))
                }
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-400 p-8 rounded-xl bg-slate-900/60 border border-slate-800">
                <svg
                  className="w-12 h-12 mb-2 text-slate-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
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
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={handleNextPhoto}
                  className="absolute right-2 sm:right-6 w-12 h-12 rounded-full bg-black/70 hover:bg-white text-white hover:text-black border border-white/20 flex items-center justify-center transition cursor-pointer shadow-xl"
                  aria-label="Next image"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M9 5l7 7-7 7"
                    />
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
