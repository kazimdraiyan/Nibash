import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { apiClient } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { BackendListing } from "./ListingsPage";

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
  const { user } = useAuth();

  const [listing, setListing] = useState<BackendListing | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Application submission state
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

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setApplying(true);
    setApplyError(null);
    setApplySuccess(null);

    const body: Record<string, any> = {
      listingId: parseInt(id, 10),
    };

    if (applyIncome.trim()) {
      const inc = parseFloat(applyIncome);
      if (!isNaN(inc)) body.monthly_income = inc;
    }

    if (applyContact.trim()) {
      body.emergency_contact = applyContact.trim();
    }

    try {
      const res = await apiClient.post<{ message: string }>("/applications", body);
      setApplySuccess(res.message || "Application submitted successfully!");
      setApplyIncome("");
      setApplyContact("");
    } catch (err: any) {
      setApplyError(err.message || "Failed to apply.");
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
              {listing.latitude.toFixed(2)}, {listing.longitude.toFixed(2)}
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
            <div className="border border-slate-800 bg-[#12151c] rounded-2xl p-6">
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
                    className="inline-block bg-white text-slate-900 px-4 py-2 rounded text-xs font-medium"
                  >
                    Log In to Apply
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleApply} className="flex flex-col gap-4">
                  <div>
                    <label
                      htmlFor="apply-income"
                      className="block text-xs uppercase font-medium text-slate-400 mb-1"
                    >
                      Monthly Income (BDT, optional if already tenant)
                    </label>
                    <input
                      id="apply-income"
                      type="number"
                      min="1000"
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
                      Emergency Contact (11 digits, optional if already tenant)
                    </label>
                    <input
                      id="apply-contact"
                      type="tel"
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
                    className="w-full bg-white text-slate-900 font-medium py-2.5 px-4 rounded-lg hover:bg-slate-200 transition disabled:opacity-50 cursor-pointer text-sm"
                  >
                    {applying ? "Submitting Application..." : "Submit Application"}
                  </button>
                </form>
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
    </div>
  );
}
