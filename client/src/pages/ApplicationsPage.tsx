import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../api/client";
import { useAuth } from "../context/AuthContext";

interface OwnerApplication {
  tenant_id: number;
  listing_id: number;
  status: string;
  applied_at: string;
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
    if (!confirm("Are you sure you want to reject this applicant?")) return;
    try {
      await apiClient.put(`/applications/${listingId}/${tenantId}`, { status: "rejected" });
      fetchApplications();
    } catch (err: any) {
      alert(err.message || "Failed to reject application.");
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
            When tenants apply for your residences, they will appear here for review and digital contract proposal.
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
              className="border border-slate-800 bg-[#12151c] rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div>
                <div className="flex items-center gap-2 mb-1.5">
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

                <div className="text-sm text-slate-200 font-medium mb-1">
                  Property #{app.listing_id}: {app.title || "Residence"}
                </div>
                <div className="text-xs text-slate-500">
                  Applied on {new Date(app.applied_at || Date.now()).toLocaleDateString()}
                </div>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <Link
                  to={`/listings/${app.listing_id}`}
                  className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded text-xs font-medium"
                >
                  View Residence
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
                      onClick={() => handleReject(app.listing_id, app.tenant_id)}
                      className="bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800 px-3 py-1.5 rounded text-xs cursor-pointer"
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
  );
}
