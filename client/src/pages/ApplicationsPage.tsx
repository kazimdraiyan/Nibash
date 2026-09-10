import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../api/client";
import { useAuth } from "../context/AuthContext";

interface OwnerApplication {
  tenant_id: number;
  listing_id: number;
  status: string;
  applied_at: string;
  name?: string;
  email?: string;
  phone?: string;
  monthly_income?: number | string | null;
  emergency_contact?: string | null;
  title?: string;
  area_id?: number;
  bedroom_count?: number;
  bathroom_count?: number;
  on_which_floor?: number;
}

export function ApplicationsPage() {
  const { token } = useAuth();
  const [applications, setApplications] = useState<OwnerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rejectingKey, setRejectingKey] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<{ applications: OwnerApplication[] }>("/applications");
      setApplications(res.applications || []);
    } catch (err: any) {
      setError(err.message || "Failed to load owner applications.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleReject = async (listingId: number, tenantId: number) => {
    if (rejectingKey) return;
    if (!confirm("Are you sure you want to reject this applicant?")) return;
    const key = `${listingId}-${tenantId}`;
    setRejectingKey(key);
    try {
      await apiClient.put(`/applications/${listingId}/${tenantId}`, { status: "rejected" });
      setApplications((prev) =>
        prev.map((app) =>
          app.listing_id === listingId && app.tenant_id === tenantId
            ? { ...app, status: "rejected" }
            : app
        )
      );
    } catch (err: any) {
      alert(err.message || "Failed to reject application.");
    } finally {
      setRejectingKey(null);
    }
  };

  if (!token) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center">
        <h2 className="text-xl font-bold text-white mb-2">Authentication Required</h2>
        <p className="text-sm text-slate-400 mb-6">
          Please log in to manage your property rental applications.
        </p>
        <Link to="/login" className="bg-white text-slate-900 px-4 py-2 rounded text-xs font-medium">
          Log In
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Rental Applications</h1>
          <p className="text-sm text-slate-400">
            Incoming tenant requests across your published property listings.
          </p>
        </div>
        <Link
          to="/listings"
          className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-xs font-medium"
        >
          View Your Listings
        </Link>
      </div>

      {loading && (
        <div className="py-20 text-center text-slate-400">
          <div className="w-8 h-8 rounded-full border-2 border-white/40 border-t-transparent animate-spin mx-auto mb-3" />
          <p className="text-sm">Fetching incoming applications...</p>
        </div>
      )}

      {error && !loading && (
        <div className="p-4 bg-red-950/50 border border-red-800 text-red-300 rounded-lg flex flex-col items-center justify-center gap-3 my-8 text-center text-sm">
          <p>{error}</p>
          <button
            onClick={fetchApplications}
            className="px-4 py-1.5 bg-red-800 hover:bg-red-700 text-white rounded text-xs font-medium cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && applications.length === 0 && (
        <div className="py-16 text-center border border-dashed border-slate-800 rounded-2xl p-8">
          <span className="material-symbols-outlined text-4xl text-slate-500 mb-2">
            inbox
          </span>
          <h3 className="text-lg font-medium text-white mb-1">No Applications Received</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
            When tenants apply for your apartments, they will appear here for review and digital contract proposal.
          </p>
          <Link
            to="/listings/new"
            className="inline-block bg-white text-slate-900 px-4 py-2 rounded text-xs font-medium"
          >
            Add Another Property
          </Link>
        </div>
      )}

      {!loading && !error && applications.length > 0 && (
        <div className="flex flex-col gap-4">
          {applications.map((app, idx) => (
            <div
              key={idx}
              className="border border-slate-800 bg-[#12151c] rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-5"
            >
              <div className="space-y-2.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-semibold text-white">
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
                        ? "bg-red-950 text-red-300 border border-red-800"
                        : "bg-amber-950 text-amber-300 border border-amber-800"
                    }`}
                  >
                    {app.status}
                  </span>
                </div>

                <div className="text-sm text-slate-300 font-medium">
                  Property #{app.listing_id}: {app.title || "Apartment"}
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

                <div className="text-xs text-slate-500">
                  Applied on {new Date(app.applied_at || Date.now()).toLocaleDateString()}
                </div>
              </div>

              <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0">
                <Link
                  to={`/listings/${app.listing_id}`}
                  className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded text-xs font-medium"
                >
                  View Apartment
                </Link>

                {app.status === "pending" && (
                  <>
                    <Link
                      to={`/contracts/new?listingId=${app.listing_id}&tenantId=${app.tenant_id}`}
                      className="bg-white text-slate-900 px-3.5 py-1.5 rounded text-xs font-semibold hover:bg-slate-200 transition"
                    >
                      Propose Contract
                    </Link>
                    <button
                      type="button"
                      disabled={rejectingKey === `${app.listing_id}-${app.tenant_id}`}
                      onClick={() => handleReject(app.listing_id, app.tenant_id)}
                      className="bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800 px-3 py-1.5 rounded text-xs cursor-pointer disabled:opacity-50"
                    >
                      {rejectingKey === `${app.listing_id}-${app.tenant_id}` ? "Rejecting..." : "Reject"}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
