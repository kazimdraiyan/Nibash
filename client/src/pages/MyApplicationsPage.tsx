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
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase font-mono bg-[#d4b068]/20 text-[#d4b068] border border-[#d4b068]/50 animate-pulse">
        <span className="w-1.5 h-1.5 rounded-full bg-[#d4b068]" />
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
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase font-mono bg-amber-950/80 text-amber-300 border border-amber-700/60">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
      {status || "Waiting"}
    </span>
  );
}

interface ApplicationModalProps {
  app: TenantApplication;
  onClose: () => void;
}

function ApplicationDetailModal({ app, onClose }: ApplicationModalProps) {
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
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-[#12151c] border border-slate-700 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Status */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
              Application Details
            </span>
            <StatusBadge status={app.status} contractStatus={app.contract_status} />
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Property Overview */}
        <div className="mb-6 p-4 rounded-xl bg-[#090a0c] border border-slate-800">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[11px] text-[#d4b068] font-mono uppercase">
              Property #{app.listing_id}
            </span>
            {areaName && (
              <span className="text-[11px] text-slate-400 font-mono">
                {areaName}
              </span>
            )}
          </div>
          <h3 className="text-base font-semibold text-white mb-2">
            {app.title || `Apartment #${app.listing_id}`}
          </h3>
          {app.rent !== undefined && app.rent !== null && app.rent !== "" && !isNaN(Number(app.rent)) && (
            <p className="text-sm font-mono font-bold text-[#d4b068]">
              ৳{Number(app.rent).toLocaleString()} / month
            </p>
          )}
        </div>

        {/* Details List */}
        <div className="flex flex-col gap-2.5 mb-6 text-xs divide-y divide-slate-800/60">
          <div className="flex items-center justify-between py-1.5">
            <span className="text-slate-400">Application Status</span>
            <span className="font-semibold text-white capitalize">{app.status}</span>
          </div>

          {app.contract_id && (
            <div className="flex items-center justify-between py-1.5">
              <span className="text-slate-400">Lease Contract</span>
              <span className={`font-mono font-semibold uppercase text-xs ${app.contract_status === "signed" ? "text-emerald-400" : "text-[#d4b068]"}`}>
                {app.contract_status === "signed" ? "Signed / Active" : "Proposed (Pending Signature)"}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between py-1.5">
            <span className="text-slate-400">Applied On</span>
            <span className="font-medium text-slate-200">{appliedDate}</span>
          </div>

          {(app.bedroom_count !== undefined || app.bathroom_count !== undefined || app.on_which_floor !== undefined) && (
            <div className="flex items-center justify-between py-1.5">
              <span className="text-slate-400">Specifications</span>
              <span className="font-medium text-slate-200">
                {[
                  app.bedroom_count !== undefined ? `${app.bedroom_count} Bed` : null,
                  app.bathroom_count !== undefined ? `${app.bathroom_count} Bath` : null,
                  app.on_which_floor !== undefined ? `Floor ${app.on_which_floor}` : null,
                ]
                  .filter(Boolean)
                  .join(" • ")}
              </span>
            </div>
          )}

          {app.security_deposit !== undefined && app.security_deposit !== null && app.security_deposit !== "" && !isNaN(Number(app.security_deposit)) && (
            <div className="flex items-center justify-between py-1.5">
              <span className="text-slate-400">Security Deposit</span>
              <span className="font-mono text-slate-200">৳{Number(app.security_deposit).toLocaleString()}</span>
            </div>
          )}

          {app.monthly_income !== undefined && app.monthly_income !== null && (
            <div className="flex items-center justify-between py-1.5">
              <span className="text-slate-400">Reported Monthly Income</span>
              <span className="font-mono text-slate-200">৳{Number(app.monthly_income).toLocaleString()}</span>
            </div>
          )}

          {app.emergency_contact && (
            <div className="flex items-center justify-between py-1.5">
              <span className="text-slate-400">Emergency Contact</span>
              <span className="font-mono text-slate-200">{app.emergency_contact}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-medium py-2.5 px-4 rounded-xl transition text-xs cursor-pointer text-center"
          >
            Close
          </button>
          {app.contract_id && app.contract_status === "proposed" ? (
            <Link
              to={`/contracts/${app.contract_id}`}
              onClick={onClose}
              className="flex-1 bg-[#d4b068] hover:bg-[#c39f57] text-black font-semibold py-2.5 px-4 rounded-xl transition text-xs cursor-pointer text-center flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">edit_document</span>
              <span>Review & Sign Contract</span>
            </Link>
          ) : app.contract_id && app.contract_status === "signed" ? (
            <Link
              to={`/contracts/${app.contract_id}`}
              onClick={onClose}
              className="flex-1 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold py-2.5 px-4 rounded-xl transition text-xs cursor-pointer text-center flex items-center justify-center gap-1.5"
            >
              <span>View Signed Contract</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          ) : (
            <Link
              to={`/listings/${app.listing_id}`}
              onClick={onClose}
              className="flex-1 bg-white text-slate-900 font-semibold py-2.5 px-4 rounded-xl hover:bg-slate-200 transition text-xs cursor-pointer text-center flex items-center justify-center gap-1.5"
            >
              <span>View Apartment</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export function MyApplicationsPage() {
  const { user, token } = useAuth();
  const [applications, setApplications] = useState<TenantApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<TenantApplication | null>(null);
  const [signingId, setSigningId] = useState<number | null>(null);

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

  const handleSignContract = async (contractId: number) => {
    if (signingId !== null) return;
    if (!confirm("Are you sure you want to sign this digital lease contract?")) return;
    setSigningId(contractId);
    try {
      await apiClient.patch(`/contracts/${contractId}`, { status: "signed" });
      alert("Contract signed successfully! Your lease agreement is now active.");
      fetchMyApplications();
    } catch (err: any) {
      alert(err.message || "Failed to sign contract.");
    } finally {
      setSigningId(null);
    }
  };

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
              <span className="text-xs font-semibold text-[#d4b068] bg-[#d4b068]/15 border border-[#d4b068]/30 px-2.5 py-0.5 rounded-full">
                {applications.length} {applications.length === 1 ? "Application" : "Applications"}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Applications you have submitted as a prospective tenant.
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

          <Link
            to="/listings"
            className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-xs font-medium transition"
          >
            Browse Listings
          </Link>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="py-24 text-center text-slate-400">
          <div className="w-10 h-10 rounded-full border-2 border-[#d4b068]/60 border-t-transparent animate-spin mx-auto mb-4" />
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
                  {/* Status & Area row */}
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <StatusBadge status={app.status} contractStatus={app.contract_status} />
                    {areaName && (
                      <span className="text-xs font-mono uppercase bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700/60">
                        {areaName}
                      </span>
                    )}
                    <span className="text-xs text-slate-500 font-mono">
                      #{app.listing_id}
                    </span>
                  </div>

                  {/* Title */}
                  <h2 className="text-lg font-bold text-white mb-1">
                    {app.title || `Apartment #${app.listing_id}`}
                  </h2>

                  {/* Rent and Specs */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mb-2">
                    {app.rent !== undefined && app.rent !== null && app.rent !== "" && !isNaN(Number(app.rent)) && (
                      <span className="font-mono font-bold text-[#d4b068]">
                        ৳{Number(app.rent).toLocaleString()} / month
                      </span>
                    )}
                    {(app.bedroom_count !== undefined || app.bathroom_count !== undefined) && (
                      <span className="text-slate-400">
                        {[
                          app.bedroom_count !== undefined ? `${app.bedroom_count} Bed` : null,
                          app.bathroom_count !== undefined ? `${app.bathroom_count} Bath` : null,
                          app.on_which_floor !== undefined ? `Floor ${app.on_which_floor}` : null,
                        ]
                          .filter(Boolean)
                          .join(" • ")}
                      </span>
                    )}
                  </div>

                  {/* Proposed Contract Alert */}
                  {app.contract_id && app.contract_status === "proposed" && (
                    <div className="my-2.5 p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs text-amber-200">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-amber-400 text-base shrink-0">edit_document</span>
                        <span><strong>Lease Agreement Proposed:</strong> Landlord has sent the digital contract for your signature.</span>
                      </div>
                      <Link
                        to={`/contracts/${app.contract_id}`}
                        className="shrink-0 bg-[#d4b068] hover:bg-[#c39f57] text-black font-semibold px-3 py-1 rounded-lg text-xs transition"
                      >
                        Review Terms
                      </Link>
                    </div>
                  )}

                  {/* Applied timestamp */}
                  <p className="text-[11px] text-slate-500">
                    Applied on <span className="text-slate-400">{appliedDate}</span>
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto self-end sm:self-center">
                  {app.contract_id && app.contract_status === "proposed" && (
                    <button
                      type="button"
                      disabled={signingId === app.contract_id}
                      onClick={() => handleSignContract(app.contract_id!)}
                      className="bg-[#d4b068] hover:bg-[#c39f57] text-black font-semibold px-3.5 py-2 rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
                    >
                      <span className="material-symbols-outlined text-sm">draw</span>
                      <span>{signingId === app.contract_id ? "Signing..." : "Sign Contract"}</span>
                    </button>
                  )}

                  {app.contract_id && app.contract_status === "signed" && (
                    <Link
                      to={`/contracts/${app.contract_id}`}
                      className="bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-700 px-3.5 py-2 rounded-xl text-xs font-semibold transition text-center flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-sm">verified</span>
                      <span>View Contract</span>
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedApp(app)}
                    className="flex-1 sm:flex-none bg-slate-800 hover:bg-slate-700 text-white font-medium px-3.5 py-2 rounded-xl text-xs transition cursor-pointer text-center"
                  >
                    View Details
                  </button>

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

      {/* Application Details Modal */}
      {selectedApp && (
        <ApplicationDetailModal
          app={selectedApp}
          onClose={() => setSelectedApp(null)}
        />
      )}
    </div>
  );
}
