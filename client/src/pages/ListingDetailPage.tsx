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
import { ListingMapPreview } from "../components/ListingMapPreview";
import { getAmenityIcon, getAmenityMeta } from "../utils/amenities";
import { DocumentViewerModal } from "../components/DocumentViewerModal";

interface OwnerPhoneListing extends BackendListing {
  owner_name?: string | null;
  owner_email?: string | null;
  owner_phone?: string | null;
}

export interface ListingDocument {
  id: number;
  document_type: string;
  is_verified: boolean;
  verification_type?: string | null;
  uploaded_at: string;
  media: { id: number; url: string }[];
}

function formatDocumentType(type: string): string {
  switch (type) {
    case "electricity_bill_receipt":
      return "Electricity Bill Receipt";
    case "holding_tax_receipt":
      return "Holding Tax Receipt";
    case "water_bill_receipt":
      return "Water Bill Receipt";
    case "trade_license":
      return "Trade License";
    case "nid":
      return "National ID (NID)";
    case "passport":
      return "Passport";
    case "driving_license":
      return "Driving License";
    default:
      return type
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
  }
}

function formatPhoneForWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, "");

  if (!digits) return "";
  if (digits.startsWith("880") && digits.length >= 12) return digits;
  if (digits.startsWith("0") && digits.length === 11) return `880${digits.slice(1)}`;
  if (digits.length >= 10) return digits;

  return "";
}

interface ReviewMediaItem {
  id: number;
  url: string;
}

interface Review {
  id: number;
  contract_id: number;
  reviewer_name?: string | null;
  reviewer_id?: number;
  rating: number;
  description?: string | null;
  created_at: string;
  media?: ReviewMediaItem[];
}

interface ReviewSummary {
  total_reviews: number;
  average_rating: number;
  rating_counts: Record<number, number>;
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

interface TenantHistoryRecord {
  contractId: number;
  tenantId: number;
  name: string;
  email: string;
  phone: string | null;
  emergencyContact: string | null;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  contractStatus: string;
  createdAt: string;
}

interface ListingTenantHistoryResponse {
  listingId: number;
  listingTitle: string;
  currentTenants: TenantHistoryRecord[];
  pastTenants: TenantHistoryRecord[];
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

  const [listing, setListing] = useState<OwnerPhoneListing | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary>({
    total_reviews: 0,
    average_rating: 0,
    rating_counts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });
  const [reviewLightbox, setReviewLightbox] = useState<{
    photos: ReviewMediaItem[];
    selectedIndex: number;
    reviewerName?: string | null;
    rating: number;
  } | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Owner details state
  const [owner, setOwner] = useState<OwnerInfo | null>(null);

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
    user &&
    id &&
    (myApplication || hasUserApplied(user.id, id) || appliedRefresh > 0),
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
  const [rejectingTenantId, setRejectingTenantId] = useState<number | null>(
    null,
  );

  // Delete state
  const [deleting, setDeleting] = useState(false);

  // Documents state for verifiers and owner
  const [documents, setDocuments] = useState<ListingDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsError, setDocumentsError] = useState<string | null>(null);

  // Tenant history state for owner
  const [tenantHistory, setTenantHistory] = useState<ListingTenantHistoryResponse | null>(null);
  const [tenantHistoryLoading, setTenantHistoryLoading] = useState(false);
  const [tenantHistoryError, setTenantHistoryError] = useState<string | null>(null);
  const [activeTenantTab, setActiveTenantTab] = useState<"current" | "past">("current");

  // Verifier actions state
  const [verifyingDocId, setVerifyingDocId] = useState<number | null>(null);
  const [docVerifyError, setDocVerifyError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifySuccessMsg, setVerifySuccessMsg] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectError, setRejectError] = useState<string | null>(null);

  // Active document viewer state
  const [activeViewerDoc, setActiveViewerDoc] = useState<{
    title: string;
    type: string;
    isVerified: boolean;
    uploadedAt?: string;
    media: { id: number; url: string }[];
    initialIndex: number;
  } | null>(null);

  // Photo gallery state
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [failedImages, setFailedImages] = useState<Record<number, boolean>>({});
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isStarred, setIsStarred] = useState(false);
  const [starLoading, setStarLoading] = useState(false);

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
      if (reviewLightbox) {
        if (e.key === "ArrowLeft" && reviewLightbox.photos.length > 1) {
          setReviewLightbox((prev) =>
            prev
              ? {
                  ...prev,
                  selectedIndex:
                    prev.selectedIndex === 0
                      ? prev.photos.length - 1
                      : prev.selectedIndex - 1,
                }
              : null
          );
        }
        if (e.key === "ArrowRight" && reviewLightbox.photos.length > 1) {
          setReviewLightbox((prev) =>
            prev
              ? {
                  ...prev,
                  selectedIndex:
                    prev.selectedIndex === prev.photos.length - 1
                      ? 0
                      : prev.selectedIndex + 1,
                }
              : null
          );
        }
        if (e.key === "Escape") setReviewLightbox(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLightboxOpen, reviewLightbox, handlePrevPhoto, handleNextPhoto]);

  const fetchDetails = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch listing details
      let currentListing: OwnerPhoneListing | null = null;
      try {
        const listingRes = await apiClient.get<{ listing: OwnerPhoneListing }>(
          `/listings/${id}`,
        );
        currentListing = listingRes.listing;
      } catch (err: any) {
        // If 404 and current user is a verifier, query unverified queue
        if (user?.is_verifier) {
          try {
            const unverifiedRes = await apiClient.get<{ listings: OwnerPhoneListing[] }>(
              `/verify/listings`,
            );
            const found = (unverifiedRes.listings || []).find(
              (l) => String(l.id) === String(id),
            );
            if (found) {
              currentListing = found;
            } else {
              throw err;
            }
          } catch {
            throw err;
          }
        } else {
          throw err;
        }
      }
      if (!currentListing) {
        throw new Error("Apartment not found.");
      }
      setListing(currentListing);

      // Seed owner info from listing fields (server omits name/email/phone for the owner themselves)
      const ownerId = currentListing.owner_id;
      setOwner({
        id: ownerId,
        name: currentListing.owner_name ?? undefined,
        email: currentListing.owner_email ?? undefined,
        phone: currentListing.owner_phone ?? undefined,
      });

      // 2. Fetch reviews for this listing
      try {
        const reviewsRes = await apiClient.get<{
          reviews: Review[];
          summary: ReviewSummary;
        }>(`/reviews/listings/${id}`);
        setReviews(reviewsRes.reviews || []);
        if (reviewsRes.summary) {
          setReviewSummary(reviewsRes.summary);
        }
      } catch {
        setReviews([]);
        setReviewSummary({
          total_reviews: 0,
          average_rating: 0,
          rating_counts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        });
      }

      // 3. If current logged-in user is the owner, fetch applicants
      if (user && currentListing.owner_id === user.id) {
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
      if (user && currentListing.owner_id !== user.id) {
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
              listingTitle: currentListing.title || `Apartment #${id}`,
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

      // 5. Fetch documents for verifiers or property owner
      if (user?.is_verifier || (user && currentListing.owner_id === user.id)) {
        setDocumentsLoading(true);
        setDocumentsError(null);
        try {
          const docRes = await apiClient.get<{ documents: ListingDocument[] }>(
            `/documents/listings/${id}`,
          );
          setDocuments(docRes.documents || []);
        } catch (docErr: any) {
          setDocumentsError(docErr.message || "Failed to load documents.");
        } finally {
          setDocumentsLoading(false);
        }
      }

      // 6. Fetch tenant history if property owner
      if (user && currentListing.owner_id === user.id) {
        setTenantHistoryLoading(true);
        setTenantHistoryError(null);
        try {
          const histRes = await apiClient.get<ListingTenantHistoryResponse>(
            `/listings/${id}/tenants`,
          );
          setTenantHistory(histRes);
        } catch (histErr: any) {
          setTenantHistoryError(histErr.message || "Failed to load tenant history.");
        } finally {
          setTenantHistoryLoading(false);
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

  // Fetch starred state after listing loads
  useEffect(() => {
    if (!id || !user) return;
    apiClient.get<{ starred: boolean }>(`/listings/${id}/starred`)
      .then((res) => setIsStarred(res.starred))
      .catch(() => {});
  }, [id, user]);

  const handleToggleStar = async () => {
    if (!user || starLoading) return;
    const next = !isStarred;
    setIsStarred(next); // optimistic
    setStarLoading(true);
    try {
      await apiClient.post(`/listings/${id}/togglestar`);
    } catch {
      setIsStarred(!next); // revert
    } finally {
      setStarLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && window.location.hash === "#apply-section") {
      setTimeout(() => {
        const el = document.getElementById("apply-section");
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [loading]);

  useEffect(() => {
    if (!loading && window.location.hash === "#tenant-history") {
      setTimeout(() => {
        const el = document.getElementById("tenant-history");
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 150);
    }
  }, [loading]);

  const loadTenantHistory = async () => {
    if (!id || !user) return;
    setTenantHistoryLoading(true);
    setTenantHistoryError(null);
    try {
      const histRes = await apiClient.get<ListingTenantHistoryResponse>(
        `/listings/${id}/tenants`,
      );
      setTenantHistory(histRes);
    } catch (histErr: any) {
      setTenantHistoryError(histErr.message || "Failed to load tenant history.");
    } finally {
      setTenantHistoryLoading(false);
    }
  };

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
        fetchDetails();
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
          fetchDetails();
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
        fetchDetails();
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
          fetchDetails();
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
    if (!window.confirm("Are you sure you want to reject this applicant?"))
      return;
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

  const loadDocuments = useCallback(async () => {
    if (!id || !user) return;
    setDocumentsLoading(true);
    setDocumentsError(null);
    try {
      const docRes = await apiClient.get<{ documents: ListingDocument[] }>(
        `/documents/listings/${id}`,
      );
      setDocuments(docRes.documents || []);
    } catch (docErr: any) {
      setDocumentsError(docErr.message || "Failed to load documents.");
    } finally {
      setDocumentsLoading(false);
    }
  }, [id, user]);

  const handleVerifyDocument = async (documentId: number) => {
    if (verifyingDocId !== null) return;
    setVerifyingDocId(documentId);
    setDocVerifyError(null);
    try {
      await apiClient.post(`/documents/${documentId}/verify`);
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === documentId
            ? { ...d, is_verified: true, verification_type: "manual" }
            : d,
        ),
      );
    } catch (err: any) {
      setDocVerifyError(err.message || "Failed to verify document.");
    } finally {
      setVerifyingDocId(null);
    }
  };

  const handleApproveListing = async () => {
    if (!id || verifying || listing?.status?.toLowerCase() === "approved") return;
    setVerifying(true);
    setVerifyError(null);
    setVerifySuccessMsg(null);
    try {
      await apiClient.post(`/verify/listings/${id}/verify`);
      setListing((prev) => (prev ? { ...prev, status: "approved" } : null));
      setVerifySuccessMsg("Listing approved successfully and is now active on Nibash.");
    } catch (err: any) {
      setVerifyError(err.message || "Failed to approve listing.");
    } finally {
      setVerifying(false);
    }
  };

  const handleRejectListing = async () => {
    if (!id || rejecting || listing?.status?.toLowerCase() === "rejected") return;
    setRejecting(true);
    setRejectError(null);
    try {
      await apiClient.post(`/verify/listings/${id}/reject`);
      setListing((prev) => (prev ? { ...prev, status: "rejected" } : null));
      setShowRejectModal(false);
      setVerifySuccessMsg(null);
      setVerifyError(null);
    } catch (err: any) {
      setRejectError(err.message || "Failed to reject listing.");
    } finally {
      setRejecting(false);
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
      fetchDetails();
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

  const getDirections = () => {
    const url =
      `https://www.google.com/maps/dir/?api=1` +
      `&destination=${Number(listing.latitude)},${Number(listing.longitude)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const isOwner = Boolean(user && Number(user.id) === Number(listing.owner_id));
  const whatsAppPhone = listing.owner_phone
    ? formatPhoneForWhatsApp(listing.owner_phone)
    : "";
  const whatsAppHref = whatsAppPhone
    ? `https://wa.me/${whatsAppPhone}?text=${encodeURIComponent(
        `Hello, I'm interested in your listing "${listing.title}".`,
      )}`
    : null;

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

          {/* 3. Amenities & Facilities (order-4 on mobile) */}
          <div className="order-4 border border-slate-800 bg-[#12151c] rounded-2xl p-6 sm:p-7">
            <h2 className="text-base font-bold text-white flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-lg text-[#d4b068]">
                hotel_class
              </span>
              <span>Amenities & Facilities</span>
            </h2>

            {listing.amenities && listing.amenities.length > 0 ? (
              <div className="flex flex-wrap gap-2.5">
                {listing.amenities.map((amenity) => {
                  const iconName = getAmenityIcon(amenity.name);
                  const meta = getAmenityMeta(amenity.name);
                  const tooltipText = amenity.description || meta.category || amenity.name;

                  return (
                    <div
                      key={amenity.id || amenity.name}
                      title={tooltipText}
                      className="group inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium border border-slate-800 bg-[#090a0c] text-slate-200 hover:border-[#d4b068]/40 hover:bg-[#151922] transition-all cursor-default select-none shadow-xs"
                    >
                      <span className="material-symbols-outlined text-base text-[#d4b068] group-hover:scale-110 transition-transform">
                        {iconName}
                      </span>
                      <span>{amenity.name}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#090a0c] border border-slate-800/80 text-center sm:text-left flex items-center gap-3 text-slate-400 text-xs">
                <span className="material-symbols-outlined text-slate-500 text-lg">
                  info
                </span>
                <span>No specific building amenities or facilities listed for this residence.</span>
              </div>
            )}
          </div>

          {/* 4. Detailed Lease Terms & Financial Information (order-5 on mobile) */}
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
            <div className="order-5 border border-slate-800 bg-[#12151c] rounded-2xl p-6 sm:p-7">
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
          {!isOwner && (
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

            {owner ? (
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
          )}

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
                              <span className="material-symbols-outlined text-xs text-slate-500">
                                mail
                              </span>
                              <span className="font-mono text-slate-300">
                                {app.email}
                              </span>
                            </div>
                          )}
                          {app.phone && (
                            <div className="flex items-center gap-1.5 text-slate-400">
                              <span className="material-symbols-outlined text-xs text-slate-500">
                                call
                              </span>
                              <span className="font-mono text-slate-300">
                                {app.phone}
                              </span>
                            </div>
                          )}
                          {app.monthly_income !== undefined &&
                            app.monthly_income !== null &&
                            app.monthly_income !== "" &&
                            !isNaN(Number(app.monthly_income)) && (
                              <div className="flex items-center gap-1.5 text-slate-400">
                                <span className="material-symbols-outlined text-xs text-slate-500">
                                  payments
                                </span>
                                <span>
                                  Monthly Income:{" "}
                                  <strong className="text-slate-200 font-mono">
                                    ৳
                                    {Number(
                                      app.monthly_income,
                                    ).toLocaleString()}
                                  </strong>
                                </span>
                              </div>
                            )}
                          {app.emergency_contact && (
                            <div className="flex items-center gap-1.5 text-slate-400">
                              <span className="material-symbols-outlined text-xs text-slate-500">
                                contact_phone
                              </span>
                              <span>
                                Emergency Contact:{" "}
                                <strong className="text-slate-200 font-mono">
                                  {app.emergency_contact}
                                </strong>
                              </span>
                            </div>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-500">
                          Applied:{" "}
                          {new Date(app.applied_at).toLocaleDateString()}
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
                              {rejectingTenantId === app.tenant_id
                                ? "Rejecting..."
                                : "Reject"}
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

          {/* 6. If Owner: Tenant History Section (order-7 on mobile) */}
          {isOwner && (
            <div
              id="tenant-history"
              className="order-7 border border-slate-800 bg-[#12151c] rounded-2xl p-6 sm:p-7 shadow-xl scroll-mt-24"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 pb-4 border-b border-white/10">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-xl text-sky-400">
                      history
                    </span>
                    <h2 className="text-lg font-serif font-bold text-white tracking-wide">
                      Tenant History
                    </h2>
                    <span className="text-xs bg-sky-500/20 text-sky-300 border border-sky-500/40 px-2.5 py-0.5 rounded-full font-mono font-medium">
                      {(tenantHistory?.currentTenants?.length || 0) +
                        (tenantHistory?.pastTenants?.length || 0)}{" "}
                      Total
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Public record of current and previous tenants for this apartment.
                  </p>
                </div>

                {/* Tab Controls */}
                <div className="flex items-center gap-2 bg-[#090a0c] p-1 rounded-xl border border-slate-800 self-start sm:self-center">
                  <button
                    type="button"
                    onClick={() => setActiveTenantTab("current")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeTenantTab === "current"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>
                      Current ({tenantHistory?.currentTenants?.length || 0})
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTenantTab("past")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeTenantTab === "past"
                        ? "bg-slate-700/60 text-slate-200 border border-slate-600 shadow-sm"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    <span>Past ({tenantHistory?.pastTenants?.length || 0})</span>
                  </button>
                </div>
              </div>

              {/* Error Banner */}
              {tenantHistoryError && (
                <div className="p-3 mb-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center justify-between">
                  <span>{tenantHistoryError}</span>
                  <button
                    type="button"
                    onClick={loadTenantHistory}
                    className="text-red-400 hover:text-white text-xs ml-2 cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Loading Spinner */}
              {tenantHistoryLoading ? (
                <div className="py-12 text-center text-slate-400">
                  <div className="w-7 h-7 rounded-full border-2 border-sky-400/40 border-t-transparent animate-spin mx-auto mb-2" />
                  <p className="text-xs">Loading tenant history...</p>
                </div>
              ) : activeTenantTab === "current" ? (
                <div>
                  {tenantHistory &&
                  tenantHistory.currentTenants &&
                  tenantHistory.currentTenants.length > 0 ? (
                    <div className="flex flex-col gap-4">
                      {tenantHistory.currentTenants.map((tenant) => (
                        <TenantHistoryCard
                          key={tenant.contractId}
                          tenant={tenant}
                          isCurrent={true}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="py-10 text-center border border-dashed border-slate-800 rounded-xl p-6 bg-[#090a0c]/60">
                      <span className="material-symbols-outlined text-3xl text-slate-600 mb-2">
                        no_accounts
                      </span>
                      <h4 className="text-sm font-medium text-slate-300 mb-1">
                        No Current Tenants
                      </h4>
                      <p className="text-xs text-slate-500">
                        This apartment is not currently occupied by an active tenant.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  {tenantHistory &&
                  tenantHistory.pastTenants &&
                  tenantHistory.pastTenants.length > 0 ? (
                    <div className="flex flex-col gap-4">
                      {tenantHistory.pastTenants.map((tenant) => (
                        <TenantHistoryCard
                          key={tenant.contractId}
                          tenant={tenant}
                          isCurrent={false}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="py-10 text-center border border-dashed border-slate-800 rounded-xl p-6 bg-[#090a0c]/60">
                      <span className="material-symbols-outlined text-3xl text-slate-600 mb-2">
                        history_toggle_off
                      </span>
                      <h4 className="text-sm font-medium text-slate-300 mb-1">
                        No Past Tenants
                      </h4>
                      <p className="text-xs text-slate-500">
                        No historical tenancy records found for this property.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 7. Verification Documents Section (order-7 on mobile) */}
          {(user?.is_verifier || isOwner) && (
            <div className="order-7 border border-slate-800 bg-[#12151c] rounded-2xl p-6 sm:p-7 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 pb-4 border-b border-white/10">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-xl text-amber-400">
                      folder_shared
                    </span>
                    <h2 className="text-lg font-serif font-bold text-white tracking-wide">
                      Verification Documents
                    </h2>
                    <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-full font-mono font-medium">
                      {documents.length}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Official documents uploaded to substantiate ownership, utilities, and property legitimacy.
                  </p>
                </div>

                {user?.is_verifier && (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-[11px] font-label-sm uppercase tracking-wider text-amber-300 self-start sm:self-center">
                    <span className="material-symbols-outlined text-sm text-amber-400">verified_user</span>
                    <span>Review Flow</span>
                  </div>
                )}
              </div>

              {docVerifyError && (
                <div className="p-3 mb-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center justify-between">
                  <span>{docVerifyError}</span>
                  <button
                    type="button"
                    onClick={() => setDocVerifyError(null)}
                    className="text-red-400 hover:text-white text-xs ml-2"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {documentsLoading ? (
                <div className="py-12 text-center text-slate-400">
                  <div className="w-7 h-7 rounded-full border-2 border-amber-400/40 border-t-transparent animate-spin mx-auto mb-2" />
                  <p className="text-xs">Loading verification documents...</p>
                </div>
              ) : documentsError ? (
                <div className="p-4 rounded-xl bg-red-950/40 border border-red-800 text-red-300 text-xs flex items-center justify-between">
                  <span>{documentsError}</span>
                  <button
                    type="button"
                    onClick={loadDocuments}
                    className="px-3 py-1 bg-red-800 hover:bg-red-700 text-white rounded text-xs transition cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              ) : documents.length === 0 ? (
                <div className="py-10 text-center border border-dashed border-slate-800 rounded-xl p-6 bg-[#090a0c]/60">
                  <span className="material-symbols-outlined text-3xl text-slate-600 mb-2">
                    description
                  </span>
                  <h4 className="text-sm font-medium text-slate-300 mb-1">
                    No Documents Uploaded
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    The owner has not uploaded any verification documents (utility bills, holding tax, or trade license) for this property yet.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {documents.map((doc) => {
                    const docTitle = formatDocumentType(doc.document_type);
                    const isDocVerified = Boolean(doc.is_verified);
                    const uploadedDate = doc.uploaded_at
                      ? new Date(doc.uploaded_at).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "Recently";

                    return (
                      <div
                        key={doc.id}
                        className={`p-4 sm:p-5 rounded-xl border bg-[#090a0c] transition-all flex flex-col gap-4 ${
                          isDocVerified
                            ? "border-emerald-800/40 shadow-[0_0_15px_rgba(16,185,129,0.05)]"
                            : "border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        {/* Document Top Row: Title, Badges, Actions */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                                isDocVerified
                                  ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-400"
                                  : "bg-white/5 border-white/10 text-slate-400"
                              }`}
                            >
                              <span className="material-symbols-outlined text-xl">
                                {isDocVerified ? "verified" : "article"}
                              </span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-sm font-semibold text-white">
                                  {docTitle}
                                </h4>
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] uppercase font-label-sm tracking-wider font-semibold border ${
                                    isDocVerified
                                      ? "text-emerald-300 bg-emerald-950/70 border-emerald-500/40"
                                      : "text-amber-300 bg-amber-950/70 border-amber-500/40"
                                  }`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      isDocVerified
                                        ? "bg-emerald-400"
                                        : "bg-amber-400 animate-pulse"
                                    }`}
                                  />
                                  {isDocVerified ? "Verified" : "Pending Review"}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                                <span className="font-mono text-slate-500">
                                  ID: #{doc.id}
                                </span>
                                <span>•</span>
                                <span>Uploaded: {uploadedDate}</span>
                                {doc.verification_type && (
                                  <>
                                    <span>•</span>
                                    <span className="capitalize text-slate-400">
                                      Type: {doc.verification_type}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Quick Verify Document Button (for verifiers) */}
                          {user?.is_verifier && !isDocVerified && (
                            <button
                              type="button"
                              disabled={verifyingDocId === doc.id}
                              onClick={() => handleVerifyDocument(doc.id)}
                              className="self-start sm:self-center px-3.5 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-600/50 hover:bg-emerald-900 text-emerald-300 text-xs font-medium transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                            >
                              <span className="material-symbols-outlined text-sm">
                                check
                              </span>
                              <span>
                                {verifyingDocId === doc.id
                                  ? "Verifying..."
                                  : "Verify Document"}
                              </span>
                            </button>
                          )}
                        </div>

                        {/* Media Attachments Preview Grid */}
                        {doc.media && doc.media.length > 0 && (
                          <div className="pt-3 border-t border-white/5">
                            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                              <span>Attached Files ({doc.media.length})</span>
                              <span className="text-[10px] text-slate-500">
                                Click file to inspect
                              </span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                              {doc.media.map((file, idx) => {
                                const isPdf = file.url.toLowerCase().includes(".pdf");
                                return (
                                  <div
                                    key={file.id}
                                    onClick={() =>
                                      setActiveViewerDoc({
                                        title: docTitle,
                                        type: doc.document_type,
                                        isVerified: isDocVerified,
                                        uploadedAt: doc.uploaded_at,
                                        media: doc.media,
                                        initialIndex: idx,
                                      })
                                    }
                                    className="group/file relative rounded-xl overflow-hidden border border-white/10 hover:border-[#d4b068]/50 bg-[#12151c] aspect-[4/3] flex flex-col items-center justify-center cursor-pointer transition shadow-sm hover:scale-[1.02]"
                                  >
                                    {isPdf ? (
                                      <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-slate-900/60">
                                        <span className="material-symbols-outlined text-3xl text-red-400 mb-1 group-hover/file:scale-110 transition-transform">
                                          picture_as_pdf
                                        </span>
                                        <span className="text-[10px] text-slate-300 font-mono line-clamp-1">
                                          PDF Document #{idx + 1}
                                        </span>
                                        <span className="text-[9px] uppercase tracking-wider text-slate-500 mt-0.5">
                                          Click to view
                                        </span>
                                      </div>
                                    ) : (
                                      <div className="w-full h-full relative">
                                        <img
                                          src={file.url}
                                          alt={`${docTitle} preview`}
                                          className="w-full h-full object-cover group-hover/file:scale-105 transition-transform duration-300"
                                        />
                                        <div className="absolute inset-0 bg-black/30 group-hover/file:bg-black/10 transition-colors flex items-center justify-center">
                                          <span className="material-symbols-outlined text-white text-xl opacity-0 group-hover/file:opacity-100 transition-opacity bg-black/60 rounded-full p-1.5">
                                            zoom_in
                                          </span>
                                        </div>
                                      </div>
                                    )}

                                    {/* Pill Badge */}
                                    <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between pointer-events-none">
                                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/75 text-white backdrop-blur-sm">
                                        {isPdf ? "PDF" : "IMG"}
                                      </span>
                                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/75 text-slate-300 backdrop-blur-sm">
                                        #{idx + 1}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 7. Tenant Reviews (order-8 on mobile) */}
          <div className="order-8 border border-slate-800 bg-[#12151c] rounded-2xl p-6 sm:p-7 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-xl text-amber-400">
                  hotel_class
                </span>
                <div>
                  <h2 className="text-base font-bold text-white">Tenant Reviews</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Authentic feedback from verified tenants with confirmed rental payments
                  </p>
                </div>
              </div>

              {reviewSummary.total_reviews > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-300 border border-amber-600/50 font-mono self-start sm:self-center">
                  <span className="material-symbols-outlined text-xs">star</span>
                  <span>{reviewSummary.average_rating.toFixed(1)} / 5.0</span>
                </span>
              )}
            </div>

            {/* Ratings Summary Banner (if reviews exist) */}
            {reviewSummary.total_reviews > 0 && (
              <div className="p-5 sm:p-6 rounded-xl bg-[#090a0c] border border-slate-800 mb-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                {/* Left: Overall Score */}
                <div className="md:col-span-4 flex flex-col items-center justify-center text-center p-4 border-b md:border-b-0 md:border-r border-slate-800/80">
                  <div className="text-4xl sm:text-5xl font-extrabold text-white font-mono tracking-tight mb-1">
                    {reviewSummary.average_rating.toFixed(1)}
                  </div>
                  <div className="flex items-center text-amber-400 text-lg mb-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        className={`material-symbols-outlined text-lg ${
                          star <= Math.round(reviewSummary.average_rating)
                            ? "font-variation-fill"
                            : "text-slate-700"
                        }`}
                        style={{
                          fontVariationSettings:
                            star <= Math.round(reviewSummary.average_rating)
                              ? "'FILL' 1"
                              : "'FILL' 0",
                        }}
                      >
                        star
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400">
                    Based on {reviewSummary.total_reviews} verified tenant review{reviewSummary.total_reviews > 1 ? "s" : ""}
                  </p>
                </div>

                {/* Right: Star Distribution Bars */}
                <div className="md:col-span-8 flex flex-col gap-2">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = reviewSummary.rating_counts[star] || 0;
                    const percent =
                      reviewSummary.total_reviews > 0
                        ? Math.round((count / reviewSummary.total_reviews) * 100)
                        : 0;
                    return (
                      <div key={star} className="flex items-center gap-3 text-xs">
                        <span className="w-12 font-medium text-slate-400 font-mono shrink-0 flex items-center gap-1">
                          <span>{star}</span>
                          <span className="material-symbols-outlined text-xs text-amber-400">star</span>
                        </span>
                        <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-amber-400 rounded-full transition-all duration-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="w-12 text-right text-slate-400 font-mono text-[11px] shrink-0">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Empty state or Review Cards Feed */}
            {reviews.length === 0 ? (
              <div className="py-12 px-4 text-center border border-dashed border-slate-800 rounded-xl bg-[#090a0c]/50">
                <div className="w-12 h-12 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center text-slate-400 mx-auto mb-3">
                  <span className="material-symbols-outlined text-2xl text-slate-500">rate_review</span>
                </div>
                <h3 className="text-sm font-semibold text-slate-200 mb-1">
                  No Reviews Yet
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Only verified tenants with at least one confirmed rent payment can write a review for this property.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {reviews.map((rev) => {
                  const initial = (rev.reviewer_name || "T").trim().charAt(0).toUpperCase();
                  const formattedDate = new Date(rev.created_at).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  });

                  return (
                    <div
                      key={rev.id}
                      className="p-5 bg-[#090a0c] border border-slate-800/80 rounded-xl shadow-xs transition hover:border-slate-700"
                    >
                      {/* Reviewer Header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-emerald-950/80 border border-emerald-700/60 flex items-center justify-center text-emerald-300 font-bold text-sm shrink-0">
                            {initial}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-white">
                                {rev.reviewer_name || "Verified Tenant"}
                              </span>
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/70 text-emerald-300 border border-emerald-700/50">
                                <span className="material-symbols-outlined text-[11px]">verified</span>
                                <span>Verified Tenant</span>
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400 block mt-0.5">
                              {formattedDate}
                            </span>
                          </div>
                        </div>

                        {/* Rating Stars */}
                        <div className="flex items-center text-amber-400">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span
                              key={star}
                              className={`material-symbols-outlined text-base ${
                                star <= rev.rating ? "font-variation-fill" : "text-slate-700"
                              }`}
                              style={{
                                fontVariationSettings: star <= rev.rating ? "'FILL' 1" : "'FILL' 0",
                              }}
                            >
                              star
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Review Description */}
                      {rev.description ? (
                        <p className="text-xs sm:text-sm text-slate-300 whitespace-pre-line leading-relaxed mb-3.5">
                          {rev.description}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-500 italic mb-3">
                          No written description provided.
                        </p>
                      )}

                      {/* Review Media Attachments Grid */}
                      {rev.media && rev.media.length > 0 && (
                        <div className="pt-2 border-t border-slate-800/60">
                          <div className="text-[10px] uppercase font-mono text-slate-400 mb-2">
                            Tenant Photos ({rev.media.length})
                          </div>
                          <div className="flex flex-wrap gap-2.5">
                            {rev.media.map((img, imgIdx) => (
                              <button
                                key={img.id}
                                type="button"
                                onClick={() =>
                                  setReviewLightbox({
                                    photos: rev.media!,
                                    selectedIndex: imgIdx,
                                    reviewerName: rev.reviewer_name,
                                    rating: rev.rating,
                                  })
                                }
                                className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border border-slate-700/80 hover:border-amber-400/80 transition-all hover:scale-105 group cursor-pointer shadow-sm"
                              >
                                <img
                                  src={img.url}
                                  alt={`Review attachment ${imgIdx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                  <span className="material-symbols-outlined text-lg">fullscreen</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* SIDEBAR COLUMN: Information Card + Actions Card */}
        <aside className="contents lg:flex lg:flex-col lg:col-span-5 xl:col-span-4 lg:sticky lg:top-6 lg:gap-6">
          {/* 1. Listing Information Card (order-2 on mobile) */}
          <div className="order-2 border border-slate-800 bg-[#12151c] rounded-2xl p-6 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase bg-slate-800 text-slate-300 px-2.5 py-1 rounded">
                  {getAreaName(listing.area_id)}
                </span>
                {(isOwner || user?.is_verifier || listing.status?.toLowerCase() === "occupied") && (
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded border capitalize ${
                      listing.status?.toLowerCase() === "occupied"
                        ? "text-rose-300 bg-rose-950/60 border-rose-800/60"
                        : listing.status?.toLowerCase() === "waiting" ||
                          listing.status?.toLowerCase() === "pending"
                        ? "text-amber-300 bg-amber-950/60 border-amber-800/60"
                        : "text-emerald-400 bg-emerald-950/60 border-emerald-800/60"
                    }`}
                  >
                    Status: {listing.status}
                  </span>
                )}
              </div>
              {/* Star button (non-owners only) */}
              {user && !isOwner ? (
                <button
                  type="button"
                  onClick={handleToggleStar}
                  disabled={starLoading}
                  aria-label={isStarred ? "Remove from starred" : "Add to starred"}
                  title={isStarred ? "Remove from starred" : "Save to starred listings"}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all border cursor-pointer ${
                    isStarred
                      ? "text-[#d4b068] bg-[#d4b068]/10 border-[#d4b068]/40 shadow-[0_0_12px_rgba(212,175,85,0.25)]"
                      : "text-slate-400 bg-slate-800/60 border-slate-700 hover:text-[#d4b068] hover:border-[#d4b068]/40"
                  } disabled:opacity-50`}
                >
                  <span
                    className="material-symbols-outlined text-base"
                    style={{ fontVariationSettings: isStarred ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    grade
                  </span>
                  <span>{isStarred ? "Starred" : "Star"}</span>
                </button>
              ) : (
                <span className="text-xs font-mono text-slate-500">
                  Ref #{listing.id}
                </span>
              )}
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

          {/* 3. Location */}
          <div className="order-4 border border-slate-800 bg-[#12151c] rounded-2xl p-6 sm:p-7 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg text-[#d4b068]">
                    location_on
                  </span>
                  <span>Property Location</span>
                </h2>
              </div>

              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 bg-slate-800 px-2.5 py-1 rounded">
                {getAreaName(listing.area_id)}
              </span>
            </div>

            <ListingMapPreview
              latitude={Number(listing.latitude)}
              longitude={Number(listing.longitude)}
            />

            <div className="mt-3 mb-3 flex items-center gap-2 text-[11px] text-slate-500 font-mono">
              <span className="material-symbols-outlined text-sm text-slate-600">
                near_me
              </span>

              <span>
                {Number(listing.latitude).toFixed(5)},{" "}
                {Number(listing.longitude).toFixed(5)}
              </span>
            </div>

            {/* Get Directions */}
            <button
              type="button"
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-2.5 px-4 rounded-xl text-xs transition text-center border border-slate-700 flex items-center justify-center gap-2"
              onClick={getDirections}
            >
              <span className="material-symbols-outlined text-sm">
              directions
              </span>
              <span>Get Directions</span>
            </button>
          </div>

          {/* 2. Actions Card (order-5 on mobile) */}
          <div className="order-5 border border-slate-800 bg-[#12151c] rounded-2xl p-6 shadow-xl">
            {user && !isOwner && isApplied && whatsAppHref && (
              <a
                href={whatsAppHref}
                target="_blank"
                rel="noopener noreferrer"
                className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-xs font-semibold text-slate-950 shadow-sm transition hover:bg-[#1ebe5d]"
              >
                <span className="material-symbols-outlined text-base">chat</span>
                <span>Contact Owner via WhatsApp</span>
              </a>
            )}

            {user?.is_verifier ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <div>
                    <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                      Verification Status
                    </span>
                    <span className="text-xs font-semibold text-white">Listing Review</span>
                  </div>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium border flex items-center gap-1.5 ${
                      listing.status?.toLowerCase() === "approved"
                        ? "bg-emerald-950/60 text-emerald-300 border-emerald-800/60"
                        : "bg-amber-950/60 text-amber-300 border-amber-800/60"
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">
                      {listing.status?.toLowerCase() === "approved" ? "verified" : "pending"}
                    </span>
                    {listing.status?.toLowerCase() === "approved" ? "Approved" : "Pending Verification"}
                  </span>
                </div>

                {/* Document Checklist / Stats */}
                <div className="p-3 rounded-xl bg-[#090a0c] border border-white/5">
                  <div className="text-[11px] text-slate-400 font-mono uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span>Documents Verified</span>
                    <span className="text-white font-bold">
                      {documents.filter((d) => d.is_verified).length} / {documents.length}
                    </span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full transition-all duration-300"
                      style={{
                        width: `${
                          documents.length > 0
                            ? (documents.filter((d) => d.is_verified).length / documents.length) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                {verifySuccessMsg && (
                  <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">check_circle</span>
                    <span>{verifySuccessMsg}</span>
                  </div>
                )}

                {verifyError && (
                  <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">error</span>
                    <span>{verifyError}</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleApproveListing}
                    disabled={verifying || listing.status?.toLowerCase() === "approved" || listing.status?.toLowerCase() === "rejected"}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold py-3 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">
                      {listing.status?.toLowerCase() === "approved" ? "check_circle" : "verified"}
                    </span>
                    <span>
                      {verifying
                        ? "Approving Listing..."
                        : listing.status?.toLowerCase() === "approved"
                        ? "Listing Approved"
                        : "Approve Listing"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowRejectModal(true)}
                    disabled={verifying || rejecting || listing.status?.toLowerCase() === "rejected"}
                    className="w-full bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 font-medium py-2.5 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-base">cancel</span>
                    <span>{listing.status?.toLowerCase() === "rejected" ? "Listing Rejected" : "Reject Listing"}</span>
                  </button>
                </div>
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
                  <a
                    href="#tenant-history"
                    className="w-full bg-sky-950/40 hover:bg-sky-900/50 text-sky-300 border border-sky-800/60 font-medium py-2.5 px-4 rounded-xl text-xs transition text-center flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">history</span>
                    <span>View Tenant History</span>
                  </a>
                  <Link
                    to={`/listings/${id}/edit`}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-2.5 px-4 rounded-xl text-xs transition text-center border border-slate-700"
                  >
                    Edit Listing Details
                  </Link>
                  {listing.status !== "occupied" && (
                    <button
                      type="button"
                      onClick={handleDeleteListing}
                      disabled={deleting}
                      className="w-full bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-200 py-2.5 px-4 rounded-xl text-xs transition cursor-pointer disabled:opacity-50"
                    >
                      {deleting ? "Deleting..." : "Delete Listing"}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div id="apply-section">
                <h3 className="text-base font-bold text-white mb-1">
                  {listing.status === "occupied" && !isApplied
                    ? "Property Leased & Occupied"
                    : "Apply for this Apartment"}
                </h3>
                <p className="text-xs text-slate-400 mb-5">
                  {listing.status === "occupied" && !isApplied
                    ? "This property is currently leased. New applications are not being accepted."
                    : "Submit your rental application directly to the owner."}
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

                {listing.status === "occupied" && !isApplied ? (
                  <div className="p-5 text-center border border-rose-900/40 rounded-xl bg-[#090a0c]">
                    <div className="w-10 h-10 rounded-full bg-rose-950/80 border border-rose-800/60 text-rose-400 flex items-center justify-center mx-auto mb-2.5">
                      <span className="material-symbols-outlined text-xl">home_work</span>
                    </div>
                    <p className="text-xs font-semibold text-rose-200 mb-1">
                      Applications Closed
                    </p>
                    <p className="text-[11px] text-slate-400">
                      An active lease contract is currently signed for this property.
                    </p>
                  </div>
                ) : !user ? (
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
                  <div
                    className={`p-4 rounded-xl bg-[#090a0c] border shadow-lg ${
                      effectiveApp?.contractStatus === "proposed"
                        ? "border-[#d4b068]/70"
                        : effectiveApp?.contractStatus === "signed" ||
                            effectiveApp?.status === "approved"
                          ? "border-emerald-800/60"
                          : effectiveApp?.status === "rejected"
                            ? "border-rose-800/60"
                            : "border-slate-800"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`material-symbols-outlined text-xl ${
                            effectiveApp?.contractStatus === "proposed"
                              ? "text-[#d4b068]"
                              : effectiveApp?.contractStatus === "signed" ||
                                  effectiveApp?.status === "approved"
                                ? "text-emerald-400"
                                : effectiveApp?.status === "rejected"
                                  ? "text-rose-400"
                                  : "text-amber-400"
                          }`}
                        >
                          {effectiveApp?.contractStatus === "proposed"
                            ? "edit_document"
                            : effectiveApp?.contractStatus === "signed" ||
                                effectiveApp?.status === "approved"
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
                      <span
                        className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded ${
                          effectiveApp?.contractStatus === "proposed"
                            ? "bg-amber-950 text-amber-300 border border-amber-800"
                            : effectiveApp?.contractStatus === "signed" ||
                                effectiveApp?.status === "approved"
                              ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                              : effectiveApp?.status === "rejected"
                                ? "bg-rose-950 text-rose-300 border border-rose-800"
                                : "bg-slate-800 text-slate-300 border border-slate-700"
                        }`}
                      >
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
                    {effectiveApp?.contractId &&
                      effectiveApp?.contractStatus === "proposed" && (
                        <Link
                          to={`/contracts/${effectiveApp.contractId}`}
                          className="mb-4 w-full bg-[#d4b068] hover:bg-[#c39f57] text-black font-semibold py-2.5 px-4 rounded-xl text-xs transition text-center flex items-center justify-center gap-2 shadow-sm"
                        >
                          <span className="material-symbols-outlined text-sm">
                            draw
                          </span>
                          <span>Review & Sign Lease Contract</span>
                        </Link>
                      )}

                    {effectiveApp?.contractId &&
                      effectiveApp?.contractStatus === "signed" && (
                        <Link
                          to={`/contracts/${effectiveApp.contractId}`}
                          className="mb-4 w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-2 px-4 rounded-xl text-xs transition text-center flex items-center justify-center gap-1.5"
                        >
                          <span>View Signed Contract</span>
                          <span className="material-symbols-outlined text-xs">
                            arrow_forward
                          </span>
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
                          <span
                            className={`font-semibold uppercase font-mono text-[11px] ${
                              effectiveApp.contractStatus === "signed"
                                ? "text-emerald-400"
                                : "text-[#d4b068]"
                            }`}
                          >
                            {effectiveApp.contractStatus === "signed"
                              ? "Signed"
                              : "Proposed (Pending Signature)"}
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
                            {Number(
                              effectiveApp.monthlyIncome,
                            ).toLocaleString()}{" "}
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

      {/* Review Photos Lightbox Modal */}
      {reviewLightbox && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 select-none animate-fadeIn"
          onClick={() => setReviewLightbox(null)}
        >
          {/* Top Bar */}
          <div
            className="flex items-center justify-between w-full max-w-6xl mx-auto text-white z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="text-sm font-semibold truncate max-w-xs sm:max-w-md text-white">
                  {reviewLightbox.reviewerName || "Verified Tenant"}'s Review Photo
                </h3>
                <span className="text-xs text-amber-400 font-mono">
                  ★ {reviewLightbox.rating}/5
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Photo {reviewLightbox.selectedIndex + 1} of {reviewLightbox.photos.length}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setReviewLightbox(null)}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
              aria-label="Close fullscreen gallery"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Main Image */}
          <div
            className="relative flex-1 flex items-center justify-center my-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={reviewLightbox.photos[reviewLightbox.selectedIndex]?.url}
              alt={`Review photo ${reviewLightbox.selectedIndex + 1}`}
              className="max-w-full max-h-[78vh] object-contain rounded-lg shadow-2xl"
            />

            {reviewLightbox.photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setReviewLightbox((prev) =>
                      prev
                        ? {
                            ...prev,
                            selectedIndex:
                              prev.selectedIndex === 0
                                ? prev.photos.length - 1
                                : prev.selectedIndex - 1,
                          }
                        : null
                    )
                  }
                  className="absolute left-2 sm:left-6 w-12 h-12 rounded-full bg-black/70 hover:bg-white text-white hover:text-black border border-white/20 flex items-center justify-center transition cursor-pointer shadow-xl"
                  aria-label="Previous photo"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setReviewLightbox((prev) =>
                      prev
                        ? {
                            ...prev,
                            selectedIndex:
                              prev.selectedIndex === prev.photos.length - 1
                                ? 0
                                : prev.selectedIndex + 1,
                          }
                        : null
                    )
                  }
                  className="absolute right-2 sm:right-6 w-12 h-12 rounded-full bg-black/70 hover:bg-white text-white hover:text-black border border-white/20 flex items-center justify-center transition cursor-pointer shadow-xl"
                  aria-label="Next photo"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
          </div>

          {/* Bottom Thumbnails */}
          {reviewLightbox.photos.length > 1 && (
            <div
              className="w-full max-w-4xl mx-auto flex items-center justify-center gap-2 overflow-x-auto py-2 z-10"
              onClick={(e) => e.stopPropagation()}
            >
              {reviewLightbox.photos.map((photo, idx) => (
                <button
                  key={photo.id || idx}
                  type="button"
                  onClick={() =>
                    setReviewLightbox((prev) => (prev ? { ...prev, selectedIndex: idx } : null))
                  }
                  className={`w-14 sm:w-16 aspect-square rounded-md overflow-hidden border transition cursor-pointer flex-shrink-0 ${
                    idx === reviewLightbox.selectedIndex
                      ? "ring-2 ring-white border-white scale-105 opacity-100"
                      : "border-white/20 opacity-50 hover:opacity-100"
                  }`}
                >
                  <img src={photo.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Verification Document Viewer Modal */}
      {activeViewerDoc && (
        <DocumentViewerModal
          isOpen={Boolean(activeViewerDoc)}
          onClose={() => setActiveViewerDoc(null)}
          documentTitle={activeViewerDoc.title}
          documentType={activeViewerDoc.type}
          isVerified={activeViewerDoc.isVerified}
          uploadedAt={activeViewerDoc.uploadedAt}
          media={activeViewerDoc.media}
          initialIndex={activeViewerDoc.initialIndex}
        />
      )}

      {/* Rejection Advisory Modal */}
      {showRejectModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => !rejecting && setShowRejectModal(false)}
        >
          <div
            className="w-full max-w-md bg-[#12151c] border border-rose-900/60 rounded-2xl p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-400">
                <span className="material-symbols-outlined text-2xl">cancel</span>
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-white">Reject this listing?</h3>
                <p className="text-xs text-slate-400 mt-1">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-[#090a0c] p-3.5 rounded-xl border border-white/5">
              The listing will be marked as <span className="text-rose-400 font-semibold">rejected</span> and
              immediately removed from all public listings. Tenants will no longer be able to find or apply to it.
            </p>

            {rejectError && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-base">error</span>
                <span>{rejectError}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                disabled={rejecting}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-medium transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectListing}
                disabled={rejecting}
                className="px-4 py-2 bg-rose-700 hover:bg-rose-600 text-white rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {rejecting && <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>}
                {rejecting ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TenantHistoryCard({
  tenant,
  isCurrent,
}: {
  tenant: TenantHistoryRecord;
  isCurrent: boolean;
}) {
  return (
    <div className="p-5 rounded-xl bg-[#090a0c] border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-5 hover:border-slate-700 transition">
      <div className="space-y-2.5 flex-1">
        {/* Name, Status Badge, and ID */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 font-semibold text-xs">
            {tenant.name.charAt(0).toUpperCase()}
          </div>
          <span className="font-semibold text-white text-base">
            {tenant.name}
          </span>
          <span className="text-xs text-slate-500 font-mono">
            (ID: #{tenant.tenantId})
          </span>
          <span
            className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded flex items-center gap-1 ${
              isCurrent
                ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                : "bg-slate-800 text-slate-300 border border-slate-700"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isCurrent ? "bg-emerald-400" : "bg-slate-400"
              }`}
            />
            {isCurrent ? "Active Tenancy" : "Completed Lease"}
          </span>
        </div>

        {/* Tenant Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
          {tenant.email && (
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="material-symbols-outlined text-xs text-slate-500">
                mail
              </span>
              <span className="font-mono text-slate-300 truncate">
                {tenant.email}
              </span>
            </div>
          )}
          {tenant.phone && (
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="material-symbols-outlined text-xs text-slate-500">
                call
              </span>
              <span className="font-mono text-slate-300">{tenant.phone}</span>
            </div>
          )}
          {tenant.monthlyRent > 0 && (
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="material-symbols-outlined text-xs text-slate-500">
                payments
              </span>
              <span>
                Agreed Rent:{" "}
                <strong className="text-slate-200 font-mono">
                  ৳{tenant.monthlyRent.toLocaleString()} / month
                </strong>
              </span>
            </div>
          )}
          {tenant.emergencyContact && (
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="material-symbols-outlined text-xs text-slate-500">
                contact_phone
              </span>
              <span>
                Emergency:{" "}
                <strong className="text-slate-200 font-mono">
                  {tenant.emergencyContact}
                </strong>
              </span>
            </div>
          )}
        </div>

        {/* Tenancy Duration / Dates */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-1 border-t border-slate-800/80">
          <div className="flex items-center gap-1">
            <span className="material-symbols-outlined text-xs">calendar_today</span>
            <span>
              {isCurrent
                ? `Started: ${tenant.startDate}`
                : `Tenancy: ${tenant.startDate} — ${tenant.endDate}`}
            </span>
          </div>
          {isCurrent && tenant.endDate && (
            <span className="text-slate-500 font-mono">
              (Expires: {tenant.endDate})
            </span>
          )}
        </div>
      </div>

      {/* Contract Action Link */}
      <div className="flex items-center gap-2 self-start md:self-center shrink-0">
        <Link
          to={`/contracts/${tenant.contractId}`}
          className="text-xs text-slate-300 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/60 hover:bg-slate-700 transition flex items-center gap-1 font-mono"
        >
          <span>Contract #{tenant.contractId}</span>
          <span className="material-symbols-outlined text-xs">arrow_forward</span>
        </Link>
      </div>
    </div>
  );
}
