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

  const fetchDetails = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch listing details
      const listingRes = await apiClient.get<{ listing: BackendListing }>(`/listings/${id}`);
      setListing(listingRes.listing);

      // 2. Fetch reviews for this listing
      try {
        const reviewsRes = await apiClient.get<{ reviews: Review[] }>(`/reviews/listings/${id}`);
        setReviews(reviewsRes.reviews || []);
      } catch {
        // Reviews may be empty or route might return 404 if no reviews
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
      setError(err.message || "Failed to load listing details.");
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
        window.location.reload();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [showSuccessModal]);

  const handleDirectApply = async () => {
    if (!id || applying || isApplied) return;
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
          listingTitle: listing?.title || `Residence #${id}`,
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
        // Not a registered tenant yet — show tenant information form
        setShowTenantForm(true);
      } else if (msg.includes("already applied to this listing")) {
        if (user) {
          saveUserApplication(user.id, {
            listingId: id,
            listingTitle: listing?.title || `Residence #${id}`,
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
          listingTitle: listing?.title || `Residence #${id}`,
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
            listingTitle: listing?.title || `Residence #${id}`,
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
    if (!id || !confirm("Are you sure you want to reject this applicant?")) return;
    try {
      await apiClient.put(`/applications/${id}/${tenantId}`, { status: "rejected" });
      fetchDetails();
    } catch (err: any) {
      alert(err.message || "Failed to reject application.");
    }
  };

  const handleDeleteListing = async () => {
    if (!id || !confirm("Are you sure you want to delete this listing? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/listings/${id}`);
      alert("Listing deleted successfully.");
      navigate("/listings");
    } catch (err: any) {
      alert(err.message || "Failed to delete listing.");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400">
        <div className="w-8 h-8 rounded-full border-2 border-white/40 border-t-transparent animate-spin mx-auto mb-3" />
        <p className="text-sm">Loading residence specification...</p>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center">
        <div className="p-4 bg-red-950/50 border border-red-800 text-red-300 rounded-lg mb-4 text-sm">
          {error || "Residence not found."}
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

  const isOwner = user && user.id === listing.owner_id;

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

      {/* Main Specs Banner */}
      <div className="border border-slate-800 bg-[#12151c] rounded-2xl p-6 sm:p-8 mb-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase bg-slate-800 text-slate-300 px-2.5 py-1 rounded">
              Area #{listing.area_id}
            </span>
            <span className="text-xs font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-1 rounded">
              Status: {listing.status}
            </span>
          </div>
          <span className="text-xs text-slate-400 font-mono">Owner ID: {listing.owner_id}</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">{listing.title}</h1>
        <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed mb-6">
          {listing.description}
        </p>

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

      {/* Two Column Section: Applications / Apply and Reviews */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Apply Form OR Owner Applications List */}
        <div className="lg:col-span-7">
          {isOwner ? (
            <div className="border border-slate-800 bg-[#12151c] rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-1">Incoming Applications</h2>
              <p className="text-xs text-slate-400 mb-4">
                Review tenants who applied for this residence. Propose a lease contract or reject.
              </p>

              {applications.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                  No applications received yet for this listing.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {applications.map((app, idx) => (
                    <div
                      key={idx}
                      className="border border-slate-800 bg-[#090a0c] p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-white">
                            Tenant #{app.tenant_id}
                          </span>
                          <span
                            className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded ${
                              app.status === "approved"
                                ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                                : app.status === "rejected"
                                ? "bg-red-950 text-red-300 border border-red-800"
                                : "bg-amber-950 text-amber-300 border border-amber-800"
                            }`}
                          >
                            {app.status}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500">
                          Applied: {new Date(app.applied_at || Date.now()).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {app.status === "pending" && (
                          <>
                            <Link
                              to={`/contracts/new?listingId=${listing.id}&tenantId=${app.tenant_id}`}
                              className="bg-white text-slate-900 px-3 py-1.5 rounded text-xs font-medium hover:bg-slate-200 transition"
                            >
                              Propose Contract
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleRejectApplicant(app.tenant_id)}
                              className="bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800 px-2.5 py-1.5 rounded text-xs cursor-pointer"
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
              <h2 className="text-xl font-bold text-white mb-1">Apply for this Residence</h2>
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
                      You have already submitted an application for this residence. The property owner will review your credentials and propose a lease agreement.
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
                      {existingApp?.applicantName && (
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Applicant</span>
                          <span className="text-white font-medium">{existingApp.applicantName}</span>
                        </div>
                      )}
                      {existingApp?.applicantEmail && (
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Email</span>
                          <span className="text-white font-medium font-mono">{existingApp.applicantEmail}</span>
                        </div>
                      )}
                      {existingApp?.applicantPhone && (
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Phone</span>
                          <span className="text-white font-medium font-mono">{existingApp.applicantPhone}</span>
                        </div>
                      )}
                      {existingApp?.monthlyIncome && (
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Monthly Income</span>
                          <span className="text-white font-medium">৳{Number(existingApp.monthlyIncome).toLocaleString()}</span>
                        </div>
                      )}
                      {existingApp?.emergencyContact && (
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Emergency Contact</span>
                          <span className="text-white font-medium font-mono">{existingApp.emergencyContact}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400 text-center leading-relaxed">
                    Duplicate applications cannot be submitted. You will be contacted once the owner reviews your request.
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
                      className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black"
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
                      className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black"
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
                        ? "Your existing tenant credentials will be used to submit your lease application directly."
                        : "Click Apply to submit your application for this residence."}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleDirectApply}
                    disabled={applying}
                    className="w-full bg-white text-slate-900 font-semibold py-3 px-4 rounded-xl hover:bg-slate-200 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm flex items-center justify-center gap-2 shadow-sm"
                  >
                    {applying ? (
                      <>
                        <span className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                        <span>Submitting Application...</span>
                      </>
                    ) : (
                      <>
                        <span>Apply</span>
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
    </div>
  );
}
