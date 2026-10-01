import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { getAreaName } from "../utils/areaLookup";

export interface TenantApplication {
  tenant_id: number;
  listing_id: number;
  applied_at: string;
  status: string;
  contract_id?: number | null;
  contract_status?: string | null;
  title?: string;
  description?: string;
  bedroom_count?: number;
  bathroom_count?: number;
  on_which_floor?: number;
  area_id?: number;
  owner_id?: number;
  listing_status?: string;
  rent?: number | string | null;
  electricity_bill?: number | string | null;
  water_bill?: number | string | null;
  service_charge?: number | string | null;
  monthly_due_date?: number | string | null;
  pet_allowed?: boolean | null;
  security_deposit?: number | string | null;
  monthly_income?: number | string | null;
  emergency_contact?: string | null;
}

function StatusBadge({ status, contractStatus }: { status: string; contractStatus?: string | null }) {
  if (contractStatus === "signed") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-700/60">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        Contract Signed
      </span>
    );
  }
  if (contractStatus === "proposed") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase font-mono bg-slate-700/60 text-slate-200 border border-slate-600/60">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
        Contract Proposed
      </span>
    );
  }
  const normalized = status?.toLowerCase();
  if (normalized === "approved") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-700/60">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        Approved
      </span>
    );
  }
  if (normalized === "rejected") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase font-mono bg-red-950/80 text-red-300 border border-red-800/60">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
        Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase font-mono bg-slate-800 text-slate-300 border border-slate-700/60">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" />
      {status || "Waiting"}
    </span>
  );
}

export function MyApplicationsPage() {
  const { user, token } = useAuth();
  const [applications, setApplications] = useState<TenantApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMyApplications = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<{ applications: TenantApplication[] }>("/applications/my");
      setApplications(res.applications || []);
    } catch (err: any) {
      console.error("[MyApplicationsPage] Failed to fetch applications:", err);
      setError(err.message || "Failed to load your submitted applications.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchMyApplications();
  }, [fetchMyApplications]);


  if (!token || !user) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-4 text-slate-400">
          <span className="material-symbols-outlined text-2xl">lock</span>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Authentication Required</h2>
        <p className="text-sm text-slate-400 mb-6">
          Please log in to view the applications you have submitted.
        </p>
        <Link
          to="/login"
          state={{ from: { pathname: "/my-applications" } }}
          className="bg-white text-slate-900 px-5 py-2.5 rounded-xl text-xs font-semibold hover:bg-slate-200 transition"
        >
          Log In
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 min-h-[75vh]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              to="/listings"
              className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-xs">arrow_back</span>
              <span>All Apartments</span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-white tracking-tight">
              My Applications
            </h1>
            {!loading && (
              <span className="text-xs font-semibold text-slate-300 bg-slate-800 border border-slate-700 px-2.5 py-0.5 rounded-full">
                {applications.length} {applications.length === 1 ? "Application" : "Applications"}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Applications you have submitted as a tenant.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchMyApplications}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl border border-slate-700 bg-[#12151c] text-xs font-medium text-slate-300 hover:text-white hover:border-slate-500 transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            title="Refresh Applications"
          >
            <span className={`material-symbols-outlined text-sm ${loading ? "animate-spin" : ""}`}>
              refresh
            </span>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="py-24 text-center text-slate-400">
          <div className="w-10 h-10 rounded-full border-2 border-slate-600 border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-sm text-white font-medium mb-1">Loading your applications...</p>
          <p className="text-xs text-slate-500">Checking current status with landlords</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="p-5 bg-red-950/60 border border-red-800 text-red-300 rounded-xl flex flex-col items-center justify-center gap-3 my-8 text-center">
          <span className="material-symbols-outlined text-3xl text-red-400">error</span>
          <p className="text-sm font-medium">{error}</p>
          <button
            type="button"
            onClick={fetchMyApplications}
            className="px-4 py-2 bg-red-800 hover:bg-red-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && applications.length === 0 && (
        <div className="py-20 text-center border border-dashed border-slate-800 bg-[#12151c]/30 rounded-2xl p-8 my-6 max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto mb-4 text-slate-400">
            <span className="material-symbols-outlined text-3xl">assignment_late</span>
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No Applications Submitted</h3>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            You have not applied for any rental apartments yet. Browse available properties and submit an application to get started.
          </p>
          <Link
            to="/listings"
            className="inline-flex items-center gap-2 bg-white text-slate-900 font-semibold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider hover:bg-slate-200 transition cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">search</span>
            <span>Explore Apartments</span>
          </Link>
        </div>
      )}

      {/* Populated State */}
      {!loading && !error && applications.length > 0 && (
        <div className="flex flex-col gap-4">
          {applications.map((app) => {
            const areaName = app.area_id ? getAreaName(app.area_id) : null;
            const appliedDate = app.applied_at
              ? new Date(app.applied_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })
              : "Recently";

            return (
              <div
                key={`${app.listing_id}-${app.tenant_id}`}
                className="border border-slate-800 bg-[#12151c] rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 hover:border-slate-700 transition"
              >
                <div className="flex-1">
                  {/* Status row */}
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <StatusBadge status={app.status} contractStatus={app.contract_status} />
                  </div>

                  {/* Title */}
                  <h2 className="text-lg font-bold text-white mb-1">
                    {app.title || "Apartment"}
                  </h2>

                  {/* Rent and Specs */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mb-2">
                    {app.rent !== undefined && app.rent !== null && app.rent !== "" && !isNaN(Number(app.rent)) && (
                      <span className="font-mono font-bold text-slate-200">
                        ৳{Number(app.rent).toLocaleString()} / month
                      </span>
                    )}
                    {[
                      app.bedroom_count !== undefined ? `${app.bedroom_count} Bed` : null,
                      app.bathroom_count !== undefined ? `${app.bathroom_count} Bath` : null,
                      app.on_which_floor !== undefined ? `Floor ${app.on_which_floor}` : null,
                      areaName || null,
                    ].filter(Boolean).join(" · ")}
                  </div>

                  {/* Applied timestamp */}
                  <p className="text-[11px] text-slate-500">
                    Applied on <span className="text-slate-400">{appliedDate}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto self-end sm:self-center">
                  {app.contract_id && (
                    <Link
                      to={`/contracts/${app.contract_id}`}
                      className="flex-1 sm:flex-none bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-semibold px-3.5 py-2 rounded-xl text-xs transition text-center flex items-center justify-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-sm">description</span>
                      <span>View Contract</span>
                    </Link>
                  )}
                  <Link
                    to={`/listings/${app.listing_id}`}
                    className="flex-1 sm:flex-none bg-white text-slate-900 font-semibold px-3.5 py-2 rounded-xl text-xs hover:bg-slate-200 transition text-center flex items-center justify-center gap-1"
                  >
                    <span>View Apartment</span>
                    <span className="material-symbols-outlined text-xs">arrow_forward</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
