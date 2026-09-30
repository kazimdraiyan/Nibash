import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../api/client";

interface OverallIncomeSummary {
  currency: string;
  period: string;
  from: string | null;
  to: string | null;
  totalRentReceived: number;
  currentMonthRentReceived: number;
  incomeGeneratingListings: number;
  incomeGeneratingContracts: number;
  activeContractsCount: number;
  totalOwnedListings: number;
}

interface ListingIncomeItem {
  listingId: number;
  title: string;
  listingStatus: string;
  areaName: string;
  city: string;
  advertisedRent: number;
  totalRentReceived: number;
  contributingContractsCount: number;
  activeContractsCount: number;
  mostRecentPaymentDate: string | null;
  thumbnailUrl: string | null;
}

interface ContractIncomeItem {
  contractId: number;
  listingId: number;
  listingTitle: string;
  contractStatus: string;
  startDate: string;
  endDate: string;
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;
  agreedMonthlyRent: number;
  totalRentReceived: number;
  confirmedPaymentsCount: number;
  mostRecentPaymentDate: string | null;
}

interface PaymentLedgerItem {
  id: number;
  contractId: number;
  listingId: number;
  listingTitle: string;
  tenantName: string;
  amount: number;
  paymentMethod: string | null;
  status: string;
  billingMonth: string | null;
  dueDate: string | null;
  paidAt: string | null;
  bKashTransactionId: string | null;
  sslCommerzTransactionId: string | null;
}

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

type PeriodType =
  | "all"
  | "this_month"
  | "last_month"
  | "last_3_months"
  | "last_6_months"
  | "custom";

type TabType = "listings" | "contracts" | "ledger";

export function OwnerIncomePage() {
  // Filter state
  const [period, setPeriod] = useState<PeriodType>("all");
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");
  const [selectedListingId, setSelectedListingId] = useState<number | null>(null);

  // Active tab state
  const [activeTab, setActiveTab] = useState<TabType>("listings");

  // Data state
  const [summary, setSummary] = useState<OverallIncomeSummary | null>(null);
  const [listings, setListings] = useState<ListingIncomeItem[]>([]);
  const [contracts, setContracts] = useState<ContractIncomeItem[]>([]);
  const [payments, setPayments] = useState<PaymentLedgerItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 15,
    totalPages: 1,
  });

  // UI state
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Build query string helper
  const buildQueryParams = useCallback(
    (includePagination = false, page = 1) => {
      const params = new URLSearchParams();
      params.append("period", period);
      if (period === "custom") {
        if (customFrom) params.append("from", customFrom);
        if (customTo) params.append("to", customTo);
      }
      if (selectedListingId) {
        params.append("listing_id", String(selectedListingId));
      }
      if (includePagination) {
        params.append("page", String(page));
        params.append("limit", "15");
      }
      return params.toString();
    },
    [period, customFrom, customTo, selectedListingId],
  );

  // Main fetch function
  const fetchIncomeData = useCallback(
    async (targetPage = 1) => {
      setLoading(true);
      setError(null);
      try {
        const queryStr = buildQueryParams(false);
        const pagedQueryStr = buildQueryParams(true, targetPage);

        // Fetch overall summary and listings in parallel
        const [sumRes, listRes, contRes, payRes] = await Promise.all([
          apiClient.get<OverallIncomeSummary>(`/owners/me/income?${queryStr}`),
          apiClient.get<{ listings: ListingIncomeItem[] }>(
            `/owners/me/income/listings?${queryStr}`,
          ),
          apiClient.get<{ contracts: ContractIncomeItem[] }>(
            `/owners/me/income/contracts?${queryStr}`,
          ),
          apiClient.get<{ payments: PaymentLedgerItem[]; pagination: PaginationMeta }>(
            `/owners/me/income/payments?${pagedQueryStr}`,
          ),
        ]);

        setSummary(sumRes);
        setListings(listRes.listings || []);
        setContracts(contRes.contracts || []);
        setPayments(payRes.payments || []);
        setPagination(
          payRes.pagination || { total: 0, page: 1, limit: 15, totalPages: 1 },
        );
      } catch (err: any) {
        console.error("Failed to load rental income data:", err);
        setError(err.message || "Failed to load rental income data.");
      } finally {
        setLoading(false);
      }
    },
    [buildQueryParams],
  );

  useEffect(() => {
    fetchIncomeData(1);
  }, [fetchIncomeData]);

  // Format currency helper
  const formatBDT = (amount?: number | null) => {
    if (amount === undefined || amount === null || isNaN(amount)) return "৳0";
    return `৳${Number(amount).toLocaleString()}`;
  };

  // Format date helper
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatMonth = (monthStr?: string | null) => {
    if (!monthStr) return "—";
    const d = new Date(monthStr);
    if (isNaN(d.getTime())) return monthStr;
    return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  };

  // Find currently selected listing title if filter active
  const selectedListingObj = listings.find((l) => l.listingId === selectedListingId);

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 min-h-[80vh]">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center gap-2 mb-3">
        <Link
          to="/my-listings"
          className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-xs">arrow_back</span>
          <span>My Listings</span>
        </Link>
        <span className="text-xs text-slate-600">/</span>
        <span className="text-xs text-amber-400 font-medium">Rental Income</span>
      </div>

      {/* Page Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-white/10 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-serif font-bold text-white tracking-wide">
              Rental Income Tracking
            </h1>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">verified</span>
              <span>Confirmed Payments Only</span>
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">
            Track confirmed rent received across your properties, individual leases, and payment history.
          </p>
        </div>

        {/* Currency & Refresh Action */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs font-mono text-slate-300 shadow-sm">
            <span className="text-slate-500">Currency:</span>
            <span className="font-semibold text-white">BDT (৳)</span>
          </div>

          <button
            type="button"
            onClick={() => fetchIncomeData(pagination.page)}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl border border-slate-700 bg-[#12151c] text-xs font-medium text-slate-300 hover:text-white hover:border-slate-500 transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow-sm"
            title="Refresh Income Data"
          >
            <span className={`material-symbols-outlined text-sm ${loading ? "animate-spin" : ""}`}>
              refresh
            </span>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Date Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-[#12151c] border border-white/10 mb-8 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-400 font-mono flex items-center gap-1 mr-1">
              <span className="material-symbols-outlined text-base text-amber-400">calendar_month</span>
              <span>Filter Period:</span>
            </span>

            {[
              { id: "all", label: "All Time" },
              { id: "this_month", label: "This Month" },
              { id: "last_month", label: "Last Month" },
              { id: "last_3_months", label: "Last 3 Months" },
              { id: "last_6_months", label: "Last 6 Months" },
              { id: "custom", label: "Custom Range" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setPeriod(p.id as PeriodType);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  period === p.id
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm"
                    : "bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Active Property Scope Pill */}
          {selectedListingId && (
            <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-700/50 px-3 py-1.5 rounded-xl text-xs text-emerald-300 font-medium">
              <span className="material-symbols-outlined text-sm text-emerald-400">filter_alt</span>
              <span>Filtered by: <strong>{selectedListingObj?.title || `Listing #${selectedListingId}`}</strong></span>
              <button
                type="button"
                onClick={() => setSelectedListingId(null)}
                className="hover:text-white ml-1 text-slate-400 cursor-pointer"
                title="Clear listing filter"
              >
                <span className="material-symbols-outlined text-xs">close</span>
              </button>
            </div>
          )}
        </div>

        {/* Custom Date Pickers when 'custom' is active */}
        {period === "custom" && (
          <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-mono">From:</span>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono focus:border-amber-400 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-mono">To:</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono focus:border-amber-400 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => fetchIncomeData(1)}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-4 py-1.5 rounded-lg transition cursor-pointer"
            >
              Apply Filter
            </button>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/60 border border-red-700/60 text-red-200 text-xs mb-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-red-400">error</span>
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchIncomeData(1)}
            className="underline font-semibold hover:text-white cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Overall Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {/* Metric 1: Total Rent Received */}
        <div className="p-5 rounded-2xl bg-[#12151c] border border-white/10 relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs uppercase tracking-wider font-semibold font-mono">
              Total Rent Received
            </span>
            <span className="material-symbols-outlined text-xl text-amber-400">payments</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-white mb-1">
            {loading ? (
              <div className="h-8 w-32 bg-slate-800 rounded animate-pulse" />
            ) : (
              formatBDT(summary?.totalRentReceived)
            )}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>
              {period === "all" ? "All time confirmed rent" : "Filtered period confirmed"}
            </span>
          </div>
        </div>

        {/* Metric 2: Rent Received This Month */}
        <div className="p-5 rounded-2xl bg-[#12151c] border border-white/10 relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs uppercase tracking-wider font-semibold font-mono">
              This Month
            </span>
            <span className="material-symbols-outlined text-xl text-emerald-400">event_available</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400 mb-1">
            {loading ? (
              <div className="h-8 w-28 bg-slate-800 rounded animate-pulse" />
            ) : (
              formatBDT(summary?.currentMonthRentReceived)
            )}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Current calendar month receipts
          </div>
        </div>

        {/* Metric 3: Income-Generating Listings */}
        <div className="p-5 rounded-2xl bg-[#12151c] border border-white/10 relative overflow-hidden group hover:border-cyan-500/40 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs uppercase tracking-wider font-semibold font-mono">
              Income Listings
            </span>
            <span className="material-symbols-outlined text-xl text-cyan-400">real_estate_agent</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-white mb-1">
            {loading ? (
              <div className="h-8 w-20 bg-slate-800 rounded animate-pulse" />
            ) : (
              `${summary?.incomeGeneratingListings || 0} / ${summary?.totalOwnedListings || 0}`
            )}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Properties generating rental revenue
          </div>
        </div>

        {/* Metric 4: Active Income Contracts */}
        <div className="p-5 rounded-2xl bg-[#12151c] border border-white/10 relative overflow-hidden group hover:border-purple-500/40 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs uppercase tracking-wider font-semibold font-mono">
              Active Contracts
            </span>
            <span className="material-symbols-outlined text-xl text-purple-400">description</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-white mb-1">
            {loading ? (
              <div className="h-8 w-16 bg-slate-800 rounded animate-pulse" />
            ) : (
              summary?.activeContractsCount || 0
            )}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Signed or active lease agreements
          </div>
        </div>
      </div>

      {/* Navigation Tabs (3 Hierarchical Levels + Ledger) */}
      <div className="flex items-center gap-2 border-b border-white/10 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab("listings")}
          className={`pb-3 px-4 text-xs uppercase tracking-wider font-semibold font-mono transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === "listings"
              ? "border-amber-400 text-amber-300"
              : "border-transparent text-slate-400 hover:text-white hover:border-slate-700"
          }`}
        >
          <span className="material-symbols-outlined text-sm">apartment</span>
          <span>Income by Property ({listings.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("contracts")}
          className={`pb-3 px-4 text-xs uppercase tracking-wider font-semibold font-mono transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === "contracts"
              ? "border-amber-400 text-amber-300"
              : "border-transparent text-slate-400 hover:text-white hover:border-slate-700"
          }`}
        >
          <span className="material-symbols-outlined text-sm">handshake</span>
          <span>Income by Contract ({contracts.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("ledger")}
          className={`pb-3 px-4 text-xs uppercase tracking-wider font-semibold font-mono transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === "ledger"
              ? "border-amber-400 text-amber-300"
              : "border-transparent text-slate-400 hover:text-white hover:border-slate-700"
          }`}
        >
          <span className="material-symbols-outlined text-sm">receipt_long</span>
          <span>Payment History Ledger ({pagination.total})</span>
        </button>
      </div>

      {/* TAB 1: INCOME BY LISTING */}
      {activeTab === "listings" && (
        <div className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 bg-[#12151c] rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div className="py-16 text-center rounded-2xl border border-dashed border-slate-800 bg-[#12151c]/60">
              <span className="material-symbols-outlined text-4xl text-slate-600 block mb-2">
                home_work
              </span>
              <p className="text-sm font-semibold text-slate-300">No properties found</p>
              <p className="text-xs text-slate-500 mt-1">
                You haven't posted any listings yet.
              </p>
              <Link
                to="/listings/new"
                className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-white text-slate-900 hover:bg-slate-200 transition"
              >
                <span className="material-symbols-outlined text-sm">add_circle</span>
                <span>Post Your First Listing</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {listings.map((l) => {
                const isSelected = selectedListingId === l.listingId;
                return (
                  <div
                    key={l.listingId}
                    className={`rounded-2xl border p-5 transition-all flex flex-col justify-between ${
                      isSelected
                        ? "bg-[#14231f] border-emerald-500/70 shadow-lg"
                        : "bg-[#12151c] border-white/10 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      {/* Top Header: Area badge & Status */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-[11px] font-mono text-slate-300 bg-slate-800/80 px-2.5 py-0.5 rounded border border-slate-700/60 flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs text-slate-400">location_on</span>
                          <span>{l.areaName}, {l.city}</span>
                        </span>

                        <span className={`text-[10px] uppercase font-mono font-semibold px-2 py-0.5 rounded border ${
                          l.listingStatus === "occupied"
                            ? "bg-emerald-950/80 text-emerald-300 border-emerald-600/50"
                            : "bg-slate-800 text-slate-300 border-slate-700"
                        }`}>
                          {l.listingStatus}
                        </span>
                      </div>

                      {/* Main Title & Image */}
                      <div className="flex gap-4 mb-4">
                        {l.thumbnailUrl ? (
                          <img
                            src={l.thumbnailUrl}
                            alt={l.title}
                            className="w-20 h-20 rounded-xl object-cover border border-white/10 shrink-0"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-xl bg-slate-800/80 border border-white/10 flex items-center justify-center shrink-0 text-slate-600">
                            <span className="material-symbols-outlined text-2xl">apartment</span>
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <Link
                            to={`/listings/${l.listingId}`}
                            className="text-base font-bold text-white hover:text-amber-400 transition line-clamp-1"
                          >
                            {l.title}
                          </Link>
                          <p className="text-xs text-slate-400 font-mono mt-1">
                            Monthly Rent: <strong>{formatBDT(l.advertisedRent)}</strong>
                          </p>
                          <div className="flex items-center gap-3 text-xs text-slate-400 mt-2">
                            <span>Contracts: <strong className="text-white">{l.contributingContractsCount}</strong></span>
                            <span>•</span>
                            <span>Active: <strong className="text-emerald-400">{l.activeContractsCount}</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* Financial Highlight Box */}
                      <div className="p-3 rounded-xl bg-[#090a0c] border border-slate-800 flex items-center justify-between mb-4">
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-mono block">
                            Total Received
                          </span>
                          <span className="text-lg font-bold font-mono text-emerald-400">
                            {formatBDT(l.totalRentReceived)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-mono block">
                            Last Payment
                          </span>
                          <span className="text-xs font-mono text-slate-300">
                            {formatDate(l.mostRecentPaymentDate)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedListingId(null);
                          } else {
                            setSelectedListingId(l.listingId);
                            setActiveTab("ledger");
                          }
                        }}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                          isSelected
                            ? "bg-emerald-800 text-white"
                            : "bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700"
                        }`}
                      >
                        <span className="material-symbols-outlined text-xs">
                          {isSelected ? "check" : "filter_alt"}
                        </span>
                        <span>{isSelected ? "Filter Applied" : "Filter Payments"}</span>
                      </button>

                      <Link
                        to={`/listings/${l.listingId}`}
                        className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-medium"
                      >
                        <span>View Listing</span>
                        <span className="material-symbols-outlined text-xs">arrow_forward</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: INCOME BY CONTRACT */}
      {activeTab === "contracts" && (
        <div className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 bg-[#12151c] rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : contracts.length === 0 ? (
            <div className="py-16 text-center rounded-2xl border border-dashed border-slate-800 bg-[#12151c]/60">
              <span className="material-symbols-outlined text-4xl text-slate-600 block mb-2">
                history_edu
              </span>
              <p className="text-sm font-semibold text-slate-300">No contracts found</p>
              <p className="text-xs text-slate-500 mt-1">
                {selectedListingId
                  ? "No contracts found for the selected property."
                  : "No rental contracts have been proposed or signed yet."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {contracts.map((c) => (
                <div
                  key={c.contractId}
                  className="rounded-2xl border border-white/10 bg-[#12151c] p-5 flex flex-col justify-between hover:border-slate-700 transition"
                >
                  <div>
                    {/* Contract ID and Status Badge */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-mono text-slate-300 bg-slate-800/80 px-2.5 py-0.5 rounded border border-slate-700/60">
                        Contract #{c.contractId}
                      </span>
                      <span className={`text-[10px] uppercase font-mono font-semibold px-2 py-0.5 rounded border ${
                        c.contractStatus === "signed" || c.contractStatus === "active"
                          ? "bg-emerald-950/80 text-emerald-300 border-emerald-600/50"
                          : "bg-slate-800 text-slate-300 border-slate-700"
                      }`}>
                        {c.contractStatus}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white mb-1 line-clamp-1">
                      {c.listingTitle}
                    </h3>

                    {/* Tenant Details */}
                    <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 my-3 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Tenant:</span>
                        <span className="font-semibold text-white">{c.tenantName}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400 font-mono">
                        <span>Contact:</span>
                        <span>{c.tenantPhone || c.tenantEmail}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400 font-mono">
                        <span>Lease Period:</span>
                        <span>{formatDate(c.startDate)} → {formatDate(c.endDate)}</span>
                      </div>
                    </div>

                    {/* Financial Metrics */}
                    <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-[#090a0c] border border-slate-800 mb-4">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-mono block">
                          Agreed Rent
                        </span>
                        <span className="text-sm font-bold font-mono text-white">
                          {formatBDT(c.agreedMonthlyRent)}/mo
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-mono block">
                          Total Received
                        </span>
                        <span className="text-sm font-bold font-mono text-emerald-400">
                          {formatBDT(c.totalRentReceived)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer: Payments count & View details */}
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs">
                    <span className="text-slate-400 font-mono">
                      {c.confirmedPaymentsCount} {c.confirmedPaymentsCount === 1 ? "payment" : "payments"} recorded
                    </span>

                    <Link
                      to={`/contracts/${c.contractId}`}
                      className="text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1"
                    >
                      <span>Contract Details</span>
                      <span className="material-symbols-outlined text-xs">arrow_forward</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PAYMENT HISTORY LEDGER */}
      {activeTab === "ledger" && (
        <div className="space-y-4">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-[#12151c] rounded-xl animate-pulse" />
              ))}
            </div>
          ) : payments.length === 0 ? (
            <div className="py-16 text-center rounded-2xl border border-dashed border-slate-800 bg-[#12151c]/60">
              <span className="material-symbols-outlined text-4xl text-slate-600 block mb-2">
                receipt_long
              </span>
              <p className="text-sm font-semibold text-slate-300">No confirmed payment records</p>
              <p className="text-xs text-slate-500 mt-1">
                No confirmed rent payments match your selected date period or property filter.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#12151c] shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900/80 border-b border-white/10 text-slate-400 uppercase font-mono text-[10px] tracking-wider">
                      <th className="py-3 px-4">Payment Date</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Method</th>
                      <th className="py-3 px-4">Rent Month</th>
                      <th className="py-3 px-4">Property</th>
                      <th className="py-3 px-4">Tenant</th>
                      <th className="py-3 px-4">Contract</th>
                      <th className="py-3 px-4 text-right">Receipt / Tx</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-slate-300 font-mono">
                    {payments.map((p) => (
                      <tr key={p.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-white whitespace-nowrap">
                          {formatDate(p.paidAt)}
                        </td>
                        <td className="py-3.5 px-4 text-emerald-400 font-bold text-sm whitespace-nowrap">
                          {formatBDT(p.amount)}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] uppercase font-semibold border ${
                            p.paymentMethod === "Cash"
                              ? "bg-amber-950/60 text-amber-300 border-amber-600/40"
                              : "bg-cyan-950/60 text-cyan-300 border-cyan-600/40"
                          }`}>
                            <span className="material-symbols-outlined text-xs">
                              {p.paymentMethod === "Cash" ? "payments" : "credit_card"}
                            </span>
                            <span>{p.paymentMethod || "Verified"}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">
                          {formatMonth(p.billingMonth)}
                        </td>
                        <td className="py-3.5 px-4 text-white font-sans font-medium max-w-[200px] truncate">
                          <Link
                            to={`/listings/${p.listingId}`}
                            className="hover:text-amber-400 transition"
                            title={p.listingTitle}
                          >
                            {p.listingTitle}
                          </Link>
                        </td>
                        <td className="py-3.5 px-4 font-sans text-slate-300 whitespace-nowrap">
                          {p.tenantName}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <Link
                            to={`/contracts/${p.contractId}`}
                            className="text-amber-400 hover:underline font-mono"
                          >
                            #{p.contractId}
                          </Link>
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-500 text-[11px] whitespace-nowrap">
                          {p.bKashTransactionId || p.sslCommerzTransactionId || `ID #${p.id}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Toolbar */}
              <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400 font-mono">
                <div>
                  Showing {payments.length} of {pagination.total} confirmed payments
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={pagination.page <= 1 || loading}
                    onClick={() => fetchIncomeData(pagination.page - 1)}
                    className="px-3 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-40 cursor-pointer"
                  >
                    Previous
                  </button>

                  <span className="text-white">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={pagination.page >= pagination.totalPages || loading}
                    onClick={() => fetchIncomeData(pagination.page + 1)}
                    className="px-3 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-40 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
